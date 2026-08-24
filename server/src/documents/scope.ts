import type { NextFunction, Request, Response } from 'express'
import type { TokenPayload } from '../auth/jwt.js'

export const SHARED_SCOPE_KEY = 'shared'
export const DEMO_MAX_DOCUMENTS = 3
export const DEMO_MAX_FILE_BYTES = 2 * 1024 * 1024

export type DemoSessionPayload = TokenPayload & { demoSessionId: string }

export function isDemoSession(user?: TokenPayload): user is DemoSessionPayload {
  return user?.role === 'user' && typeof user.demoSessionId === 'string' && user.demoSessionId.length > 0
}

export function requireUploadAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'admin' || isDemoSession(req.user)) return next()
  return res.status(403).json({ error: 'Only administrators and demo sessions can upload documents.' })
}

function sharedDocumentScope(): Record<string, unknown> {
  // The missing-field branch keeps pre-migration records visible until the
  // index maintenance script has backfilled scopeKey.
  return { $or: [{ scopeKey: SHARED_SCOPE_KEY }, { scopeKey: { $exists: false } }] }
}

export function buildDocumentScope(user?: TokenPayload): Record<string, unknown> {
  if (user?.role === 'admin') return {}
  const shared = sharedDocumentScope()
  if (isDemoSession(user)) {
    return { $or: [shared, { scopeKey: user.demoSessionId }] }
  }
  return shared
}

export function buildOwnDemoDocumentScope(sessionId: string): Record<string, unknown> {
  return { demoSessionId: sessionId, scopeKey: sessionId }
}
