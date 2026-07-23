import { DocumentModel } from '../models/Document.js'
import { ChunkModel } from '../models/Chunk.js'
import { chunkText } from '../rag/chunker.js'
import { getEmbeddingProvider } from '../rag/provider.js'
import { extractText } from './parse.js'

const EMBED_BATCH_SIZE = 50

export async function ingestDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  try {
    const text = await extractText(buffer, mimeType)
    const chunks = await chunkText(text)

    if (chunks.length === 0) {
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'error',
        error: 'No readable text was found in this file.',
      })
      return
    }

    const embeddings = getEmbeddingProvider()
    let position = 0

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
      const vectors = await embeddings.embed(batch)
      await ChunkModel.insertMany(
        batch.map((content, j) => ({
          documentId,
          content,
          embedding: vectors[j],
          position: position++,
        })),
      )
    }

    await DocumentModel.findByIdAndUpdate(documentId, {
      status: 'ready',
      chunkCount: chunks.length,
    })
  } catch (err) {
    // A batch may have inserted before a later batch failed (for example a
    // rate limit that survived every retry). Remove any chunks already stored
    // for this document so a failed ingest leaves nothing the retriever would
    // still surface, then record the failure on the document.
    await ChunkModel.deleteMany({ documentId })
    await DocumentModel.findByIdAndUpdate(documentId, {
      status: 'error',
      chunkCount: 0,
      error: err instanceof Error ? err.message : 'Processing failed.',
    })
  }
}
