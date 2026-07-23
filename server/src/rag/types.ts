export const EMBEDDING_DIMENSIONS = 768

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
  embedOne(text: string): Promise<number[]>
}

export interface LlmProvider {
  generate(prompt: string): Promise<string>
}

export type RetrievedChunk = {
  chunkId: string
  documentId: string
  filename: string
  content: string
  score: number
}

export type SourceRef = {
  documentId: string
  filename: string
  chunkId: string
  snippet: string
}

export type AnswerResult = {
  answer: string
  sources: SourceRef[]
  grounded: boolean
}
