import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { IconLock } from '../components/Icon'

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
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">
          <span className="brand-tab" aria-hidden="true" />
          DocuChat
        </div>
        <p className="auth-tagline">
          Ask questions about your documents. Every answer cites its source, or says it doesn't know.
        </p>

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
            placeholder="Email"
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
            placeholder="Password"
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

        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
