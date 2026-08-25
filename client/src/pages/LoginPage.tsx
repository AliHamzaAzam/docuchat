import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ChatMessage } from '../components/ChatMessage'
import {
  IconCheck,
  IconChevron,
  IconClock,
  IconDatabase,
  IconFile,
  IconLock,
  IconMessage,
  IconUpload,
} from '../components/Icon'

const receiptMessages = [
  {
    id: 'receipt-question',
    role: 'user' as const,
    content: 'What does the retention policy say about deleted documents?',
    sources: [],
  },
  {
    id: 'receipt-answer',
    role: 'assistant' as const,
    content:
      'Deleted documents are removed from the workspace after the retention period expires. The policy also requires an active legal hold to be preserved.',
    sources: [
      {
        documentId: 'retention-policy',
        filename: 'retention-policy.pdf',
        chunkId: 'retention-policy-1',
        snippet: 'Documents are removed after the retention period expires.',
      },
      {
        documentId: 'security-handbook',
        filename: 'security-handbook.pdf',
        chunkId: 'security-handbook-1',
        snippet: 'Active legal holds override the standard deletion schedule.',
      },
    ],
  },
  {
    id: 'receipt-refusal',
    role: 'assistant' as const,
    content: 'I do not know. The uploaded sources do not mention how long legal holds last.',
    sources: [],
  },
]

export function LoginPage() {
  const { login, register, loginDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="brand-mark" href="/" aria-label="DocuChat home">
          <span className="brand-tab" aria-hidden="true" />
          <span>DocuChat</span>
        </a>
        <div className="landing-header-meta">
          <span>Source-grounded document workbench</span>
          <a href="https://github.com/AliHamzaAzam/docuchat" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </header>

      <main>
        <section className="auth-screen landing-hero" aria-labelledby="landing-title">
          <div className="auth-intro">
            <div className="auth-intro-top">
              <span className="brand-tab" aria-hidden="true" />
              <span className="auth-intro-kicker">A clearer way to read</span>
            </div>
            <h1 id="landing-title">Ask the file.<br /><em>Trust the answer.</em></h1>
            <p>DocuChat turns your PDFs, DOCX files, and notes into a conversation with receipts.</p>
            <div className="auth-proof">
              <span className="auth-proof-line" aria-hidden="true" />
              <span>Every answer is tied back to a passage.</span>
            </div>
            <a className="hero-text-link" href="#how-it-works">
              See how the evidence trail works
              <IconChevron aria-hidden="true" />
            </a>
          </div>

          <div className="auth-card">
            <div className="brand-mark">
              <span className="brand-tab" aria-hidden="true" />
              DocuChat
            </div>
            <p className="auth-tagline">Bring a document to the table. We’ll keep the conversation grounded in what it says.</p>

            <button className="demo-button" disabled={busy} onClick={() => run(loginDemo)}>
              Try the live demo
            </button>
            <p className="auth-demo-note">Upload your own files and ask real questions. No account needed.</p>

            <div className="divider">
              <span>or sign in</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                run(() => (mode === 'login' ? login(email, password) : register(email, password)))
              }}
            >
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
              {error && (
                <p className="field-error" role="alert">
                  <IconLock />
                  {error}
                </p>
              )}
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <button
              className="link-button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </div>
        </section>

        <section className="landing-section process-section" id="how-it-works" aria-labelledby="process-title">
          <div className="section-heading-row">
            <div>
              <span className="section-label">How it works</span>
              <h2 id="process-title">A short path from file to proof.</h2>
            </div>
            <p>Retrieval does the reading. The answer keeps the receipts.</p>
          </div>
          <div className="process-grid">
            <article className="process-card">
              <div className="process-icon"><IconUpload /></div>
              <span className="process-number">01</span>
              <h3>Bring the source</h3>
              <p>Upload a PDF, DOCX, or TXT file into your private session.</p>
            </article>
            <article className="process-card">
              <div className="process-icon"><IconDatabase /></div>
              <span className="process-number">02</span>
              <h3>Make it searchable</h3>
              <p>Chunks are embedded and indexed in MongoDB Atlas Vector Search.</p>
            </article>
            <article className="process-card">
              <div className="process-icon"><IconMessage /></div>
              <span className="process-number">03</span>
              <h3>Ask plainly</h3>
              <p>Ask a question in normal language, with no query syntax to learn.</p>
            </article>
            <article className="process-card process-card-refusal">
              <div className="process-icon"><IconCheck /></div>
              <span className="process-number">04</span>
              <h3>Read the evidence</h3>
              <p>Get exact source passages, or a clear “I do not know” when the file is silent.</p>
            </article>
          </div>
        </section>

        <section className="landing-section receipts-section" id="receipts" aria-labelledby="receipts-title">
          <div className="receipts-copy">
            <span className="section-label">Receipts, in context</span>
            <h2 id="receipts-title">The answer is only half the product.</h2>
            <p>Each grounded response stays close to the passages that support it. When retrieval comes up empty, DocuChat says so instead of filling the gap.</p>
            <div className="refusal-note">
              <span className="refusal-mark" aria-hidden="true" />
              <span>A refusal is a useful result when the source set has no answer.</span>
            </div>
          </div>
          <figure className="showcase-mock" aria-label="Static example of a grounded answer with citations followed by an honest refusal">
            <div className="showcase-mock-top">
              <span className="section-label">Conversation / sample</span>
              <span className="showcase-status"><span className="status-dot" aria-hidden="true" /> Grounded</span>
            </div>
            <div className="showcase-messages">
              {receiptMessages.map((message) => <ChatMessage key={message.id} message={message} />)}
            </div>
          </figure>
        </section>

        <section className="landing-section reassurance-section" aria-labelledby="sandbox-title">
          <div className="section-heading-row">
            <div>
              <span className="section-label">Demo sandbox</span>
              <h2 id="sandbox-title">A small, private room to try it.</h2>
            </div>
            <p>Guest access gets you to the useful part immediately.</p>
          </div>
          <div className="reassurance-grid">
            <div className="reassurance-item"><IconFile /><span><strong>Private to your session</strong> Your uploads are not shared with other demo visitors.</span></div>
            <div className="reassurance-item"><IconUpload /><span><strong>3 documents, 2 MB each</strong> Enough room for a focused question.</span></div>
            <div className="reassurance-item"><IconClock /><span><strong>Auto-delete after 2 hours</strong> Demo files and conversations expire automatically.</span></div>
            <div className="reassurance-item"><IconCheck /><span><strong>No account required</strong> Start with the live demo, then create an account if you want to keep going.</span></div>
          </div>
        </section>

        <section className="stack-line" aria-label="Technology stack">
          <span className="section-label">Built with</span>
          <p>React + Vite <span aria-hidden="true">/</span> Express <span aria-hidden="true">/</span> MongoDB Atlas Vector Search <span aria-hidden="true">/</span> LangChain <span aria-hidden="true">/</span> Cloudflare Workers AI (Llama 3.3 70B + bge embeddings)</p>
        </section>
      </main>

      <footer className="landing-footer">
        <div><strong>DocuChat</strong> by Ali Hamza Azam</div>
        <div className="footer-links">
          <a href="https://github.com/AliHamzaAzam/docuchat" target="_blank" rel="noreferrer">View the GitHub repo</a>
          <span>Demo uploads are private to your session and auto-delete after 2 hours.</span>
          <span>Built as a portfolio RAG showcase.</span>
        </div>
      </footer>
    </div>
  )
}
