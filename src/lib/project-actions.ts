'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './prisma';

export async function getClients() {
  return await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getClientById(id: string) {
  return await prisma.client.findUnique({
    where: { id },
  });
}

export async function updateClientOnboarding(id: string, data: any) {
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
  return await prisma.project.findMany({
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(id: string) {
  return await prisma.project.findUnique({
    where: { id },
    include: { client: true, projectOwner: true, techOwner: true },
  });
}

export async function getProjectTasks(projectId: string) {
  return await prisma.task.findMany({
    where: { projectId },
    include: { assignee: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTask(data: any) {
  const task = await prisma.task.create({ data });
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

export async function updateTaskStatus(taskId: string, status: any) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function getChangeRequests(projectId: string) {
  return await prisma.changeRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createChangeRequest(data: any) {
  const cr = await prisma.changeRequest.create({ data });
  revalidatePath(`/projects/${data.projectId}`);
  return cr;
}

export async function updateChangeRequestStatus(crId: string, status: any) {
  const cr = await prisma.changeRequest.update({
    where: { id: crId },
    data: { status },
  });
  revalidatePath(`/projects/${cr.projectId}`);
  return cr;
}

export async function getMilestones(projectId: string) {
  return await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
  });
}
