import { describe, it, expect, vi } from 'vitest'
import { withRetry, isRateLimitError } from '../src/rag/provider.js'

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
