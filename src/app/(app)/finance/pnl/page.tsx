import { getPnLData } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MonthSelector } from './month-selector'

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">{monthName}</p>
        </div>
        <MonthSelector currentYear={year} currentMonth={month} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* P&L Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly P&L</CardTitle>
            <CardDescription>Revenue ≠ Cash ≠ Profit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Revenue (Contracted)</span>
              <span className="font-medium">{formatCurrency(pnl.revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-600">Collections (Cash In)</span>
              <span className="font-bold text-green-600">{formatCurrency(pnl.collections)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm">Direct Project Costs</span>
              <span className="font-medium text-red-600">-{formatCurrency(pnl.projectCosts)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/50 rounded px-2 py-1">
              <span className="text-sm font-semibold">Gross Profit</span>
              <span className={`font-bold ${pnl.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnl.grossProfit)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm">Operating Expenses</span>
              <span className="font-medium text-red-600">-{formatCurrency(pnl.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Founder Compensation</span>
              <span className="font-medium text-red-600">-{formatCurrency(pnl.founderCompensation)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Tax Provision (est.)</span>
              <span className="font-medium text-red-600">-{formatCurrency(pnl.taxProvision)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center bg-primary/5 rounded px-2 py-2">
              <span className="text-base font-bold">Net Profit</span>
              <span className={`text-lg font-bold ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnl.netProfit)}
              </span>
            </div>
            {pnl.collections > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Gross Margin: {((pnl.grossProfit / pnl.collections) * 100).toFixed(1)}%
                | Net Margin: {((pnl.netProfit / pnl.collections) * 100).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        {/* Key Insight */}
        <Card>
          <CardHeader>
            <CardTitle>Key Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">Revenue vs Collections Gap</p>
              <p className="text-2xl font-bold">
                {formatCurrency(Math.abs(pnl.revenue - pnl.collections))}
              </p>
              <p className="text-xs text-muted-foreground">
                {pnl.revenue > pnl.collections
                  ? 'Revenue exceeds collections — money is stuck in receivables'
                  : 'Collections exceed new revenue — collecting from prior months'}
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
