import { describe, it, expect } from 'vitest'
import { buildConversationScope, isOwnedDemoConversation } from '../src/conversations/scope.js'

describe('demo conversation scoping', () => {
  const sessionA = { userId: 'demo-user', role: 'user' as const, demoSessionId: 'session-a' }
  const sessionB = { userId: 'demo-user', role: 'user' as const, demoSessionId: 'session-b' }

  it('lists only the current demo session conversations', () => {
    expect(buildConversationScope(sessionA)).toEqual({ demoSessionId: 'session-a' })
    expect(buildConversationScope(sessionA)).not.toEqual(buildConversationScope(sessionB))
  })

  it('makes a cross-session get miss the caller scope and returns legacy conversations to no session', () => {
    expect(isOwnedDemoConversation({ demoSessionId: 'session-b' }, sessionA)).toBe(false)
    expect(isOwnedDemoConversation({ demoSessionId: null }, sessionA)).toBe(false)
    expect(isOwnedDemoConversation({}, sessionA)).toBe(false)
  })

  it('keeps ordinary users on the existing user-owned conversation behavior', () => {
    expect(buildConversationScope({ userId: 'user', role: 'user' })).toEqual({})
    expect(isOwnedDemoConversation({ demoSessionId: 'session-a' }, { userId: 'user', role: 'user' })).toBe(false)
  })
})
