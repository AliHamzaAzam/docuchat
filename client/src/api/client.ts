const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// Seed the token synchronously at module load, so the first request after a
// page refresh carries it. Relying only on a provider useEffect would attach
// the token too late: child components' mount effects fire before the
// provider's, so their first authenticated request would go out unauthenticated.
let authToken: string | null = localStorage.getItem('token')
export function setAuthToken(token: string | null) {
  authToken = token
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Request failed. Please try again.')
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
