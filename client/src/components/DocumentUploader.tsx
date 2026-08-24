import { useRef, useState, type DragEvent } from 'react'
import { api, ApiError } from '../api/client'
import { IconUpload } from './Icon'

const ACCEPT = '.pdf,.docx,.txt'
const ACCEPT_LABEL = 'PDF, DOCX, or TXT'

export type UploadedDocument = { id: string; filename: string; status: 'processing' | 'ready' | 'error' }

/**
 * Caps to enforce client-side for a snappier no-round-trip rejection. The
 * server is the source of truth (413 over size, 409 over count); this only
 * saves a request for the common case.
 */
export type UploadCaps = {
  maxBytes: number
  atCapacity: boolean
  capacityLabel: string
}

export function DocumentUploader({
  onUploaded,
  caps,
}: {
  onUploaded: (doc: UploadedDocument) => void
  caps?: UploadCaps
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function validate(file: File): string | null {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      return `${ACCEPT_LABEL} files only. "${file.name}" isn't one of those.`
    }
    if (caps && file.size > caps.maxBytes) {
      const limitMb = (caps.maxBytes / (1024 * 1024)).toFixed(0)
      return `"${file.name}" is over the ${limitMb} MB demo limit.`
    }
    return null
  }

  async function upload(file: File) {
    if (caps?.atCapacity) {
      setError(caps.capacityLabel)
      return
    }
    const problem = validate(file)
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.postForm('/api/documents', form)
      onUploaded(res)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Uploads are rate limited right now. Try again in a few minutes.')
      } else {
        setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  const disabled = busy || caps?.atCapacity === true

  return (
    <div className="uploader">
      <label
        className={`uploader-drop${dragging ? ' dragging' : ''}${disabled ? ' disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={disabled ? (e) => e.preventDefault() : onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
          }}
        />
        <IconUpload className="uploader-icon" />
        <span className="uploader-label">
          {busy ? 'Uploading...' : caps?.atCapacity ? caps.capacityLabel : <><strong>Choose a file</strong> or drop it here</>}
        </span>
        <span className="uploader-hint">{ACCEPT_LABEL}{caps ? ` · up to ${(caps.maxBytes / (1024 * 1024)).toFixed(0)} MB` : ''}</span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}
