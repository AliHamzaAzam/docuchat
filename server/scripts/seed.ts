import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { connectDb, disconnectDb } from '../src/db/connect.js'
import { UserModel } from '../src/models/User.js'
import { DocumentModel } from '../src/models/Document.js'
import { ChunkModel } from '../src/models/Chunk.js'
import { BootstrapModel, ADMIN_CLAIM_ID } from '../src/models/Bootstrap.js'
import { ingestDocument } from '../src/documents/ingest.js'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(here, '..', 'seed-docs')

async function main() {
  await connectDb()

  await ChunkModel.deleteMany({})
  await DocumentModel.deleteMany({})
  await UserModel.deleteMany({})
  await BootstrapModel.deleteMany({})

  // The admin password comes from the environment, never a committed default.
  // This repository is public and the deployed demo IS the live instance, so a
  // hardcoded admin password would let anyone reading the repo log in as admin
  // and deface the corpus. The "Enter demo" button uses the separate demo user
  // account (below) and needs no password.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) {
    console.error(
      'SEED_ADMIN_PASSWORD is not set. Set it before seeding so the admin account does not use a value from the repository.',
    )
    await disconnectDb()
    process.exit(1)
  }

  const admin = await UserModel.create({
    email: 'admin@docuchat.app',
    passwordHash: await bcrypt.hash(adminPassword, 10),
    role: 'admin',
  })

  // Seeding creates the admin directly, so consume the bootstrap claim too.
  // Otherwise the next public registration would also be promoted to admin.
  await BootstrapModel.create({ _id: ADMIN_CLAIM_ID })

  await UserModel.create({
    email: 'demo@docuchat.app',
    passwordHash: await bcrypt.hash(`demo-${Date.now()}-unused`, 10),
    role: 'user',
    isDemo: true,
  })

  for (const filename of readdirSync(SEED_DIR).filter((f) => f.endsWith('.txt'))) {
    const buffer = readFileSync(join(SEED_DIR, filename))
    const doc = await DocumentModel.create({
      filename,
      mimeType: 'text/plain',
      size: buffer.length,
      status: 'processing',
      uploadedBy: admin._id,
    })
    await ingestDocument(String(doc._id), buffer, 'text/plain')
    console.log(`Seeded ${filename}`)
  }

  console.log('Seed complete.')
  await disconnectDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
