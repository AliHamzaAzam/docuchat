import { api, ApiError } from '../api/client'
import { useToast } from './Toast'
import { IconMessage, IconPlus, IconTrash } from './Icon'

export type ConversationSummary = { id: string; title: string; updatedAt: string }

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onDeleted,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  /** Called after a conversation is deleted on the server, so the owner can
   * drop it from its own list and clear the active thread if it was open. */
  onDeleted: (id: string) => void
}) {
  const { notify } = useToast()

  async function remove(e: React.MouseEvent, convo: ConversationSummary) {
    e.stopPropagation()
    if (!confirm(`Delete "${convo.title}"? This can't be undone.`)) return
    try {
      await api.del(`/api/conversations/${convo.id}`)
      onDeleted(convo.id)
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 429)) {
        notify(err instanceof Error ? err.message : 'Could not delete that conversation.')
      }
    }
  }

  return (
    <div className="conversation-list">
      <div className="sidebar-heading">
        <span className="section-label">Your workspace</span>
        <span className="sidebar-count">{conversations.length ? `${conversations.length} saved` : 'New'}</span>
      </div>
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
            <li key={c.id} className="conversation-item-row">
              <button
                className={`conversation-item${c.id === activeId ? ' active' : ''}`}
                onClick={() => onSelect(c.id)}
                aria-current={c.id === activeId}
              >
                {c.title}
              </button>
              <button
                className="icon-button conversation-item-delete"
                onClick={(e) => remove(e, c)}
                aria-label={`Delete ${c.title}`}
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
