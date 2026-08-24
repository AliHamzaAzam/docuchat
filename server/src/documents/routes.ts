import { Router } from 'express'
import multer from 'multer'
import { DocumentModel } from '../models/Document.js'
import { ChunkModel } from '../models/Chunk.js'
import { requireAuth } from '../auth/middleware.js'
import { ingestDocument } from './ingest.js'
import { SUPPORTED_MIME_TYPES, MAX_FILE_BYTES } from './parse.js'
import {
  buildDocumentScope,
  buildOwnDemoDocumentScope,
  DEMO_MAX_DOCUMENTS,
  DEMO_MAX_FILE_BYTES,
  isDemoSession,
  requireUploadAccess,
  SHARED_SCOPE_KEY,
} from './scope.js'
import { uploadRateLimiter } from '../config/rateLimit.js'

export const documentsRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
})

documentsRouter.get('/', requireAuth, async (req, res) => {
  const docs = await DocumentModel.find(buildDocumentScope(req.user) as any).sort({ createdAt: -1 }).lean()
  res.json(docs.map((d) => ({
    id: String(d._id),
    filename: d.filename,
    status: d.status,
    error: d.error ?? null,
    chunkCount: d.chunkCount,
    size: d.size,
    createdAt: d.createdAt,
  })))
})

documentsRouter.get('/:id/status', requireAuth, async (req, res) => {
  const doc = await DocumentModel.findOne({ _id: req.params.id, ...buildDocumentScope(req.user) } as any).lean()
  if (!doc) return res.status(404).json({ error: 'Document not found.' })
  res.json({ id: String(doc._id), status: doc.status, error: doc.error ?? null, chunkCount: doc.chunkCount })
})

documentsRouter.post('/', requireAuth, requireUploadAccess, uploadRateLimiter, upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'No file was uploaded.' })

  if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Only PDF, DOCX, and TXT files are supported.' })
  }

  const user = req.user!
  const demo = isDemoSession(user)
  if (demo && file.size > DEMO_MAX_FILE_BYTES) {
    return res.status(413).json({ error: 'Demo uploads are limited to 2 MB per file.' })
  }

  if (demo) {
    const activeCount = await DocumentModel.countDocuments({
      demoSessionId: user.demoSessionId,
      status: { $in: ['processing', 'ready'] },
    })
    if (activeCount >= DEMO_MAX_DOCUMENTS) {
      return res.status(409).json({ error: 'Demo sessions can have up to 3 active documents. Delete one before uploading another.' })
    }
  }

  const scopeKey = demo ? user.demoSessionId : SHARED_SCOPE_KEY

  const doc = await DocumentModel.create({
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    status: 'processing',
    uploadedBy: user.userId,
    demoSessionId: demo ? user.demoSessionId : null,
    scopeKey,
  })

  // Processing runs after the response so the upload request returns immediately.
  // The client polls GET /:id/status until the document is ready.
  void ingestDocument(String(doc._id), file.buffer, file.mimetype, {
    demoSessionId: demo ? user.demoSessionId : null,
    scopeKey,
  })

  res.status(202).json({ id: String(doc._id), filename: doc.filename, status: doc.status })
})

documentsRouter.delete('/:id', requireAuth, async (req, res) => {
  if (req.user!.role !== 'admin' && !isDemoSession(req.user)) {
    return res.status(403).json({ error: 'Only administrators or the demo upload owner can delete documents.' })
  }

  const query = req.user!.role === 'admin'
    ? { _id: req.params.id }
    : { _id: req.params.id, ...buildOwnDemoDocumentScope(req.user!.demoSessionId!) }
  const doc = await DocumentModel.findOne(query as any)
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  await ChunkModel.deleteMany({ documentId: doc._id })
  await doc.deleteOne()

  res.json({ ok: true })
})
