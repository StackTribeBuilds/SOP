import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    where: { role: { in: ['CEO', 'CTO'] } },
    select: { id: true, name: true, role: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Founder Withdrawals</h1>
          <p className="text-muted-foreground">
            This month: {formatCurrency(monthlyTotal)} / ₹40,000 target
          </p>
        </div>
        <WithdrawalForm founders={users} />
      </div>

      <Card>
        <CardContent className="pt-6">
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
