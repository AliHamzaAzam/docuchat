import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractText } from '../src/documents/parse.js'

const state = vi.hoisted(() => ({ mode: 'ok', options: null as any, terminated: 0 }))
vi.mock('pdf-parse', () => ({ default: async () => {
  if (state.mode === 'hang') return new Promise(() => {})
  if (state.mode === 'error') throw new Error('FAKE_PRIVATE_PARSER_DETAIL')
  return { text: state.mode === 'large' ? 'a'.repeat(300_001) : 'Readable PDF', numpages: state.mode === 'pages' ? 101 : 1 }
} }))
vi.mock('node:worker_threads', () => ({ Worker: class extends EventEmitter {
  constructor(_source: string, options: any) {
    super()
    state.options = options
    queueMicrotask(() => {
      if (state.mode === 'hang') return
      if (state.mode === 'error') return this.emit('error', new Error('FAKE_PRIVATE_PARSER_DETAIL'))
      if (state.mode === 'exit') return this.emit('exit', 1)
      this.emit('message', { text: state.mode === 'large' ? 'a'.repeat(300_001) : 'Readable PDF', pages: state.mode === 'pages' ? 101 : 1 })
    })
  }
  terminate() { state.terminated++; return Promise.resolve(1) }
} }))

afterEach(() => { vi.useRealTimers(); state.mode = 'ok'; state.options = null; state.terminated = 0 })
describe('PDF parser resource boundary', () => {
  it('places PDF parsing in a memory-limited worker with no inherited credentials', async () => {
    await expect(extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')).resolves.toBe('Readable PDF')
    expect(state.options).toEqual(expect.objectContaining({ env: {}, resourceLimits: expect.objectContaining({ maxOldGenerationSizeMb: expect.any(Number) }) }))
    expect(state.terminated).toBe(1)
  })
  it.each(['large', 'pages'])('rejects excessive PDF output: %s', async (mode) => {
    state.mode = mode
    await expect(extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')).rejects.toThrow(/PDF.*limit|limit.*PDF/i)
  })
  it('terminates a stuck PDF parser on a fixed deadline', async () => {
    state.mode = 'hang'
    vi.useFakeTimers()
    const result = Promise.race([
      extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf').then(() => 'resolved', (e: Error) => e.message),
      new Promise<string>(resolve => setTimeout(() => resolve('hung'), 10_001)),
    ])
    await vi.advanceTimersByTimeAsync(10_002)
    expect(await result).toMatch(/PDF.*limit|PDF.*time/i)
    expect(state.terminated).toBe(1)
  })
  it('bounds concurrent PDF work and releases capacity after termination', async () => {
    state.mode = 'hang'
    vi.useFakeTimers()
    const work = Promise.allSettled([1, 2].map(() => extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')))
    await expect(extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')).rejects.toThrow(/busy/i)
    await vi.advanceTimersByTimeAsync(10_002)
    expect((await work).every(result => result.status === 'rejected')).toBe(true)
    expect(state.terminated).toBe(2)
    state.mode = 'ok'
    await expect(extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')).resolves.toBe('Readable PDF')
  })
  it('sanitizes parser errors', async () => {
    state.mode = 'error'
    await expect(extractText(Buffer.from('%PDF-1.7\nfake'), 'application/pdf')).rejects.toThrow('This PDF could not be read.')
  })
})
