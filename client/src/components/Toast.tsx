import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { setRateLimitHandler, type ApiError } from '../api/client'
import { IconAlert, IconClose } from './Icon'

type Toast = { id: number; message: string }

type ToastValue = {
  notify: (message: string) => void
}

const ToastContext = createContext<ToastValue | null>(null)

const AUTO_DISMISS_MS = 7000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const lastMessage = useRef<{ text: string; at: number } | null>(null)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string) => {
      // Rate-limit errors on a busy screen (e.g. polling) can arrive in a
      // burst; collapse repeats of the same message within a short window
      // into a single toast instead of stacking duplicates.
      const now = Date.now()
      if (lastMessage.current && lastMessage.current.text === message && now - lastMessage.current.at < 4000) {
        return
      }
      lastMessage.current = { text: message, at: now }

      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  useEffect(() => {
    const handler = (error: ApiError) => {
      notify(error.message || "You've hit a demo rate limit. Please wait a few minutes and try again.")
    }
    setRateLimitHandler(handler)
    return () => setRateLimitHandler(null)
  }, [notify])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div className="toast" role="status" key={t.id}>
            <IconAlert className="toast-icon" />
            <p>{t.message}</p>
            <button className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <IconClose />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
