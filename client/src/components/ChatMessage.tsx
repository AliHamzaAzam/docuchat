import type { ReactNode } from 'react'
import { SourceChips, type SourceRef } from './SourceChips'

export type ChatMessageData = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceRef[]
  grounded?: boolean
}

const INLINE_MARKUP = /(\[Source\s+(\d+):\s*([^\]]+)\])|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/g

function renderInline(text: string, sources: SourceRef[]): ReactNode[] {
  const parts: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  INLINE_MARKUP.lastIndex = 0
  while ((match = INLINE_MARKUP.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))

    if (match[1]) {
      const sourceIndex = Number(match[2])
      const source = sources[sourceIndex - 1]
      parts.push(
        <span
          className="inline-citation"
          key={`citation-${match.index}`}
          title={source ? `Source ${sourceIndex}: ${source.filename}` : `Source ${sourceIndex}`}
          aria-label={source ? `Source ${sourceIndex}, ${source.filename}` : `Source ${sourceIndex}`}
        >
          {sourceIndex}
        </span>,
      )
    } else if (match[4]) {
      parts.push(<code className="inline-code" key={`code-${match.index}`}>{match[5]}</code>)
    } else if (match[6]) {
      parts.push(<strong key={`strong-${match.index}`}>{match[7]}</strong>)
    } else if (match[8]) {
      parts.push(<strong key={`strong-${match.index}`}>{match[9]}</strong>)
    } else if (match[10]) {
      parts.push(<em key={`italic-${match.index}`}>{match[11]}</em>)
    } else if (match[12]) {
      parts.push(<em key={`italic-${match.index}`}>{match[13]}</em>)
    }

    cursor = match.index + match[0].length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function renderAnswer(content: string, sources: SourceRef[]): ReactNode[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1
      continue
    }

    const unordered = lines[index].match(/^\s*[-*+]\s+(.+)$/)
    const ordered = lines[index].match(/^\s*\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      const items: string[] = []
      const pattern = unordered ? /^\s*[-*+]\s+(.+)$/ : /^\s*\d+[.)]\s+(.+)$/
      while (index < lines.length) {
        const item = lines[index].match(pattern)
        if (!item) break
        items.push(item[1])
        index += 1
      }
      const List = unordered ? 'ul' : 'ol'
      blocks.push(
        <List className="answer-list" key={`list-${blockKey}`}>
          {items.map((item, itemIndex) => <li key={`${blockKey}-${itemIndex}`}>{renderInline(item, sources)}</li>)}
        </List>,
      )
      blockKey += 1
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim()) {
      if (paragraph.length > 0 && lines[index].match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/)) break
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(<p key={`paragraph-${blockKey}`}>{renderInline(paragraph.join(' '), sources)}</p>)
    blockKey += 1
  }

  return blocks
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
      <div className="message-content">
        {message.role === 'assistant' ? renderAnswer(message.content, message.sources) : message.content}
      </div>
      <SourceChips sources={message.sources} />
    </div>
  )
}
