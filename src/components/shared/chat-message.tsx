import type { ChatMessage } from '@/schemas/session.ts'

export function ChatMessageRow({ msg }: { msg: ChatMessage }) {
  switch (msg.type) {
    case 'system':
      return (
        <div className="text-xs text-muted-foreground/70 italic py-0.5">
          {msg.content}
        </div>
      )
    case 'action':
      return (
        <div className="text-xs py-0.5 flex items-start gap-1.5">
          <span className="text-amber-500 shrink-0">⚡</span>
          <span className="text-muted-foreground">{msg.content}</span>
        </div>
      )
    case 'roll':
      return (
        <div className="text-xs py-0.5 flex items-start gap-1.5">
          <span className="text-primary shrink-0">🎲</span>
          <span>
            <span className="font-semibold text-primary">{msg.senderName}</span>
            <span className="text-muted-foreground">: {msg.content}</span>
          </span>
        </div>
      )
    case 'chat':
    default:
      return (
        <div className="text-xs py-0.5">
          <span className="font-semibold text-primary">{msg.senderName}</span>
          <span className="text-foreground">: {msg.content}</span>
        </div>
      )
  }
}
