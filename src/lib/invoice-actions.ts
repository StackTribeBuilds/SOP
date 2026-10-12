"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "./prisma"
import { requireFounder } from "./session"
import { nextInvoiceNumber, withInvoiceNumberRetry } from "./invoice-number"

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
