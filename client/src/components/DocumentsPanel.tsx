import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { addOwnDocumentId, getOwnDocumentIds, removeOwnDocumentId } from '../demo/ownDocuments'
import { DocumentRow, type DocumentSummary } from './DocumentRow'
import { DocumentUploader, type UploadCaps } from './DocumentUploader'

const DEMO_MAX_DOCUMENTS = 3
const DEMO_MAX_BYTES = 2 * 1024 * 1024

/** Documents panel for the demo flow: the visitor's own uploads, managed and
 * deletable, kept visually distinct from the shared sample corpus everyone
 * shares. See DEMO_UPLOAD_NOTES.md for the caps this mirrors. */
export function DocumentsPanel() {
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

  useEffect(() => {
    if (!documents?.some((d) => d.status === 'processing')) return
    const timer = window.setInterval(load, 2000)
    return () => window.clearInterval(timer)
  }, [documents, load])

  const ownIds = getOwnDocumentIds()
  const own = (documents ?? []).filter((d) => ownIds.has(d.id))
  const shared = (documents ?? []).filter((d) => !ownIds.has(d.id))
  const activeOwn = own.filter((d) => d.status !== 'error').length

  async function remove(doc: DocumentSummary) {
    if (!confirm(`Delete "${doc.filename}"? Its content will no longer be used in answers.`)) return
    try {
      await api.del(`/api/documents/${doc.id}`)
      removeOwnDocumentId(doc.id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete that document.')
    }
  }

  const caps: UploadCaps = {
    maxBytes: DEMO_MAX_BYTES,
    atCapacity: activeOwn >= DEMO_MAX_DOCUMENTS,
    capacityLabel: `You've used all ${DEMO_MAX_DOCUMENTS} demo document slots. Delete one to upload another.`,
  }

  return (
    <div className="docs-panel">
      <div className="docs-panel-intro">
        <p className="muted">
          Upload up to {DEMO_MAX_DOCUMENTS} documents ({(DEMO_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB each, PDF,
          DOCX, or TXT). Only you can see and chat with them, and they're deleted automatically after 2 hours.
        </p>
      </div>

      <DocumentUploader
        caps={caps}
        onUploaded={(doc) => {
          addOwnDocumentId(doc.id)
          load()
        }}
      />

      {error && <p className="field-error" role="alert">{error}</p>}

      <section className="docs-section">
        <h3>Your documents</h3>
        {documents === null ? (
          <DocRowSkeleton count={1} />
        ) : own.length === 0 ? (
          <p className="muted docs-section-empty">Nothing uploaded yet in this session.</p>
        ) : (
          <div className="doc-list">
            {own.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onDelete={remove} showExpiry />
            ))}
          </div>
        )}
      </section>

      <section className="docs-section">
        <h3>Sample documents</h3>
        <p className="muted docs-section-caption">Shared with every visitor. You can chat with these too.</p>
        {documents === null ? (
          <DocRowSkeleton count={2} />
        ) : shared.length === 0 ? (
          <p className="muted docs-section-empty">No sample documents are loaded right now.</p>
        ) : (
          <div className="doc-list">
            {shared.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>
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
