import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExpenseForm } from './expense-form'

export const metadata = { title: 'Expenses' };

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: 'desc' },
    take: 50,
  })

  const now = new Date()
  const monthlyTotal = expenses
    .filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, e) => s + e.amount, 0)

  const recurringMonthly = expenses.filter(e => e.isRecurring).reduce((s, e) => s + e.amount, 0)
  const byCategory = new Map<string, number>()
  expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .forEach(e => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount))
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="What StackTribe spends. Recurring expenses feed the cash forecast every week."
        actions={<ExpenseForm />}
      />

      <StatStrip>
        <Stat label="This month" value={formatCurrency(monthlyTotal)} />
        <Stat label="Recurring each month" value={formatCurrency(recurringMonthly)} hint="Included in the 13-week forecast" />
        <Stat label="Biggest category" value={top ? formatCurrency(top[1]) : '—'} hint={top ? top[0].replace(/_/g, ' ').toLowerCase() : 'Nothing this month'} />
      </StatStrip>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Recurring</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No expenses recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{expense.category.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        {expense.isRecurring ? <Badge variant="outline">Recurring</Badge> : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
