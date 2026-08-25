import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { DocumentPreview } from './DocumentPreview'
import { DocumentRow, type DocumentSummary } from './DocumentRow'
import { DocumentUploader, type UploadCaps } from './DocumentUploader'

const DEMO_MAX_DOCUMENTS = 3
const DEMO_MAX_BYTES = 2 * 1024 * 1024

/** Documents panel for demo and registered-user workspaces. Ownership comes
 * from the server's `owned` flag rather than client-side bookkeeping. */
export function DocumentsPanel({ isDemo }: { isDemo: boolean }) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentSummary | null>(null)

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

  useEffect(() => {
    if (!documents?.some((d) => d.status === 'processing')) return
    const timer = window.setInterval(load, 2000)
    return () => window.clearInterval(timer)
  }, [documents, load])

  const own = isDemo ? (documents ?? []).filter((d) => d.owned) : documents ?? []
  const library = isDemo ? (documents ?? []).filter((d) => !d.owned) : []
  const activeOwn = own.filter((d) => d.status !== 'error').length

  async function remove(doc: DocumentSummary) {
    if (!confirm(`Delete "${doc.filename}"? Its content will no longer be used in answers.`)) return
    try {
      await api.del(`/api/documents/${doc.id}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete that document.')
    }
  }

  const caps: UploadCaps | undefined = isDemo
    ? {
        maxBytes: DEMO_MAX_BYTES,
        atCapacity: activeOwn >= DEMO_MAX_DOCUMENTS,
        capacityLabel: `You've used all ${DEMO_MAX_DOCUMENTS} demo document slots. Delete one to upload another.`,
      }
    : undefined

  return (
    <div className="docs-panel">
      <div className="docs-panel-intro">
        <p className="muted">
          {isDemo ? (
            <>Upload up to {DEMO_MAX_DOCUMENTS} documents ({(DEMO_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB each, PDF, DOCX, or TXT). Only you can see and chat with them. A read-only library of sample documents is also included.</>
          ) : (
            <>Upload PDF, DOCX, or TXT files to give your private workspace sources to search. Only you can see and chat with these documents.</>
          )}
        </p>
      </div>

      <DocumentUploader caps={caps} onUploaded={() => load()} />

      {error && <p className="field-error" role="alert">{error}</p>}

      <section className="docs-section">
        <h3>
          {isDemo ? 'Your documents' : 'Private documents'}
          {isDemo && <span className="docs-count">{activeOwn} of {DEMO_MAX_DOCUMENTS}</span>}
        </h3>
        {documents === null ? (
          <DocRowSkeleton count={1} />
        ) : own.length === 0 ? (
          <p className="muted docs-section-empty">
            {isDemo ? 'Nothing uploaded yet in this session.' : 'Upload your first document to give the assistant a source to work from.'}
          </p>
        ) : (
          <div className="doc-list">
            {own.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onDelete={remove} onPreview={setPreviewDoc} showExpiry={isDemo} />
            ))}
          </div>
        )}
      </section>

      {isDemo && (
        <section className="docs-section">
          <h3>Library</h3>
          <p className="muted docs-section-caption">
            Read-only reference documents included with every demo session. You can chat with these too.
          </p>
          {documents === null ? (
            <DocRowSkeleton count={2} />
          ) : library.length === 0 ? (
            <p className="muted docs-section-empty">No library documents are loaded right now.</p>
          ) : (
            <div className="doc-list">
              {library.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onPreview={setPreviewDoc} libraryTag />
              ))}
            </div>
          )}
        </section>
      )}

      {previewDoc && <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}

function DocRowSkeleton({ count }: { count: number }) {
  return (
    <div className="doc-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="doc-row-skeleton" key={i}>
          <span className="skeleton skeleton-icon" />
          <span className="skeleton skeleton-line" />
        </div>
      ))}
    </div>
  )
}
