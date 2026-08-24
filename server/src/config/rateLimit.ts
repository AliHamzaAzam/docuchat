import rateLimit from 'express-rate-limit'

export const RATE_LIMITS = {
  chat: { windowMs: 10 * 60 * 1000, max: 15 },
  uploads: { windowMs: 60 * 60 * 1000, max: 5 },
  demoLogin: { windowMs: 10 * 60 * 1000, max: 10 },
  auth: { windowMs: 10 * 60 * 1000, max: 10 },
} as const

export function createRateLimiter(config: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      })
    },
  })
}

export const chatRateLimiter = createRateLimiter(RATE_LIMITS.chat)
export const uploadRateLimiter = createRateLimiter(RATE_LIMITS.uploads)
export const demoLoginRateLimiter = createRateLimiter(RATE_LIMITS.demoLogin)
export const authRateLimiter = createRateLimiter(RATE_LIMITS.auth)
