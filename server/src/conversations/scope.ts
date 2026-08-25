import type { TokenPayload } from '../auth/jwt.js'
import { isDemoSession } from '../documents/scope.js'

export function buildConversationScope(user?: TokenPayload): Record<string, unknown> {
  return isDemoSession(user) ? { demoSessionId: user.demoSessionId } : {}
}

export function isOwnedDemoConversation(
  conversation: { demoSessionId?: string | null },
  user?: TokenPayload,
): boolean {
  return isDemoSession(user) && conversation.demoSessionId === user.demoSessionId
}
