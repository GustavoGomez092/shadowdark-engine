import type { ChatMessage } from '@/schemas/session.ts'
import { useLocale } from '@/hooks/use-locale.ts'

function renderMarkdown(text: string) {
  const parts: (string | React.ReactElement)[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[2]) parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>)
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

export function ChatMessageRow({ msg }: { msg: ChatMessage }) {
  const { t } = useLocale()
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
    case 'ai_response':
      return (
        <div className="my-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-purple-400">
            <span>✨</span>
            <span>{t('chat.aiNarrator')}</span>
          </div>
          <div className="text-xs text-foreground/90 italic whitespace-pre-wrap leading-relaxed">{renderMarkdown(msg.content)}</div>
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
