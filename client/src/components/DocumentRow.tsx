import { useEffect, useState } from 'react'
import { IconCheck, IconClock, IconFile, IconLock, IconTrash } from './Icon'

export type DocumentSummary = {
  id: string
  filename: string
  status: 'processing' | 'ready' | 'error'
  error: string | null
  chunkCount: number
  size: number
  createdAt: string
  /** True only for the caller's own upload; false for shared seed/library
   * documents, and false for an admin viewing the seed corpus. Drives
   * nothing here directly — call sites decide what `owned` implies (a
   * library tag, a delete affordance) since the same field means different
   * things on the demo panel vs. the admin page. */
  owned: boolean
}

const EXPIRY_MS = 2 * 60 * 60 * 1000

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(bytes < 1024 * 100 ? 1 : 0)} KB`
}

function formatExpiry(createdAt: string): string {
  const remainingMs = new Date(createdAt).getTime() + EXPIRY_MS - Date.now()
  if (remainingMs <= 0) return 'Expiring now'
  const minutes = Math.round(remainingMs / 60000)
  if (minutes < 60) return `Expires in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `Expires in ${hours}h${mins ? ` ${mins}m` : ''}`
}

export function StatusBadge({ status }: { status: DocumentSummary['status'] }) {
  return (
    <span className={`status status-${status}`}>
      {status === 'ready' && <IconCheck />}
      {status === 'processing' && <span className="status-dot" aria-hidden="true" />}
      {status === 'error' && <span className="status-dot" aria-hidden="true" />}
      {status === 'ready' ? 'Ready' : status === 'processing' ? 'Processing' : 'Failed'}
    </span>
  )
}

export function DocumentRow({
  doc,
  onDelete,
  onPreview,
  showExpiry = false,
  libraryTag = false,
}: {
  doc: DocumentSummary
  onDelete?: (doc: DocumentSummary) => void
  onPreview?: (doc: DocumentSummary) => void
  showExpiry?: boolean
  /** Marks this row as part of the read-only reference library rather than
   * the caller's own upload (e.g. the demo seed corpus). Independent of
   * `doc.owned`, since that field means something different on the admin
   * page, where an admin's own seed uploads are still theirs to manage. */
  libraryTag?: boolean
}) {
  // Re-render the expiry countdown roughly once a minute rather than
  // computing it once, since demo documents genuinely disappear over the
  // course of a session and a stale "Expires in 2h" would mislead.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!showExpiry) return
    const timer = window.setInterval(() => setTick((n) => n + 1), 60000)
    return () => window.clearInterval(timer)
  }, [showExpiry])

  return (
    <div className="doc-row">
      <button
        type="button"
        className="doc-row-preview"
        disabled={!onPreview || doc.status !== 'ready'}
        onClick={() => onPreview?.(doc)}
        aria-label={doc.status === 'ready' ? `Preview ${doc.filename}` : `${doc.filename} is not ready to preview`}
      >
        <IconFile className="doc-row-icon" />
        <span className="doc-row-body">
          <span className="doc-row-top">
            <span className="doc-row-name" title={doc.filename}>{doc.filename}</span>
            <span className="doc-row-tags">
              {libraryTag && (
                <span className="status status-library">
                  <IconLock />
                  Library
                </span>
              )}
              <StatusBadge status={doc.status} />
            </span>
          </span>
          <span className="doc-row-meta">
            <span>{formatSize(doc.size)}</span>
            {doc.status === 'ready' && <span>{doc.chunkCount} chunk{doc.chunkCount === 1 ? '' : 's'}</span>}
            {doc.status === 'error' && <span className="doc-row-error">{doc.error ?? 'Processing failed.'}</span>}
            {showExpiry && doc.status !== 'error' && (
              <span className="doc-row-expiry">
                <IconClock />
                {formatExpiry(doc.createdAt)}
              </span>
            )}
            {onPreview && doc.status === 'ready' && <span className="doc-row-preview-hint">Open preview</span>}
          </span>
        </span>
      </button>
      {onDelete && (
        <button className="icon-button" onClick={() => onDelete(doc)} aria-label={`Delete ${doc.filename}`}>
          <IconTrash />
        </button>
      )}
    </div>
  )
}
