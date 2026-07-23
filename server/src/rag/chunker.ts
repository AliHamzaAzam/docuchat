import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 200

export async function chunkText(
  text: string,
  opts: { chunkSize?: number; chunkOverlap?: number } = {},
): Promise<string[]> {
  if (!text.trim()) return []

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: opts.chunkSize ?? DEFAULT_CHUNK_SIZE,
    chunkOverlap: opts.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
  })

  const docs = await splitter.createDocuments([text])
  return docs.map((d) => d.pageContent).filter((c) => c.trim().length > 0)
}
