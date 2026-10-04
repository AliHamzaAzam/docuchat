import { afterEach, expect, it, vi } from 'vitest'
import { cleanupExpiredDemoUploads, DEMO_UPLOAD_TTL_MS } from '../src/documents/cleanup.js'
import { DocumentModel } from '../src/models/Document.js'
import { ConversationModel } from '../src/models/Conversation.js'
import { DemoQuotaModel } from '../src/models/DemoQuota.js'
afterEach(() => vi.restoreAllMocks())
it('cleans only quota records older than the complete demo token lifetime', async () => {
  const now = new Date('2026-10-04T12:00:00Z')
  const cutoff = new Date(now.getTime() - DEMO_UPLOAD_TTL_MS)
  vi.spyOn(DocumentModel, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) } as any)
  vi.spyOn(ConversationModel, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) } as any)
  const remaining = [{ createdAt: new Date(cutoff.getTime() - 1) }, { createdAt: new Date(cutoff.getTime() + 1) }]
  const remove = vi.spyOn(DemoQuotaModel, 'deleteMany').mockImplementation((async (query: any) => {
    expect(query).toEqual({ createdAt: { $lt: cutoff } })
    for (let i = remaining.length - 1; i >= 0; i--) if (remaining[i].createdAt < query.createdAt.$lt) remaining.splice(i, 1)
    return { deletedCount: 1 }
  }) as any)
  await cleanupExpiredDemoUploads(now)
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remaining).toEqual([{ createdAt: new Date(cutoff.getTime() + 1) }])
})
it('removes expired parents before chunks so in-flight ingestion cannot leave readable descendants', async () => {
  let parentDeleted = false
  vi.spyOn(DocumentModel, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'expired' }] }) } as any)
  vi.spyOn(ConversationModel, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) } as any)
  vi.spyOn(DocumentModel, 'deleteMany').mockImplementation((async () => {
    parentDeleted = true
    return { deletedCount: 1 }
  }) as any)
  const { ChunkModel } = await import('../src/models/Chunk.js')
  vi.spyOn(ChunkModel, 'deleteMany').mockImplementation((async () => {
    expect(parentDeleted).toBe(true)
    return { deletedCount: 1 }
  }) as any)
  vi.spyOn(DemoQuotaModel, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
  await expect(cleanupExpiredDemoUploads()).resolves.toBe(1)
})
