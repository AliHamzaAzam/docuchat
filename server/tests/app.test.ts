import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { signToken } from '../src/auth/jwt.js'
import { MAX_FILE_BYTES } from '../src/documents/parse.js'

// These cases touch no database. createApp() only wires middleware and
// routers; the two scenarios below are both rejected before any handler
// reaches Mongoose (requireAuth returns 401 on its own, and multer's
// fileSize limit rejects the upload before the route body runs).
describe('createApp', () => {
  it('rejects unauthenticated requests to a protected route with 401', async () => {
    const app = createApp()
    const res = await request(app).get('/api/documents')
    expect(res.status).toBe(401)
  })

  it('maps an oversized upload to 413 via the LIMIT_FILE_SIZE error handler', async () => {
    const app = createApp()
    const token = signToken({ userId: 'admin-id', role: 'admin' })
    const oversized = Buffer.alloc(MAX_FILE_BYTES + 1)

    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', oversized, 'big.txt')

    expect(res.status).toBe(413)
    expect(res.body.error).toMatch(/too large/i)
  })
})
