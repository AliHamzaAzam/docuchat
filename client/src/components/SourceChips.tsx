export type SourceRef = {
  documentId: string
  filename: string
  chunkId: string
  snippet: string
}

export function SourceChips({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null

  return (
    <div className="sources">
      {sources.map((s) => (
        <span className="source-chip" key={s.chunkId} title={s.snippet}>
          {s.filename}
        </span>
      ))}
    </div>
  )
}
