import type { SourcePassage } from '@/lib/api'

interface PassageInspectorProps {
  passage: SourcePassage | null
  activeQuote?: string | null
  onClose: () => void
}

export default function PassageInspector({
  passage,
  activeQuote,
  onClose,
}: PassageInspectorProps) {
  if (!passage) return null

  function renderHighlightedContent(content: string, quote?: string | null) {
    if (!quote || !quote.trim()) {
      return (
        <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800 dark:text-zinc-200">
          {content}
        </p>
      )
    }

    const cleanQuote = quote.trim()
    const index = content.toLowerCase().indexOf(cleanQuote.toLowerCase())

    if (index === -1) {
      return (
        <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800 dark:text-zinc-200">
          {content}
        </p>
      )
    }

    const before = content.slice(0, index)
    const match = content.slice(index, index + cleanQuote.length)
    const after = content.slice(index + cleanQuote.length)

    return (
      <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800 dark:text-zinc-200">
        {before}
        <mark className="bg-amber-200 dark:bg-amber-400/30 text-amber-950 dark:text-amber-200 font-semibold px-1 py-0.5 rounded shadow-xs">
          {match}
        </mark>
        {after}
      </p>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal overlay" />

      <div className="relative z-10 h-full w-full max-w-xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-zinc-800 animate-slide-left">
        <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex items-start justify-between bg-gray-50/70 dark:bg-zinc-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-black dark:bg-emerald-600 text-white">
                {passage.ticker}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                {passage.form}
              </span>
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Filed: {passage.filing_date}
              </span>
            </div>
            <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-zinc-100">
              SEC Filing Grounding Passage
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
              Accession: {passage.accession_number} • Chunk #{passage.chunk_index}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {activeQuote && (
          <div className="mx-5 mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
              Cited Claim Quote
            </span>
            <p className="text-xs italic text-amber-950 dark:text-amber-100 font-medium">
              "{activeQuote}"
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">
                Underlying Passage Text
              </span>
              {passage.score !== undefined && passage.score > 0 && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  Relevance: {(passage.score * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {renderHighlightedContent(passage.content, activeQuote)}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex items-center justify-between">
          {passage.source_url.startsWith('http') ? (
            <a
              href={passage.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-emerald-400 hover:underline transition-colors"
            >
              <span>Open Original Filing on SEC EDGAR</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : (
            <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
              Source: {passage.source_url}
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-gray-900 dark:bg-emerald-600 text-white rounded-lg hover:bg-black dark:hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
