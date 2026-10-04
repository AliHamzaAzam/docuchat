import { inflateRawSync } from 'node:zlib'

const MAX_EXPANDED_BYTES = 20 * 1024 * 1024
const MAX_ENTRIES = 1000

/** Bound actual inflation before handing an untrusted DOCX archive to Mammoth.
 * Checking the ZIP headers alone is insufficient: attackers control the sizes.
 * ZIP64, encryption, multi-disk and uncommon methods are deliberately rejected.
 */
export function validateDocxArchive(buffer: Buffer): void {
  const invalid = () => new Error('Invalid or unsupported DOCX archive.')
  const limit = () => new Error('DOCX expanded size or compression limit exceeded.')
  let end = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) {
      end = i
      break
    }
  }
  if (end < 0) throw invalid()
  const entries = buffer.readUInt16LE(end + 10)
  const directorySize = buffer.readUInt32LE(end + 12)
  const directoryOffset = buffer.readUInt32LE(end + 16)
  if (!entries || entries > MAX_ENTRIES) throw limit()
  if (buffer.readUInt32LE(end + 4) !== 0 || buffer.readUInt16LE(end + 8) !== entries
    || directoryOffset + directorySize !== end) throw invalid()
  let cursor = directoryOffset
  let expanded = 0
  const names = new Set<string>()
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) throw invalid()
    const flags = buffer.readUInt16LE(cursor + 8)
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const claimedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > end || flags & 1 || ![0, 8].includes(method)
      || buffer.readUInt16LE(cursor + 34) !== 0) throw invalid()
    if (claimedSize > MAX_EXPANDED_BYTES - expanded) throw limit()
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength)
    const key = name.toString('utf8')
    if (names.has(key) || key.includes('..') || key.startsWith('/')) throw invalid()
    names.add(key)
    if (localOffset + 30 > directoryOffset || buffer.readUInt32LE(localOffset) !== 0x04034b50
      || buffer.readUInt16LE(localOffset + 8) !== method
      || buffer.readUInt16LE(localOffset + 6) !== flags) throw invalid()
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const start = localOffset + 30 + localNameLength + buffer.readUInt16LE(localOffset + 28)
    if (!buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(name)
      || start + compressedSize > directoryOffset) throw invalid()
    const compressed = buffer.subarray(start, start + compressedSize)
    let size: number
    try {
      size = method === 0 ? compressed.length : inflateRawSync(compressed, {
        maxOutputLength: Math.max(1, MAX_EXPANDED_BYTES - expanded),
      }).length
    } catch {
      throw limit()
    }
    expanded += size
    if (expanded > MAX_EXPANDED_BYTES) throw limit()
    if (size !== claimedSize) throw invalid()
    cursor = next
  }
  if (cursor !== end || !names.has('word/document.xml')) throw invalid()
}
