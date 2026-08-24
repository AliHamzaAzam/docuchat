import { SourceChips, type SourceRef } from './SourceChips'

export type ChatMessageData = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceRef[]
  grounded?: boolean
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  // Derive the ungrounded state from the sources, not the grounded flag. A
  // grounded answer always has retrieved chunks (non-empty sources); an
  // ungrounded "I do not know" answer always has none. History messages from
  // GET /api/conversations/:id do not carry the grounded flag, so relying on it
  // would silently drop the ungrounded styling after a reload.
  const ungrounded = message.role === 'assistant' && message.sources.length === 0

  return (
    <div className={`message message-${message.role}${ungrounded ? ' message-ungrounded' : ''}`}>
      {message.role === 'assistant' && (
        <span className="message-label">{ungrounded ? "Couldn't find this" : 'Answer'}</span>
      )}
      <div className="message-content">{message.content}</div>
      <SourceChips sources={message.sources} />
    </div>
  )
}
