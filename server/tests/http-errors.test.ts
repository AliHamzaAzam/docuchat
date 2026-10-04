import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { DocumentModel } from '../src/models/Document.js'
import { signToken } from '../src/auth/jwt.js'

afterEach(() => vi.restoreAllMocks())
describe('public request errors', () => {
  it('returns 400 for malformed JSON without logging request contents', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(createApp()).post('/api/auth/login').set('Content-Type', 'application/json').send('{"password":"FAKE_PRIVATE_VALUE",')
    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).not.toContain('FAKE_PRIVATE_VALUE')
    expect(log).not.toHaveBeenCalled()
  })
  it('returns 413 for JSON above its transport limit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(createApp()).post('/api/auth/login').send({ email: 'a'.repeat(110_000) })
    expect(res.status).toBe(413)
  })
  it('returns 400 for an unexpected multipart field', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const token = signToken({ userId: 'user-a', role: 'user' })
    const res = await request(createApp()).post('/api/documents').set('Authorization', `Bearer ${token}`).attach('wrong', Buffer.from('text'), 'test.txt')
    expect(res.status).toBe(400)
  })
  it('does not put internal diagnostics in logs or public errors', async () => {
    vi.spyOn(DocumentModel, 'find').mockImplementation(() => { throw new Error('FAKE_PRIVATE_VALUE') })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const token = signToken({ userId: 'user-a', role: 'user' })
    const res = await request(createApp()).get('/api/documents').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(500)
    expect(JSON.stringify(res.body)).not.toContain('FAKE_PRIVATE_VALUE')
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_PRIVATE_VALUE')
    expect(log.mock.calls.flat().map(String).join()).not.toContain('FAKE_PRIVATE_VALUE')
  })
})
