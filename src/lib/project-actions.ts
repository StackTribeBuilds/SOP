'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './prisma';
import { requireFounder } from './session';
import { ChangeRequestStatus, MilestoneStatus, ProjectStatus, TaskStatus } from '@prisma/client';
import {
  ONBOARDING_ITEMS, OnboardingField, checkCrMove, milestoneStartBlockers, MILESTONE_ACTIVE_STATUSES,
  CLOSURE_ITEMS, ClosureItemId, closureAutoItems, missingOnboarding, unpaidMilestones, PROJECT_MOVES,
} from './gates';
import { nextInvoiceNumber, withInvoiceNumberRetry } from './invoice-number';

type Result = { success: true; invoiceCreated?: string } | { success: false; error: string; canOverride?: boolean };

// Gate decisions and exceptions go in the activity log so there's a record of who allowed what
async function logActivity(entityType: string, entityId: string, action: string, details: string, userId: string) {
  await prisma.activity.create({ data: { entityType, entityId, action, details, userId } });
}

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

export async function updateClientOnboarding(id: string, data: Partial<Record<OnboardingField, boolean>>) {
  await requireFounder();
  const current = await prisma.client.findUnique({ where: { id } });
  if (!current) throw new Error('Client not found');

  // Only the 12 checklist fields can be changed here
  const checklist = Object.fromEntries(
    ONBOARDING_ITEMS.map(i => [i.id, typeof data[i.id] === 'boolean' ? data[i.id] : current[i.id]])
  ) as Record<OnboardingField, boolean>;

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...checklist,
      // Bible §8.1: onboarded only when every item is done
      isOnboarded: ONBOARDING_ITEMS.every(i => checklist[i.id]),
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

export async function createTask(data: { projectId: string; title: string; description?: string; status?: TaskStatus; priority?: number; estimatedHours?: number; assigneeId?: string }) {
  await requireFounder();
  const status = data.status ?? 'BACKLOG';
  if (!PLANNING_TASK_STATUSES.includes(status)) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (project?.status !== 'IN_PROGRESS') throw new Error('Gate 4: start the project before adding work in progress');
  }
  const task = await prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status,
      priority: data.priority ?? 1,
      estimatedHours: data.estimatedHours,
      assigneeId: data.assigneeId || null,
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

// Planning statuses are allowed before kickoff; building is not (Gates 4–5)
const PLANNING_TASK_STATUSES: TaskStatus[] = ['BACKLOG', 'THIS_WEEK'];

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Result> {
  await requireFounder();
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) return { success: false, error: 'Task not found' };
  if (!PLANNING_TASK_STATUSES.includes(status) && task.project.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Gate 4: start the project before moving work into progress' };
  }
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath(`/projects/${task.projectId}`, 'layout');
  return { success: true };
}

export async function getChangeRequests(projectId: string) {
  await requireFounder();
  return await prisma.changeRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

type CrInput = {
  description: string;
  impactOnScope?: string;
  impactOnTimeline?: string;
  estimatedHours?: number | null;
  additionalCost?: number | null;
};

// CR-001, CR-002, ... (crNumber is unique across all projects)
async function nextCrNumber() {
  const all = await prisma.changeRequest.findMany({ where: { crNumber: { startsWith: 'CR-' } }, select: { crNumber: true } });
  // Older CRs used CR-<timestamp>; only count the short sequence numbers
  const seq = all.map(c => parseInt(c.crNumber.slice(3), 10)).filter(n => n > 0 && n < 100000);
  return `CR-${String((seq.length ? Math.max(...seq) : 0) + 1).padStart(3, '0')}`;
}

export async function createChangeRequest(projectId: string, data: CrInput): Promise<Result> {
  const user = await requireFounder();
  if (!data.description?.trim()) return { success: false, error: 'Describe what the client is asking for' };

  const create = async () => prisma.changeRequest.create({
    data: {
      projectId,
      crNumber: await nextCrNumber(),
      description: data.description.trim(),
      impactOnScope: data.impactOnScope || null,
      impactOnTimeline: data.impactOnTimeline || null,
      estimatedHours: data.estimatedHours ?? null,
      additionalCost: data.additionalCost ?? null,
      status: 'REQUESTED',
    },
  });
  const cr = await withInvoiceNumberRetry(create);
  await logActivity('ChangeRequest', cr.id, 'Created', `${cr.crNumber}: ${cr.description}`, user.id);
  revalidatePath(`/projects/${projectId}`, 'layout');
  return { success: true };
}

// Step 4 of §11.2: estimate impact (hours, timeline, cost) before the client is asked to approve
export async function estimateChangeRequest(crId: string, data: { estimatedHours: number; additionalCost: number; impactOnTimeline: string; impactOnScope?: string }): Promise<Result> {
  await requireFounder();
  const cr = await prisma.changeRequest.findUnique({ where: { id: crId } });
  if (!cr) return { success: false, error: 'Change request not found' };
  if (cr.status !== 'REQUESTED' && cr.status !== 'ESTIMATED') {
    return { success: false, error: 'The estimate is locked once the client has decided' };
  }
  if (!(data.estimatedHours >= 0) || !(data.additionalCost >= 0) || !data.impactOnTimeline?.trim()) {
    return { success: false, error: 'Enter hours, cost (0 if free) and the timeline impact' };
  }
  await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      estimatedHours: data.estimatedHours,
      additionalCost: data.additionalCost,
      impactOnTimeline: data.impactOnTimeline.trim(),
      impactOnScope: data.impactOnScope ?? cr.impactOnScope,
      status: 'ESTIMATED',
    },
  });
  revalidatePath(`/projects/${cr.projectId}`, 'layout');
  return { success: true };
}

