'use server';

import { prisma } from '@/lib/prisma';
import { requireFounder, requireGrowthViewer } from '@/lib/session';
import type { ContentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Every draft post, email and page copy, in planned order.
 * Founders and the sales team can read them; only founders review them.
 */
export async function getContentItems() {
  await requireGrowthViewer();
  return prisma.contentItem.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** The growth to-do list, open items first. */
export async function getGrowthTasks() {
  await requireGrowthViewer();
  return prisma.growthTask.findMany({
    orderBy: [{ done: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Ticks a to-do on or off. Founders only. */
export async function setGrowthTaskDone(id: string, done: boolean) {
  const user = await requireFounder();
  try {
    await prisma.growthTask.update({
      where: { id },
      data: { done, doneAt: done ? new Date() : null, doneById: done ? user.id : null },
    });
    revalidatePath('/growth/todos');
    return { success: true };
  } catch (error) {
    console.error('Error updating growth task:', error);
    return { success: false, error: 'Could not save. Try again.' };
  }
}

const ALLOWED: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['APPROVED', 'CHANGES'],
  CHANGES: ['APPROVED'],
  APPROVED: ['SENT', 'CHANGES', 'DRAFT'],
  SENT: ['DRAFT'],
};

/**
 * Moves a draft through review. A change request needs a note so whoever
 * revises it knows what to fix.
 */
export async function updateContentStatus(id: string, status: ContentStatus, feedback?: string) {
  const user = await requireFounder();
  try {
    const current = await prisma.contentItem.findUnique({ where: { id } });
    if (!current) return { success: false, error: 'This draft no longer exists.' };
    if (!ALLOWED[current.status].includes(status)) {
      return { success: false, error: `A ${current.status.toLowerCase()} item can't move to ${status.toLowerCase()}.` };
    }
    const note = feedback?.trim();
    if (status === 'CHANGES' && !note) {
      return { success: false, error: 'Add a note saying what should change.' };
    }

    const now = new Date();
    await prisma.contentItem.update({
      where: { id },
      data: {
        status,
        reviewedAt: now,
        reviewedById: user.id,
        feedback: status === 'CHANGES' ? note : status === 'APPROVED' ? null : current.feedback,
        sentAt: status === 'SENT' ? now : status === 'DRAFT' ? null : current.sentAt,
      },
    });
    await prisma.activity.create({
      data: { entityType: 'Content', entityId: id, action: `status_${status.toLowerCase()}`, details: current.title, userId: user.id },
    });

    revalidatePath('/growth/approvals');
    revalidatePath('/growth/calendar');
    return { success: true };
  } catch (error) {
    console.error('Error updating content status:', error);
    return { success: false, error: 'Could not save. Try again.' };
  }
}
