// GET /api/documents returns shared and demo-scoped documents merged, with no
// field marking which is which (see DEMO_UPLOAD_NOTES.md). The client tracks
// its own uploads locally so it can list them separately from the shared
// corpus and gate the delete control to documents the visitor actually owns.
//
// Each demo login mints a fresh server-side session (a new demoSessionId
// claim in the JWT), so a document uploaded under a previous demo session is
// no longer visible to a new one anyway. This list is reset in lockstep, on
// every demo login and on logout.
const KEY = 'docuchat_own_docs'

export function getOwnDocumentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function addOwnDocumentId(id: string) {
  const ids = getOwnDocumentIds()
  ids.add(id)
  localStorage.setItem(KEY, JSON.stringify([...ids]))
}

export function removeOwnDocumentId(id: string) {
  const ids = getOwnDocumentIds()
  ids.delete(id)
  localStorage.setItem(KEY, JSON.stringify([...ids]))
}

export function clearOwnDocumentIds() {
  localStorage.removeItem(KEY)
}
