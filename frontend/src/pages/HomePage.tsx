import { useCallback, useEffect, useState } from 'react'
import CommandPalette from '@/components/CommandPalette'
import UploadDocumentModal from '@/components/UploadDocumentModal'
import ChatPane from '@/components/chat/ChatPane'
import PassageInspector from '@/components/chat/PassageInspector'
import ThreadSidebar from '@/components/chat/ThreadSidebar'
import {
  api,
  type Company,
  type CorpusStats,
  type Message,
  type SourcePassage,
  type Thread,
} from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const [health, setHealth] = useState<string | null>(null)
  const [corpusStats, setCorpusStats] = useState<CorpusStats | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('dc-theme') === 'dark'
  })
  const [activePassage, setActivePassage] = useState<{
    passage: SourcePassage
    quote?: string | null
  } | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('dc-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const fetchThreads = useCallback(() => {
    return api.threads
      .list()
      .then(setThreads)
      .catch((e: unknown) => console.error('Failed to load threads', e))
  }, [])

  const fetchCorpusStats = useCallback(() => {
    return api.documents
      .stats()
      .then(setCorpusStats)
      .catch(() => {
        // Non-blocking telemetry
      })
  }, [])

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then((data) => setHealth(data.status))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Backend unreachable'),
      )

    fetchCorpusStats()

    api
      .get<{ id: string; email: string }>('/me')
      .then((data) => setUser(data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to fetch user profile'),
      )

    api
      .get<Company[]>('/companies')
      .then((data) => setCompanies(data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to fetch companies'),
      )

    api.threads
      .list()
      .then(setThreads)
      .catch((e: unknown) => console.error('Failed to load threads', e))
      .finally(() => setLoadingThreads(false))
  }, [fetchCorpusStats])

  async function handleSelectThread(thread: Thread) {
    setActiveThread(thread)
    try {
      const msgs = await api.threads.listMessages(thread.id)
      setMessages(msgs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load thread messages')
    }
  }

  async function handleNewThread(initialPrompt?: string, tickerOverride?: string) {
    try {
      const newThread = await api.threads.create(
        initialPrompt ? initialPrompt.slice(0, 30) : 'New Research Chat',
      )
      setThreads((prev) => [newThread, ...prev])
      setActiveThread(newThread)
      setMessages([])
      if (tickerOverride !== undefined) {
        setSelectedTicker(tickerOverride)
      }

      if (initialPrompt) {
        await handleSendMessage(initialPrompt, newThread.id, tickerOverride ?? selectedTicker)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create thread')
    }
  }

  async function handleDeleteThread(threadId: string) {
    try {
      await api.threads.delete(threadId)
      setThreads((prev) => prev.filter((t) => t.id !== threadId))
      if (activeThread?.id === threadId) {
        setActiveThread(null)
        setMessages([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete thread')
    }
  }

  async function handleSendMessage(
    content: string,
    threadIdOverride?: string,
    tickerOverride?: string | null,
  ) {
    const threadId = threadIdOverride || activeThread?.id
    if (!threadId) return

    const activeTicker = tickerOverride !== undefined ? tickerOverride : selectedTicker
    setSending(true)

    const userMsg: Message = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      citations: [],
    }

    const assistantPlaceholderId = crypto.randomUUID()
    const assistantPlaceholder: Message = {
      id: assistantPlaceholderId,
      thread_id: threadId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      citations: [],
      isStreaming: true,
      traceSteps: [],
    }

    const updatedHistory = [...messages, userMsg]
    setMessages([...updatedHistory, assistantPlaceholder])

    try {
      await api.threads.stream(
        threadId,
        updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        {
          onStatus: (step) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, traceSteps: [...(m.traceSteps || []), step] }
                  : m,
              ),
            )
          },
          onTextDelta: (delta: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, content: m.content + delta }
                  : m,
              ),
            )
          },
          onCitations: (citations, citedPassages) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, citations, cited_passages: citedPassages }
                  : m,
              ),
            )
          },
          onDone: ({ message_id, elapsed_ms, model, passages_scanned }) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      id: message_id,
                      isStreaming: false,
                      elapsedMs: elapsed_ms,
                      model,
                      passagesScanned: passages_scanned,
                    }
                  : m,
              ),
            )
            fetchThreads()
          },
          onError: (errMsg: string) => {
            setError(errMsg)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content:
                        m.content ||
                        'Error: could not generate grounded response from SEC filings.',
                      isStreaming: false,
                    }
                  : m,
              ),
            )
          },
        },
        activeTicker,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Streaming chat request failed')
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantPlaceholderId
            ? {
                ...m,
                content: m.content || 'Failed to complete chat stream.',
                isStreaming: false,
              }
            : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  function handleExportBrief() {
    if (!activeThread || messages.length === 0) return
    const lines: string[] = [
      `# ${activeThread.title}`,
      '',
      `Exported from Document Copilot (Gemini 3.5 Flash-Lite) on ${new Date().toLocaleString()}`,
      '',
    ]

    for (const m of messages) {
      lines.push(`## ${m.role === 'user' ? 'Analyst Question' : 'Grounded Copilot Answer'}`)
      lines.push('')
      lines.push(m.content)
      lines.push('')
      if (m.cited_passages && m.cited_passages.length > 0) {
        lines.push('### Verified Sources')
        for (const p of m.cited_passages) {
          lines.push(
            `- **${p.ticker} ${p.form}** (Filed ${p.filing_date}, Accession \`${p.accession_number}\`, Chunk #${p.chunk_index}) — ${p.source_url}`,
          )
        }
        lines.push('')
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeThread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'research-brief'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Slim Minimal Top Bar */}
      <header className="h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveThread(null)
              setMessages([])
            }}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <span className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center text-xs font-bold tracking-tighter">
              DC
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Document Copilot
            </span>
          </button>

          {health && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {corpusStats
                  ? `${corpusStats.source_documents} docs · ${corpusStats.document_chunks} chunks`
                  : 'Corpus online'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
            title="Command Palette (Cmd+K / Ctrl+K)"
          >
            <span>Search</span>
            <kbd className="rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.5 text-[10px] font-mono leading-none">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07l-.71.71M6.34 17.66l-.71.71m12.73 0l-.71-.71M6.34 6.34l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {user && (
            <span className="hidden md:inline-block text-xs text-zinc-500 dark:text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800 max-w-[180px] truncate">
              {user.email}
            </span>
          )}

          <button
            onClick={handleSignOut}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        <ThreadSidebar
          threads={threads}
          activeThreadId={activeThread?.id || null}
          onSelectThread={handleSelectThread}
          onNewThread={() => handleNewThread()}
          onDeleteThread={handleDeleteThread}
          onOpenUpload={() => setUploadOpen(true)}
          loading={loadingThreads}
        />

        <ChatPane
          activeThread={activeThread}
          messages={messages}
          onSendMessage={handleSendMessage}
          sending={sending}
          companies={companies}
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
          onSelectCompanyPrompt={(prompt, ticker) => handleNewThread(prompt, ticker)}
          onInspectPassage={(passage, quote) => setActivePassage({ passage, quote })}
          onExportBrief={handleExportBrief}
        />
      </div>

      {/* Modals & Drawers */}
      <PassageInspector
        passage={activePassage?.passage ?? null}
        activeQuote={activePassage?.quote}
        onClose={() => setActivePassage(null)}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        threads={threads}
        darkMode={darkMode}
        hasActiveThread={Boolean(activeThread && messages.length > 0)}
        onNewThread={() => handleNewThread()}
        onSelectThread={handleSelectThread}
        onRunPrompt={(prompt) => handleNewThread(prompt)}
        onOpenUpload={() => setUploadOpen(true)}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onExportBrief={handleExportBrief}
      />

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          fetchCorpusStats()
        }}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 dark:bg-zinc-800 border border-red-500/40 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 z-50">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-1 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
