import { getMoneyBar, getPnLData } from '@/lib/actions'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MonthSelector } from './month-selector'

export const metadata = { title: 'Profit & loss' };

export default async function PnLPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth()

  const pnl = await getPnLData(year, month)
  const monthName = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const money = await getMoneyBar()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & loss"
        description={`${monthName}. The four numbers the Bible says never to mix (§16.2).`}
        actions={<MonthSelector currentYear={year} currentMonth={month} />}
      />

      <StatStrip>
        <Stat label="Revenue" value={formatCurrency(pnl.revenue)} hint="Invoices raised this month" />
        <Stat label="Collections" value={formatCurrency(pnl.collections)} tone="good" hint="Money that actually arrived" />
        <Stat label="Net profit" value={formatCurrency(pnl.netProfit)} tone={pnl.netProfit < 0 ? 'bad' : 'good'}
          hint={pnl.revenue > 0 ? `${((pnl.netProfit / pnl.revenue) * 100).toFixed(1)}% of revenue` : 'No revenue this month'} />
        <Stat label="Cash in bank" value={formatCurrency(money.cash)} hint="Today, not this month" />
      </StatStrip>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* P&L Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Statement</CardTitle>
            <CardDescription>Revenue ≠ Cash ≠ Profit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Revenue (Contracted)</span>
              <span className="font-medium">{formatCurrency(pnl.revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-good">Collections (cash in, shown for comparison)</span>
              <span className="font-bold text-good">{formatCurrency(pnl.collections)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm">Direct Project Costs</span>
              <span className="figure font-medium text-bad">-{formatCurrency(pnl.projectCosts)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/50 rounded px-2 py-1">
              <span className="text-sm font-semibold">Gross Profit</span>
              <span className={`font-bold ${pnl.grossProfit >= 0 ? 'text-good' : 'text-bad'}`}>
                {formatCurrency(pnl.grossProfit)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm">Operating Expenses</span>
              <span className="figure font-medium text-bad">-{formatCurrency(pnl.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Founder Compensation</span>
              <span className="figure font-medium text-bad">-{formatCurrency(pnl.founderCompensation)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Tax Provision (est.)</span>
              <span className="figure font-medium text-bad">-{formatCurrency(pnl.taxProvision)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center bg-primary/5 rounded px-2 py-2">
              <span className="text-base font-bold">Net Profit</span>
              <span className={`text-lg font-bold ${pnl.netProfit >= 0 ? 'text-good' : 'text-bad'}`}>
                {formatCurrency(pnl.netProfit)}
              </span>
            </div>
            {pnl.revenue > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Gross Margin: {((pnl.grossProfit / pnl.revenue) * 100).toFixed(1)}%
                | Net Margin: {((pnl.netProfit / pnl.revenue) * 100).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        {/* Key Insight */}
        <Card>
          <CardHeader>
            <CardTitle>What it means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">Revenue vs Collections Gap</p>
              <p className="text-2xl font-bold">
                {formatCurrency(Math.abs(pnl.revenue - pnl.collections))}
              </p>
              <p className="text-xs text-muted-foreground">
                {pnl.revenue > pnl.collections
                  ? 'More was invoiced than collected. The difference is waiting in receivables.'
                  : 'More was collected than invoiced, so earlier months are being paid off.'}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Founder Take-Home</p>
              <p className="text-2xl font-bold">{formatCurrency(pnl.founderCompensation)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Effective Tax Rate (estimated)</p>
              <p className="text-2xl font-bold">
                {pnl.grossProfit > 0 ? ((pnl.taxProvision / pnl.grossProfit) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
