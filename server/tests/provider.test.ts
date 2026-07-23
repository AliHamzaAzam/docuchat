import { describe, it, expect, vi } from 'vitest'
import {
  withRetry,
  isRateLimitError,
  assertCompleteEmbeddings,
  IncompleteEmbeddingError,
  isRetryableError,
} from '../src/rag/provider.js'

describe('isRateLimitError', () => {
  it('recognises a 429 status', () => {
    expect(isRateLimitError({ status: 429 })).toBe(true)
  })

  it('recognises a quota message', () => {
    expect(isRateLimitError(new Error('Quota exceeded for this project'))).toBe(true)
  })

  it('does not treat an ordinary error as rate limiting', () => {
    expect(isRateLimitError(new Error('Invalid API key'))).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns the value when the call succeeds first time', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    expect(await withRetry(fn)).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a rate-limited call and eventually succeeds', async () => {
    vi.useFakeTimers()
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue('ok')

    const promise = withRetry(fn)
    await vi.runAllTimersAsync()

    expect(await promise).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('does not retry a non-rate-limit error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'))
    await expect(withRetry(fn)).rejects.toThrow('Invalid API key')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after the attempt limit', async () => {
    vi.useFakeTimers()
    const fn = vi.fn().mockRejectedValue({ status: 429 })

    const promise = withRetry(fn, 3)
    const assertion = expect(promise).rejects.toMatchObject({ status: 429 })
    await vi.runAllTimersAsync()
    await assertion

    expect(fn).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })
})

describe('assertCompleteEmbeddings', () => {
  const good = () => Array.from({ length: 768 }, () => 0.1)

  it('accepts vectors of the right count and dimension', () => {
    expect(() => assertCompleteEmbeddings([good(), good()], 2)).not.toThrow()
  })

  it('rejects an empty vector, which is what a swallowed rate limit produces', () => {
    expect(() => assertCompleteEmbeddings([[]], 1)).toThrow(IncompleteEmbeddingError)
  })

  it('rejects a wrong-dimension vector', () => {
    expect(() => assertCompleteEmbeddings([[0.1, 0.2, 0.3]], 1)).toThrow(IncompleteEmbeddingError)
  })

  it('rejects a short count', () => {
    expect(() => assertCompleteEmbeddings([good()], 2)).toThrow(IncompleteEmbeddingError)
  })
})

describe('isRetryableError', () => {
  it('retries rate limits', () => {
    expect(isRetryableError({ status: 429 })).toBe(true)
  })

  it('retries incomplete embeddings, since they are transient on the free tier', () => {
    expect(isRetryableError(new IncompleteEmbeddingError('empty'))).toBe(true)
  })

  it('does not retry an ordinary error', () => {
    expect(isRetryableError(new Error('bad api key'))).toBe(false)
  })
})
