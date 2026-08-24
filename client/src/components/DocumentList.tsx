import { useState } from 'react'
import { api } from '../api/client'
import { DocumentRow, type DocumentSummary } from './DocumentRow'

export type { DocumentSummary }

export function DocumentList({
  documents,
  onChanged,
}: {
  documents: DocumentSummary[]
  onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function remove(doc: DocumentSummary) {
    if (!confirm(`Delete "${doc.filename}"? Its content will no longer be used in answers.`)) return
    setError(null)
    try {
      await api.del(`/api/documents/${doc.id}`)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete that document.')
    }
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <p>No documents yet.</p>
        <p className="muted">Upload one above to give the assistant something to answer from.</p>
      </div>
    )
  }

  return (
    <div className="doc-list">
      {error && <p className="field-error" role="alert">{error}</p>}
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} onDelete={remove} />
      ))}
    </div>
  )
}
