import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setAuthToken } from '../api/client'
import { clearOwnDocumentIds } from '../demo/ownDocuments'

type User = { email: string; role: 'admin' | 'user' }

type AuthValue = {
  token: string | null
  user: User | null
  isDemo: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginDemo: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })
  // The API never tells the client it is a demo session (the demoSessionId
  // claim lives only inside the JWT). Recorded at the moment /api/auth/demo
  // succeeds and persisted alongside the token, since that is the only point
  // the client can know for certain which flow it came through.
  const [isDemo, setIsDemo] = useState<boolean>(() => localStorage.getItem('isDemo') === '1')

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  function persist(res: { token: string; user: User }, demo: boolean) {
    setToken(res.token)
    setUser(res.user)
    setIsDemo(demo)
    setAuthToken(res.token)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    if (demo) {
      localStorage.setItem('isDemo', '1')
      // A fresh demo login mints a new server-side session; last session's
      // uploads are no longer visible to it, so its local "mine" list is
      // stale and must be cleared to match.
      clearOwnDocumentIds()
    } else {
      localStorage.removeItem('isDemo')
    }
  }

  const value: AuthValue = {
    token,
    user,
    isDemo,
    login: async (email, password) => persist(await api.post('/api/auth/login', { email, password }), false),
    register: async (email, password) => persist(await api.post('/api/auth/register', { email, password }), false),
    loginDemo: async () => persist(await api.post('/api/auth/demo', {}), true),
    logout: () => {
      setToken(null)
      setUser(null)
      setIsDemo(false)
      setAuthToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('isDemo')
      clearOwnDocumentIds()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
