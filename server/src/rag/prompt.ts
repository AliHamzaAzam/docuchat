import type { RetrievedChunk } from './types.js'

export const NO_CONTEXT_RESPONSE =
  'I do not know. I could not find anything in the uploaded documents that answers that question.'

export function isNoContextResponse(answer: string): boolean {
  return answer.trim() === NO_CONTEXT_RESPONSE
}

export function buildGroundedPrompt(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename}]\n${c.content}`)
    .join('\n\n')

  return [
    'You are a knowledge assistant answering questions about a specific set of documents.',
    '',
    'Rules you must follow:',
    '1. Answer using only the context below. Do not use outside knowledge.',
    '2. If the context does not contain the answer, reply exactly: "I do not know. I could not find anything in the uploaded documents that answers that question."',
    '3. Do not guess, infer beyond the context, or fill gaps with general knowledge.',
    '4. Cite the source name when you state a fact.',
    '',
    'Context:',
    context,
    '',
    `Question: ${question}`,
    '',
    'Answer:',
  ].join('\n')
}
