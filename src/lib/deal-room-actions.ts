"use server"
import { prisma } from "./prisma"

export async function getDealRoomData(projectId: string) {
  return await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      projectOwner: true,
      milestones: true,
      invoices: true,
    }
  });
}

export async function saveProjectDocs(projectId: string, proposalData: any, contractData: any) {
  return await prisma.project.update({
    where: { id: projectId },
    data: {
      proposalData: proposalData,
      contractData: contractData,
    }
  });
}

export async function saveInvoiceData(invoiceId: string, invoiceData: any, lineItems: any) {
  return await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amount: invoiceData.amount,
      dueDate: new Date(invoiceData.dueDate),
      lineItems: lineItems,
    }
  });
}

export async function createInvoiceFromDealRoom(projectId: string, invoiceData: any, lineItems: any) {
  return await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceData.invNo,
      amount: invoiceData.amount,
      dueDate: new Date(invoiceData.date),
      status: "DRAFT",
      clientId: invoiceData.clientId,
      projectId: projectId,
      lineItems: lineItems,
      ownerId: invoiceData.ownerId,
    }
  });
}
