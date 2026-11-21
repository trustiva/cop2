import type { Thread } from '@/lib/api'

interface ThreadSidebarProps {
  threads: Thread[]
  activeThreadId: string | null
  onSelectThread: (thread: Thread) => void
  onNewThread: () => void
  onDeleteThread: (threadId: string) => void
  onOpenUpload?: () => void
  loading?: boolean
}

export default function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onOpenUpload,
  loading,
}: ThreadSidebarProps) {
  return (
    <aside className="w-60 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950 flex flex-col h-[calc(100vh-3.5rem)] shrink-0">
      <div className="p-3 space-y-1.5">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>

        {onOpenUpload && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>Upload Filing</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-0.5">
        <div className="px-2.5 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          Threads
        </div>

        {loading && (
          <p className="px-2.5 py-2 text-xs text-zinc-400 dark:text-zinc-600">Loading...</p>
        )}

        {!loading && threads.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-zinc-400 dark:text-zinc-600">
            No research threads yet.
          </p>
        )}

        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId
          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-zinc-200/70 dark:bg-zinc-900 font-medium text-zinc-950 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="truncate flex-1">{thread.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteThread(thread.id)
                }}
                className="opacity-0 group-hover:opacity-100 ml-1.5 text-zinc-400 hover:text-red-500 transition-opacity px-1 cursor-pointer"
                title="Delete thread"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
