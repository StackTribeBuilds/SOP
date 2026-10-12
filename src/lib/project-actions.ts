'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './prisma';
import { requireFounder } from './session';
import { MilestoneStatus } from '@prisma/client';

export async function getClients() {
  await requireFounder();
  return await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getClientById(id: string) {
  await requireFounder();
  return await prisma.client.findUnique({
    where: { id },
  });
}

export async function updateClientOnboarding(id: string, data: any) {
  await requireFounder();
  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...data,
      isOnboarded: data.kickoffCompleted && data.agreementSigned && data.advanceReceived // or custom logic
    }
  });
  revalidatePath('/clients');
  revalidatePath(`/clients/${id}/onboard`);
  return updated;
}

export async function getProjects() {
  await requireFounder();
  return await prisma.project.findMany({
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(id: string) {
  await requireFounder();
  return await prisma.project.findUnique({
    where: { id },
    include: { client: true, projectOwner: true, techOwner: true },
  });
}

export async function getProjectTasks(projectId: string) {
  await requireFounder();
  return await prisma.task.findMany({
    where: { projectId },
    include: { assignee: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTask(data: any) {
  await requireFounder();
  const task = await prisma.task.create({ data });
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

export async function updateTaskStatus(taskId: string, status: any) {
  await requireFounder();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function getChangeRequests(projectId: string) {
  await requireFounder();
  return await prisma.changeRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createChangeRequest(data: any) {
  await requireFounder();
  const cr = await prisma.changeRequest.create({ data });
  revalidatePath(`/projects/${data.projectId}`);
  return cr;
}

export async function updateChangeRequestStatus(crId: string, status: any) {
  await requireFounder();
  const cr = await prisma.changeRequest.update({
    where: { id: crId },
    data: { status },
  });
  revalidatePath(`/projects/${cr.projectId}`);
  return cr;
}

export async function getMilestones(projectId: string) {
  await requireFounder();
  return await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
    include: { invoices: { where: { status: { not: 'CANCELLED' } }, orderBy: { createdAt: 'desc' } } },
  });
}

type MilestoneInput = {
  name: string;
  description?: string;
  deliverables?: string;
  dueDate?: string;
  paymentAmount: number;
};

type Result = { success: true } | { success: false; error: string };

function validateMilestone(data: MilestoneInput): string | null {
  if (!data.name?.trim()) return 'Give the milestone a name';
  if (!(data.paymentAmount >= 0)) return 'Payment amount must be zero or more';
  if (data.dueDate && isNaN(new Date(data.dueDate).getTime())) return 'Enter a valid due date';
  return null;
}

export async function createMilestone(projectId: string, data: MilestoneInput): Promise<Result> {
  await requireFounder();
  const error = validateMilestone(data);
  if (error) return { success: false, error };

  const count = await prisma.milestone.count({ where: { projectId } });
  await prisma.milestone.create({
    data: {
      projectId,
      name: data.name.trim(),
      description: data.description || null,
      deliverables: data.deliverables || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paymentAmount: data.paymentAmount,
      sortOrder: count,
    },
  });
  revalidatePath(`/projects/${projectId}`, 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateMilestone(id: string, data: MilestoneInput): Promise<Result> {
  await requireFounder();
  const error = validateMilestone(data);
  if (error) return { success: false, error };

  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { invoices: { where: { status: { not: 'CANCELLED' } } } },
  });
  if (!milestone) return { success: false, error: 'Milestone not found' };
  // The invoice is the client's copy of the amount; change it there (or cancel it) first
  if (milestone.invoices.length > 0 && data.paymentAmount !== milestone.paymentAmount) {
    return { success: false, error: 'This milestone is already invoiced. Cancel the invoice before changing the amount.' };
  }

  await prisma.milestone.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description || null,
      deliverables: data.deliverables || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paymentAmount: data.paymentAmount,
    },
  });
  revalidatePath(`/projects/${milestone.projectId}`, 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function setMilestoneStatus(id: string, status: MilestoneStatus): Promise<Result> {
  await requireFounder();
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return { success: false, error: 'Milestone not found' };

  await prisma.milestone.update({
    where: { id },
    data: {
      status,
      completedDate: status === 'COMPLETED' || status === 'APPROVED' ? (milestone.completedDate ?? new Date()) : null,
      clientApprovalDate: status === 'APPROVED' ? (milestone.clientApprovalDate ?? new Date()) : null,
    },
  });
  revalidatePath(`/projects/${milestone.projectId}`, 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteMilestone(id: string): Promise<Result> {
  await requireFounder();
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { invoices: { where: { status: { not: 'CANCELLED' } } } },
  });
  if (!milestone) return { success: false, error: 'Milestone not found' };
  if (milestone.invoices.length > 0) {
    return { success: false, error: 'This milestone has an invoice. Cancel the invoice before deleting the milestone.' };
  }
  // Keep cancelled invoices for the record, just unlink them
  await prisma.$transaction([
    prisma.invoice.updateMany({ where: { milestoneId: id }, data: { milestoneId: null } }),
    prisma.milestone.delete({ where: { id } }),
  ]);
  revalidatePath(`/projects/${milestone.projectId}`, 'layout');
  return { success: true };
}



export async function createProject(data: { name: string; clientId: string; contractValue: number; startDate?: Date; description?: string }) {
  const { id: userId } = await requireFounder();
  try {

    const project = await prisma.project.create({ 
      data: {
        name: data.name,
        clientId: data.clientId,
        contractValue: data.contractValue,
        startDate: data.startDate,
        description: data.description,
        status: 'NOT_STARTED',
        health: 'ON_TRACK',
        completionPercentage: 0,
        projectOwnerId: userId,
        techOwnerId: userId,
      }
    });
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}


export async function updateProject(id: string, data: any) {
  await requireFounder();
  try {
    const project = await prisma.project.update({
      where: { id },
      data
    });
    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
