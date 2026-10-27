"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "./prisma"
import { requireFounder } from "./session"
import { nextInvoiceNumber, withInvoiceNumberRetry } from "./invoice-number"
import { applyInvoicePayment, PaymentError, readPaymentInput } from "./payments"

type Result<T extends object = Record<never, never>> = ({ success: true } & T) | { success: false; error: string }

export async function getInvoiceById(id: string) {
  await requireFounder()
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      milestone: true,
    }
  });
}

function revalidateMoney(projectId?: string | null) {
  revalidatePath("/dashboard")
  revalidatePath("/finance", "layout")
  if (projectId) revalidatePath(`/projects/${projectId}`, "layout")
}

export async function generateInvoiceFromMilestone(milestoneId: string): Promise<Result<{ invoiceId: string }>> {
  await requireFounder()
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      project: true,
      invoices: { where: { status: { not: "CANCELLED" } } },
    },
  });

  if (!milestone) return { success: false, error: "Milestone not found" }
  if (milestone.invoices.length > 0) {
    return { success: false, error: `This milestone already has invoice ${milestone.invoices[0].invoiceNumber}` }
  }
  if (!(milestone.paymentAmount > 0)) {
    return { success: false, error: "Set a payment amount on the milestone first" }
  }

  const lineItems = [
    {
      description: milestone.deliverables || milestone.name,
      qty: 1,
      cost: milestone.paymentAmount,
      subtotal: milestone.paymentAmount
    }
  ];

  // Default to 7 days from now for Due Date if not specified
  const dueDate = milestone.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invoice = await withInvoiceNumberRetry(() => prisma.$transaction(async (tx) => tx.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(tx),
      amount: milestone.paymentAmount,
      dueDate: dueDate,
      status: "DRAFT",
      lineItems: lineItems,
      clientId: milestone.project.clientId,
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      ownerId: milestone.project.projectOwnerId,
    }
  })))
  revalidateMoney(milestone.projectId)
  return { success: true, invoiceId: invoice.id }
}

// DRAFT -> SENT. From here the invoice counts as money owed (receivables, forecast, overdue).
export async function sendInvoice(id: string, dueDate?: string): Promise<Result> {
  await requireFounder()
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) return { success: false, error: "Invoice not found" }
  if (invoice.status !== "DRAFT") return { success: false, error: "Only draft invoices can be sent" }
  if (!(invoice.amount > 0)) return { success: false, error: "Set an amount before sending" }

  const due = dueDate ? new Date(dueDate) : invoice.dueDate
  if (isNaN(due.getTime())) return { success: false, error: "Enter a valid due date" }

  await prisma.invoice.update({ where: { id }, data: { status: "SENT", dueDate: due } })
  revalidateMoney(invoice.projectId)
  return { success: true }
}

// Invoices with money already received can't be cancelled; that history must stay intact.
export async function cancelInvoice(id: string): Promise<Result> {
  await requireFounder()
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) return { success: false, error: "Invoice not found" }
  if (invoice.paidAmount > 0) return { success: false, error: "This invoice has payments logged and can't be cancelled" }
  if (invoice.status === "CANCELLED") return { success: true }

  await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } })
  revalidateMoney(invoice.projectId)
  return { success: true }
}

// One step for "the client paid this milestone": raises the invoice if there isn't one,
// marks a draft as sent, and records the payment. Partial payments are fine; the rest
// stays in receivables. Everything happens in one transaction.
export async function recordMilestonePayment(
  milestoneId: string,
  data: { amount: number; date: string; method?: string; reference?: string; notes?: string },
): Promise<Result<{ invoiceNumber: string; fullyPaid: boolean }>> {
  await requireFounder()

  try {
    const payment = readPaymentInput(data)
    const result = await withInvoiceNumberRetry(() => prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findUnique({
        where: { id: milestoneId },
        include: { project: true, invoices: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } } },
      })
      if (!milestone) throw new PaymentError("Milestone not found")

      let invoice = milestone.invoices[0]
      if (!invoice) {
        if (!(milestone.paymentAmount > 0)) throw new PaymentError("Set a payment amount on the milestone first")
        invoice = await tx.invoice.create({
          data: {
            invoiceNumber: await nextInvoiceNumber(tx),
            amount: milestone.paymentAmount,
            dueDate: milestone.dueDate ?? payment.date,
            status: "SENT",
            lineItems: [{ description: milestone.deliverables || milestone.name, qty: 1, cost: milestone.paymentAmount, subtotal: milestone.paymentAmount }],
            clientId: milestone.project.clientId,
            projectId: milestone.projectId,
            milestoneId: milestone.id,
            ownerId: milestone.project.projectOwnerId,
          },
        })
      } else if (invoice.status === "DRAFT") {
        // The client is paying it, so it has effectively been sent
        invoice = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } })
      }

      await applyInvoicePayment(tx, invoice, payment)
      const after = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } })
      return { invoiceNumber: after.invoiceNumber, fullyPaid: after.status === "PAID", projectId: milestone.projectId }
    }))

    revalidateMoney(result.projectId)
    return { success: true, invoiceNumber: result.invoiceNumber, fullyPaid: result.fullyPaid }
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message }
    throw e
  }
}
