import { DocumentModel } from '../models/Document.js'
import { ChunkModel } from '../models/Chunk.js'
import { chunkText } from '../rag/chunker.js'
import { getEmbeddingProvider } from '../rag/provider.js'
import { extractText } from './parse.js'
import { releaseDemoDocument } from './quota.js'
import { DEMO_SEED_SCOPE_KEY } from './scope.js'

const EMBED_BATCH_SIZE = 50

export async function ingestDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
  scope: { demoSessionId?: string | null; scopeKey: string },
): Promise<void> {
  try {
    const text = await extractText(buffer, mimeType)
    const chunks = await chunkText(text)

    if (chunks.length === 0) {
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'error',
        error: 'No readable text was found in this file.',
      })
      await releaseDemoDocument(scope.demoSessionId, documentId)
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
          isSeed: scope.scopeKey === DEMO_SEED_SCOPE_KEY,
          demoSessionId: scope.demoSessionId ?? null,
          scopeKey: scope.scopeKey,
        })),
      )
    }

    const completed = await DocumentModel.findOneAndUpdate({
      _id: documentId, scopeKey: scope.scopeKey, status: 'processing',
    }, { status: 'ready', chunkCount: chunks.length })
    if (!completed) {
      // Deletion removes the parent first. If it raced with a batch insert,
      // remove the late chunks instead of resurrecting a deleted document.
      await ChunkModel.deleteMany({ documentId })
      await releaseDemoDocument(scope.demoSessionId, documentId)
    }
  } catch (err) {
    // A batch may have inserted before a later batch failed (for example a
    // rate limit that survived every retry). Remove any chunks already stored
    // for this document so a failed ingest leaves nothing the retriever would
    // still surface, then record the failure on the document.
    //
    // Guard the cleanup so that even if it fails, the document is still marked
    // error. A document stuck in processing makes the admin page poll forever,
    // and an unhandled rejection would escape the fire-and-forget ingest call.
    try {
      await ChunkModel.deleteMany({ documentId })
    } catch {
      // Best effort. Fall through and still record the error below.
    }
    try {
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'error',
        chunkCount: 0,
        error: 'This document could not be processed. Try another file.',
      })
      await releaseDemoDocument(scope.demoSessionId, documentId)
    } catch {
      // The caller intentionally does not await ingest. Database outages must
      // not escape as an unhandled rejection. Do not log provider diagnostics.
      console.error('Document processing failed and its status could not be saved.')
    }
  }
}
