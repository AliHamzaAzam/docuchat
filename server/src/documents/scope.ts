import type { NextFunction, Request, Response } from 'express'
import type { TokenPayload } from '../auth/jwt.js'

export const DEMO_SEED_SCOPE_KEY = 'demo-seed'
export const DEMO_MAX_DOCUMENTS = 3
export const DEMO_MAX_FILE_BYTES = 2 * 1024 * 1024

export type DemoSessionPayload = TokenPayload & { demoSessionId: string }

export function isDemoSession(user?: TokenPayload): user is DemoSessionPayload {
  return user?.role === 'user' && typeof user.demoSessionId === 'string' && user.demoSessionId.length > 0
}

export function requireUploadAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next()
  return res.status(401).json({ error: 'Authentication required.' })
}

export function buildRetrievalScope(user?: TokenPayload): string[] {
  if (!user) return []
  if (isDemoSession(user)) return [DEMO_SEED_SCOPE_KEY, user.demoSessionId]
  if (user.role === 'admin') return [DEMO_SEED_SCOPE_KEY]
  return [user.userId]
}

export function buildDocumentScope(user?: TokenPayload): Record<string, unknown> {
  if (!user) return { _id: null }
  if (isDemoSession(user)) {
    return {
      $or: [
        { isSeed: true, scopeKey: DEMO_SEED_SCOPE_KEY },
        { isSeed: { $ne: true }, demoSessionId: user.demoSessionId, scopeKey: user.demoSessionId },
      ],
    }
  }
  if (user.role === 'admin') return { isSeed: true, scopeKey: DEMO_SEED_SCOPE_KEY }
  return { isSeed: { $ne: true }, uploadedBy: user.userId, scopeKey: user.userId }
}

export function buildOwnDemoDocumentScope(sessionId: string): Record<string, unknown> {
  return { isSeed: { $ne: true }, demoSessionId: sessionId, scopeKey: sessionId }
}

export function isOwnedDemoDocument(
  document: { scopeKey?: string | null; uploadedBy?: unknown; isSeed?: boolean },
  user?: TokenPayload,
): boolean {
  if (document.isSeed) return false
  if (isDemoSession(user)) return document.scopeKey === user.demoSessionId
  return Boolean(user && user.role !== 'admin' && String(document.uploadedBy) === user.userId)
}
