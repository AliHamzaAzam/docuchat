import { describe, it, expect } from 'vitest'
import { buildDocumentScope, buildOwnDemoDocumentScope, buildRetrievalScope, DEMO_MAX_DOCUMENTS, DEMO_MAX_FILE_BYTES, DEMO_SEED_SCOPE_KEY, isDemoSession, isOwnedDemoDocument } from '../src/documents/scope.js'

describe('document scoping', () => {
  it('keeps registered users on their own private documents', () => {
    expect(buildDocumentScope({ userId: 'user', role: 'user' })).toEqual({
      isSeed: { $ne: true },
      uploadedBy: 'user',
      scopeKey: 'user',
    })
    expect(buildRetrievalScope({ userId: 'user', role: 'user' })).toEqual(['user'])
  })

  it('includes seed documents and only the current demo session uploads', () => {
    expect(buildDocumentScope({ userId: 'user', role: 'user', demoSessionId: 'session-a' })).toEqual({
      $or: [
        { isSeed: true, scopeKey: DEMO_SEED_SCOPE_KEY },
        { isSeed: { $ne: true }, demoSessionId: 'session-a', scopeKey: 'session-a' },
      ],
    })
    expect(buildOwnDemoDocumentScope('session-a')).toEqual({ isSeed: { $ne: true }, demoSessionId: 'session-a', scopeKey: 'session-a' })
    expect(buildRetrievalScope({ userId: 'user', role: 'user', demoSessionId: 'session-a' })).toEqual([DEMO_SEED_SCOPE_KEY, 'session-a'])
  })

  it('gives administrators the seed corpus for curation', () => {
    expect(buildDocumentScope({ userId: 'admin', role: 'admin' })).toEqual({ isSeed: true, scopeKey: DEMO_SEED_SCOPE_KEY })
    expect(buildRetrievalScope({ userId: 'admin', role: 'admin' })).toEqual([DEMO_SEED_SCOPE_KEY])
  })

  it('does not classify an ordinary user token as a demo session', () => {
    expect(isDemoSession({ userId: 'user', role: 'user' })).toBe(false)
    expect(isDemoSession({ userId: 'admin', role: 'admin', demoSessionId: 'not-demo' })).toBe(false)
  })

  it('defines the requested demo caps', () => {
    expect(DEMO_MAX_DOCUMENTS).toBe(3)
    expect(DEMO_MAX_FILE_BYTES).toBe(2 * 1024 * 1024)
  })

  it('marks only the current demo session documents as owned', () => {
    const user = { userId: 'user', role: 'user' as const, demoSessionId: 'session-a' }
    expect(isOwnedDemoDocument({ scopeKey: 'session-a', isSeed: false }, user)).toBe(true)
    expect(isOwnedDemoDocument({ scopeKey: DEMO_SEED_SCOPE_KEY, isSeed: true }, user)).toBe(false)
    expect(isOwnedDemoDocument({ scopeKey: 'session-b' }, user)).toBe(false)
    expect(isOwnedDemoDocument({ scopeKey: 'session-a' }, { userId: 'user', role: 'user' })).toBe(false)
    expect(isOwnedDemoDocument({ scopeKey: 'user', uploadedBy: 'user' }, { userId: 'user', role: 'user' })).toBe(true)
  })
})
