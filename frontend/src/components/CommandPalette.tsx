import { useEffect, useMemo, useState } from 'react'
import type { Thread } from '@/lib/api'

interface CommandItem {
  id: string
  category: 'Actions' | 'Analyst Prompts' | 'Recent Threads'
  label: string
  hint?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  threads: Thread[]
  darkMode: boolean
  hasActiveThread: boolean
  onNewThread: () => void
  onSelectThread: (thread: Thread) => void
  onRunPrompt: (prompt: string) => void
  onOpenUpload: () => void
  onToggleTheme: () => void
  onExportBrief: () => void
}

const ANALYST_PROMPTS = [
  {
    label: 'Apple: iPhone vs Services revenue & margin mix',
    hint: 'AAPL 10-K',
    prompt:
      "Compare Apple's (AAPL) iPhone and Services net sales growth and gross margin trends across its latest 10-K filings.",
  },
  {
    label: 'NVIDIA: Data Center growth & customer concentration risks',
    hint: 'NVDA 10-K',
    prompt:
      "What do NVIDIA's (NVDA) latest 10-K filings disclose about Data Center revenue drivers and customer or supply concentration risks?",
  },
  {
    label: 'Microsoft: Intelligent Cloud & AI infrastructure CapEx',
    hint: 'MSFT 10-K',
    prompt:
      "Summarize Microsoft's (MSFT) Intelligent Cloud performance and capital expenditure disclosures related to AI infrastructure.",
  },
  {
    label: 'Amazon: AWS operating margins vs Retail segments',
    hint: 'AMZN 10-K',
    prompt:
      "How did AWS revenue and operating income compare to Amazon's (AMZN) North America and International segments in the latest 10-K?",
  },
]

export default function CommandPalette({
  open,
  onClose,
  threads,
  darkMode,
  hasActiveThread,
  onNewThread,
  onSelectThread,
  onRunPrompt,
  onOpenUpload,
  onToggleTheme,
  onExportBrief,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const items = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      {
        id: 'new-chat',
        category: 'Actions',
        label: 'New Research Chat',
        hint: 'Start fresh thread',
        action: () => {
          onNewThread()
          onClose()
        },
      },
      {
        id: 'upload-doc',
        category: 'Actions',
        label: 'Upload Document to Gemini RAG Corpus',
        hint: '.md / .txt / .html',
        action: () => {
          onOpenUpload()
          onClose()
        },
      },
      {
        id: 'toggle-theme',
        category: 'Actions',
        label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        hint: 'Theme',
        action: () => {
          onToggleTheme()
          onClose()
        },
      },
    ]

    if (hasActiveThread) {
      base.push({
        id: 'export-brief',
        category: 'Actions',
        label: 'Export Current Research Thread as Markdown (.md)',
        hint: 'With verified citations',
        action: () => {
          onExportBrief()
          onClose()
        },
      })
    }

    const promptItems: CommandItem[] = ANALYST_PROMPTS.map((p, idx) => ({
      id: `prompt-${idx}`,
      category: 'Analyst Prompts',
      label: p.label,
      hint: p.hint,
      action: () => {
        onRunPrompt(p.prompt)
        onClose()
      },
    }))

    const threadItems: CommandItem[] = threads.slice(0, 6).map((t) => ({
      id: `thread-${t.id}`,
      category: 'Recent Threads',
      label: t.title,
      hint: new Date(t.updated_at).toLocaleDateString(),
      action: () => {
        onSelectThread(t)
        onClose()
      },
    }))

    const all = [...base, ...promptItems, ...threadItems]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.hint && item.hint.toLowerCase().includes(q)),
    )
  }, [
    query,
    threads,
    darkMode,
    hasActiveThread,
    onNewThread,
    onSelectThread,
    onRunPrompt,
    onOpenUpload,
    onToggleTheme,
    onExportBrief,
    onClose,
  ])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (items.length ? (i + 1) % items.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        e.preventDefault()
        items[selectedIndex].action()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, items, selectedIndex, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-xs animate-fade-in px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-800 px-4 py-3.5">
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z"
            />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, analyst prompts, or research threads..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="rounded border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 dark:text-zinc-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">No matching commands found.</p>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const showCategory = idx === 0 || items[idx - 1].category !== item.category
              return (
                <div key={item.id}>
                  {showCategory && (
                    <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      {item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={item.action}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gray-900 text-white dark:bg-emerald-600 dark:text-white'
                        : 'text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate pr-3">{item.label}</span>
                    {item.hint && (
                      <span
                        className={`text-[11px] font-mono shrink-0 ${
                          isSelected
                            ? 'text-gray-300 dark:text-emerald-100'
                            : 'text-gray-400 dark:text-zinc-500'
                        }`}
                      >
                        {item.hint}
                      </span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
