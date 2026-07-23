import { useState, useRef } from 'react'
import { api } from '../api/client'

export function DocumentUploader({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.postForm('/api/documents', form)
      onUploaded(res.id)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
        }}
      />
      {busy && <p className="muted">Uploading and processing. This can take a moment.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
