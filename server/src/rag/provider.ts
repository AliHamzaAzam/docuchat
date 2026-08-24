import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { env } from '../config/env.js'
import type { EmbeddingProvider, LlmProvider } from './types.js'
import { EMBEDDING_DIMENSIONS } from './types.js'

// Swapping providers happens here and nowhere else. To move to OpenAI,
// install @langchain/openai and replace the two implementations below.

export function isRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const message = String((err as { message?: string })?.message ?? '')
  return status === 429 || /quota|rate.?limit|too many requests/i.test(message)
}

/**
 * Raised when the embedding provider returns a vector of the wrong shape.
 * The installed @langchain/google-genai swallows a failed batch and returns
 * empty arrays rather than throwing, so without this check a rate-limited
 * ingest would silently persist empty embeddings and mark the document ready.
 */
export class IncompleteEmbeddingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IncompleteEmbeddingError'
  }
}

// Both conditions are transient on the free tier, so both should be retried.
export function isRetryableError(err: unknown): boolean {
  return isRateLimitError(err) || err instanceof IncompleteEmbeddingError
}

/** Throw unless every vector has the expected dimension and none is empty. */
export function assertCompleteEmbeddings(vectors: number[][], expectedCount: number): void {
  if (vectors.length !== expectedCount) {
    throw new IncompleteEmbeddingError(
      `Expected ${expectedCount} embeddings but received ${vectors.length}.`,
    )
  }
  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
      throw new IncompleteEmbeddingError(
        `The embedding provider returned an empty or wrong-size vector. This usually means a rate limit or a transient API error.`,
      )
    }
  }
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
      if (!isRetryableError(err) || attempt === attempts - 1) throw err
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
    return withRetry(async () => {
      const vectors = await this.client.embedDocuments(texts)
      assertCompleteEmbeddings(vectors, texts.length)
      return vectors
    })
  }

  async embedOne(text: string): Promise<number[]> {
    return withRetry(async () => {
      const vector = await this.client.embedQuery(text)
      assertCompleteEmbeddings([vector], 1)
      return vector
    })
  }
}

class GeminiLlm implements LlmProvider {
  private client = new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: 'gemini-3.6-flash',
    temperature: 0,
  })

  async generate(prompt: string): Promise<string> {
    const res = await withRetry(() => this.client.invoke(prompt))
    return typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
  }
}

/**
 * Workers AI error responses carry HTTP status; surface it so
 * isRateLimitError and withRetry treat 429s as transient.
 */
class WorkersAiRequestError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'WorkersAiRequestError'
    this.status = status
  }
}

async function workersAiRun<T>(model: string, body: unknown): Promise<T> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  const json = (await res.json()) as {
    success: boolean
    result: T
    errors?: { code: number; message: string }[]
  }
  if (!res.ok || !json.success) {
    const detail = json.errors?.map((e) => e.message).join('; ') || res.statusText
    throw new WorkersAiRequestError(res.status, `Workers AI ${model} failed: ${detail}`)
  }
  return json.result
}

// bge-base-en-v1.5 accepts at most 100 texts per request.
const WORKERS_AI_EMBED_BATCH = 100

class WorkersAiEmbeddings implements EmbeddingProvider {
  private model = '@cf/baai/bge-base-en-v1.5'

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = []
    for (let i = 0; i < texts.length; i += WORKERS_AI_EMBED_BATCH) {
      const batch = texts.slice(i, i + WORKERS_AI_EMBED_BATCH)
      const result = await withRetry(() =>
        workersAiRun<{ data: number[][] }>(this.model, { text: batch }),
      )
      vectors.push(...result.data)
    }
    assertCompleteEmbeddings(vectors, texts.length)
    return vectors
  }

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embed([text])
    return vector
  }
}

class WorkersAiLlm implements LlmProvider {
  private model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

  async generate(prompt: string): Promise<string> {
    const result = await withRetry(() =>
      workersAiRun<{ response: string }>(this.model, {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1024,
      }),
    )
    return result.response
  }
}

let embeddings: EmbeddingProvider | null = null
let llm: LlmProvider | null = null

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddings) {
    embeddings = env.AI_PROVIDER === 'workers-ai' ? new WorkersAiEmbeddings() : new GeminiEmbeddings()
  }
  return embeddings
}

export function getLlmProvider(): LlmProvider {
  if (!llm) {
    llm = env.AI_PROVIDER === 'workers-ai' ? new WorkersAiLlm() : new GeminiLlm()
  }
  return llm
}
