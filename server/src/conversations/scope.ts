import type { TokenPayload } from '../auth/jwt.js'
import { isDemoSession } from '../documents/scope.js'

export function buildConversationScope(user?: TokenPayload): Record<string, unknown> {
  if (!user) return { _id: null }
  return isDemoSession(user)
    ? { userId: user.userId, demoSessionId: user.demoSessionId }
    : { userId: user.userId }
}

export function isOwnedDemoConversation(
  conversation: { demoSessionId?: string | null },
  user?: TokenPayload,
): boolean {
  return isDemoSession(user) && conversation.demoSessionId === user.demoSessionId
}
