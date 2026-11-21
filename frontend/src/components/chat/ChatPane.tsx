import { useEffect, useRef, useState } from 'react'
import type { Message, SourcePassage, Thread } from '@/lib/api'
import CompanyList, { type Company } from '@/components/CompanyList'
import MessageContent from './MessageContent'

interface ChatPaneProps {
  activeThread: Thread | null
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  sending: boolean
  companies: Company[]
  selectedTicker: string | null
  onSelectTicker: (ticker: string | null) => void
  onSelectCompanyPrompt?: (prompt: string, ticker?: string) => void
  onInspectPassage?: (passage: SourcePassage, quote?: string | null) => void
  onExportBrief?: () => void
  onOpenUpload?: () => void
}

export default function ChatPane({
  activeThread,
  messages,
  onSendMessage,
  sending,
  companies,
  selectedTicker,
  onSelectTicker,
  onSelectCompanyPrompt,
  onInspectPassage,
  onExportBrief,
  onOpenUpload,
}: ChatPaneProps) {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    const text = input
    setInput('')
    await onSendMessage(text)
  }

  function handleCopyMessage(m: Message) {
    const citationLines =
      m.cited_passages && m.cited_passages.length > 0
        ? '\n\nSources:\n' +
          m.cited_passages
            .map(
              (p) =>
                `- ${p.ticker} ${p.form} (${p.filing_date}, Chunk #${p.chunk_index}): ${p.source_url}`,
            )
            .join('\n')
        : ''
    navigator.clipboard.writeText(`${m.content}${citationLines}`).then(() => {
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(null), 1800)
    })
  }

  if (!activeThread) {
    return (
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Powered by Gemini 3.5 Flash-Lite + Hybrid pgvector RAG</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Driftwood Capital Research Copilot
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400 max-w-lg mx-auto">
            Query SEC 10-K & 10-Q filings or upload your own memos for verified, glass-box grounded citations. Press{' '}
            <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700">
              ⌘K
            </kbd>{' '}
            for quick commands.
          </p>
          {onOpenUpload && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
              >
                <span>+ Upload Filing / Memo (.md, .txt, .html)</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <CompanyList
            companies={companies}
            onSelect={(c) => {
              onSelectCompanyPrompt?.(
                `Across ${c.name}'s (${c.ticker}) latest 10-K filings, how did the primary revenue streams and segment profitability change?`,
                c.ticker,
              )
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4.5rem)] bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm truncate">
              {activeThread.title}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              Glass-Box RAG
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
            Started {new Date(activeThread.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExportBrief && messages.length > 0 && (
            <button
              type="button"
              onClick={onExportBrief}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Download thread & verified citations as Markdown"
            >
              <span>Export .md</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-zinc-500 text-sm">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            No messages in this research thread yet. Ask an analyst question below or press{' '}
            <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
              ⌘K
            </kbd>
            .
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user'
            const hasTrace = !isUser && m.traceSteps && m.traceSteps.length > 0
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-black dark:bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-gray-50/90 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-bl-xs border border-gray-200/80 dark:border-zinc-800'
                  }`}
                >
                  {/* Live Glass-Box Agent Reasoning Trace */}
                  {hasTrace && (
                    <div className="mb-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.isStreaming
                                ? 'bg-amber-500 animate-ping'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {m.isStreaming
                              ? 'Agent Research Trace (Live)'
                              : 'Verified Research Trace'}
                          </span>
                        </span>
                        {m.model && m.elapsedMs !== undefined && (
                          <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500">
                            {m.model} · {(m.elapsedMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {m.traceSteps!.map((t, idx) => {
                          const isCurrent = m.isStreaming && idx === m.traceSteps!.length - 1
                          return (
                            <li
                              key={`${t.step}-${idx}`}
                              className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-zinc-300"
                            >
                              <span
                                className={
                                  isCurrent
                                    ? 'text-amber-500 font-bold'
                                    : 'text-emerald-600 dark:text-emerald-400 font-bold'
                                }
                              >
                                {isCurrent ? '◌' : '✓'}
                              </span>
                              <span>{t.label}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {isUser ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <MessageContent content={m.content} isStreaming={m.isStreaming} />
                  )}

                  {/* Interactive Verified Citations Shelf */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 font-semibold mb-2">
                        <svg
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Verified Citations ({m.citations.length})</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {m.citations.map((c, cIdx) => {
                          const passage =
                            c.passage ||
                            m.cited_passages?.find((p) => p.chunk_id === c.chunk_id)

                          const badgeText = passage
                            ? `${passage.ticker} ${passage.form} (Chunk #${passage.chunk_index})`
                            : `Filing Chunk [${c.chunk_id.slice(0, 8)}]`

                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => {
                                if (passage && onInspectPassage) {
                                  onInspectPassage(passage, c.quote)
                                }
                              }}
                              className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                passage
                                  ? 'bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 hover:border-black dark:hover:border-emerald-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:shadow-xs cursor-pointer'
                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 cursor-default'
                              }`}
                              title={
                                c.quote
                                  ? `Quote: "${c.quote}"`
                                  : 'Click to inspect underlying passage'
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="font-semibold">{badgeText}</span>
                              {passage && (
                                <svg
                                  className="w-3 h-3 text-gray-400 group-hover:text-black dark:group-hover:text-emerald-400 transition-colors"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assistant Action Footer */}
                  {!isUser && !m.isStreaming && m.content && (
                    <div className="mt-3 pt-2 border-t border-gray-200/70 dark:border-zinc-800/80 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m)}
                        className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        {copiedId === m.id ? '✓ Copied with citations' : 'Copy with citations'}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ticker Scope Chips + Input Composer */}
      <div className="border-t border-gray-200 dark:border-zinc-800 p-4 bg-gray-50/70 dark:bg-zinc-900/70 space-y-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 mr-1">
            Focus:
          </span>
          <button
            type="button"
            onClick={() => onSelectTicker(null)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedTicker === null
                ? 'bg-black dark:bg-emerald-600 text-white'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-gray-400'
            }`}
          >
            All Filings
          </button>
          {companies.map((c) => {
            const active = selectedTicker === c.ticker
            return (
              <button
                key={c.ticker}
                type="button"
                onClick={() => onSelectTicker(active ? null : c.ticker)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-black dark:bg-emerald-600 text-white'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-gray-400'
                }`}
              >
                {c.ticker}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedTicker
                ? `Ask a grounded question about ${selectedTicker} filings...`
                : 'Ask an SEC filing research question (or press ⌘K for analyst prompts)...'
            }
            className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-emerald-500 shadow-xs transition-shadow"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="rounded-lg bg-black dark:bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Send</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
