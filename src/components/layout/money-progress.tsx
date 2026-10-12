import { formatCurrency } from '@/lib/utils'

// One bar for a contract: collected (green), invoiced but unpaid (amber), not yet billed (grey)
export function MoneyProgress({ total, collected, owed }: { total: number; collected: number; owed: number }) {
  const safe = Math.max(total, collected + owed, 1)
  const paidPct = (collected / safe) * 100
  const owedPct = (owed / safe) * 100
  return (
    <div className="min-w-[140px]">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="bg-good" style={{ width: `${paidPct}%` }} />
        <div className="bg-warn/70" style={{ width: `${owedPct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="figure font-medium text-foreground">{formatCurrency(collected)}</span> of{' '}
        <span className="figure">{formatCurrency(total)}</span>
        {owed > 0 && <span className="text-warn"> · <span className="figure">{formatCurrency(owed)}</span> owed</span>}
      </p>
    </div>
  )
}
