import mammoth from 'mammoth'
import { extractPdfText } from './pdf.js'
import { validateDocxArchive } from './zip.js'

export const MIME_PDF = 'application/pdf'
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const MIME_TXT = 'text/plain'

export const SUPPORTED_MIME_TYPES = [MIME_PDF, MIME_DOCX, MIME_TXT]
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) throw new Error('File size limit exceeded.')
  if (mimeType === MIME_TXT) {
    if (buffer.includes(0)) throw new Error('The file must contain valid UTF-8 text.')
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
      throw new Error('The file must contain valid UTF-8 text.')
    }
  }

  if (mimeType === MIME_DOCX) {
    validateDocxArchive(buffer)
    const { value } = await mammoth.extractRawText({ buffer })
    return value
  }

  if (mimeType === MIME_PDF) {
    return extractPdfText(buffer)
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
