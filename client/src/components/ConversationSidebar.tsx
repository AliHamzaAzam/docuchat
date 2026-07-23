export type ConversationSummary = { id: string; title: string; updatedAt: string }

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <aside className="sidebar">
      <button onClick={onNew} style={{ marginBottom: 12 }}>New chat</button>
      {conversations.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No conversations yet.</p>}
      {conversations.map((c) => (
        <button
          key={c.id}
          className={c.id === activeId ? 'active' : ''}
          onClick={() => onSelect(c.id)}
        >
          {c.title}
        </button>
      ))}
    </aside>
  )
}
