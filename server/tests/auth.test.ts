import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../src/auth/jwt.js'

describe('jwt', () => {
  it('round-trips a payload', () => {
    const token = signToken({ userId: 'abc123', role: 'admin' })
    const decoded = verifyToken(token)
    expect(decoded.userId).toBe('abc123')
    expect(decoded.role).toBe('admin')
  })

  it('preserves the demo session claim', () => {
    const token = signToken({ userId: 'demo', role: 'user', demoSessionId: 'session-123' })
    expect(verifyToken(token).demoSessionId).toBe('session-123')
  })

  it('rejects a tampered token', () => {
    const token = signToken({ userId: 'abc123', role: 'user' })
    expect(() => verifyToken(`${token}tampered`)).toThrow()
  })

  it('rejects a token that is not a token at all', () => {
    expect(() => verifyToken('not-a-jwt')).toThrow()
  })
})
