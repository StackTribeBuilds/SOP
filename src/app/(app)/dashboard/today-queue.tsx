'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { TodayItem } from '@/lib/actions'

const GROUP_ORDER: TodayItem['group'][] = ['Collect', 'Send', 'Follow up', 'Unblock', 'Waiting on client', 'Team']

const SEVERITY = [
  { bar: 'bg-border', label: 'Watch' },
  { bar: 'bg-warn', label: 'Today' },
  { bar: 'bg-bad', label: 'Now' },
]

export function TodayQueue({ items }: { items: TodayItem[] }) {
  const [filter, setFilter] = useState<TodayItem['group'] | 'All'>('All')
  const counts = GROUP_ORDER.map(g => ({ group: g, count: items.filter(i => i.group === g).length })).filter(g => g.count > 0)
  const shown = filter === 'All' ? items : items.filter(i => i.group === filter)

  return (
    <section className="surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">Needs action</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
          {[{ group: 'All' as const, count: items.length }, ...counts].map(({ group, count }) => (
            <button
              key={group}
              type="button"
              onClick={() => setFilter(group)}
              aria-pressed={filter === group}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                filter === group ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {group} <span className="figure ml-0.5 opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <CheckCircle2 className="h-6 w-6 text-good" />
          <p className="font-medium">Nothing waiting on you</p>
          <p className="text-sm text-muted-foreground">Use the sales block for outbound and follow-ups (§19.1).</p>
        </div>
      ) : (
        <ul className="divide-y">
          {shown.map(item => (
            <li key={item.id} className="group relative flex items-center gap-4 px-5 py-3 hover:bg-muted/40">
              <span className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-r', SEVERITY[item.severity].bar)}
                title={SEVERITY[item.severity].label} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground w-[7.5rem] hidden sm:inline">{item.group}</span>
                  <p className="truncate text-sm font-medium">{item.title}</p>
                </div>
                <p className="truncate text-xs text-muted-foreground sm:pl-[8rem]">{item.context}</p>
              </div>
              {item.amount != null && (
                <span className="figure hidden shrink-0 text-[15px] font-semibold sm:block">{formatCurrency(item.amount)}</span>
              )}
              <Link
                href={item.href}
                className="shrink-0 rounded-md border bg-card px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary"
              >
                {item.action}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
