import { getCashFlowForecast, getMoneyBar } from '@/lib/actions'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { ForecastChart } from './chart'
import { AlertTriangle } from 'lucide-react'

export const metadata = { title: 'Cash forecast' }

const range = (a: Date, b: Date) =>
  `${new Date(a).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(b).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`

export default async function ForecastPage() {
  const [{ weeks, atRiskOverdue, weeklyRecurring, weeklySalaries }, money] = await Promise.all([getCashFlowForecast(), getMoneyBar()])

  const lowest = weeks.reduce((min, w) => (w.closingCash < min.closingCash ? w : min), weeks[0])
  const belowFloor = weeks.filter(w => w.closingCash < money.floor)
  const end = weeks[weeks.length - 1]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash forecast"
        description="13 weeks ahead, updated every Monday (§16.5). Invoices count at their probability; pipeline never counts."
      />

      <StatStrip>
        <Stat label="Cash today" value={formatCurrency(money.cash)} />
        <Stat label="Lowest point" value={formatCurrency(lowest.closingCash)} tone={lowest.closingCash < money.floor ? 'bad' : undefined}
          hint={`Week ${lowest.weekNumber}, ${range(lowest.weekStart, lowest.weekEnd)}`} />
        <Stat label="After 13 weeks" value={formatCurrency(end.closingCash)} tone={end.closingCash >= money.cash ? 'good' : 'warn'}
          hint={`${end.closingCash >= money.cash ? '+' : '−'}${formatCurrency(Math.abs(end.closingCash - money.cash))} from today`} />
        <Stat label="Going out each week" value={formatCurrency(weeklyRecurring + weeklySalaries)}
          hint={`${formatCurrency(weeklyRecurring)} expenses · ${formatCurrency(weeklySalaries)} founder pay`} />
      </StatStrip>

      {(belowFloor.length > 0 || atRiskOverdue > 0) && (
        <div className="space-y-2">
          {belowFloor.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-semibold">Below the {formatCurrency(money.floor)} floor in {belowFloor.length} of 13 weeks</span>
                {' '}(W{belowFloor.map(w => w.weekNumber).join(', W')}). Collect faster, invoice earlier, or ask for bigger advances.
              </p>
            </div>
          )}
          {atRiskOverdue > 0 && (
            <div className="flex gap-3 rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p><span className="font-semibold">{formatCurrency(atRiskOverdue)} is more than 30 days overdue</span> and isn&apos;t counted. Escalate it on Receivables.</p>
            </div>
          )}
        </div>
      )}

      <section className="surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Closing cash by week</h2>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-primary" /> Closing cash</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-good/60" /> Coming in</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-bad/50" /> Going out</span>
          </div>
        </div>
        <div className="mt-4">
          <ForecastChart floor={money.floor} weeks={weeks.map(w => ({
            week: `W${w.weekNumber}`,
            opening: w.openingCash,
            closing: w.closingCash,
            inflow: w.expectedIn,
            outflow: w.expectedOut,
          }))} />
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Week</th>
                <th className="px-4 py-2.5 text-right font-medium">Opening</th>
                <th className="px-4 py-2.5 text-right font-medium">Committed</th>
                <th className="px-4 py-2.5 text-right font-medium">Probable</th>
                <th className="px-4 py-2.5 text-right font-medium">Overdue (chase)</th>
                <th className="px-4 py-2.5 text-right font-medium">Going out</th>
                <th className="px-4 py-2.5 text-right font-medium">Closing</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground/70">Pipeline, not counted</th>
              </tr>
            </thead>
            <tbody className="figure">
              {weeks.map(week => {
                const below = week.closingCash < money.floor
                const dash = <span className="text-muted-foreground/50">—</span>
                return (
                  <tr key={week.weekNumber} className={cn('border-b last:border-0', below && 'bg-bad-soft/50')}>
                    <td className="px-4 py-2.5 font-sans">
                      <span className="font-medium">W{week.weekNumber}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{range(week.weekStart, week.weekEnd)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(week.openingCash)}</td>
                    <td className="px-4 py-2.5 text-right text-good">{week.committedIn > 0 ? `+${formatCurrency(week.committedIn)}` : dash}</td>
                    <td className="px-4 py-2.5 text-right text-good/80">{week.probableIn > 0 ? `+${formatCurrency(week.probableIn)}` : dash}</td>
                    <td className="px-4 py-2.5 text-right text-warn">{week.overdueIn > 0 ? `+${formatCurrency(week.overdueIn)}` : dash}</td>
                    <td className="px-4 py-2.5 text-right">{week.expectedOut > 0 ? `−${formatCurrency(week.expectedOut)}` : dash}</td>
                    <td className={cn('px-4 py-2.5 text-right text-[15px] font-semibold', below && 'text-bad')}>
                      {formatCurrency(week.closingCash)}
                      {below && <Badge variant="danger" className="ml-2 font-sans">Below floor</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground/60">{week.pipelineIn > 0 ? formatCurrency(week.pipelineIn) : dash}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
