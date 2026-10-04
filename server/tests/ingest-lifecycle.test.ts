import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ingestDocument } from '../src/documents/ingest.js'
import { DocumentModel } from '../src/models/Document.js'
import { ChunkModel } from '../src/models/Chunk.js'
import { DemoQuotaModel } from '../src/models/DemoQuota.js'
const mocks = vi.hoisted(() => ({ extract: vi.fn(), chunks: vi.fn(), embed: vi.fn() }))
vi.mock('../src/documents/parse.js', () => ({ extractText: mocks.extract }))
vi.mock('../src/rag/chunker.js', () => ({ chunkText: mocks.chunks }))
vi.mock('../src/rag/provider.js', () => ({ getEmbeddingProvider: () => ({ embed: mocks.embed }) }))
beforeEach(() => {
  mocks.extract.mockResolvedValue('text')
  mocks.chunks.mockResolvedValue(['text'])
  mocks.embed.mockResolvedValue([[1]])
  vi.spyOn(DocumentModel, 'findByIdAndUpdate').mockResolvedValue(null)
  vi.spyOn(DocumentModel, 'findOneAndUpdate').mockResolvedValue(null)
  vi.spyOn(ChunkModel, 'insertMany').mockResolvedValue([])
  vi.spyOn(ChunkModel, 'deleteMany').mockResolvedValue({ deletedCount: 1 } as any)
  vi.spyOn(DemoQuotaModel, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any)
})
afterEach(() => vi.restoreAllMocks())
describe('ingest lifecycle', () => {
  it('retains chunks and the quota reservation for a successfully completed document', async () => {
    vi.mocked(DocumentModel.findOneAndUpdate).mockResolvedValue({ _id: 'doc' } as any)
    await ingestDocument('doc', Buffer.from('text'), 'text/plain', { scopeKey: 's', demoSessionId: 's' })
    expect(ChunkModel.insertMany).toHaveBeenCalledTimes(1)
    expect(ChunkModel.deleteMany).not.toHaveBeenCalled()
    expect(DemoQuotaModel.updateOne).not.toHaveBeenCalled()
  })
  it('removes a late batch when the parent was deleted during ingestion', async () => {
    await ingestDocument('doc', Buffer.from('text'), 'text/plain', { scopeKey: 's', demoSessionId: 's' })
    expect(DocumentModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'doc', scopeKey: 's', status: 'processing' }, { status: 'ready', chunkCount: 1 })
    expect(ChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: 'doc' })
    expect(DemoQuotaModel.updateOne).toHaveBeenCalledWith({ _id: 's' }, { $pull: { documentIds: 'doc' } })
  })
  it('releases an active slot when parsing fails', async () => {
    mocks.extract.mockRejectedValue(new Error('bad PDF'))
    await ingestDocument('doc', Buffer.from('text'), 'application/pdf', { scopeKey: 's', demoSessionId: 's' })
    expect(DemoQuotaModel.updateOne).toHaveBeenCalledWith({ _id: 's' }, { $pull: { documentIds: 'doc' } })
  })
  it('releases an active slot when no readable text is found', async () => {
    mocks.chunks.mockResolvedValue([])
    await ingestDocument('doc', Buffer.from('text'), 'text/plain', { scopeKey: 's', demoSessionId: 's' })
    expect(DemoQuotaModel.updateOne).toHaveBeenCalled()
    expect(ChunkModel.insertMany).not.toHaveBeenCalled()
  })
  it('retains the reservation when status persistence fails', async () => {
    mocks.extract.mockRejectedValue(new Error('bad PDF'))
    vi.mocked(DocumentModel.findByIdAndUpdate).mockRejectedValue(new Error('DB unavailable'))
    await ingestDocument('doc', Buffer.from('text'), 'application/pdf', { scopeKey: 's', demoSessionId: 's' })
    expect(DemoQuotaModel.updateOne).not.toHaveBeenCalled()
  })
})
