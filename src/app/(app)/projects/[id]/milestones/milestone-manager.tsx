'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Circle, Clock, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { createMilestone, updateMilestone, setMilestoneStatus, deleteMilestone } from '@/lib/project-actions'
import { generateInvoiceFromMilestone } from '@/lib/invoice-actions'
import { SendInvoiceDialog, CancelInvoiceButton, LogPaymentDialog } from '@/components/finance/invoice-controls'
import { EmailButton } from '@/components/email/email-button'
import { formatCurrency } from '@/lib/utils'
import type { MilestoneStatus } from '@prisma/client'

type Invoice = {
  id: string
  invoiceNumber: string
  amount: number
  paidAmount: number
  dueDate: Date
  status: string
}

type Milestone = {
  id: string
  name: string
  description: string | null
  deliverables: string | null
  dueDate: Date | null
  paymentAmount: number
  status: string
  invoices: Invoice[]
}

const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'CLIENT_REVIEW', label: 'Client review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved by client' },
]

const INVOICE_BADGE: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' | 'danger' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SENT: { label: 'Sent', variant: 'warning' },
  PARTIALLY_PAID: { label: 'Part paid', variant: 'warning' },
  OVERDUE: { label: 'Overdue', variant: 'danger' },
  PAID: { label: 'Paid', variant: 'success' },
}

const toDateInput = (d: Date | null) => (d ? new Date(d).toISOString().split('T')[0] : '')

export function MilestoneManager({
  projectId,
  contractValue,
  clientName,
  milestones,
}: {
  projectId: string
  contractValue: number
  clientName: string
  milestones: Milestone[]
}) {
  const planned = milestones.reduce((s, m) => s + m.paymentAmount, 0)
  const invoiced = milestones.reduce((s, m) => s + m.invoices.reduce((t, i) => t + (i.status === 'DRAFT' ? 0 : i.amount), 0), 0)
  const collected = milestones.reduce((s, m) => s + m.invoices.reduce((t, i) => t + i.paidAmount, 0), 0)
  const gap = contractValue - planned

  return (
    <div className="space-y-6">
      {/* Money summary: contract → planned → invoiced → collected */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Summary label="Contract value" value={formatCurrency(contractValue)} />
        <Summary
          label="Planned in milestones"
          value={formatCurrency(planned)}
          note={Math.abs(gap) < 1 ? 'Matches contract' : gap > 0 ? `${formatCurrency(gap)} not yet scheduled` : `${formatCurrency(-gap)} over contract`}
          tone={Math.abs(gap) < 1 ? 'good' : 'warn'}
        />
        <Summary label="Invoiced (sent)" value={formatCurrency(invoiced)} />
        <Summary label="Collected" value={formatCurrency(collected)} note={invoiced > 0 ? `${Math.round((collected / invoiced) * 100)}% of invoiced` : undefined} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <MilestoneDialog projectId={projectId} />
      </div>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
          <h3 className="text-lg font-semibold">No milestones yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Split the {formatCurrency(contractValue)} contract into payment milestones, for example 40% advance, 30% on core build, 30% before handover (Bible §7.3).
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-muted ml-3 md:ml-6 space-y-6 pb-4">
          {milestones.map((m) => (
            <MilestoneCard key={m.id} milestone={m} projectId={projectId} clientName={clientName} />
          ))}
        </div>
      )}
    </div>
  )
}

function Summary({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'good' | 'warn' }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {note && (
        <CardContent className="pt-0">
          <p className={`text-xs ${tone === 'warn' ? 'text-orange-600' : tone === 'good' ? 'text-green-600' : 'text-muted-foreground'}`}>{note}</p>
        </CardContent>
      )}
    </Card>
  )
}

