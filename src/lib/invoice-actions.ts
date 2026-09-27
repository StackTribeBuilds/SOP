"use server"

import { prisma } from "./prisma"

export async function getInvoiceById(id: string) {
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      milestone: true,
    }
  });
}

export async function generateInvoiceFromMilestone(milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      project: {
        include: {
          client: true,
          projectOwner: true
        }
      }
    }
  });

  if (!milestone) throw new Error("Milestone not found");

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

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `STMS-${Date.now().toString().slice(-6)}`,
      amount: milestone.paymentAmount,
      dueDate: dueDate,
      status: "DRAFT",
      lineItems: JSON.stringify(lineItems),
      clientId: milestone.project.clientId,
      projectId: milestone.projectId,
      milestoneId: milestone.id,
      ownerId: milestone.project.projectOwnerId,
    }
  });

  return { success: true, invoiceId: invoice.id };
}
