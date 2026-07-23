import mammoth from 'mammoth'

export const MIME_PDF = 'application/pdf'
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const MIME_TXT = 'text/plain'

export const SUPPORTED_MIME_TYPES = [MIME_PDF, MIME_DOCX, MIME_TXT]
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === MIME_TXT) {
    return buffer.toString('utf-8')
  }

  if (mimeType === MIME_DOCX) {
    const { value } = await mammoth.extractRawText({ buffer })
    return value
  }

  if (mimeType === MIME_PDF) {
    const pdfParse = (await import('pdf-parse')).default
    const { text } = await pdfParse(buffer)
    return text
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
