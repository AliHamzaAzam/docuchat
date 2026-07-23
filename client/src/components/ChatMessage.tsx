import { SourceChips, type SourceRef } from './SourceChips'

export type ChatMessageData = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceRef[]
  grounded?: boolean
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const ungrounded = message.role === 'assistant' && message.grounded === false

  return (
    <div className={`message ${message.role}${ungrounded ? ' ungrounded' : ''}`}>
      <div>{message.content}</div>
      <SourceChips sources={message.sources} />
    </div>
  )
}
