import { createApp } from './app.js'
import { connectDb } from './db/connect.js'
import { env } from './config/env.js'
import { cleanupExpiredDemoUploads } from './documents/cleanup.js'
import { ensureVectorIndex } from './rag/vectorIndex.js'
import { ChunkModel } from './models/Chunk.js'

async function main() {
  await connectDb()
  await cleanupExpiredDemoUploads()
  // Runs in the background so a slow Atlas admin call never delays startup.
  void ensureVectorIndex(ChunkModel.collection as any).catch((err) =>
    console.error('[vector-index] check failed:', err instanceof Error ? err.message : String(err)),
  )
  const cleanupTimer = setInterval(() => {
    void cleanupExpiredDemoUploads().catch((err) => console.error('Demo upload cleanup failed:', err))
  }, 15 * 60 * 1000)
  cleanupTimer.unref()
  createApp().listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
