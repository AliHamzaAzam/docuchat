import { Schema, model, InferSchemaType } from 'mongoose'

const chunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
  position: { type: Number, required: true },
  demoSessionId: { type: String, default: null, index: true },
  scopeKey: { type: String, default: 'shared', index: true },
})

export type ChunkDoc = InferSchemaType<typeof chunkSchema>
export const ChunkModel = model('Chunk', chunkSchema)
