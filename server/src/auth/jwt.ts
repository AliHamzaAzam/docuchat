import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type TokenPayload = { userId: string; role: 'admin' | 'user'; demoSessionId?: string }

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: payload.demoSessionId ? '2h' : '7d' })
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  if (typeof decoded === 'string'
    || typeof decoded.userId !== 'string' || !decoded.userId.trim()
    || !['admin', 'user'].includes(decoded.role)
    || typeof decoded.exp !== 'number'
    || (decoded.demoSessionId !== undefined && (
      decoded.role !== 'user' || typeof decoded.demoSessionId !== 'string' || !decoded.demoSessionId.trim()
      || typeof decoded.iat !== 'number' || decoded.iat > Date.now() / 1000
      || Date.now() / 1000 >= decoded.iat + 2 * 60 * 60
    ))) throw new Error('Invalid token payload')
  const payload: TokenPayload = { userId: String(decoded.userId), role: decoded.role as 'admin' | 'user' }
  if (typeof decoded.demoSessionId === 'string') payload.demoSessionId = decoded.demoSessionId
  return payload
}
