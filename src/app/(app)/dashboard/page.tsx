import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getMoneyBar, getTodayData } from '@/lib/actions'
import { cn, formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { TodayQueue } from './today-queue'
import { UpdateBalanceDialog } from './quick-actions'

export const metadata = { title: 'Today' }

const ZONE_COPY = {
  GREEN: { tone: 'text-good', bar: 'bg-good', advice: 'Healthy reserve. Operate normally.' },
  YELLOW: { tone: 'text-warn', bar: 'bg-warn', advice: 'Near the floor. Freeze unnecessary spending and push collections (§16.4).' },
  RED: { tone: 'text-bad', bar: 'bg-bad', advice: 'Below the floor. Stop discretionary withdrawals, collect aggressively, ask for advances (§16.4).' },
}

export default async function TodayPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const role = session.user.role
  if (role === 'BDE' || role === 'BUSINESS_ANALYST') redirect('/bde')

  const [today, money] = await Promise.all([getTodayData(), getMoneyBar()])

  const now = new Date()
  const hour = Number(now.toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateLine = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })
  const urgent = today.items.filter(i => i.severity === 2).length

  const zone = ZONE_COPY[money.zone]
  // Bar runs to 2× the floor so the floor sits in the middle
  const scale = Math.max(money.floor * 2, money.cash, 1)
  const cashPct = Math.max(0, Math.min(100, (money.cash / scale) * 100))
  const floorPct = (money.floor / scale) * 100
  const maxStage = Math.max(...today.pipelineByStage.map(s => s.value), 1)
  const firstName = session.user.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={
          today.items.length === 0
            ? `${dateLine}. Nothing is waiting on you.`
            : `${dateLine}. ${today.items.length} thing${today.items.length === 1 ? '' : 's'} need you${urgent ? `, ${urgent} of them now` : ''}.`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <TodayQueue items={today.items} />

        <div className="space-y-6">
          {/* Cash position against the floor (§16.3–16.4) */}
          <section className="surface overflow-hidden p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Cash position</h2>
                <p className={cn('mt-0.5 text-xs', zone.tone)}>{zone.advice}</p>
              </div>
              <UpdateBalanceButton />
            </div>
            <p className="figure mt-4 text-[32px] font-semibold leading-none">{formatCurrency(money.cash)}</p>
            <div className="relative mt-3 h-2 rounded-full bg-muted" aria-hidden>
              <div className={cn('h-2 rounded-full', zone.bar)} style={{ width: `${cashPct}%` }} />
              <div className="absolute -top-1 h-4 w-px bg-foreground/60" style={{ left: `${floorPct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Floor {formatCurrency(money.floor)}
            </p>

            <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Expected in this week</dt>
                <dd className="figure font-semibold text-good">+{formatCurrency(today.thisWeek.expectedIn)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Going out this week</dt>
                <dd className="figure font-semibold">−{formatCurrency(today.thisWeek.expectedOut)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Lowest point in 13 weeks</dt>
                <dd className={cn('figure font-semibold', today.lowestWeek.closingCash < money.floor && 'text-bad')}>
                  {formatCurrency(today.lowestWeek.closingCash)}
                  <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                    W{today.lowestWeek.weekNumber}
                  </span>
                </dd>
              </div>
              {today.atRiskOverdue > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Overdue 30+ days (not counted)</dt>
                  <dd className="figure font-semibold text-bad">{formatCurrency(today.atRiskOverdue)}</dd>
                </div>
              )}
            </dl>
            <Link href="/finance/forecast" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">
              Open 13-week forecast
            </Link>
          </section>

          {/* Pipeline by stage */}
          <section className="surface overflow-hidden p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">Pipeline</h2>
              <span className="figure text-sm text-muted-foreground">{formatCurrency(money.weightedPipeline)} weighted</span>
            </div>
            <ul className="mt-4 space-y-3">
              {today.pipelineByStage.map(s => (
                <li key={s.stage}>
                  <div className="flex justify-between text-xs">
                    <span>{s.stage.charAt(0) + s.stage.slice(1).toLowerCase()} <span className="text-muted-foreground">· {s.count}</span></span>
                    <span className="figure font-medium">{formatCurrency(s.value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${(s.value / maxStage) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/leads/kanban" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">Open lead board</Link>
          </section>

          {/* Money that actually arrived */}
          <section className="surface overflow-hidden p-5">
            <h2 className="text-[15px] font-semibold">Recent payments</h2>
            {today.recentPayments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No payments logged yet. Log them from Receivables as they arrive.</p>
            ) : (
              <ul className="mt-3 divide-y text-sm">
                {today.recentPayments.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate">{p.client.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{p.method ? ` · ${p.method}` : ''}
                      </p>
                    </div>
                    <span className="figure font-semibold text-good">+{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function UpdateBalanceButton() {
  return <UpdateBalanceDialog compact />
}
