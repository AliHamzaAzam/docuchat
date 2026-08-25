import { describe, it, expect, vi } from 'vitest'
import { answerQuestion } from '../src/rag/answer.js'
import { NO_CONTEXT_RESPONSE } from '../src/rag/prompt.js'
import type { RetrievedChunk, LlmProvider } from '../src/rag/types.js'

const chunks: RetrievedChunk[] = [
  { chunkId: 'c1', documentId: 'd1', filename: 'handbook.pdf', content: 'Holiday allowance is 25 days.', score: 0.9 },
]

function stubLlm(reply: string): LlmProvider {
  return { generate: vi.fn().mockResolvedValue(reply) }
}

describe('answerQuestion', () => {
  it('returns the model answer with sources when context is found', async () => {
    const result = await answerQuestion('How many holidays?', {
      retrieveFn: async () => chunks,
      llm: stubLlm('You get 25 days, per handbook.pdf.'),
    })

    expect(result.answer).toBe('You get 25 days, per handbook.pdf.')
    expect(result.grounded).toBe(true)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].filename).toBe('handbook.pdf')
    expect(result.sources[0].chunkId).toBe('c1')
  })

  it('does NOT call the model when retrieval returns nothing', async () => {
    const llm = stubLlm('should never be used')

    const result = await answerQuestion('Unrelated question?', {
      retrieveFn: async () => [],
      llm,
    })

    expect(llm.generate).not.toHaveBeenCalled()
    expect(result.answer).toBe(NO_CONTEXT_RESPONSE)
    expect(result.grounded).toBe(false)
    expect(result.sources).toEqual([])
  })

  it('treats the canonical model refusal as ungrounded even when context was retrieved', async () => {
    const result = await answerQuestion('Unrelated question?', {
      retrieveFn: async () => chunks,
      llm: stubLlm(`${NO_CONTEXT_RESPONSE}\n`),
    })

    expect(result.answer).toBe(`${NO_CONTEXT_RESPONSE}\n`)
    expect(result.grounded).toBe(false)
    expect(result.sources).toEqual([])
  })

  it('truncates long chunk content into a short citation snippet', async () => {
    const long = 'x'.repeat(500)
    const result = await answerQuestion('q', {
      retrieveFn: async () => [{ ...chunks[0], content: long }],
      llm: stubLlm('answer'),
    })
    expect(result.sources[0].snippet.length).toBeLessThanOrEqual(203)
  })

  it('deduplicates sources so one document cited twice appears once per chunk', async () => {
    const result = await answerQuestion('q', {
      retrieveFn: async () => [chunks[0], chunks[0]],
      llm: stubLlm('answer'),
    })
    expect(result.sources).toHaveLength(1)
  })
})
