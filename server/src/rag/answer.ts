import { retrieve } from './retriever.js'
import { getLlmProvider } from './provider.js'
import { buildGroundedPrompt, NO_CONTEXT_RESPONSE } from './prompt.js'
import type { AnswerResult, LlmProvider, RetrievedChunk, SourceRef } from './types.js'

const SNIPPET_LENGTH = 200

function toSources(chunks: RetrievedChunk[]): SourceRef[] {
  const seen = new Set<string>()
  const sources: SourceRef[] = []

  for (const c of chunks) {
    if (seen.has(c.chunkId)) continue
    seen.add(c.chunkId)
    sources.push({
      documentId: c.documentId,
      filename: c.filename,
      chunkId: c.chunkId,
      snippet: c.content.length > SNIPPET_LENGTH
        ? `${c.content.slice(0, SNIPPET_LENGTH)}...`
        : c.content,
    })
  }

  return sources
}

export async function answerQuestion(
  question: string,
  deps: { retrieveFn?: typeof retrieve; llm?: LlmProvider; k?: number } = {},
): Promise<AnswerResult> {
  const retrieveFn = deps.retrieveFn ?? retrieve
  const chunks = await retrieveFn(question, { k: deps.k })

  if (chunks.length === 0) {
    return { answer: NO_CONTEXT_RESPONSE, sources: [], grounded: false }
  }

  const llm = deps.llm ?? getLlmProvider()
  const answer = await llm.generate(buildGroundedPrompt(question, chunks))

  return { answer, sources: toSources(chunks), grounded: true }
}
