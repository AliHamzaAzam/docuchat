import { connectDb, disconnectDb } from '../src/db/connect.js'
import { UserModel } from '../src/models/User.js'
import { DocumentModel } from '../src/models/Document.js'
import { ChunkModel } from '../src/models/Chunk.js'
import { ConversationModel } from '../src/models/Conversation.js'
import { MessageModel } from '../src/models/Message.js'
import { DEMO_SEED_SCOPE_KEY } from '../src/documents/scope.js'

async function migrateDocuments() {
  const admins = await UserModel.find({ role: 'admin' }).select({ _id: 1 }).lean()
  const adminIds = new Set(admins.map((admin) => String(admin._id)))
  const documents = await DocumentModel.find({}).select({ _id: 1, uploadedBy: 1, demoSessionId: 1 }).lean()
  let seedCount = 0
  let demoCount = 0
  let privateCount = 0

  for (const document of documents) {
    const uploadedBy = String(document.uploadedBy)
    const isDemoUpload = typeof document.demoSessionId === 'string' && document.demoSessionId.length > 0
    const isSeed = adminIds.has(uploadedBy)
    const update = isSeed
      ? { isSeed: true, demoSessionId: null, scopeKey: DEMO_SEED_SCOPE_KEY }
      : isDemoUpload
        ? { isSeed: false, scopeKey: document.demoSessionId }
        : { isSeed: false, demoSessionId: null, scopeKey: uploadedBy }

    await DocumentModel.updateOne({ _id: document._id }, { $set: update })
    await ChunkModel.updateMany({ documentId: document._id }, { $set: { ...update, isSeed } })

    if (isSeed) seedCount++
    else if (isDemoUpload) demoCount++
    else privateCount++
  }

  return { total: documents.length, seedCount, demoCount, privateCount }
}

async function purgeDemoConversations() {
  const demoUsers = await UserModel.find({ isDemo: true }).select({ _id: 1 }).lean()
  const demoUserIds = demoUsers.map((user) => user._id)
  const query = {
    $or: [
      { userId: { $in: demoUserIds } },
      { demoSessionId: { $exists: true, $nin: [null, ''] } },
    ],
  }
  const conversations = await ConversationModel.find(query).select({ _id: 1 }).lean()
  const conversationIds = conversations.map((conversation) => conversation._id)

  if (conversationIds.length > 0) {
    await MessageModel.deleteMany({ conversationId: { $in: conversationIds } })
    await ConversationModel.deleteMany({ _id: { $in: conversationIds } })
  }

  return conversations.length
}

async function main() {
  await connectDb()
  const documents = await migrateDocuments()
  const purgedConversations = await purgeDemoConversations()
  console.log(`Privacy migration complete: ${documents.total} documents (${documents.seedCount} seed, ${documents.demoCount} demo, ${documents.privateCount} private); purged ${purgedConversations} demo conversations.`)
  await disconnectDb()
}

main().catch(async (err) => {
  console.error(err)
  await disconnectDb()
  process.exit(1)
})
