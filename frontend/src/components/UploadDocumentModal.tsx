import { useRef, useState } from 'react'
import { api, type UploadDocumentResponse } from '@/lib/api'

interface UploadDocumentModalProps {
  open: boolean
  onClose: () => void
  onUploaded: (result: UploadDocumentResponse) => void
}

export default function UploadDocumentModal({
  open,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const [ticker, setTicker] = useState('CUSTOM')
  const [form, setForm] = useState('10-K')
  const [filename, setFilename] = useState('')
  const [content, setContent] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<UploadDocumentResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!open) return null

  function handleFile(file: File) {
    setError(null)
    setSuccess(null)
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setContent(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => setError('Could not read file contents.')
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError('Upload a file or paste document text first.')
      return
    }
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.documents.upload({
        filename: filename.trim() || `${ticker.toLowerCase()}-${form.toLowerCase()}.md`,
        content,
        ticker: ticker.trim() || 'CUSTOM',
        form: form.trim() || 'NOTE',
      })
      setSuccess(res)
      onUploaded(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document ingestion failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Index Document
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Chunk & embed HTML, Markdown, or text via{' '}
              <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                gemini-embedding-2
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Ticker / Tag
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL, NVDA, CUSTOM"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Document Type
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              >
                <option value="10-K">10-K Filing</option>
                <option value="10-Q">10-Q Filing</option>
                <option value="EARNINGS">Earnings Release</option>
                <option value="NOTE">Research Memo</option>
              </select>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) handleFile(dropped)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border border-dashed p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-zinc-900 dark:border-zinc-200 bg-zinc-100/70 dark:bg-zinc-900'
                : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.html,.htm,text/plain,text/markdown,text/html"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <svg
              className="w-5 h-5 mx-auto mb-2 text-zinc-400 dark:text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {filename ? filename : 'Drop a file here or click to browse'}
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              HTML, Markdown, or plain text
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Or paste text directly
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste earnings excerpts or research notes..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
              Indexed <strong>{success.chunks_created} chunks</strong> for {success.ticker} ({success.form}).
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !content.trim()}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              {uploading ? 'Indexing...' : 'Index Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
