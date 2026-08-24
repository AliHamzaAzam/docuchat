import { createApp } from './app.js'
import { connectDb } from './db/connect.js'
import { env } from './config/env.js'
import { cleanupExpiredDemoUploads } from './documents/cleanup.js'

async function main() {
  await connectDb()
  await cleanupExpiredDemoUploads()
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
