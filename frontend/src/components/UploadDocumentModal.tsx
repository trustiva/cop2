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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              Index Document with Gemini Embeddings
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Drop a `.md`, `.txt`, or `.html` filing/memo to chunk & embed with `gemini-embedding-2`.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Ticker / Tag
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL, NVDA, CUSTOM"
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Document Type
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="10-K">10-K Filing</option>
                <option value="10-Q">10-Q Filing</option>
                <option value="EARNINGS">Earnings Call / Release</option>
                <option value="NOTE">Research Memo / Note</option>
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
            className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 bg-gray-50/50 dark:bg-zinc-950/50'
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
            <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
              {filename ? `Loaded: ${filename}` : 'Drop a filing or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports HTML SEC filings, Markdown, or plain text
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              Or Paste Document Text
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste earnings highlights, 10-K excerpts, or research notes..."
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-mono text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
              Indexed <strong>{success.chunks_created} chunks</strong> for {success.ticker} ({success.form}). Corpus now has {success.total_documents} docs & {success.total_chunks} chunks.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={uploading || !content.trim()}
              className="rounded-lg bg-black dark:bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 dark:hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? 'Chunking & Embedding...' : 'Index into Corpus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
