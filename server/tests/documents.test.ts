import { describe, it, expect } from 'vitest'
import { buildDocumentScope, buildOwnDemoDocumentScope, DEMO_MAX_DOCUMENTS, DEMO_MAX_FILE_BYTES, isDemoSession, isOwnedDemoDocument } from '../src/documents/scope.js'

describe('demo document scoping', () => {
  it('keeps ordinary users on shared documents', () => {
    expect(buildDocumentScope({ userId: 'user', role: 'user' })).toEqual({
      $or: [{ scopeKey: 'shared' }, { scopeKey: { $exists: false } }],
    })
  })

  it('includes shared and only the current demo session', () => {
    expect(buildDocumentScope({ userId: 'user', role: 'user', demoSessionId: 'session-a' })).toEqual({
      $or: [
        { $or: [{ scopeKey: 'shared' }, { scopeKey: { $exists: false } }] },
        { scopeKey: 'session-a' },
      ],
    })
    expect(buildOwnDemoDocumentScope('session-a')).toEqual({ demoSessionId: 'session-a', scopeKey: 'session-a' })
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
    expect(isOwnedDemoDocument({ scopeKey: 'session-a' }, user)).toBe(true)
    expect(isOwnedDemoDocument({ scopeKey: 'shared' }, user)).toBe(false)
    expect(isOwnedDemoDocument({ scopeKey: 'session-b' }, user)).toBe(false)
    expect(isOwnedDemoDocument({ scopeKey: 'session-a' }, { userId: 'user', role: 'user' })).toBe(false)
  })
})
