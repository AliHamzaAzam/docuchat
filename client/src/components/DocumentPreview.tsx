import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { IconAlert, IconClose, IconFile } from './Icon'
import type { DocumentSummary } from './DocumentRow'

type PreviewData = {
  filename: string
  text: string
  truncated: boolean
}

export function DocumentPreview({
  doc,
  onClose,
}: {
  doc: DocumentSummary
  onClose: () => void
}) {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    // Move focus into the dialog on open and hand it back to whatever
    // triggered the preview (the row's preview button) on close, the same
    // round trip the mobile workspace drawer does for its own overlay.
    closeButtonRef.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus()
    }
  }, [onClose])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setPreview(null)

    api
      .get(`/api/documents/${doc.id}/preview`)
      .then((data: PreviewData) => {
        if (active) setPreview(data)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load the document preview.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [doc.id])

  return (
    <div className="preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <header className="preview-header">
          <div className="preview-title-wrap">
            <span className="preview-file-mark" aria-hidden="true"><IconFile /></span>
            <div>
              <span className="section-label">Document preview</span>
              <h2 id="preview-title" title={doc.filename}>{doc.filename}</h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button preview-close"
            onClick={onClose}
            aria-label="Close document preview"
          >
            <IconClose />
          </button>
        </header>

        <div className="preview-body">
          {loading && <p className="preview-loading">Preparing the readable text…</p>}
          {error && (
            <p className="field-error preview-error" role="alert">
              <IconAlert />
              {error}
            </p>
          )}
          {preview && (
            <>
              <p className="preview-note">Showing the extracted text used to answer questions from this document.</p>
              <pre className="preview-text">{preview.text || 'No readable text was found in this document.'}</pre>
              {preview.truncated && <p className="preview-truncated">This preview is capped at 300,000 characters.</p>}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
