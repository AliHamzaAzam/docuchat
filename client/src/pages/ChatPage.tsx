import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage'
import { ConversationSidebar, type ConversationSummary } from '../components/ConversationSidebar'
import { DocumentsPanel } from '../components/DocumentsPanel'
import { IconFile, IconMenu, IconMessage, IconSend } from '../components/Icon'

export function ChatPage() {
  const { isDemo } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'documents'>('chats')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    api
      .get('/api/conversations')
      .then(setConversations)
      .catch(() => setError('Could not load your conversations. Refresh to try again.'))
      .finally(() => setConversationsLoading(false))
  }, [])

  async function loadConversations() {
    setConversations(await api.get('/api/conversations'))
  }

  async function openConversation(id: string) {
    setActiveId(id)
    setError(null)
    setMobileNavOpen(false)
    try {
      const convo = await api.get(`/api/conversations/${id}`)
      setMessages(convo.messages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that conversation.')
    }
  }

  function newChat() {
    setActiveId(null)
    setMessages([])
    setError(null)
    setMobileNavOpen(false)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return

    const optimisticId = `local-${Date.now()}`
    setQuestion('')
    setError(null)
    setBusy(true)
    setMessages((prev) => [...prev, { id: optimisticId, role: 'user', content: q, sources: [] }])

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
      // Roll back the optimistic message and restore the draft, so a failed
      // send (rate limited or otherwise) never leaves an orphan question
      // sitting in the thread with no reply and no way to retry it as-is.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setQuestion(q)
      if (!(e instanceof ApiError && e.status === 429)) {
        setError(e instanceof Error ? e.message : 'Could not get an answer. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const showTabs = isDemo

  return (
    <div className="chat-shell">
      <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
        <IconMenu />
      </button>

      {mobileNavOpen && <div className="nav-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`sidebar${mobileNavOpen ? ' open' : ''}`}>
        {showTabs && (
          <div className="sidebar-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={sidebarTab === 'chats'}
              className={sidebarTab === 'chats' ? 'active' : ''}
              onClick={() => setSidebarTab('chats')}
            >
              <IconMessage />
              Chats
            </button>
            <button
              role="tab"
              aria-selected={sidebarTab === 'documents'}
              className={sidebarTab === 'documents' ? 'active' : ''}
              onClick={() => setSidebarTab('documents')}
            >
              <IconFile />
              Documents
            </button>
          </div>
        )}

        {sidebarTab === 'chats' || !showTabs ? (
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            loading={conversationsLoading}
            onSelect={openConversation}
            onNew={newChat}
          />
        ) : (
          <DocumentsPanel />
        )}
      </aside>

      <section className="chat-main">
        <div className="messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <IconMessage className="chat-empty-icon" />
              <h2>Ask about your documents</h2>
              <p className="muted">
                Answers come only from what's uploaded, with the passages they're drawn from. Ask something the
                documents don't cover and the assistant will say so, instead of guessing.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {busy && (
            <div className="message message-assistant message-pending">
              <span className="typing-indicator" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">Searching the documents</span>
            </div>
          )}
        </div>

        {error && (
          <p className="field-error field-error-banner" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={send} className="composer">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents"
            disabled={busy}
            aria-label="Your question"
          />
          <button type="submit" disabled={busy || !question.trim()} aria-label="Send">
            <IconSend />
          </button>
        </form>
      </section>
    </div>
  )
}
