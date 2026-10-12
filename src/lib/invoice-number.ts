import { Prisma } from '@prisma/client'

// STMS-2026-001, STMS-2026-002, ... numbered per calendar year
export async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  const prefix = `STMS-${new Date().getFullYear()}-`
  const last = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const lastSeq = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) || 0 : 0
  return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`
}

// Retries once when two invoices grab the same number at the same moment
export async function withInvoiceNumberRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return await fn()
    throw e
  }
}
