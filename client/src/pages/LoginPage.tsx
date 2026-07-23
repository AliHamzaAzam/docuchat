import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

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
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>DocuChat</h1>
      <p className="muted">Ask questions about your documents and get answers with sources.</p>

      <button className="demo-button" disabled={busy} onClick={() => run(loginDemo)}>
        Enter demo
      </button>

      <div className="divider">or</div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (mode === 'login' ? login(email, password) : register(email, password)))
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
