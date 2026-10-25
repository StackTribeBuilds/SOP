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
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { SendInvoiceDialog, CancelInvoiceButton, LogPaymentDialog } from '@/components/finance/invoice-controls'
import { EmailButton } from '@/components/email/email-button'

export const metadata = { title: 'Receivables' };

export default async function ReceivablesPage() {
  const { receivables, agingSummary, drafts } = await getReceivablesData()
  const totalOutstanding = receivables.reduce((s, r) => s + r.outstanding, 0)
  const totalExpected = receivables.reduce((s, r) => s + r.expectedCash, 0)

  const overdueTotal = agingSummary['1-30'] + agingSummary['31-60'] + agingSummary['60+']

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receivables"
        description="Every rupee owed to StackTribe. Remind 3 days before due, escalate to a founder at 7 days overdue (§13.1)."
      />

      <StatStrip>
        <Stat label="Owed to us" value={formatCurrency(totalOutstanding)} hint={`${formatCurrency(totalExpected)} expected at current probabilities`} />
        <Stat label="Not yet due" value={formatCurrency(agingSummary.current)} tone="good" />
        <Stat label="1–30 days late" value={formatCurrency(agingSummary['1-30'])} tone={agingSummary['1-30'] > 0 ? 'warn' : undefined} />
        <Stat label="31–60 days late" value={formatCurrency(agingSummary['31-60'])} tone={agingSummary['31-60'] > 0 ? 'bad' : undefined} />
        <Stat label="60+ days late" value={formatCurrency(agingSummary['60+'])} tone={agingSummary['60+'] > 0 ? 'bad' : undefined}
          hint={overdueTotal > 0 ? `${Math.round((overdueTotal / Math.max(totalOutstanding, 1)) * 100)}% of receivables overdue` : undefined} />
      </StatStrip>

      {/* Drafts: not owed until sent */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drafts to send</CardTitle>
            <p className="text-sm text-muted-foreground">
              Not counted as receivables until you mark them sent. Invoice 7 days before a milestone is due (Bible §13).
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Project / milestone</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Planned due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.client.company}</TableCell>
                      <TableCell>{d.invoiceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.project?.name ?? '—'}{d.milestone ? ` · ${d.milestone.name}` : ''}
                      </TableCell>
                      <TableCell className="figure text-right text-[15px] font-semibold">{formatCurrency(d.amount)}</TableCell>
                      <TableCell>{new Date(d.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EmailButton context={{ invoiceId: d.id }} kind="INVOICE" label="Email invoice" variant="default" />
                          <SendInvoiceDialog invoice={d} />
                          <CancelInvoiceButton invoice={d} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receivables Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Sent invoices</CardTitle>
          <p className="text-xs text-muted-foreground">Oldest due first. Log a payment the day it reaches the bank.</p>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nothing owed right now. Send invoices from a project&apos;s milestones.
                </TableCell>
              </TableRow>
            ) : (
              receivables.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.client.company}</p>
                    <p className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.invoiceNumber}{r.project ? ` · ${r.project.name}` : ''}
                    </p>
                  </TableCell>
                  <TableCell className="figure text-right text-[15px] font-semibold whitespace-nowrap">
                    {formatCurrency(r.outstanding)}
                    {r.paidAmount > 0 && <p className="font-sans text-xs font-normal text-muted-foreground">of {formatCurrency(r.amount)}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className={r.daysOverdue > 0 ? 'text-bad font-medium' : ''}>
                      {new Date(r.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                    <Badge variant={r.agingBucket === 'Current' ? 'success' : r.agingBucket === '1-30 days' ? 'warning' : 'danger'} className="mt-0.5">
                      {r.daysOverdue > 0 ? `${r.daysOverdue} days late${r.daysOverdue >= 7 ? ' · escalate' : ''}` : 'Not due yet'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <p className="figure text-muted-foreground">{formatCurrency(r.expectedCash)}</p>
                    <p className="text-xs text-muted-foreground">{r.probabilityPercent}% {r.probability.toLowerCase()}</p>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate text-sm">{r.nextAction || <span className="text-muted-foreground">No next action</span>}</p>
                    <p className="text-xs text-muted-foreground">{r.owner.name}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EmailButton context={{ invoiceId: r.id }} kind="PAYMENT_REMINDER" label="Remind" />
                      <LogPaymentDialog invoice={r} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