export async function updateChangeRequestStatus(crId: string, status: ChangeRequestStatus, approvalNote?: string): Promise<Result> {
  const user = await requireFounder();
  const cr = await prisma.changeRequest.findUnique({ where: { id: crId }, include: { project: true } });
  if (!cr) return { success: false, error: 'Change request not found' };

  const blocked = checkCrMove(cr, status, approvalNote);
  if (blocked) return { success: false, error: blocked };

  await withInvoiceNumberRetry(() => prisma.$transaction(async (tx) => {
    await tx.changeRequest.update({
      where: { id: crId },
      data: {
        status,
        ...(status === 'APPROVED' ? { clientApprovalDate: new Date(), clientApprovalNote: approvalNote!.trim() } : {}),
      },
    });

    // Step 7 of §11.2: an approved paid change gets its own invoice before work starts
    if (status === 'APPROVED' && (cr.additionalCost ?? 0) > 0) {
      await tx.invoice.create({
        data: {
          invoiceNumber: await nextInvoiceNumber(tx),
          amount: cr.additionalCost!,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          lineItems: [{ description: `${cr.crNumber}: ${cr.description}`, qty: 1, cost: cr.additionalCost, subtotal: cr.additionalCost }],
          notes: `Change request ${cr.crNumber}`,
          clientId: cr.project.clientId,
          projectId: cr.projectId,
          ownerId: cr.project.projectOwnerId,
        },
      });
    }
  }));

  await logActivity('ChangeRequest', cr.id, `Status: ${status}`, approvalNote ? `Client approval: ${approvalNote}` : `${cr.status} → ${status}`, user.id);
  revalidatePath(`/projects/${cr.projectId}`, 'layout');
  revalidatePath('/finance', 'layout');
  return { success: true };
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

export async function setMilestoneStatus(id: string, status: MilestoneStatus, exceptionReason?: string): Promise<Result> {
  const user = await requireFounder();
  const milestone = await prisma.milestone.findUnique({ where: { id }, include: { project: true } });
  if (!milestone) return { success: false, error: 'Milestone not found' };

  if (MILESTONE_ACTIVE_STATUSES.includes(status) && !MILESTONE_ACTIVE_STATUSES.includes(milestone.status)) {
    if (milestone.project.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Gate 4: start the project before working on milestones' };
    }
    // Gate 7: no payment or approval on earlier milestones, no next milestone
    const all = await prisma.milestone.findMany({ where: { projectId: milestone.projectId }, include: { invoices: true } });
    const target = all.find(m => m.id === id)!;
    const blockers = milestoneStartBlockers(all, target);
    if (blockers.length) {
      if (!exceptionReason?.trim()) {
        return { success: false, canOverride: true, error: `Gate 7: ${blockers.join('; ')}. No payment, no next milestone.` };
      }
      await logActivity('Project', milestone.projectId, 'Gate 7 exception', `${milestone.name} started early (${blockers.join('; ')}). Reason: ${exceptionReason.trim()}`, user.id);
    }
  }

  const done = status === 'COMPLETED' || status === 'APPROVED';
  const invoiceCreated = await withInvoiceNumberRetry(() => prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { id },
      data: {
        status,
        completedDate: done ? (milestone.completedDate ?? new Date()) : null,
        clientApprovalDate: status === 'APPROVED' ? (milestone.clientApprovalDate ?? new Date()) : null,
      },
    });

    // A finished milestone is when its money falls due (§13): raise the draft invoice
    // so it can't be forgotten. It counts as owed once it's sent.
    if (!done || !(milestone.paymentAmount > 0)) return undefined;
    const existing = await tx.invoice.count({ where: { milestoneId: id, status: { not: 'CANCELLED' } } });
    if (existing) return undefined;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        amount: milestone.paymentAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        lineItems: [{ description: milestone.deliverables || milestone.name, qty: 1, cost: milestone.paymentAmount, subtotal: milestone.paymentAmount }],
        clientId: milestone.project.clientId,
        projectId: milestone.projectId,
        milestoneId: id,
        ownerId: milestone.project.projectOwnerId,
      },
    });
    return invoice.invoiceNumber;
  }));

  revalidatePath(`/projects/${milestone.projectId}`, 'layout');
  revalidatePath('/dashboard');
  if (invoiceCreated) revalidatePath('/finance', 'layout');
  return { success: true, invoiceCreated };
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


