import { describe, it, expect } from 'vitest'
import { buildGroundedPrompt } from '../../src/rag/prompt.js'
import { getLlmProvider } from '../../src/rag/provider.js'
import type { RetrievedChunk } from '../../src/rag/types.js'

const chunks: RetrievedChunk[] = [
  {
    chunkId: 'c1',
    documentId: 'd1',
    filename: 'handbook.pdf',
    content: 'Acme Corp employees receive 25 days of paid holiday per year.',
    score: 0.9,
  },
]

describe('live grounding behaviour', () => {
  it('answers a question the context supports', async () => {
    const prompt = buildGroundedPrompt('How many holiday days do employees get?', chunks)
    const reply = await getLlmProvider().generate(prompt)
    expect(reply).toMatch(/25/)
  }, 30_000)

  it('refuses a question the context does not support', async () => {
    const prompt = buildGroundedPrompt('What is the CEO home address?', chunks)
    const reply = await getLlmProvider().generate(prompt)
    expect(reply.toLowerCase()).toContain('do not know')
  }, 30_000)
})
