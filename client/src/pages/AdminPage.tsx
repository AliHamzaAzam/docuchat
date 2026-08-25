import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { DocumentUploader } from '../components/DocumentUploader'
import { DocumentList, type DocumentSummary } from '../components/DocumentList'

export function AdminPage() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setDocuments(await api.get('/api/documents'))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load documents.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Poll while anything is still processing, then stop.
  useEffect(() => {
    if (!documents?.some((d) => d.status === 'processing')) return
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [documents, load])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="section-label">Demo seed library</span>
          <h1>Documents</h1>
        </div>
        <p className="muted">
          Upload PDF, DOCX, or TXT files. Every upload here becomes part of the read-only library visible to demo
          sessions. Registered users' own documents stay private to their account and never appear here.
        </p>
      </header>

      <DocumentUploader onUploaded={load} />
      {error && <p className="field-error" role="alert">{error}</p>}

      {documents === null ? (
        <div className="doc-list" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="doc-row-skeleton" key={i}>
              <span className="skeleton skeleton-icon" />
              <span className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
      ) : (
        <DocumentList documents={documents} onChanged={load} />
      )}
    </div>
  )
}
