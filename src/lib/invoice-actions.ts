"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"
import { requireFounder } from "./session"

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

// STMS-2026-001, STMS-2026-002, ... numbered per calendar year
async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  const prefix = `STMS-${new Date().getFullYear()}-`
  const last = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })
  const lastSeq = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) || 0 : 0
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`
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

  // Retry once if another invoice took the same number in parallel
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const invoice = await prisma.$transaction(async (tx) => tx.invoice.create({
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
      }))
      revalidateMoney(milestone.projectId)
      return { success: true, invoiceId: invoice.id }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt === 0) continue
      throw e
    }
  }
  return { success: false, error: "Could not assign an invoice number. Try again." }
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
