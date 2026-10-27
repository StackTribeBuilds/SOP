import type { Invoice, Prisma } from '@prisma/client'
import { formatCurrency, invoiceOutstanding, OPEN_INVOICE_STATUSES } from './utils'

// A payment problem the person can fix, shown to them as is
export class PaymentError extends Error {}

export type PaymentInput = {
  amount: number
  date: Date
  method?: string
  reference?: string
  notes?: string
}

// Parse and check what was typed in the payment form
export function readPaymentInput(data: { amount: number; date: string; method?: string; reference?: string; notes?: string }): PaymentInput {
  const amount = Math.round(data.amount * 100) / 100
  if (!(amount > 0)) throw new PaymentError('Enter an amount greater than zero')
  const date = new Date(data.date)
  if (isNaN(date.getTime())) throw new PaymentError('Enter a valid payment date')
  if (date.getTime() > Date.now() + 86400000) throw new PaymentError("The payment date can't be in the future")
  return { amount, date, method: data.method || undefined, reference: data.reference || undefined, notes: data.notes || undefined }
}

// Records money received against a sent invoice, inside the caller's transaction,
// and moves the invoice to part paid or paid. The one place these rules live.
export async function applyInvoicePayment(tx: Prisma.TransactionClient, invoice: Invoice, payment: PaymentInput) {
  if (!(OPEN_INVOICE_STATUSES as readonly string[]).includes(invoice.status)) {
    throw new PaymentError(invoice.status === 'DRAFT'
      ? 'Send this invoice before logging a payment against it'
      : `This invoice is ${invoice.status.toLowerCase()} and can't take payments`)
  }
  const outstanding = invoiceOutstanding(invoice)
  if (payment.amount > outstanding + 0.5) {
    throw new PaymentError(`Amount is more than the ${formatCurrency(outstanding)} still owed on this invoice`)
  }

  const newPaidAmount = Math.min(invoice.amount, invoice.paidAmount + payment.amount)
  const fullyPaid = newPaidAmount >= invoice.amount - 0.5
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: newPaidAmount,
      status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      paidDate: fullyPaid ? payment.date : null,
    },
  })

  return tx.payment.create({
    data: {
      amount: payment.amount,
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      date: payment.date,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
    },
  })
}
