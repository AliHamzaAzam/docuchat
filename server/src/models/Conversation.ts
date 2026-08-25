import { Schema, model, InferSchemaType } from 'mongoose'
import type { Timestamps } from './User.js'

const conversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  demoSessionId: { type: String, default: null, index: true },
  title: { type: String, required: true },
}, { timestamps: true })

export type ConversationDoc = InferSchemaType<typeof conversationSchema> & Timestamps
export const ConversationModel = model('Conversation', conversationSchema)
