import { describe, it, expect } from 'vitest'
import { buildGroundedPrompt } from '../src/rag/prompt.js'
import type { RetrievedChunk } from '../src/rag/types.js'

const chunks: RetrievedChunk[] = [
  { chunkId: 'c1', documentId: 'd1', filename: 'handbook.pdf', content: 'Holiday allowance is 25 days.', score: 0.9 },
  { chunkId: 'c2', documentId: 'd1', filename: 'handbook.pdf', content: 'Probation lasts 3 months.', score: 0.8 },
]

describe('buildGroundedPrompt', () => {
  it('includes every retrieved chunk as context', () => {
    const prompt = buildGroundedPrompt('How many holidays?', chunks)
    expect(prompt).toContain('Holiday allowance is 25 days.')
    expect(prompt).toContain('Probation lasts 3 months.')
  })

  it('includes the question', () => {
    expect(buildGroundedPrompt('How many holidays?', chunks)).toContain('How many holidays?')
  })

  it('instructs the model to answer only from context', () => {
    const prompt = buildGroundedPrompt('q', chunks).toLowerCase()
    expect(prompt).toContain('only')
    expect(prompt).toContain('context')
  })

  it('instructs the model to say it does not know when the answer is absent', () => {
    expect(buildGroundedPrompt('q', chunks).toLowerCase()).toContain('do not know')
  })

  it('labels each chunk with its source so answers can be traced', () => {
    expect(buildGroundedPrompt('q', chunks)).toContain('handbook.pdf')
  })
})
