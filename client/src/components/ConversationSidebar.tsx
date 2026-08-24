import { IconMessage, IconPlus } from './Icon'

export type ConversationSummary = { id: string; title: string; updatedAt: string }

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="conversation-list">
      <button className="new-chat-button" onClick={onNew}>
        <IconPlus />
        New chat
      </button>

      {loading ? (
        <div className="conversation-skeleton" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <span className="skeleton skeleton-line" key={i} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="empty-state empty-state-compact">
          <IconMessage />
          <p>No conversations yet. Ask something to start one.</p>
        </div>
      ) : (
        <ul className="conversation-items">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                className={`conversation-item${c.id === activeId ? ' active' : ''}`}
                onClick={() => onSelect(c.id)}
                aria-current={c.id === activeId}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
