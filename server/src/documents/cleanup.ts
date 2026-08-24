import { ChunkModel } from '../models/Chunk.js'
import { DocumentModel } from '../models/Document.js'

export const DEMO_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000

export async function cleanupExpiredDemoUploads(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DEMO_UPLOAD_TTL_MS)
  const expired = await DocumentModel.find({
    demoSessionId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: cutoff },
  }).select({ _id: 1 }).lean()

  if (expired.length === 0) return 0

  const ids = expired.map((doc) => doc._id)
  await ChunkModel.deleteMany({ documentId: { $in: ids } })
  const result = await DocumentModel.deleteMany({ _id: { $in: ids } })
  return result.deletedCount ?? 0
}
