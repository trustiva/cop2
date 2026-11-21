export type Company = {
  ticker: string
  name: string
  cik?: string
}

type CompanyListProps = {
  companies: Company[]
  onSelect?: (company: Company) => void
}

export default function CompanyList({ companies, onSelect }: CompanyListProps) {
  if (companies.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        No companies indexed yet.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Tracked Companies
        </h3>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
          Click to start research
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {companies.map((company) => (
          <button
            key={company.ticker}
            type="button"
            onClick={() => onSelect?.(company)}
            className="group flex items-center justify-between rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 px-4 py-3.5 text-left hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {company.ticker}
                </span>
                {company.cik && (
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
                    {company.cik}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {company.name}
              </p>
            </div>
            <span className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all text-sm">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