function MilestoneCard({ milestone: m, projectId, clientName }: { milestone: Milestone; projectId: string; clientName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Gate 7 block waiting for a founder exception
  const [gateBlock, setGateBlock] = useState<{ status: MilestoneStatus; error: string } | null>(null)
  const [exceptionReason, setExceptionReason] = useState('')
  const invoice = m.invoices[0]
  const done = m.status === 'COMPLETED' || m.status === 'APPROVED'
  const current = m.status === 'IN_PROGRESS' || m.status === 'CLIENT_REVIEW'

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (!res.success) return toast.error(res.error)
    toast.success(ok)
    router.refresh()
  }

  const changeStatus = async (status: MilestoneStatus, reason?: string) => {
    setBusy(true)
    const res = await setMilestoneStatus(m.id, status, reason)
    setBusy(false)
    if (!res.success) {
      if (res.canOverride) {
        setExceptionReason('')
        return setGateBlock({ status, error: res.error })
      }
      return toast.error(res.error)
    }
    setGateBlock(null)
    toast.success('Status updated')
    router.refresh()
  }

  return (
    <div className="relative pl-8 md:pl-12">
      <Dialog open={!!gateBlock} onOpenChange={(o) => { if (!o) setGateBlock(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start {m.name} early?</DialogTitle>
          </DialogHeader>
          <p className="text-sm rounded-md border border-orange-200 bg-orange-50 p-3 text-orange-800">{gateBlock?.error}</p>
          <div className="space-y-2">
            <Label htmlFor={`gate7-${m.id}`}>Founder exception (logged)</Label>
            <Textarea id={`gate7-${m.id}`} rows={2} value={exceptionReason} onChange={e => setExceptionReason(e.target.value)}
              placeholder="e.g. Client paid by cheque, clearing on Monday" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGateBlock(null)}>Wait for payment</Button>
            <Button variant="destructive" disabled={busy || !exceptionReason.trim()}
              onClick={() => gateBlock && changeStatus(gateBlock.status, exceptionReason)}>
              Start with exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="absolute -left-[11px] top-5 bg-background rounded-full">
        {done ? <CheckCircle2 className="w-5 h-5 text-primary" /> : current ? <Clock className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
      </div>

      <Card className={current ? 'border-blue-500/50 shadow-sm' : ''}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg">{m.name}</CardTitle>
              <CardDescription>
                Due {m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'not set'}
                {' · '}
                <span className="font-medium text-foreground tabular-nums">{formatCurrency(m.paymentAmount)}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={m.status} onValueChange={(v) => changeStatus(v as MilestoneStatus)} disabled={busy}>
                <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <MilestoneDialog projectId={projectId} milestone={m} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(m.deliverables || m.description) && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{m.deliverables || m.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
            {invoice ? (
              <>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
                <Badge variant={INVOICE_BADGE[invoice.status]?.variant ?? 'outline'}>{INVOICE_BADGE[invoice.status]?.label ?? invoice.status}</Badge>
                {invoice.paidAmount > 0 && invoice.status !== 'PAID' && (
                  <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(invoice.paidAmount)} received</span>
                )}
                <span className="ml-auto flex flex-wrap gap-1">
                  <EmailButton context={{ invoiceId: invoice.id }}
                    kind={invoice.status === 'DRAFT' ? 'INVOICE' : invoice.status === 'PAID' ? 'PAYMENT_RECEIPT' : 'PAYMENT_REMINDER'}
                    label={invoice.status === 'DRAFT' ? 'Email invoice' : invoice.status === 'PAID' ? 'Send receipt' : 'Remind'} />
                  {invoice.status === 'DRAFT' && <SendInvoiceDialog invoice={{ ...invoice, client: { company: clientName } }} />}
                  {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && <LogPaymentDialog invoice={{ ...invoice, client: { company: clientName } }} />}
                  {invoice.status !== 'PAID' && <CancelInvoiceButton invoice={{ ...invoice, client: { company: clientName } }} />}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Not invoiced</span>
                <span className="ml-auto flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={busy || !(m.paymentAmount > 0)}
                    onClick={() => run(() => generateInvoiceFromMilestone(m.id), 'Draft invoice created')}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Create invoice
                  </Button>
                  {confirmDelete ? (
                    <>
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => run(() => deleteMilestone(m.id), 'Milestone deleted')}>Confirm delete</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} title="Delete milestone">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MilestoneDialog({ projectId, milestone }: { projectId: string; milestone?: Milestone }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const editing = !!milestone
  const locked = !!milestone?.invoices.length
  const key = milestone?.id ?? 'new'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name') as string,
      deliverables: (form.get('deliverables') as string) || undefined,
      dueDate: (form.get('dueDate') as string) || undefined,
      paymentAmount: parseFloat(form.get('paymentAmount') as string) || 0,
    }
    const res = editing ? await updateMilestone(milestone!.id, data) : await createMilestone(projectId, data)
    setLoading(false)
    if (!res.success) return toast.error(res.error)
    toast.success(editing ? 'Milestone updated' : 'Milestone added')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing
          ? <Button size="icon" variant="ghost" className="h-9 w-9" title="Edit milestone"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-2" /> Add milestone</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit milestone' : 'Add milestone'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`ms-name-${key}`}>Name</Label>
            <Input id={`ms-name-${key}`} name="name" required defaultValue={milestone?.name} placeholder="e.g., M1 Advance (40%)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`ms-amount-${key}`}>Payment amount (₹)</Label>
              <Input id={`ms-amount-${key}`} name="paymentAmount" type="number" step="0.01" min="0" required
                defaultValue={milestone?.paymentAmount} readOnly={locked} />
              {locked && <p className="text-xs text-muted-foreground">Invoiced. Cancel the invoice to change the amount.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`ms-due-${key}`}>Due date</Label>
              <Input id={`ms-due-${key}`} name="dueDate" type="date" defaultValue={toDateInput(milestone?.dueDate ?? null)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`ms-deliv-${key}`}>Deliverables</Label>
            <Textarea id={`ms-deliv-${key}`} name="deliverables" rows={3} defaultValue={milestone?.deliverables ?? ''} placeholder="What the client receives at this milestone" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : editing ? 'Save changes' : 'Add milestone'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
