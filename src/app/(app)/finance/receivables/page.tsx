import { getReceivablesData } from '@/lib/actions'
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
import { AlertTriangle, CheckCircle, Clock, Ban } from 'lucide-react'

export default async function ReceivablesPage() {
  const { receivables, agingSummary } = await getReceivablesData()
  const totalOutstanding = receivables.reduce((s, r) => s + r.outstanding, 0)
  const totalExpected = receivables.reduce((s, r) => s + r.expectedCash, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
        <p className="text-muted-foreground">Track every rupee owed to StackTribe</p>
      </div>

      {/* Aging Buckets */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Expected: {formatCurrency(totalExpected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Current
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(agingSummary.current)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-1">
              <Clock className="h-3 w-3" /> 1-30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(agingSummary['1-30'])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> 31-60 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(agingSummary['31-60'])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1">
              <Ban className="h-3 w-3" /> 60+ Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(agingSummary['60+'])}</div>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead className="text-right">Expected Cash</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Next Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No outstanding receivables 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  receivables.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.client.company}</TableCell>
                      <TableCell>{r.invoiceNumber}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.outstanding)}</TableCell>
                      <TableCell>
                        <span className={r.daysOverdue > 0 ? 'text-red-600 font-medium' : ''}>
                          {new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          r.agingBucket === 'Current' ? 'success' :
                          r.agingBucket === '1-30 days' ? 'warning' :
                          'danger'
                        }>
                          {r.daysOverdue > 0 ? `${r.daysOverdue}d overdue` : 'Current'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.probabilityPercent}% — {r.probability}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(r.expectedCash)}</TableCell>
                      <TableCell className="text-sm">{r.owner.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {r.nextAction || '—'}
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
