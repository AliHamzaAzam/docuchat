import { useState } from 'react'

export type SourceRef = {
  documentId: string
  filename: string
  chunkId: string
  snippet: string
}

/**
 * Citation chips styled as index tabs: a numbered marker plus filename, in
 * the same "tab" language as the document panel's own sections. Clicking one
 * reveals the exact passage the answer drew from, highlighted the way a
 * reader would mark up a source document by hand. A click-to-expand
 * disclosure (not a hover tooltip) so the same interaction works with touch.
 */
export function SourceChips({ sources }: { sources: SourceRef[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (sources.length === 0) return null

  return (
    <div className="sources">
      <div className="source-chips">
        {sources.map((s, i) => (
          <button
            key={s.chunkId}
            className={`source-chip${openId === s.chunkId ? ' open' : ''}`}
            aria-expanded={openId === s.chunkId}
            onClick={() => setOpenId(openId === s.chunkId ? null : s.chunkId)}
          >
            <span className="source-chip-index">{i + 1}</span>
            <span className="source-chip-name">{s.filename}</span>
          </button>
        ))}
      </div>
      {sources.map(
        (s) =>
          openId === s.chunkId && (
            <blockquote className="source-excerpt" key={s.chunkId}>
              <mark>{s.snippet}</mark>
              <cite>{s.filename}</cite>
            </blockquote>
          ),
      )}
    </div>
  )
}
