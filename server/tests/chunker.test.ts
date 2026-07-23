import { describe, it, expect } from 'vitest'
import { chunkText } from '../src/rag/chunker.js'

describe('chunkText', () => {
  it('returns a single chunk for short text', async () => {
    const chunks = await chunkText('Hello world.')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('Hello world.')
  })

  it('splits long text into multiple chunks', async () => {
    const text = 'sentence. '.repeat(400)
    const chunks = await chunkText(text, { chunkSize: 200, chunkOverlap: 50 })
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('overlaps adjacent chunks so boundary content is not lost', async () => {
    const text = Array.from({ length: 60 }, (_, i) => `token${i}`).join(' ')
    const chunks = await chunkText(text, { chunkSize: 100, chunkOverlap: 40 })
    expect(chunks.length).toBeGreaterThan(1)
    const firstTail = chunks[0].slice(-20)
    expect(chunks[1].includes(firstTail.trim().split(' ')[0])).toBe(true)
  })

  it('returns no chunks for empty or whitespace-only text', async () => {
    expect(await chunkText('')).toEqual([])
    expect(await chunkText('   \n  ')).toEqual([])
  })
})
