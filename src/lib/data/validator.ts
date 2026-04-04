import type { DataPack } from './types.ts'
import { DATA_PACK_SCHEMAS } from './schemas.ts'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  pack?: DataPack
}

export function validateDataPack(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Invalid JSON: expected an object'] }
  }

  const obj = raw as Record<string, unknown>

  // Required metadata
  if (!obj.id || typeof obj.id !== 'string') errors.push('Missing or invalid "id" (string required)')
  if (!obj.name || typeof obj.name !== 'string') errors.push('Missing or invalid "name" (string required)')
  if (!obj.author || typeof obj.author !== 'string') errors.push('Missing or invalid "author" (string required)')
  if (!obj.version || typeof obj.version !== 'string') errors.push('Missing or invalid "version" (string required)')

  // Data object
  if (!obj.data || typeof obj.data !== 'object') {
    errors.push('Missing or invalid "data" object')
    return { valid: false, errors }
  }

  const data = obj.data as Record<string, unknown>
  const validKeys = Object.keys(DATA_PACK_SCHEMAS)

  for (const key of Object.keys(data)) {
    if (!validKeys.includes(key)) {
      errors.push(`Unknown data key: "${key}". Valid keys: ${validKeys.join(', ')}`)
      continue
    }

    const arr = data[key]
    if (!Array.isArray(arr)) {
      errors.push(`"data.${key}" must be an array`)
      continue
    }

    // Validate with Zod schema
    const schema = DATA_PACK_SCHEMAS[key]
    if (schema) {
      const result = schema.safeParse(arr)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.length > 0 ? `[${issue.path.join('.')}]` : ''
          errors.push(`data.${key}${path}: ${issue.message}`)
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    pack: obj as unknown as DataPack,
  }
}
