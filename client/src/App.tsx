import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import { AdminPage } from './pages/AdminPage'
import './styles.css'

function Shell() {
  const { token, user, logout } = useAuth()
  if (!token) return <LoginPage />

  return (
    <div className="app">
      <header className="topbar">
        <strong>DocuChat</strong>
        <nav>
          <Link to="/">Chat</Link>
          {user?.role === 'admin' && <Link to="/admin">Documents</Link>}
          <button className="link-button" onClick={logout}>Sign out</button>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}
