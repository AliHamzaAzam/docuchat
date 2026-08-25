import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../src/db/connect.js'

const COLLECTION = 'chunks'
const INDEX = 'chunk_vector_index'
const DIMS = 768
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 5 * 60_000

async function main() {
  await connectDb()
  const db = mongoose.connection.db
  if (!db) throw new Error('No database handle')

  const chunks = db.collection(COLLECTION)
  const indexes = await chunks.listSearchIndexes().toArray()
  if (indexes.some((index: any) => index.name === INDEX)) {
    await chunks.dropSearchIndex(INDEX)
    console.log(`Dropped existing ${INDEX}.`)
  }

  await chunks.createSearchIndex({
    name: INDEX,
    type: 'vectorSearch',
    definition: {
      fields: [
        { type: 'vector', path: 'embedding', numDimensions: DIMS, similarity: 'cosine' },
        { type: 'filter', path: 'scopeKey' },
      ],
    },
  })
  console.log(`Created ${INDEX}; waiting for Atlas to report queryable=true.`)

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const current = (await chunks.listSearchIndexes().toArray()).find((index: any) => index.name === INDEX) as any
    if (current?.queryable === true) {
      console.log(`SUCCESS: ${INDEX} is queryable.`)
      await disconnectDb()
      return
    }
    if (current?.status === 'FAILED') {
      throw new Error(`Atlas reported ${INDEX} status FAILED.`)
    }
    console.log(`Index status: ${current?.status ?? 'not yet listed'}.`)
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Timed out waiting for ${INDEX} to become queryable.`)
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : 'Vector index recreation failed.')
  await disconnectDb()
  process.exit(1)
})
