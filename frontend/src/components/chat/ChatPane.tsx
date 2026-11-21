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
      <div className="flex-1 overflow-y-auto px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-3">
            <p className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Gemini 3.5 Flash-Lite · Hybrid pgvector RAG</span>
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Research filings with verified proof.
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Ask questions across SEC 10-K filings or uploaded memos. Every claim is grounded to inspectable source passages.
            </p>
          </div>

          <div className="mt-10">
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
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-white dark:bg-zinc-950">
      {/* Minimal Thread Subheader */}
      <div className="border-b border-zinc-200/70 dark:border-zinc-800/70 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">
            {activeThread.title}
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
            {new Date(activeThread.created_at).toLocaleDateString()}
          </span>
        </div>

        {onExportBrief && messages.length > 0 && (
          <button
            type="button"
            onClick={onExportBrief}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
            title="Download thread & verified citations as Markdown"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export .md</span>
          </button>
        )}
      </div>

      {/* Centered Editorial Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-sm">
              Ask a question below, or press{' '}
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                ⌘K
              </kbd>{' '}
              for analyst prompts.
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user'
              const hasTrace = !isUser && m.traceSteps && m.traceSteps.length > 0

              if (isUser) {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-xl rounded-2xl rounded-br-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-4 py-3 text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={m.id} className="space-y-3">
                  {/* Minimal Glass-Box Agent Trace */}
                  {hasTrace && (
                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.isStreaming
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {m.isStreaming ? 'Researching filings...' : 'Verified research trace'}
                          </span>
                        </span>
                        {m.model && m.elapsedMs !== undefined && (
                          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            {m.model} · {(m.elapsedMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <ul className="mt-1.5 space-y-0.5 pl-3.5">
                        {m.traceSteps!.map((t, idx) => {
                          const isCurrent = m.isStreaming && idx === m.traceSteps!.length - 1
                          return (
                            <li
                              key={`${t.step}-${idx}`}
                              className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400"
                            >
                              <span
                                className={
                                  isCurrent
                                    ? 'text-amber-500'
                                    : 'text-emerald-600 dark:text-emerald-400'
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

                  {/* Editorial Assistant Response */}
                  <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/40 dark:bg-zinc-900/40 px-5 py-4">
                    <MessageContent content={m.content} isStreaming={m.isStreaming} />

                    {/* Minimal Verified Citations Bar */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mr-1">
                            Sources:
                          </span>
                          {m.citations.map((c, cIdx) => {
                            const passage =
                              c.passage ||
                              m.cited_passages?.find((p) => p.chunk_id === c.chunk_id)

                            const badgeText = passage
                              ? `${passage.ticker} ${passage.form} · #${passage.chunk_index}`
                              : `Chunk ${c.chunk_id.slice(0, 6)}`

                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => {
                                  if (passage && onInspectPassage) {
                                    onInspectPassage(passage, c.quote)
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors ${
                                  passage
                                    ? 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-default'
                                }`}
                                title={
                                  c.quote
                                    ? `Quote: "${c.quote}"`
                                    : 'Inspect underlying passage'
                                }
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{badgeText}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Subtle Metadata + Copy Footer */}
                    {!m.isStreaming && m.content && (
                      <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m)}
                          className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {copiedId === m.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Centered Floating Composer */}
      <div className="px-6 pb-5 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            <button
              type="button"
              onClick={() => onSelectTicker(null)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                selectedTicker === null
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              All
            </button>
            {companies.map((c) => {
              const active = selectedTicker === c.ticker
              return (
                <button
                  key={c.ticker}
                  type="button"
                  onClick={() => onSelectTicker(active ? null : c.ticker)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  {c.ticker}
                </button>
              )
            })}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 px-3 py-2 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-xs"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedTicker
                  ? `Ask about ${selectedTicker} filings...`
                  : 'Ask an SEC filing question...'
              }
              className="flex-1 bg-transparent px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="rounded-xl bg-zinc-900 dark:bg-zinc-100 p-2 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-30 transition-colors cursor-pointer shrink-0"
              title="Send message"
            >
              {sending ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
