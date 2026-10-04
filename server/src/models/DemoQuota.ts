import { Schema, model } from 'mongoose'

// The built-in unique _id index serializes reservations across server processes.
const schema = new Schema({
  _id: { type: String, required: true },
  documentIds: { type: [String], required: true, default: [] },
  createdAt: { type: Date, required: true, default: Date.now },
})
export const DemoQuotaModel = model('DemoQuota', schema)
