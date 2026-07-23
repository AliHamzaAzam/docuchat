import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage'
import { ConversationSidebar, type ConversationSummary } from '../components/ConversationSidebar'

export function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadConversations() {
    setConversations(await api.get('/api/conversations'))
  }

  useEffect(() => {
    loadConversations().catch(() => setError('Could not load your conversations.'))
  }, [])

  async function openConversation(id: string) {
    setActiveId(id)
    setError(null)
    const convo = await api.get(`/api/conversations/${id}`)
    setMessages(convo.messages)
  }

  function newChat() {
    setActiveId(null)
    setMessages([])
    setError(null)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return

    setQuestion('')
    setError(null)
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: q, sources: [] },
    ])

    try {
      const res = await api.post('/api/conversations/chat', {
        question: q,
        conversationId: activeId,
      })
      setMessages((prev) => [...prev, { ...res.message, grounded: res.grounded }])
      if (!activeId) {
        setActiveId(res.conversationId)
        await loadConversations()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get an answer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chat">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={openConversation}
        onNew={newChat}
      />

      <section>
        <div className="messages">
          {messages.length === 0 && (
            <p className="muted">
              Ask a question about the uploaded documents. Answers come only from those documents.
            </p>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {busy && <div className="message muted">Searching the documents...</div>}
        </div>

        {error && <p className="error">{error}</p>}

        <form onSubmit={send} style={{ marginTop: 16 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !question.trim()}>
            {busy ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  )
}
