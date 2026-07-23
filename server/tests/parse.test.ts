import { describe, it, expect } from 'vitest'
import { extractText, SUPPORTED_MIME_TYPES } from '../src/documents/parse.js'

describe('extractText', () => {
  it('reads plain text', async () => {
    const text = await extractText(Buffer.from('Hello from a text file.'), 'text/plain')
    expect(text).toBe('Hello from a text file.')
  })

  it('rejects an unsupported mime type', async () => {
    await expect(extractText(Buffer.from('x'), 'image/png')).rejects.toThrow(/unsupported/i)
  })
})

describe('SUPPORTED_MIME_TYPES', () => {
  it('covers pdf, docx, and txt', () => {
    expect(SUPPORTED_MIME_TYPES).toContain('application/pdf')
    expect(SUPPORTED_MIME_TYPES).toContain('text/plain')
    expect(SUPPORTED_MIME_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  })
})