type ProjectDetails = {
  name?: string;
  description?: string;
  scope?: string;
  exclusions?: string;
  contractValue?: number;
  completionPercentage?: number;
  isRecurring?: boolean;
};

// Status changes go through changeProjectStatus so the gates apply
export async function updateProject(id: string, data: ProjectDetails) {
  await requireFounder();
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        scope: data.scope,
        exclusions: data.exclusions,
        contractValue: data.contractValue,
        completionPercentage: data.completionPercentage,
        isRecurring: data.isRecurring,
      }
    });
    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

// ============================================
// PROJECT STATUS GATES (4, 8, 9)
// ============================================

// Closure checklist is stored as a setting so no schema change is needed
const closureKey = (projectId: string) => `project_closure:${projectId}`;

async function readClosure(projectId: string): Promise<Partial<Record<ClosureItemId, boolean>>> {
  const row = await prisma.setting.findUnique({ where: { key: closureKey(projectId) } });
  try {
    return row ? JSON.parse(row.value) : {};
  } catch {
    return {};
  }
}

export async function getProjectGates(projectId: string) {
  await requireFounder();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      milestones: { orderBy: { sortOrder: 'asc' }, include: { invoices: { where: { status: { not: 'CANCELLED' } } } } },
    },
  });
  if (!project) return null;

  const manual = await readClosure(projectId);
  const auto = closureAutoItems(project.milestones);
  const closure = CLOSURE_ITEMS.map(item => ({
    id: item.id,
    label: item.label,
    auto: 'auto' in item,
    done: 'auto' in item ? auto[item.id as keyof typeof auto] : !!manual[item.id],
  }));

  return {
    status: project.status,
    allowedMoves: PROJECT_MOVES[project.status],
    clientId: project.clientId,
    clientName: project.client.company,
    onboardingMissing: missingOnboarding(project.client),
    milestoneCount: project.milestones.length,
    unpaid: unpaidMilestones(project.milestones),
    closure,
  };
}

export async function updateClosureItem(projectId: string, itemId: ClosureItemId, done: boolean): Promise<Result> {
  await requireFounder();
  const item = CLOSURE_ITEMS.find(i => i.id === itemId);
  if (!item) return { success: false, error: 'Unknown checklist item' };
  if ('auto' in item) return { success: false, error: `"${item.label}" is worked out from the project's invoices` };

  const current = await readClosure(projectId);
  const value = JSON.stringify({ ...current, [itemId]: done });
  await prisma.setting.upsert({
    where: { key: closureKey(projectId) },
    create: { key: closureKey(projectId), value },
    update: { value },
  });
  revalidatePath(`/projects/${projectId}`, 'layout');
  return { success: true };
}

