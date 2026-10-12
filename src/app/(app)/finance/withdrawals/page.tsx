import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { getMoneyBar } from '@/lib/actions'
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
import { WithdrawalForm } from './withdrawal-form'

export const metadata = { title: 'Founder pay' };

export default async function WithdrawalsPage() {
  const withdrawals = await prisma.founderWithdrawal.findMany({
    orderBy: { date: 'desc' },
    take: 50,
    include: { user: true },
  })

  const now = new Date()
  const monthlyTotal = withdrawals
    .filter(w => {
      const d = new Date(w.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, w) => s + w.amount, 0)

  const users = await prisma.user.findMany({
    where: { role: { in: ['FOUNDER', 'CEO', 'CTO', 'ADMIN'] }, isActive: true },
    select: { id: true, name: true, role: true },
  })

  const money = await getMoneyBar()
  // Bible §16.7 stage 1: ₹20k per founder, paid only when cash allows
  const target = users.length * 20000

  return (
    <div className="space-y-6">
      <PageHeader
        title="Founder pay"
        description="Paid on a fixed date, only when the business meets its cash floor. Never raised on one good month (§16.7)."
        actions={<WithdrawalForm founders={users} />}
      />

      {money.zone === 'RED' && (
        <div className="rounded-lg border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">
          <span className="font-semibold">Cash is below the floor.</span> Discretionary withdrawals stop until it recovers (§16.4).
        </div>
      )}

      <StatStrip>
        <Stat label="Paid this month" value={formatCurrency(monthlyTotal)} tone={monthlyTotal > target ? 'warn' : undefined} />
        <Stat label="Stage 1 budget" value={formatCurrency(target)} hint={`₹20,000 × ${users.length} founders`} />
        <Stat label="Cash in bank" value={formatCurrency(money.cash)} tone={money.zone === 'RED' ? 'bad' : money.zone === 'YELLOW' ? 'warn' : 'good'}
          hint={`Floor ${formatCurrency(money.floor)}`} />
      </StatStrip>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Founder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No withdrawals recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        {new Date(w.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-medium">{w.user.name}</TableCell>
                      <TableCell><Badge variant="outline">{w.type}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(w.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.notes || '—'}</TableCell>
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
