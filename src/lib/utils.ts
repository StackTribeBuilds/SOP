import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date2.getTime() - date1.getTime()) / oneDay)
}

export function getCashZone(currentCash: number, minimumFloor: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (currentCash >= minimumFloor * 1.5) return 'GREEN'
  if (currentCash >= minimumFloor) return 'YELLOW'
  return 'RED'
}

export function getAgingBucket(dueDate: Date): string {
  const today = new Date()
  const days = daysBetween(dueDate, today)
  if (days <= 0) return 'Current'
  if (days <= 30) return '1-30 days'
  if (days <= 60) return '31-60 days'
  return '60+ days'
}

// --- Invoice money helpers (one definition, used by every screen) ---

type InvoiceMoney = { amount: number; paidAmount: number; probabilityPercent: number; dueDate: Date; status: string }

// Invoices the client has actually received and still owes on
export const OPEN_INVOICE_STATUSES = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] as const

export function invoiceOutstanding(inv: Pick<InvoiceMoney, 'amount' | 'paidAmount'>): number {
  return Math.max(0, inv.amount - inv.paidAmount)
}

// Calculated on read so partial payments are always reflected
export function invoiceExpectedCash(inv: Pick<InvoiceMoney, 'amount' | 'paidAmount' | 'probabilityPercent'>): number {
  return invoiceOutstanding(inv) * (inv.probabilityPercent / 100)
}

// Overdue is derived from the due date; nothing needs to flip a status flag
export function isInvoiceOverdue(inv: Pick<InvoiceMoney, 'dueDate' | 'status' | 'amount' | 'paidAmount'>, now: Date = new Date()): boolean {
  return (OPEN_INVOICE_STATUSES as readonly string[]).includes(inv.status)
    && invoiceOutstanding(inv) > 0
    && new Date(inv.dueDate) < now
}
