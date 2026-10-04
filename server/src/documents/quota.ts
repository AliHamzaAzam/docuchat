import { DemoQuotaModel } from '../models/DemoQuota.js'
import { DocumentModel } from '../models/Document.js'
import { DEMO_MAX_DOCUMENTS } from './scope.js'

export async function reserveDemoDocument(sessionId: string, documentId: string): Promise<boolean> {
  // Include pre-existing active uploads when this session first uses quotas.
  // A unique _id insert selects a single snapshot; duplicate initializers cannot
  // overwrite reservations that another request has already acquired.
  const existing = await DocumentModel.find({
    demoSessionId: sessionId, scopeKey: sessionId, isSeed: { $ne: true },
    status: { $in: ['processing', 'ready'] },
  }).select({ _id: 1 }).lean()
  try {
    await DemoQuotaModel.create({ _id: sessionId, documentIds: existing.map((doc) => String(doc._id)) })
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err
  }
  const reserved = await DemoQuotaModel.findOneAndUpdate({
    _id: sessionId,
    $expr: { $lt: [{ $size: '$documentIds' }, DEMO_MAX_DOCUMENTS] },
  }, { $addToSet: { documentIds: documentId } }, { new: true })
  return Boolean(reserved)
}

export async function releaseDemoDocument(sessionId: string | null | undefined, documentId: string): Promise<void> {
  if (!sessionId) return
  await DemoQuotaModel.updateOne({ _id: sessionId }, { $pull: { documentIds: documentId } })
}
