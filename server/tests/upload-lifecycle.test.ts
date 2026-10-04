import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { documentsRouter } from '../src/documents/routes.js'
import { ChunkModel } from '../src/models/Chunk.js'
import { DocumentModel } from '../src/models/Document.js'
import { DemoQuotaModel } from '../src/models/DemoQuota.js'
import { signToken } from '../src/auth/jwt.js'
import { DEMO_MAX_FILE_BYTES } from '../src/documents/scope.js'
vi.mock('../src/documents/ingest.js', () => ({ ingestDocument: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/config/rateLimit.js', () => ({ uploadRateLimiter: (_req: any, _res: any, next: any) => next() }))
const user = '507f1f77bcf86cd799439011'
const token = signToken({ userId: user, role: 'user', demoSessionId: 'session-a' })
const app = express()
app.use('/documents', documentsRouter)
app.use((err: any, _req: any, res: any, _next: any) => res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code }))
let ids: string[]
let initialized: boolean
beforeEach(() => {
  ids = []; initialized = false
  vi.spyOn(DocumentModel, 'countDocuments').mockResolvedValue(0)
  vi.spyOn(DocumentModel, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) } as any)
  vi.spyOn(DocumentModel, 'create').mockImplementation(async (value: any) => ({ _id: value._id ?? String(Math.random()), ...value }) as any)
  vi.spyOn(DemoQuotaModel, 'create').mockImplementation(async (value: any) => {
    if (initialized) throw Object.assign(new Error('duplicate'), { code: 11000 })
    initialized = true; ids = value.documentIds
    return value
  })
  vi.spyOn(DemoQuotaModel, 'findOneAndUpdate').mockImplementation((async (filter: any, update: any) => {
    expect(filter._id).toBe('session-a')
    expect(filter.$expr).toEqual({ $lt: [{ $size: '$documentIds' }, 3] })
    if (ids.length >= 3) return null
    ids.push(update.$addToSet.documentIds)
    return { _id: 'session-a', documentIds: [...ids] }
  }) as any)
  vi.spyOn(DemoQuotaModel, 'updateOne').mockImplementation((async (_filter: any, update: any) => {
    ids = ids.filter((id) => id !== update.$pull.documentIds)
    return { acknowledged: true, modifiedCount: 1 } as any
  }) as any)
})
afterEach(() => vi.restoreAllMocks())
function upload(buffer = Buffer.from('hello')) {
  return request(app).post('/documents').set('Authorization', `Bearer ${token}`).attach('file', buffer, 'document.txt')
}
describe('upload resource boundaries', () => {
  it('admits only three concurrent demo uploads with atomic database reservations', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => upload()))
    expect(responses.map((r) => r.status).sort()).toEqual([202, 202, 202, 409])
    expect(DocumentModel.create).toHaveBeenCalledTimes(3)
  })
  it('includes existing uploads when initializing a legacy session quota', async () => {
    vi.mocked(DocumentModel.find).mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'one' }, { _id: 'two' }, { _id: 'three' }] }) } as any)
    expect((await upload()).status).toBe(409)
    expect(DocumentModel.create).not.toHaveBeenCalled()
  })
  it('rejects a second multipart file before document creation', async () => {
    const response = await upload().attach('file', Buffer.from('second'), 'second.txt')
    expect(response.status).toBe(400)
    expect(DocumentModel.create).not.toHaveBeenCalled()
  })
  it('applies the demo memory limit inside multipart parsing', async () => {
    const response = await upload(Buffer.alloc(DEMO_MAX_FILE_BYTES + 1, 65))
    expect(response.status).toBe(413)
    expect(response.body.error).toBe('LIMIT_FILE_SIZE')
    expect(DocumentModel.create).not.toHaveBeenCalled()
  })
  it('rejects unexpected multipart fields', async () => {
    const response = await upload().field('unused', 'payload')
    expect(response.status).toBe(400)
    expect(DocumentModel.create).not.toHaveBeenCalled()
  })
  it('retains a reservation when a database write outcome is unknown', async () => {
    vi.mocked(DocumentModel.create).mockRejectedValueOnce(new Error('network timeout'))
    expect((await upload()).status).toBe(400)
    expect(DemoQuotaModel.updateOne).not.toHaveBeenCalled()
    expect(ids).toHaveLength(1)
  })
  it('deletes the parent before chunks so late ingestion can observe deletion', async () => {
    let deleted = false
    vi.spyOn(DocumentModel, 'findOne').mockResolvedValue({ _id: 'd', demoSessionId: 'session-a', deleteOne: async () => { deleted = true } } as any)
    vi.spyOn(ChunkModel, 'deleteMany').mockImplementation((async () => {
      expect(deleted).toBe(true)
      return { deletedCount: 1 }
    }) as any)
    const response = await request(app).delete('/documents/507f1f77bcf86cd799439022').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(DemoQuotaModel.updateOne).toHaveBeenCalledWith({ _id: 'session-a' }, { $pull: { documentIds: 'd' } })
  })
  it('releases the reservation if document creation fails', async () => {
    vi.mocked(DocumentModel.create).mockRejectedValueOnce(Object.assign(new Error('insert rejected'), { code: 11000 }))
    expect((await upload()).status).toBe(400)
    expect(DemoQuotaModel.updateOne).toHaveBeenCalled()
    expect(ids).toHaveLength(0)
  })
})
