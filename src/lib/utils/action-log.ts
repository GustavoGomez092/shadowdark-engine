import type { ChatMessage } from '@/schemas/session.ts'
import { generateId } from './id.ts'

/**
 * Create an action log entry — a system notification about a game action.
 * These are visually distinct from player/GM chat messages.
 */
export function createActionLog(content: string): ChatMessage {
  return {
    id: generateId(),
    senderId: 'system',
    senderName: 'System',
    type: 'action',
    content,
    timestamp: Date.now(),
    isPublic: true,
  }
}

export function createSystemLog(content: string): ChatMessage {
  return {
    id: generateId(),
    senderId: 'system',
    senderName: 'System',
    type: 'system',
    content,
    timestamp: Date.now(),
    isPublic: true,
  }
}
