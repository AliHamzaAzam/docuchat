const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// Seed the token synchronously at module load, so the first request after a
// page refresh carries it. Relying only on a provider useEffect would attach
// the token too late: child components' mount effects fire before the
// provider's, so their first authenticated request would go out unauthenticated.
let authToken: string | null = localStorage.getItem('token')
export function setAuthToken(token: string | null) {
  authToken = token
}

/**
 * A failed API call. Carries the HTTP status and, when the server sent one,
 * its machine-readable `code` (e.g. "RATE_LIMITED") so callers can branch on
 * the failure kind instead of pattern-matching the message text.
 */
export class ApiError extends Error {
  status: number
  code: string | null

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// Set by the notification layer so every 429 across the app surfaces the same
// friendly, non-blocking notice regardless of which call site triggered it.
// A plain module-level hook (rather than importing React state here) keeps
// this file framework-agnostic; components still receive the thrown ApiError
// too, so a call site can layer its own handling on top when it needs to.
let rateLimitHandler: ((error: ApiError) => void) | null = null
export function setRateLimitHandler(handler: ((error: ApiError) => void) | null) {
  rateLimitHandler = handler
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const error = new ApiError(body.error ?? 'Request failed. Please try again.', res.status, body.code ?? null)
    if (res.status === 429) rateLimitHandler?.(error)
    throw error
  }
  return res.json()
}

function headers(extra: Record<string, string> = {}) {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra
}

export const api = {
  get: (path: string) => fetch(`${BASE}${path}`, { headers: headers() }).then(handle),

  post: (path: string, body: unknown) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }).then(handle),

  postForm: (path: string, form: FormData) =>
    fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: form }).then(handle),

  del: (path: string) =>
    fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handle),
}
