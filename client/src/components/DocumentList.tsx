import { api } from '../api/client'

export type DocumentSummary = {
  id: string
  filename: string
  status: 'processing' | 'ready' | 'error'
  error: string | null
  chunkCount: number
  size: number
  createdAt: string
}

export function DocumentList({
  documents,
  onChanged,
}: {
  documents: DocumentSummary[]
  onChanged: () => void
}) {
  async function remove(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? Its content will no longer be used in answers.`)) return
    await api.del(`/api/documents/${id}`)
    onChanged()
  }

  if (documents.length === 0) {
    return <p className="muted">No documents yet. Upload one to get started.</p>
  }

  return (
    <div>
      {documents.map((doc) => (
        <div className="doc-row" key={doc.id}>
          <div>
            <div>{doc.filename}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {doc.status === 'ready' && `${doc.chunkCount} chunks`}
              {doc.status === 'processing' && 'Processing...'}
              {doc.status === 'error' && (doc.error ?? 'Processing failed.')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`status ${doc.status}`}>{doc.status}</span>
            <button className="link-button" onClick={() => remove(doc.id, doc.filename)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
