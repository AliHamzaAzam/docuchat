import { createApp } from './app.js'
import { connectDb } from './db/connect.js'
import { env } from './config/env.js'

async function main() {
  await connectDb()
  createApp().listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
