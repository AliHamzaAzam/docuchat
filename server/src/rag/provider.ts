import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { env } from '../config/env.js'
import type { EmbeddingProvider, LlmProvider } from './types.js'

// Swapping providers happens here and nowhere else. To move to OpenAI,
// install @langchain/openai and replace the two implementations below.

export function isRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const message = String((err as { message?: string })?.message ?? '')
  return status === 429 || /quota|rate.?limit|too many requests/i.test(message)
}

/**
 * The Gemini free tier throttles aggressively. Ingesting a real document makes
 * many embedding calls in sequence, so without this any moderately sized upload
 * fails partway through.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isRateLimitError(err) || attempt === attempts - 1) throw err
      const delay = 1000 * 2 ** attempt
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

class GeminiEmbeddings implements EmbeddingProvider {
  private client = new GoogleGenerativeAIEmbeddings({
    apiKey: env.GEMINI_API_KEY,
    model: 'text-embedding-004',
  })

  async embed(texts: string[]): Promise<number[][]> {
    return withRetry(() => this.client.embedDocuments(texts))
  }

  async embedOne(text: string): Promise<number[]> {
    return withRetry(() => this.client.embedQuery(text))
  }
}

class GeminiLlm implements LlmProvider {
  private client = new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    temperature: 0,
  })

  async generate(prompt: string): Promise<string> {
    const res = await withRetry(() => this.client.invoke(prompt))
    return typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
  }
}

let embeddings: EmbeddingProvider | null = null
let llm: LlmProvider | null = null

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddings) embeddings = new GeminiEmbeddings()
  return embeddings
}

export function getLlmProvider(): LlmProvider {
  if (!llm) llm = new GeminiLlm()
  return llm
}
