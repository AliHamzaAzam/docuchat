import { DEMO_UPLOAD_TTL_MS } from '../documents/cleanup.js'
import { ChunkModel } from '../models/Chunk.js'
import { getEmbeddingProvider } from './provider.js'
import type { EmbeddingProvider, RetrievedChunk } from './types.js'

export const VECTOR_INDEX_NAME = 'chunk_vector_index'

const DEFAULT_K = 5
const CANDIDATE_MULTIPLIER = 20

export function buildVectorPipeline(queryVector: number[], k: number, scopeKeys: string[] = []): Record<string, unknown>[] {
  const scopeFilter = scopeKeys.length === 1
    ? { scopeKey: scopeKeys[0] }
    : { scopeKey: { $in: scopeKeys } }

  return [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(k * CANDIDATE_MULTIPLIER, 50),
        limit: k,
        filter: scopeFilter,
      },
    },
    {
      $lookup: {
        from: 'documents',
        localField: 'documentId',
        foreignField: '_id',
        as: 'document',
      },
    },
    {
      // A stale vector index or interrupted ingest must not make an orphaned,
      // failed, deleted, or differently owned parent document retrievable.
      $match: {
        scopeKey: scopeFilter.scopeKey,
        document: {
          $elemMatch: {
            scopeKey: { $in: scopeKeys },
            status: 'ready',
            $or: [
              { demoSessionId: null },
              { createdAt: { $gt: new Date(Date.now() - DEMO_UPLOAD_TTL_MS) } },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        content: 1,
        score: { $meta: 'vectorSearchScore' },
        'document.filename': 1,
      },
    },
  ]
}

export function mapAggregateRow(row: any): RetrievedChunk {
  return {
    chunkId: String(row._id),
    documentId: String(row.documentId),
    filename: row.document?.[0]?.filename ?? 'Unknown document',
    content: row.content,
    score: row.score,
  }
}

export async function retrieve(
  question: string,
  opts: { k?: number; embeddings?: EmbeddingProvider; scopeKeys?: string[] } = {},
): Promise<RetrievedChunk[]> {
  if (!opts.scopeKeys?.length) return []
  const k = opts.k ?? DEFAULT_K
  const embeddings = opts.embeddings ?? getEmbeddingProvider()
  const queryVector = await embeddings.embedOne(question)

  const rows = await ChunkModel.aggregate(buildVectorPipeline(queryVector, k, opts.scopeKeys) as any[])
  return rows.map(mapAggregateRow)
}
