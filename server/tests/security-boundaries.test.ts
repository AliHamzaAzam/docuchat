import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { verifyToken, signToken } from '../src/auth/jwt.js'
import { env } from '../src/config/env.js'
import { buildConversationScope } from '../src/conversations/scope.js'
import { buildVectorPipeline, retrieve } from '../src/rag/retriever.js'
import { extractText, MAX_FILE_BYTES } from '../src/documents/parse.js'
import { validateDocxArchive } from '../src/documents/zip.js'
import { deflateRawSync } from 'node:zlib'

function zipEntry(content: Buffer, claimedSize = content.length): Buffer {
  const name = Buffer.from('word/document.xml')
  const compressed = deflateRawSync(content)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(compressed.length, 18)
  local.writeUInt32LE(claimedSize, 22)
  local.writeUInt16LE(name.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(compressed.length, 20)
  central.writeUInt32LE(claimedSize, 24)
  central.writeUInt16LE(name.length, 28)
  const entry = Buffer.concat([local, name, compressed])
  const directory = Buffer.concat([central, name])
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(entry.length, 16)
  return Buffer.concat([entry, directory, end])
}

describe('security boundaries', () => {
  it.each([
    {}, { userId: {}, role: 'user' }, { userId: '', role: 'user' },
    { userId: 'u', role: 'owner' }, { userId: 'u', role: 'admin', demoSessionId: 's' },
    { userId: 'u', role: 'user', demoSessionId: '' },
  ])('rejects signed malformed authorization claims %j', (claims) => {
    expect(() => verifyToken(jwt.sign(claims, env.JWT_SECRET, { expiresIn: '1h' }))).toThrow()
  })
  it('rejects tokens without an expiry', () => {
    expect(() => verifyToken(jwt.sign({ userId: 'u', role: 'user' }, env.JWT_SECRET))).toThrow()
  })
  it('expires legacy seven-day demo tokens after two hours', () => {
    const token = jwt.sign({ userId: 'u', role: 'user', demoSessionId: 's', iat: Math.floor(Date.now() / 1000) - 3 * 3600 }, env.JWT_SECRET, { expiresIn: '7d' })
    expect(() => verifyToken(token)).toThrow()
  })
  it('limits a demo token to the sandbox lifetime', () => {
    const decoded = jwt.decode(signToken({ userId: 'u', role: 'user', demoSessionId: 's' })) as jwt.JwtPayload
    expect(decoded.exp! - decoded.iat!).toBe(7200)
  })
  it('does not let a regular token read demo conversations for the shared user', () => {
    expect(buildConversationScope({ userId: 'demo', role: 'user' })).toEqual({ userId: 'demo', demoSessionId: null })
  })
  it('requires a ready parent document in the same allowed scope after vector search', () => {
    const pipeline = buildVectorPipeline([1], 5, ['user-a'])
    expect(pipeline).toContainEqual({ $match: { scopeKey: 'user-a', document: { $elemMatch: { scopeKey: { $in: ['user-a'] }, status: 'ready', $or: [{ demoSessionId: null }, { createdAt: { $gt: expect.any(Date) } }] } } } })
  })
  it('does not even embed a query without an explicit scope', async () => {
    const embeddings = { embedOne: vi.fn(), embed: vi.fn() }
    await expect(retrieve('private question', { embeddings })).resolves.toEqual([])
    expect(embeddings.embedOne).not.toHaveBeenCalled()
  })
  it('rejects oversized files even when called outside HTTP', async () => {
    await expect(extractText(Buffer.alloc(MAX_FILE_BYTES + 1, 65), 'text/plain')).rejects.toThrow(/large|limit/i)
  })
  it('rejects binary data falsely labeled as text', async () => {
    await expect(extractText(Buffer.from([0, 255, 1]), 'text/plain')).rejects.toThrow(/text|encoding/i)
  })
  it('accepts a small ZIP entry and valid UTF-8 text', async () => {
    expect(() => validateDocxArchive(zipEntry(Buffer.from('<document>hello</document>')))).not.toThrow()
    await expect(extractText(Buffer.from('Hello café'), 'text/plain')).resolves.toBe('Hello café')
  })
  it('rejects a compressed DOCX bomb before the document parser', async () => {
    await expect(extractText(zipEntry(Buffer.alloc(21 * 1024 * 1024, 65)), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).rejects.toThrow(/limit|large|compression/i)
  })
  it('bounds inflation even when ZIP metadata lies about expanded size', async () => {
    await expect(extractText(zipEntry(Buffer.alloc(21 * 1024 * 1024, 65), 1), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).rejects.toThrow(/limit|large|compression/i)
  })
})
