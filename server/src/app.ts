import express from 'express'
import cors from 'cors'
import { authRouter } from './auth/routes.js'
import { documentsRouter } from './documents/routes.js'
import { conversationsRouter } from './conversations/routes.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRouter)
  app.use('/api/documents', documentsRouter)
  app.use('/api/conversations', conversationsRouter)

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That file is too large. The limit is 10 MB.' })
    }
    console.error(err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  })

  return app
}
