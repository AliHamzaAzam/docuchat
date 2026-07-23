import { Schema, model, InferSchemaType } from 'mongoose'

export type Timestamps = { createdAt: Date; updatedAt: Date }

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true })

export type UserDoc = InferSchemaType<typeof userSchema> & Timestamps
export const UserModel = model('User', userSchema)
