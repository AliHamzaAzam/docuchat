import { Schema, model, InferSchemaType } from 'mongoose'
import type { Timestamps } from './User.js'

const sourceSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
  filename: { type: String, required: true },
  chunkId: { type: Schema.Types.ObjectId, ref: 'Chunk', required: true },
  snippet: { type: String, required: true },
}, { _id: false })

const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: { type: [sourceSchema], default: [] },
}, { timestamps: true })

export type MessageDoc = InferSchemaType<typeof messageSchema> & Timestamps
export const MessageModel = model('Message', messageSchema)
