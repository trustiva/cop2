import React from 'react'

interface MessageContentProps {
  content: string
  isStreaming?: boolean
}

export default function MessageContent({ content, isStreaming }: MessageContentProps) {
  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span
          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    )
  }

  const blocks = parseMarkdownBlocks(content)

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-gray-900 dark:text-zinc-100">
      {blocks.map((b, idx) => (
        <React.Fragment key={idx}>{renderBlock(b)}</React.Fragment>
      ))}
      {isStreaming && (
        <span className="inline-block w-2 h-3.5 bg-gray-800 dark:bg-emerald-400 ml-0.5 animate-pulse rounded-xs align-middle" />
      )}
    </div>
  )
}

type Block =
  | { type: 'header'; level: number; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'header', level: 3, text: trimmed.slice(4) })
      i++
      continue
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'header', level: 2, text: trimmed.slice(3) })
      i++
      continue
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'header', level: 1, text: trimmed.slice(2) })
      i++
      continue
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim())
        i++
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())

        const headers = parseRow(tableLines[0])
        const rows = tableLines.slice(2).map(parseRow)
        blocks.push({ type: 'table', headers, rows })
        continue
      }
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = []
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    const pLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ')
    ) {
      pLines.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', text: pLines.join(' ') })
  }

  return blocks
}

function renderBlock(block: Block) {
  switch (block.type) {
    case 'header': {
      if (block.level === 1)
        return (
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 mt-2">
            {renderInline(block.text)}
          </h2>
        )
      if (block.level === 2)
        return (
          <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-2">
            {renderInline(block.text)}
          </h3>
        )
      return (
        <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wide mt-1.5">
          {renderInline(block.text)}
        </h4>
      )
    }

    case 'table':
      return (
        <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-xs">
            <thead className="bg-gray-100/90 dark:bg-zinc-800/80 font-semibold text-gray-900 dark:text-zinc-100">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left tracking-wider">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
              {block.rows.map((r, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx % 2 === 0
                      ? 'bg-white dark:bg-zinc-950'
                      : 'bg-gray-50/50 dark:bg-zinc-900/60'
                  }
                >
                  {r.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-1.5 whitespace-nowrap text-gray-700 dark:text-zinc-300"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 my-2">
          {block.items.map((item, idx) => (
            <li key={idx} className="text-gray-800 dark:text-zinc-200">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )

    case 'paragraph':
      return <p className="leading-relaxed">{renderInline(block.text)}</p>
  }
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-gray-900 dark:text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-gray-200/70 dark:bg-zinc-800 px-1 py-0.5 font-mono text-xs text-gray-900 dark:text-emerald-300"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
