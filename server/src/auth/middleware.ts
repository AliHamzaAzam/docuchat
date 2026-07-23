import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type TokenPayload } from './jwt.js'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' })
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or has expired.' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' })
  }
  next()
}
