import { describe, it, expect } from 'vitest'
import { buildVectorPipeline, mapAggregateRow } from '../src/rag/retriever.js'

describe('buildVectorPipeline', () => {
  it('puts $vectorSearch first, which MongoDB requires', () => {
    const pipeline = buildVectorPipeline([0.1], 4)
    expect(Object.keys(pipeline[0])).toEqual(['$vectorSearch'])
  })

  it('targets the vector index with the query vector and limit', () => {
    const vector = [0.1, 0.2, 0.3]
    const pipeline = buildVectorPipeline(vector, 4)
    const stage = pipeline[0] as any

    expect(stage.$vectorSearch.index).toBe('chunk_vector_index')
    expect(stage.$vectorSearch.path).toBe('embedding')
    expect(stage.$vectorSearch.queryVector).toEqual(vector)
    expect(stage.$vectorSearch.limit).toBe(4)
  })

  it('oversamples candidates by the multiplier so recall stays useful', () => {
    const stage = buildVectorPipeline([0.1], 4)[0] as any
    expect(stage.$vectorSearch.numCandidates).toBe(80)
  })

  it('applies the candidate floor when k is small', () => {
    const stage = buildVectorPipeline([0.1], 1)[0] as any
    expect(stage.$vectorSearch.numCandidates).toBe(50)
  })

  it('joins documents on the id so the filename is available for citations', () => {
    const pipeline = buildVectorPipeline([0.1], 2)
    const lookup = pipeline.find((s: any) => s.$lookup) as any
    expect(lookup.$lookup).toEqual({
      from: 'documents',
      localField: 'documentId',
      foreignField: '_id',
      as: 'document',
    })
  })

  it('projects what mapAggregateRow reads and excludes the embedding', () => {
    const pipeline = buildVectorPipeline([0.1], 2)
    const project = pipeline.find((s: any) => s.$project) as any
    expect(project.$project['document.filename']).toBe(1)
    expect(project.$project.embedding).toBeUndefined()
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
