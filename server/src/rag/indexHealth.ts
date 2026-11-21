import { ChunkModel } from '../models/Chunk.js'
import { VECTOR_INDEX_NAME } from './retriever.js'
import { EMBEDDING_DIMENSIONS } from './types.js'
import { DEMO_SEED_SCOPE_KEY } from '../documents/scope.js'

/**
 * Logs the state of the Atlas vector index at startup. $vectorSearch returns
 * an empty result, not an error, when the index is missing, still building or
 * does not match the stored vectors, so without this a broken index only shows
 * up as every answer being "I do not know".
 */
export async function logVectorIndexHealth(): Promise<void> {
  try {
    const collection = ChunkModel.collection
    const indexes = (await collection.listSearchIndexes().toArray()) as any[]
    const summary = indexes.map((index) => ({
      name: index.name,
      type: index.type,
      status: index.status,
      queryable: index.queryable,
      fields: index.latestDefinition?.fields ?? index.latestDefinition?.mappings ?? null,
    }))
    console.log('[index-health] search indexes on chunks:', JSON.stringify(summary))

    const shapes = await collection
      .aggregate([
        { $group: { _id: { scopeKey: { $cond: [{ $eq: ['$scopeKey', DEMO_SEED_SCOPE_KEY] }, DEMO_SEED_SCOPE_KEY, 'other'] }, dims: { $size: { $ifNull: ['$embedding', []] } } }, count: { $sum: 1 } } },
      ])
      .toArray()
    console.log('[index-health] chunk count by scope and embedding size:', JSON.stringify(shapes.map((s) => ({ ...s._id, count: s.count }))))

    const sample = await collection.findOne({ scopeKey: DEMO_SEED_SCOPE_KEY }, { projection: { embedding: 1 } })
    if (!sample?.embedding) {
      console.warn('[index-health] no seed chunk found to probe with')
      return
    }

    const probe = async (filter?: Record<string, unknown>) => {
      try {
        const rows = await collection
          .aggregate([
            { $vectorSearch: { index: VECTOR_INDEX_NAME, path: 'embedding', queryVector: sample.embedding, numCandidates: 50, limit: 3, ...(filter ? { filter } : {}) } },
            { $project: { _id: 1 } },
          ])
          .toArray()
        return String(rows.length)
      } catch (err) {
        return `error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    console.log(
      `[index-health] probe with a stored ${sample.embedding.length}-dim seed vector (expected ${EMBEDDING_DIMENSIONS}):`,
      JSON.stringify({
        unfiltered: await probe(),
        seedScope: await probe({ scopeKey: DEMO_SEED_SCOPE_KEY }),
        seedScopeIn: await probe({ scopeKey: { $in: [DEMO_SEED_SCOPE_KEY, 'probe-session'] } }),
      }),
    )
  } catch (err) {
    console.error('[index-health] check failed:', err instanceof Error ? err.message : String(err))
  }
}
