import { Schema, model } from 'mongoose'

export const ADMIN_CLAIM_ID = 'admin-claimed'

// Single-document collection whose only job is to make the first-admin claim
// atomic. The fixed string _id is unique by definition, so exactly one insert
// can ever succeed.
const bootstrapSchema = new Schema(
  { _id: { type: String, required: true } },
  { versionKey: false, timestamps: true },
)

export const BootstrapModel = model('Bootstrap', bootstrapSchema)
