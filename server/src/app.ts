import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { authRouter } from './auth/routes.js'
import { documentsRouter } from './documents/routes.js'
import { conversationsRouter } from './conversations/routes.js'
import { isDemoSession } from './documents/scope.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', env.TRUSTED_PROXY_CIDRS)
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/conversations', conversationsRouter)

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: isDemoSession(req.user) ? 'That file is too large. The demo limit is 2 MB.' : 'That file is too large. The limit is 10 MB.' })
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'That request is too large.' })
    }
    if (err?.type === 'entity.parse.failed' || err?.type === 'request.aborted'
      || err?.name === 'MulterError' || err?.name === 'CastError' || err?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid request. Please check the submitted fields.' })
    }
    // Parser and database diagnostics may include submitted data or credentials.
    console.error('Request failed.')
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  })

  return app
}
