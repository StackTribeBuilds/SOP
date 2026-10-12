'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { sendInvoice, cancelInvoice } from '@/lib/invoice-actions'
import { logPayment } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { IndianRupee, Send, X } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]
const toDateInput = (d: Date | string) => new Date(d).toISOString().split('T')[0]

type InvoiceSummary = {
  id: string
  invoiceNumber: string
  amount: number
  paidAmount: number
  dueDate: Date | string
  client: { company: string }
}

export function SendInvoiceDialog({ invoice }: { invoice: InvoiceSummary }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await sendInvoice(invoice.id, form.get('dueDate') as string)
    setLoading(false)
    if (!res.success) return toast.error(res.error)
    toast.success(`${invoice.invoiceNumber} marked as sent`)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Send className="h-3.5 w-3.5 mr-1.5" /> Mark sent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {invoice.invoiceNumber} as sent</DialogTitle>
          <DialogDescription>
            {invoice.client.company} · {formatCurrency(invoice.amount)}. Once sent, it counts as money owed and appears in receivables and the forecast.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`send-due-${invoice.id}`}>Payment due date</Label>
            <Input id={`send-due-${invoice.id}`} name="dueDate" type="date" required defaultValue={toDateInput(invoice.dueDate)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Mark as sent'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CancelInvoiceButton({ invoice }: { invoice: InvoiceSummary }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (invoice.paidAmount > 0) return null

  const handleCancel = async () => {
    setLoading(true)
    const res = await cancelInvoice(invoice.id)
    setLoading(false)
    setConfirming(false)
    if (!res.success) return toast.error(res.error)
    toast.success(`${invoice.invoiceNumber} cancelled`)
    router.refresh()
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" variant="destructive" onClick={handleCancel} disabled={loading}>
          {loading ? 'Cancelling...' : 'Confirm cancel'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={loading}>Keep</Button>
      </span>
    )
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} title="Cancel invoice">
      <X className="h-3.5 w-3.5 mr-1" /> Cancel
    </Button>
  )
}

export function LogPaymentDialog({ invoice }: { invoice: InvoiceSummary }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const outstanding = Math.max(0, invoice.amount - invoice.paidAmount)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await logPayment({
      invoiceId: invoice.id,
      amount: parseFloat(form.get('amount') as string),
      date: form.get('date') as string,
      method: (form.get('method') as string) || undefined,
      reference: (form.get('reference') as string) || undefined,
      notes: (form.get('notes') as string) || undefined,
    })
    setLoading(false)
    if (!res.success) return toast.error(res.error)
    toast.success(`Payment logged against ${invoice.invoiceNumber}`)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><IndianRupee className="h-3.5 w-3.5 mr-1" /> Log payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log payment for {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            {invoice.client.company} · {formatCurrency(outstanding)} still owed of {formatCurrency(invoice.amount)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`pay-amount-${invoice.id}`}>Amount received (₹)</Label>
              <Input id={`pay-amount-${invoice.id}`} name="amount" type="number" step="0.01" min="0.01" max={outstanding} required defaultValue={outstanding} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pay-date-${invoice.id}`}>Date received</Label>
              <Input id={`pay-date-${invoice.id}`} name="date" type="date" required defaultValue={today()} max={today()} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select name="method" defaultValue="Bank Transfer">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pay-ref-${invoice.id}`}>Reference / UTR</Label>
              <Input id={`pay-ref-${invoice.id}`} name="reference" placeholder="Transaction ID" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pay-notes-${invoice.id}`}>Notes (optional)</Label>
            <Textarea id={`pay-notes-${invoice.id}`} name="notes" rows={2} />
          </div>
          <p className="text-xs text-muted-foreground">
            This records the payment against the invoice. Update the bank balance on the dashboard when you reconcile.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Log payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
