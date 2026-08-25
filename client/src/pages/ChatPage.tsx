import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage'
import { ConversationSidebar, type ConversationSummary } from '../components/ConversationSidebar'
import { DocumentsPanel } from '../components/DocumentsPanel'
import { IconClose, IconFile, IconMenu, IconMessage, IconSend } from '../components/Icon'

export function ChatPage() {
  const { isDemo, user } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'documents'>('chats')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null)

  // Match the same Escape-to-close and focus-return behavior as the document
  // preview dialog, so every overlay in the app closes the same way for
  // keyboard users instead of only the backdrop click working here.
  useEffect(() => {
    if (!mobileNavOpen) return
    const toggleButton = mobileNavToggleRef.current
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      toggleButton?.focus()
    }
  }, [mobileNavOpen])

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

  async function handleConversationDeleted(id: string) {
    if (activeId === id) {
      setActiveId(null)
      setMessages([])
    }
    await loadConversations()
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

  const showTabs = isDemo || user?.role === 'user'
  const prompts = isDemo
    ? [
        'How many paid holiday days do full-time employees receive?',
        'What is the warranty period for a Northwind Robotics unit?',
        'How long does standard shipping take?',
      ]
    : ['What are the key facts in my documents?', 'Which requirements are stated in the documents?', 'What dates or deadlines are mentioned?']

  return (
    <div className="chat-shell">
      <button
        ref={mobileNavToggleRef}
        className="mobile-nav-toggle"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileNavOpen}
      >
        <IconMenu />
      </button>

      {mobileNavOpen && <div className="nav-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside
        className={`sidebar${mobileNavOpen ? ' open' : ''}`}
        {...(mobileNavOpen ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Workspace menu' } : {})}
      >
        <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
          <IconClose />
        </button>
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
            onDeleted={handleConversationDeleted}
          />
        ) : (
          <DocumentsPanel isDemo={isDemo} />
        )}
      </aside>

      <section className="chat-main">
        <div className="chat-main-head">
          <div>
            <span className="section-label">Evidence-first workspace</span>
            <h1>{activeId ? 'Continue the conversation' : 'Ask your documents'}</h1>
          </div>
          <span className="evidence-pill"><span className="evidence-dot" /> Sources stay visible</span>
        </div>
        <div className="messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-mark" aria-hidden="true">
                <IconMessage className="chat-empty-icon" />
              </div>
              <h2>Start with one clear question.</h2>
              <p className="muted">
                DocuChat searches the files in your workspace, then shows the passages behind its answer. If the
                answer is not there, it will say so.
              </p>
              <div className="prompt-grid" aria-label="Question ideas">
                {prompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
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
          <label className="composer-label" htmlFor="question-input">Ask your documents</label>
          <input
            id="question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Try a question about the files in this workspace"
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
