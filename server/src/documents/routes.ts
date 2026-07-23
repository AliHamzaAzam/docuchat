import { Router } from 'express'
import multer from 'multer'
import { DocumentModel } from '../models/Document.js'
import { ChunkModel } from '../models/Chunk.js'
import { requireAuth, requireAdmin } from '../auth/middleware.js'
import { ingestDocument } from './ingest.js'
import { SUPPORTED_MIME_TYPES, MAX_FILE_BYTES } from './parse.js'

export const documentsRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
})

documentsRouter.get('/', requireAuth, async (_req, res) => {
  const docs = await DocumentModel.find().sort({ createdAt: -1 }).lean()
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
  const doc = await DocumentModel.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ error: 'Document not found.' })
  res.json({ id: String(doc._id), status: doc.status, error: doc.error ?? null, chunkCount: doc.chunkCount })
})

documentsRouter.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'No file was uploaded.' })

  if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Only PDF, DOCX, and TXT files are supported.' })
  }

  const doc = await DocumentModel.create({
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    status: 'processing',
    uploadedBy: req.user!.userId,
  })

  // Processing runs after the response so the upload request returns immediately.
  // The client polls GET /:id/status until the document is ready.
  void ingestDocument(String(doc._id), file.buffer, file.mimetype)

  res.status(202).json({ id: String(doc._id), filename: doc.filename, status: doc.status })
})

documentsRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const doc = await DocumentModel.findById(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  await ChunkModel.deleteMany({ documentId: doc._id })
  await doc.deleteOne()

  res.json({ ok: true })
})
