import { getDashboardData } from '@/lib/actions'
import { formatCurrency, getCashZone } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CashZoneIndicator } from '@/components/layout/cash-zone-indicator'
import { DashboardQuickActions } from './quick-actions'
import { RecentTransactions } from './recent-transactions'
import {
  Banknote,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  IndianRupee,
} from 'lucide-react'

export default async function DashboardPage() {
  const data = await getDashboardData()
  const zone = getCashZone(data.currentCash, data.minimumFloor)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">StackTribe money at a glance</p>
        </div>
        <CashZoneIndicator
          currentCash={data.currentCash}
          minimumFloor={data.minimumFloor}
        />
      </div>

      {/* Zone Alert */}
      {zone === 'RED' && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">🔴 RED ZONE — Cash Below Minimum Floor</p>
            <p className="text-sm text-red-700 mt-1">
              Freeze discretionary spending. Stop founder withdrawals. Aggressive collections mode.
              Push advance-heavy contracts. Minimum floor: {formatCurrency(data.minimumFloor)}
            </p>
          </div>
        </div>
      )}
      {zone === 'YELLOW' && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800">🟡 YELLOW ZONE — Cash Approaching Minimum</p>
            <p className="text-sm text-yellow-700 mt-1">
              Freeze unnecessary spending. Increase collections. Increase sales activity.
              Floor: {formatCurrency(data.minimumFloor)}
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cash in Bank */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash in Bank
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.currentCash)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Floor: {formatCurrency(data.minimumFloor)}
            </p>
          </CardContent>
        </Card>

        {/* Total Receivable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Receivable
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalReceivable)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected: {formatCurrency(data.expectedCash)}
            </p>
          </CardContent>
        </Card>

        {/* Due This Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due This Week
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.dueThisWeek)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overdue: {formatCurrency(data.totalOverdue)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Outflow */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Outflow
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.monthlyExpenses + data.monthlyWithdrawals)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expenses: {formatCurrency(data.monthlyExpenses)} | Withdrawals: {formatCurrency(data.monthlyWithdrawals)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Table + Quick Actions */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Unpaid Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Outstanding Invoices</CardTitle>
            <CardDescription>Invoices awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            {data.unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No outstanding invoices. 🎉
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Client</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Due</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Next Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unpaidInvoices.map((invoice) => {
                      const isOverdue = new Date(invoice.dueDate) < new Date()
                      const outstanding = invoice.amount - invoice.paidAmount
                      return (
                        <tr key={invoice.id} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium">{invoice.client.company}</td>
                          <td className="py-2 px-2 text-muted-foreground">{invoice.invoiceNumber}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(outstanding)}</td>
                          <td className="py-2 px-2">
                            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <Badge variant={isOverdue ? 'danger' : invoice.probability === 'COMMITTED' ? 'success' : 'warning'}>
                              {isOverdue ? 'Overdue' : invoice.probability}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground max-w-[150px] truncate">
                            {invoice.nextAction || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <DashboardQuickActions />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={data.recentPayments} />
    </div>
  )
}
