import { ChunkModel } from '../models/Chunk.js'
import { DocumentModel } from '../models/Document.js'
import { ConversationModel } from '../models/Conversation.js'
import { MessageModel } from '../models/Message.js'

export const DEMO_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000

export async function cleanupExpiredDemoUploads(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DEMO_UPLOAD_TTL_MS)
  const expired = await DocumentModel.find({
    demoSessionId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: cutoff },
  }).select({ _id: 1 }).lean()

  const ids = expired.map((doc) => doc._id)
  if (ids.length > 0) {
    await ChunkModel.deleteMany({ documentId: { $in: ids } })
  }
  const documentResult = ids.length > 0
    ? await DocumentModel.deleteMany({ _id: { $in: ids } })
    : { deletedCount: 0 }

  const expiredConversations = await ConversationModel.find({
    demoSessionId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: cutoff },
  }).select({ _id: 1 }).lean()
  const conversationIds = expiredConversations.map((conversation) => conversation._id)
  if (conversationIds.length > 0) {
    await MessageModel.deleteMany({ conversationId: { $in: conversationIds } })
  }
  const conversationResult = conversationIds.length > 0
    ? await ConversationModel.deleteMany({ _id: { $in: conversationIds } })
    : { deletedCount: 0 }

  return (documentResult.deletedCount ?? 0) + (conversationResult.deletedCount ?? 0)
}