export async function changeProjectStatus(projectId: string, to: ProjectStatus, reason?: string): Promise<Result> {
  const user = await requireFounder();
  const gates = await getProjectGates(projectId);
  if (!gates) return { success: false, error: 'Project not found' };
  if (!gates.allowedMoves.includes(to)) {
    return { success: false, error: `A ${gates.status.toLowerCase().replace('_', ' ')} project can't move to ${to.toLowerCase().replace('_', ' ')}` };
  }
  const why = reason?.trim();
  let exception: string | null = null;

  if (to === 'IN_PROGRESS' && gates.status === 'NOT_STARTED') {
    // Gates 3–5: signed agreement, advance and approved scope are all on the onboarding checklist
    if (gates.milestoneCount === 0) {
      return { success: false, error: 'Add the payment milestones before starting the project' };
    }
    if (gates.onboardingMissing.length) {
      if (!why) {
        return {
          success: false,
          canOverride: true,
          error: `Gate 4: ${gates.clientName} isn't fully onboarded. Missing: ${gates.onboardingMissing.join(', ')}.`,
        };
      }
      exception = `Started before onboarding was complete (missing: ${gates.onboardingMissing.join(', ')}). Reason: ${why}`;
    }
  }

  if (to === 'COMPLETED') {
    // Gate 9 has no exceptions: the checklist is the definition of closed
    const open = gates.closure.filter(c => !c.done && !c.auto).map(c => c.label);
    if (open.length) return { success: false, error: `Gate 9: closure checklist not finished. Still open: ${open.join(', ')}.` };
    // Gate 8: final payment before final handover, unless the contract says otherwise
    if (gates.unpaid.length) {
      if (!why) {
        return { success: false, canOverride: true, error: `Gate 8: not fully paid. Unpaid: ${gates.unpaid.join(', ')}.` };
      }
      exception = `Closed with unpaid milestones (${gates.unpaid.join(', ')}). Reason: ${why}`;
    }
  }

  if ((to === 'CANCELLED' || to === 'ON_HOLD' || (to === 'IN_PROGRESS' && gates.status === 'COMPLETED')) && !why) {
    return { success: false, error: 'Add a short reason for this change' };
  }

  const now = new Date();
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: to,
      ...(to === 'IN_PROGRESS' && gates.status === 'NOT_STARTED' ? { startDate: now } : {}),
      ...(to === 'COMPLETED' ? { actualEndDate: now, completionPercentage: 100 } : {}),
      ...(to === 'IN_PROGRESS' && gates.status === 'COMPLETED' ? { actualEndDate: null } : {}),
    },
  });

  await logActivity('Project', projectId, `Status: ${to}`, `${gates.status} → ${to}${why ? `. ${why}` : ''}`, user.id);
  if (exception) await logActivity('Project', projectId, 'Gate exception', exception, user.id);

  revalidatePath(`/projects/${projectId}`, 'layout');
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================
// LIST VIEWS: the numbers each list needs, worked out once on the server
// ============================================

export async function getProjectsOverview() {
  await requireFounder();
  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, company: true, isOnboarded: true } },
      // Every invoice on the project, including change requests and ones not tied to a milestone
      invoices: { where: { status: { not: 'CANCELLED' } }, select: { status: true, amount: true, paidAmount: true } },
      milestones: {
        orderBy: { sortOrder: 'asc' },
        include: { invoices: { where: { status: { not: 'CANCELLED' } }, select: { status: true, amount: true, paidAmount: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return projects.map(p => {
    const invoices = p.invoices;
    const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const invoiced = invoices.filter(i => i.status !== 'DRAFT').reduce((s, i) => s + i.amount, 0);
    // The next milestone that still needs work or money
    const next = p.milestones.find(m => !m.invoices.some(i => i.status === 'PAID'));
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      health: p.health,
      contractValue: p.contractValue,
      completionPercentage: p.completionPercentage,
      isRecurring: p.isRecurring,
      expectedEndDate: p.expectedEndDate,
      collected,
      owed: invoiced - collected,
      milestoneCount: p.milestones.length,
      nextMilestone: next ? { name: next.name, dueDate: next.dueDate, amount: next.paymentAmount, invoiced: next.invoices.length > 0 } : null,
    };
  });
}

export async function getClientsOverview() {
  await requireFounder();
  const clients = await prisma.client.findMany({
    include: {
      projects: { select: { id: true, status: true, contractValue: true } },
      invoices: { where: { status: { notIn: ['DRAFT', 'CANCELLED'] } }, select: { amount: true, paidAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return clients.map(c => {
    const done = ONBOARDING_ITEMS.filter(i => c[i.id]).length;
    const nextItem = ONBOARDING_ITEMS.find(i => !c[i.id]);
    return {
      id: c.id,
      company: c.company,
      primaryContactName: c.primaryContactName,
      primaryContactEmail: c.primaryContactEmail,
      onboardingDone: done,
      onboardingTotal: ONBOARDING_ITEMS.length,
      nextOnboardingStep: nextItem?.label ?? null,
      activeProjects: c.projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED').length,
      contracted: c.projects.filter(p => p.status !== 'CANCELLED').reduce((s, p) => s + p.contractValue, 0),
      collected: c.invoices.reduce((s, i) => s + i.paidAmount, 0),
      owed: c.invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0),
    };
  });
}
