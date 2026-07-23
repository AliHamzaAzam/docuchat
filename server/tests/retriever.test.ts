import { describe, it, expect } from 'vitest'
import { buildVectorPipeline, mapAggregateRow } from '../src/rag/retriever.js'

describe('buildVectorPipeline', () => {
  it('targets the vector index with the query vector and limit', () => {
    const vector = [0.1, 0.2, 0.3]
    const pipeline = buildVectorPipeline(vector, 4)
    const stage = pipeline[0] as any

    expect(stage.$vectorSearch.index).toBe('chunk_vector_index')
    expect(stage.$vectorSearch.path).toBe('embedding')
    expect(stage.$vectorSearch.queryVector).toEqual(vector)
    expect(stage.$vectorSearch.limit).toBe(4)
    expect(stage.$vectorSearch.numCandidates).toBeGreaterThanOrEqual(4)
  })

  it('joins documents so the filename is available for citations', () => {
    const pipeline = buildVectorPipeline([0.1], 2)
    const lookup = pipeline.find((s: any) => s.$lookup) as any
    expect(lookup.$lookup.from).toBe('documents')
  })
})

describe('mapAggregateRow', () => {
  it('flattens an aggregate row into a RetrievedChunk', () => {
    const row = {
      _id: 'chunk1',
      documentId: 'doc1',
      content: 'Some content',
      score: 0.87,
      document: [{ filename: 'handbook.pdf' }],
    }
    expect(mapAggregateRow(row)).toEqual({
      chunkId: 'chunk1',
      documentId: 'doc1',
      filename: 'handbook.pdf',
      content: 'Some content',
      score: 0.87,
    })
  })

  it('falls back to a placeholder filename when the join finds nothing', () => {
    const row = { _id: 'c', documentId: 'd', content: 'x', score: 0.1, document: [] }
    expect(mapAggregateRow(row).filename).toBe('Unknown document')
  })
})
