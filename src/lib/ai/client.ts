import type { AIProviderConfig, OllamaModel, OllamaTagsResponse } from '@/schemas/ai.ts'

interface ChatMessage {
  role: string
  content: string
}

interface ChatOptions {
  temperature: number
  maxTokens: number
}

interface ChatResult {
  content: string
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
}

export class AIClient {
  /**
   * Non-streaming chat completion. Sends messages to the configured provider
   * and returns the full response once complete.
   */
  async chat(
    messages: ChatMessage[],
    provider: AIProviderConfig,
    options: ChatOptions,
  ): Promise<ChatResult> {
    const { url, headers, body } = this.buildRequest(messages, provider, options, false)

    const response = await this.fetchWithErrorHandling(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, provider.endpoint)

    const data = await response.json()

    if (provider.type === 'ollama') {
      return {
        content: data.message?.content ?? '',
        tokensUsed: data.prompt_eval_count != null ? {
          prompt: data.prompt_eval_count ?? 0,
          completion: data.eval_count ?? 0,
          total: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        } : undefined,
      }
    }

    // OpenAI-compatible response
    const choice = data.choices?.[0]
    return {
      content: choice?.message?.content ?? '',
      tokensUsed: data.usage ? {
        prompt: data.usage.prompt_tokens ?? 0,
        completion: data.usage.completion_tokens ?? 0,
        total: data.usage.total_tokens ?? 0,
      } : undefined,
    }
  }

  /**
   * Streaming chat completion. Yields text chunks as they arrive from
   * the provider. Supports cancellation via AbortSignal.
   */
  async *chatStream(
    messages: ChatMessage[],
    provider: AIProviderConfig,
    options: ChatOptions,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const { url, headers, body } = this.buildRequest(messages, provider, options, true)

    const response = await this.fetchWithErrorHandling(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    }, provider.endpoint)

    if (!response.body) {
      throw new Error('Response body is empty — streaming not supported by this endpoint.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        if (provider.type === 'ollama') {
          yield* this.parseOllamaStream(buffer)
        } else {
          yield* this.parseOpenAIStream(buffer)
        }

        // Keep only the last incomplete line in the buffer
        const lastNewline = buffer.lastIndexOf('\n')
        if (lastNewline !== -1) {
          buffer = buffer.slice(lastNewline + 1)
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim()) {
        if (provider.type === 'ollama') {
          yield* this.parseOllamaStream(buffer + '\n')
        } else {
          yield* this.parseOpenAIStream(buffer + '\n')
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Attempts to detect a locally running Ollama instance by querying
   * the default endpoint. Returns available models or null if unreachable.
   */
  static async detectOllama(): Promise<OllamaModel[] | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)

      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) return null

      const data: OllamaTagsResponse = await response.json()
      return data.models ?? []
    } catch {
      return null
    }
  }

  /**
   * Lists available models for a given provider. Currently only
   * supports Ollama; OpenAI-compatible providers return an empty array.
   */
  static async listModels(provider: AIProviderConfig): Promise<string[]> {
    if (provider.type === 'ollama') {
      try {
        const response = await fetch(`${provider.endpoint}/api/tags`)
        if (!response.ok) return []

        const data: OllamaTagsResponse = await response.json()
        return (data.models ?? []).map((m) => m.name)
      } catch {
        return []
      }
    }

    // OpenAI-compatible: model listing requires org-level API access
    // that most users won't have, so we return an empty array.
    return []
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildRequest(
    messages: ChatMessage[],
    provider: AIProviderConfig,
    options: ChatOptions,
    stream: boolean,
  ): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (provider.type === 'ollama') {
      return {
        url: `${provider.endpoint}/api/chat`,
        headers,
        body: {
          model: provider.model,
          messages,
          stream,
          options: {
            temperature: options.temperature,
            num_predict: options.maxTokens,
          },
        },
      }
    }

    // OpenAI-compatible
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`
    }

    return {
      url: `${provider.endpoint}/v1/chat/completions`,
      headers,
      body: {
        model: provider.model,
        messages,
        stream,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      },
    }
  }

  private async fetchWithErrorHandling(
    url: string,
    init: RequestInit,
    endpoint: string,
  ): Promise<Response> {
    let response: Response

    try {
      response = await fetch(url, init)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed'))) {
        throw new Error(`Cannot connect to ${endpoint}. Is the server running?`)
      }
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Network error: ${message}`)
    }

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error('Authentication failed. Check your API key.')
        case 404:
          throw new Error('Model not found. Check your model name.')
        default: {
          let detail = ''
          try {
            detail = await response.text()
          } catch { /* ignore */ }
          throw new Error(
            `Request failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
          )
        }
      }
    }

    return response
  }

  /**
   * Parse Ollama's NDJSON streaming format.
   * Each line is a JSON object: {"message":{"content":"chunk"},"done":false}
   */
  private *parseOllamaStream(buffer: string): Generator<string> {
    const lines = buffer.split('\n')
    // Process all complete lines (skip the last element which may be incomplete)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const parsed = JSON.parse(line)
        if (parsed.done) return
        const chunk = parsed.message?.content
        if (chunk) yield chunk
      } catch {
        // Skip malformed lines
      }
    }
  }

  /**
   * Parse OpenAI-compatible SSE streaming format.
   * Lines follow the pattern: "data: {JSON}\n\n", ending with "data: [DONE]".
   */
  private *parseOpenAIStream(buffer: string): Generator<string> {
    const lines = buffer.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (!line || !line.startsWith('data: ')) continue

      const payload = line.slice(6)
      if (payload === '[DONE]') return

      try {
        const parsed = JSON.parse(payload)
        const chunk = parsed.choices?.[0]?.delta?.content
        if (chunk) yield chunk
      } catch {
        // Skip malformed lines
      }
    }
  }
}
