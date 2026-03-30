import type { DataPack } from './types.ts'

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
  const validKeys = ['monsters', 'spells', 'weapons', 'armor', 'gear', 'backgrounds', 'deities', 'languages', 'ancestries', 'classes']

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

    // Validate each entry has at minimum an id and name
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') {
        errors.push(`data.${key}[${i}]: must be an object`)
        continue
      }
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`data.${key}[${i}]: missing "id" field`)
      }
      if (!item.name || typeof item.name !== 'string') {
        errors.push(`data.${key}[${i}]: missing "name" field`)
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
