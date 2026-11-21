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
    <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/80 flex flex-col h-[calc(100vh-4.5rem)] shrink-0">
      <div className="p-3.5 border-b border-gray-200 dark:border-zinc-800 space-y-2">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-black dark:bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-emerald-500 transition-colors cursor-pointer"
        >
          <span>+</span>
          <span>New Research Chat</span>
        </button>

        {onOpenUpload && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span>Upload Filing / Memo</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
          Your Research Threads
        </div>

        {loading && (
          <p className="px-2 py-3 text-xs text-gray-400 dark:text-zinc-500">
            Loading threads...
          </p>
        )}

        {!loading && threads.length === 0 && (
          <p className="px-2 py-3 text-xs text-gray-400 dark:text-zinc-500">
            No chats yet. Start one above!
          </p>
        )}

        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId
          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                isActive
                  ? 'bg-white dark:bg-zinc-800 font-medium text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-700'
                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className="truncate flex-1">{thread.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteThread(thread.id)
                }}
                className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity p-0.5 cursor-pointer"
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
