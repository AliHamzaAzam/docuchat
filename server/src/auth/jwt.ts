import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type TokenPayload = { userId: string; role: 'admin' | 'user'; demoSessionId?: string }

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  if (typeof decoded === 'string') throw new Error('Invalid token payload')
  const payload: TokenPayload = { userId: String(decoded.userId), role: decoded.role as 'admin' | 'user' }
  if (typeof decoded.demoSessionId === 'string') payload.demoSessionId = decoded.demoSessionId
  return payload
}
