import { DEMO_UPLOAD_TTL_MS } from '../documents/cleanup.js'
import type { TokenPayload } from '../auth/jwt.js'
import { isDemoSession } from '../documents/scope.js'

export function buildConversationScope(user?: TokenPayload): Record<string, unknown> {
  if (!user) return { _id: null }
  return isDemoSession(user)
    ? { userId: user.userId, demoSessionId: user.demoSessionId, createdAt: { $gt: new Date(Date.now() - DEMO_UPLOAD_TTL_MS) } }
    : { userId: user.userId, demoSessionId: null }
}

export function isOwnedDemoConversation(
  conversation: { demoSessionId?: string | null },
  user?: TokenPayload,
): boolean {
  return isDemoSession(user) && conversation.demoSessionId === user.demoSessionId
}
