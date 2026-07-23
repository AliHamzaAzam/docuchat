import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { DocumentUploader } from '../components/DocumentUploader'
import { DocumentList, type DocumentSummary } from '../components/DocumentList'

export function AdminPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setDocuments(await api.get('/api/documents'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load documents.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Poll while anything is still processing, then stop.
  useEffect(() => {
    if (!documents.some((d) => d.status === 'processing')) return
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [documents, load])

  return (
    <div>
      <h2>Documents</h2>
      <p className="muted">
        Upload PDF, DOCX, or TXT files. Their content becomes the only material the assistant can
        answer from.
      </p>
      <DocumentUploader onUploaded={load} />
      {error && <p className="error">{error}</p>}
      <DocumentList documents={documents} onChanged={load} />
    </div>
  )
}
