import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ToastProvider } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import { AdminPage } from './pages/AdminPage'
import './styles.css'

function Shell() {
  const { token, user, isDemo, logout } = useAuth()
  if (!token) return <LoginPage />

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand-mark">
          <span className="brand-tab" aria-hidden="true" />
          DocuChat
        </Link>
        <nav>
          {isDemo && <span className="demo-badge">Demo session</span>}
          <Link to="/">Chat</Link>
          {user?.role === 'admin' && <Link to="/admin">Documents</Link>}
          <button className="link-button" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="app-body">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
