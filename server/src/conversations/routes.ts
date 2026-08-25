import { Router } from 'express'
import { ConversationModel } from '../models/Conversation.js'
import { MessageModel } from '../models/Message.js'
import { requireAuth } from '../auth/middleware.js'
import { answerQuestion } from '../rag/answer.js'
import { isRateLimitError } from '../rag/provider.js'
import { chatRateLimiter } from '../config/rateLimit.js'
import { isDemoSession } from '../documents/scope.js'
import { buildConversationScope } from './scope.js'

export const conversationsRouter = Router()

function titleFrom(question: string): string {
  return question.length > 60 ? `${question.slice(0, 60)}...` : question
}

conversationsRouter.get('/', requireAuth, async (req, res) => {
  const list = await ConversationModel.find({ userId: req.user!.userId, ...buildConversationScope(req.user) })
    .sort({ updatedAt: -1 })
    .lean()
  res.json(list.map((c) => ({ id: String(c._id), title: c.title, updatedAt: c.updatedAt })))
})

conversationsRouter.get('/:id', requireAuth, async (req, res) => {
  const convo = await ConversationModel.findOne({
    _id: req.params.id,
    userId: req.user!.userId,
    ...buildConversationScope(req.user),
  }).lean()
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' })

  const messages = await MessageModel.find({ conversationId: convo._id })
    .sort({ createdAt: 1 })
    .lean()

  res.json({
    id: String(convo._id),
    title: convo.title,
    messages: messages.map((m) => ({
      id: String(m._id),
      role: m.role,
      content: m.content,
      sources: (m.sources ?? []).map((s: any) => ({
        documentId: String(s.documentId),
        filename: s.filename,
        chunkId: String(s.chunkId),
        snippet: s.snippet,
      })),
      createdAt: m.createdAt,
    })),
  })
})

conversationsRouter.post('/chat', requireAuth, chatRateLimiter, async (req, res) => {
  const { question, conversationId } = req.body ?? {}
  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: 'Please enter a question.' })
  }

  // Resolve an existing conversation up front, but do not create one yet.
  // Nothing is persisted until we have a successful answer, so a failed or
  // rate-limited generation never leaves an orphan conversation or a lone
  // user message with no reply.
  const existing = conversationId
    ? await ConversationModel.findOne({
      _id: conversationId,
      userId: req.user!.userId,
      ...buildConversationScope(req.user),
    })
    : null

  if (conversationId && !existing) {
    return res.status(404).json({ error: 'Conversation not found.' })
  }

  let result
  try {
    result = await answerQuestion(String(question), { demoSessionId: req.user!.demoSessionId })
  } catch (err) {
    // Retries are already exhausted inside the provider, so reaching here means
    // the free tier is genuinely saturated rather than momentarily busy.
    const rateLimited = isRateLimitError(err)
    return res.status(rateLimited ? 429 : 500).json({
      error: rateLimited
        ? 'The assistant is busy right now. Please try again in a moment.'
        : 'The assistant could not answer that. Please try again.',
    })
  }

  const convo =
    existing ??
    (await ConversationModel.create({
      userId: req.user!.userId,
      demoSessionId: isDemoSession(req.user) ? req.user.demoSessionId : null,
      title: titleFrom(String(question)),
    }))

  await MessageModel.create({
    conversationId: convo._id,
    role: 'user',
    content: String(question),
  })

  const assistantMessage = await MessageModel.create({
    conversationId: convo._id,
    role: 'assistant',
    content: result.answer,
    sources: result.sources.map((s) => ({
      documentId: s.documentId,
      filename: s.filename,
      chunkId: s.chunkId,
      snippet: s.snippet,
    })),
  })

  await ConversationModel.findByIdAndUpdate(convo._id, { updatedAt: new Date() })

  res.json({
    conversationId: String(convo._id),
    message: {
      id: String(assistantMessage._id),
      role: 'assistant',
      content: result.answer,
      sources: result.sources,
    },
    grounded: result.grounded,
  })
})
