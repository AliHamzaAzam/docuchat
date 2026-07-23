import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setAuthToken } from '../api/client'

type User = { email: string; role: 'admin' | 'user' }

type AuthValue = {
  token: string | null
  user: User | null
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

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  function persist(res: { token: string; user: User }) {
    setToken(res.token)
    setUser(res.user)
    setAuthToken(res.token)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
  }

  const value: AuthValue = {
    token,
    user,
    login: async (email, password) => persist(await api.post('/api/auth/login', { email, password })),
    register: async (email, password) => persist(await api.post('/api/auth/register', { email, password })),
    loginDemo: async () => persist(await api.post('/api/auth/demo', {})),
    logout: () => {
      setToken(null)
      setUser(null)
      setAuthToken(null)
      localStorage.clear()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
