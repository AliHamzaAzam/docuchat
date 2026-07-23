import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../src/db/connect.js'

const COLLECTION = 'vector_spike'
const INDEX = 'spike_vector_index'
const DIMS = 768

function fakeVector(seed: number): number[] {
  return Array.from({ length: DIMS }, (_, i) => Math.sin(seed + i) / 2)
}

async function main() {
  await connectDb()
  const db = mongoose.connection.db
  if (!db) throw new Error('No database handle')

  const col = db.collection(COLLECTION)
  await col.deleteMany({})
  await col.insertMany([
    { label: 'alpha', embedding: fakeVector(1) },
    { label: 'beta', embedding: fakeVector(50) },
    { label: 'gamma', embedding: fakeVector(100) },
  ])
  console.log('Inserted 3 spike documents.')

  try {
    await col.createSearchIndex({
      name: INDEX,
      type: 'vectorSearch',
      definition: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: DIMS, similarity: 'cosine' },
        ],
      },
    })
    console.log('Vector search index creation accepted.')
  } catch (err) {
    console.error('FAILED to create vector index. Atlas tier may not support it.')
    console.error(err)
    await disconnectDb()
    process.exit(1)
  }

  console.log('Waiting 30s for the index to build...')
  await new Promise((r) => setTimeout(r, 30_000))

  const results = await col
    .aggregate([
      {
        $vectorSearch: {
          index: INDEX,
          path: 'embedding',
          queryVector: fakeVector(1),
          numCandidates: 10,
          limit: 2,
        },
      },
      { $project: { label: 1, score: { $meta: 'vectorSearchScore' } } },
    ])
    .toArray()

  console.log('Query results:', results)

  if (results.length === 0) {
    console.error('FAILED: index built but returned no results.')
    await disconnectDb()
    process.exit(1)
  }

  console.log('SUCCESS: Atlas vector search works on this cluster.')
  await col.drop()
  await disconnectDb()
}

main()
