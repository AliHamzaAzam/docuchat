import { Schema, model, InferSchemaType } from 'mongoose'
import type { Timestamps } from './User.js'

export type DocumentStatus = 'processing' | 'ready' | 'error'

const documentSchema = new Schema({
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing', required: true },
  error: { type: String },
  chunkCount: { type: Number, default: 0 },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export type DocumentDoc = InferSchemaType<typeof documentSchema> & Timestamps
export const DocumentModel = model('Document', documentSchema)
