import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ConversationModel } from '../models/Conversation.js'
import { DocumentModel } from '../models/Document.js'
import { MessageModel } from '../models/Message.js'
import { ChunkModel } from '../models/Chunk.js'
import { answerQuestion } from '../rag/answer.js'
import { DEMO_SEED_SCOPE_KEY } from '../documents/scope.js'

const here = dirname(fileURLToPath(import.meta.url))
const sourceFixturePath = join(here, '../../seed-fixtures/demo-conversations.json')
const builtFixturePath = join(here, '../../../seed-fixtures/demo-conversations.json')
export const DEMO_FIXTURE_PATH = existsSync(sourceFixturePath) ? sourceFixturePath : builtFixturePath

export type DemoFixtureSource = {
  filename: string
  snippet: string
}

export type DemoConversationFixture = {
  id: string
  title: string
  question: string
  answer: string
  grounded: boolean
  sources: DemoFixtureSource[]
}

const FIXTURE_PROMPTS = [
  {
    id: 'holiday-allowance',
    title: 'Holiday allowance',
    question: 'How many paid holiday days do full-time employees receive?',
  },
  {
    id: 'product-warranty',
    title: 'Product warranty',
    question: 'What is the warranty period for a Northwind Robotics unit?',
  },
]

export function loadDemoConversationFixtures(): DemoConversationFixture[] {
  const parsed = JSON.parse(readFileSync(DEMO_FIXTURE_PATH, 'utf8')) as unknown
  if (!Array.isArray(parsed)) throw new Error('Demo conversation fixtures must be an array.')
  return parsed as DemoConversationFixture[]
}

export async function generateDemoConversationFixtures(): Promise<DemoConversationFixture[]> {
  const fixtures: DemoConversationFixture[] = []

  for (const prompt of FIXTURE_PROMPTS) {
    const result = await answerQuestion(prompt.question, {
      scopeKeys: [DEMO_SEED_SCOPE_KEY],
      k: 1,
    })
    if (!result.grounded || result.sources.length === 0) {
      throw new Error(`Could not generate a grounded demo fixture for ${prompt.id}.`)
    }

    fixtures.push({
      ...prompt,
      answer: result.answer,
      grounded: result.grounded,
      sources: result.sources.map((source) => ({
        filename: source.filename,
        snippet: source.snippet,
      })),
    })
  }

  writeFileSync(DEMO_FIXTURE_PATH, `${JSON.stringify(fixtures, null, 2)}\n`)
  return fixtures
}

async function resolveSources(fixture: DemoConversationFixture): Promise<Array<{
  documentId: string
  filename: string
  chunkId: string
  snippet: string
}>> {
  const documents = await DocumentModel.find({ isSeed: true, scopeKey: DEMO_SEED_SCOPE_KEY })
    .select({ _id: 1, filename: 1 })
    .lean()
  const resolved = []

  for (const source of fixture.sources) {
    const document = documents.find((candidate) => candidate.filename === source.filename)
    if (!document) throw new Error(`Seed document ${source.filename} is missing.`)

    const chunks = await ChunkModel.find({ documentId: document._id })
      .select({ _id: 1, content: 1 })
      .lean()
    const prefix = source.snippet.endsWith('...') ? source.snippet.slice(0, -3) : source.snippet
    const chunk = chunks.find((candidate) => candidate.content.startsWith(prefix))
    if (!chunk) throw new Error(`Could not resolve fixture source in ${source.filename}.`)

    resolved.push({
      documentId: String(document._id),
      filename: source.filename,
      chunkId: String(chunk._id),
      snippet: source.snippet,
    })
  }

  return resolved
}

export async function copyDemoConversationFixtures(userId: string, demoSessionId: string): Promise<number> {
  const fixtures = loadDemoConversationFixtures()
  const conversationIds: unknown[] = []

  try {
    for (const fixture of fixtures) {
      const sources = await resolveSources(fixture)
      const conversation = await ConversationModel.create({
        userId,
        demoSessionId,
        isDemoExample: true,
        title: fixture.title,
      })
      conversationIds.push(conversation._id)

      await MessageModel.create({
        conversationId: conversation._id,
        role: 'user',
        content: fixture.question,
      })
      await MessageModel.create({
        conversationId: conversation._id,
        role: 'assistant',
        content: fixture.answer,
        sources,
      })
    }
  } catch (error) {
    if (conversationIds.length > 0) {
      await MessageModel.deleteMany({ conversationId: { $in: conversationIds } } as any)
      await ConversationModel.deleteMany({ _id: { $in: conversationIds } } as any)
    }
    throw error
  }

  return fixtures.length
}
