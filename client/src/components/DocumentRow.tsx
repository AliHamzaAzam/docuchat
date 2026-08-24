import { useEffect, useState } from 'react'
import { IconCheck, IconClock, IconFile, IconTrash } from './Icon'

export type DocumentSummary = {
  id: string
  filename: string
  status: 'processing' | 'ready' | 'error'
  error: string | null
  chunkCount: number
  size: number
  createdAt: string
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
  showExpiry = false,
}: {
  doc: DocumentSummary
  onDelete?: (doc: DocumentSummary) => void
  showExpiry?: boolean
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
      <IconFile className="doc-row-icon" />
      <div className="doc-row-body">
        <div className="doc-row-top">
          <div className="doc-row-name" title={doc.filename}>
            {doc.filename}
          </div>
          <StatusBadge status={doc.status} />
        </div>
        <div className="doc-row-meta">
          <span>{formatSize(doc.size)}</span>
          {doc.status === 'ready' && <span>{doc.chunkCount} chunk{doc.chunkCount === 1 ? '' : 's'}</span>}
          {doc.status === 'error' && <span className="doc-row-error">{doc.error ?? 'Processing failed.'}</span>}
          {showExpiry && doc.status !== 'error' && (
            <span className="doc-row-expiry">
              <IconClock />
              {formatExpiry(doc.createdAt)}
            </span>
          )}
        </div>
      </div>
      {onDelete && (
        <button className="icon-button" onClick={() => onDelete(doc)} aria-label={`Delete ${doc.filename}`}>
          <IconTrash />
        </button>
      )}
    </div>
  )
}
