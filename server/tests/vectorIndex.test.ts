import { describe, it, expect, vi } from 'vitest'
import {
  ensureVectorIndex,
  definitionMatches,
  VECTOR_INDEX_DEFINITION,
  VECTOR_INDEX_NAME,
  type SearchIndexCollection,
} from '../src/rag/vectorIndex.js'
import { buildVectorPipeline } from '../src/rag/retriever.js'

const silent = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }

function fakeCollection(indexes: any[]): SearchIndexCollection & { createSearchIndex: ReturnType<typeof vi.fn> } {
  return {
    listSearchIndexes: () => ({ toArray: async () => indexes }),
    createSearchIndex: vi.fn(async () => VECTOR_INDEX_NAME),
  }
}

describe('ensureVectorIndex', () => {
  // Regression: the production chunks collection lost chunk_vector_index.
  // $vectorSearch then returned zero rows without an error, so every demo
  // question answered "I do not know" with no sources.
  it('creates the vector index when the collection has none', async () => {
    const collection = fakeCollection([])

    await expect(ensureVectorIndex(collection, silent)).resolves.toBe('created')
    expect(collection.createSearchIndex).toHaveBeenCalledWith({
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: VECTOR_INDEX_DEFINITION,
    })
  })

  it('creates it when only unrelated search indexes exist', async () => {
    const collection = fakeCollection([{ name: 'some_other_index', latestDefinition: VECTOR_INDEX_DEFINITION }])
    await expect(ensureVectorIndex(collection, silent)).resolves.toBe('created')
    expect(collection.createSearchIndex).toHaveBeenCalledOnce()
  })

  it('leaves a matching index alone', async () => {
    const collection = fakeCollection([
      { name: VECTOR_INDEX_NAME, status: 'READY', queryable: true, latestDefinition: VECTOR_INDEX_DEFINITION },
    ])
    await expect(ensureVectorIndex(collection, silent)).resolves.toBe('ok')
    expect(collection.createSearchIndex).not.toHaveBeenCalled()
  })

  it('reports, but does not drop, an index without the scopeKey filter', async () => {
    const collection = fakeCollection([
      {
        name: VECTOR_INDEX_NAME,
        latestDefinition: { fields: [{ type: 'vector', path: 'embedding', numDimensions: 768, similarity: 'cosine' }] },
      },
    ])
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }

    await expect(ensureVectorIndex(collection, logger)).resolves.toBe('mismatch')
    expect(collection.createSearchIndex).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledOnce()
  })
})

describe('VECTOR_INDEX_DEFINITION', () => {
  it('indexes 768-dim cosine embeddings with scopeKey as a filter field', () => {
    expect(definitionMatches(VECTOR_INDEX_DEFINITION)).toBe(true)
  })

  it('rejects a definition with the wrong dimensions', () => {
    expect(definitionMatches({
      fields: [
        { type: 'vector', path: 'embedding', numDimensions: 1536, similarity: 'cosine' },
        { type: 'filter', path: 'scopeKey' },
      ],
    })).toBe(false)
  })

  it('is the index the retriever queries', () => {
    const stage = buildVectorPipeline([0.1], 1, ['demo-seed'])[0] as any
    expect(stage.$vectorSearch.index).toBe(VECTOR_INDEX_NAME)
    expect(stage.$vectorSearch.path).toBe(VECTOR_INDEX_DEFINITION.fields[0].path)
  })
})
