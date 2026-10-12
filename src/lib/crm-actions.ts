'use server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { LeadStage } from '@prisma/client';
import { checkLeadMove } from '@/lib/gates';
import { BDE_STAGE_COUNTS, PIPELINE_STAGES, STAGE_PROBABILITY, weekStart, winRate } from '@/lib/kpis';
import { addDays, startOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all leads, optionally filtered by stage.
 */
export async function getLeads(stage?: string) {
  await requireUser();
  try {
    const whereClause = stage ? { stage: stage as LeadStage } : {};
    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        client: true,
      },
    });
    return { success: true, data: leads };
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new lead.
 */
export async function createLead(data: any) {
  const user = await requireUser();
  try {
    const lead = await prisma.lead.create({
      data: {
        company: data.company,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        source: data.source,
        requirement: data.requirement,
        estimatedBudget: data.estimatedBudget ? parseFloat(data.estimatedBudget.toString()) : null,
        timeline: data.timeline,
        decisionMaker: data.decisionMaker,
        nextAction: data.nextAction,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : new Date(),
        stage: 'NEW',
        ownerId: user.id,
      },
    });
    await prisma.activity.create({
      data: { entityType: 'Lead', entityId: lead.id, action: 'Created', details: `Source: ${lead.source}`, userId: user.id },
    });
    return { success: true, data: lead };
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the stage of a lead (e.g., for Kanban board).
 */
export async function updateLeadStage(id: string, stage: string, lostReason?: string) {
  const user = await requireUser();
  try {
    const lead = await prisma.$transaction(async (tx) => {
      const current = await tx.lead.findUnique({
        where: { id },
        include: { client: { include: { _count: { select: { projects: true } } } } },
      });
      if (!current) throw new GateError('Lead not found');

      // Gates 1–3: allowed stage moves, qualification, founder-only wins
      const blocked = checkLeadMove(
        { ...current, clientProjectCount: current.client?._count.projects ?? 0 },
        stage as LeadStage,
        user.role,
        lostReason,
      );
      if (blocked) throw new GateError(blocked);

      // Gate 3: a won lead becomes a client, so projects and invoices can be raised against it
      let clientId = current.clientId;
      if (stage === 'WON' && !clientId) {
        const client = await tx.client.create({
          data: {
            company: current.company,
            primaryContactName: current.contactName,
            primaryContactPhone: current.phone,
            primaryContactEmail: current.email,
            decisionMakerName: current.decisionMaker,
          },
        });
        clientId = client.id;
      }

      const updated = await tx.lead.update({
        where: { id },
        data: {
          stage: stage as LeadStage,
          clientId,
          lostReason: stage === 'LOST' ? lostReason!.trim() : current.lostReason,
        },
      });
      await tx.activity.create({
        data: {
          entityType: 'Lead',
          entityId: id,
          action: 'Stage changed',
          details: `${current.stage} → ${stage}${stage === 'LOST' ? `. Reason: ${lostReason!.trim()}` : ''}`,
          userId: user.id,
        },
      });
      return updated;
    });

    revalidatePath('/leads', 'layout');
    revalidatePath('/clients');
    revalidatePath('/dashboard');
    return { success: true, data: lead };
  } catch (error: any) {
    if (error instanceof GateError) return { success: false, error: error.message };
    console.error('Error updating lead stage:', error);
    return { success: false, error: 'Could not update the lead. Try again.' };
  }
}

class GateError extends Error {}

/**
 * Updates the qualification fields of a lead.
 */
export type LeadQualificationInput = {
  estimatedBudget?: number | null;
  timeline?: string;
  decisionMaker?: string;
  businessDescription?: string;
  problemToSolve?: string;
  whoWillUse?: string;
  whyBuilding?: string;
  projectType?: string;
  existingSystem?: boolean | null;
  integrationsNeeded?: string;
  budgetConfirmed?: boolean;
  paymentStructure?: string;
  otherApprovers?: string;
};

// The Bible §4.1 qualification questions, including the three Gate 2 fields
export async function updateLeadQualification(id: string, data: LeadQualificationInput) {
  const user = await requireUser();
  try {
    const clean = (v?: string) => (v?.trim() ? v.trim() : null);
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        estimatedBudget: data.estimatedBudget && data.estimatedBudget > 0 ? data.estimatedBudget : null,
        timeline: clean(data.timeline),
        decisionMaker: clean(data.decisionMaker),
        businessDescription: clean(data.businessDescription),
        problemToSolve: clean(data.problemToSolve),
        whoWillUse: clean(data.whoWillUse),
        whyBuilding: clean(data.whyBuilding),
        projectType: clean(data.projectType),
        existingSystem: data.existingSystem ?? null,
        integrationsNeeded: clean(data.integrationsNeeded),
        budgetConfirmed: !!data.budgetConfirmed,
        paymentStructure: clean(data.paymentStructure),
        otherApprovers: clean(data.otherApprovers),
      },
    });
    await prisma.activity.create({
      data: { entityType: 'Lead', entityId: id, action: 'Qualification updated', userId: user.id },
    });
    revalidatePath(`/leads/${id}`);
    revalidatePath('/leads', 'layout');
    return { success: true, data: lead };
  } catch (error: any) {
    console.error('Error updating lead qualification:', error);
    return { success: false, error: 'Could not save the qualification details. Try again.' };
  }
}

/**
 * Returns metrics for the sales dashboard.
 */
export async function getPipelineMetrics() {
  await requireUser();
  try {
    const [openLeads, closed] = await Promise.all([
      prisma.lead.findMany({ where: { stage: { in: PIPELINE_STAGES } } }),
      prisma.lead.findMany({ where: { stage: { in: ['WON', 'LOST'] } }, select: { stage: true, estimatedBudget: true } }),
    ]);

    // Pipeline = qualified open deals only; won deals are revenue, not pipeline
    const totalValue = openLeads.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const weightedValue = openLeads.reduce((sum, l) => sum + (l.estimatedBudget || 0) * (STAGE_PROBABILITY[l.stage] ?? 0), 0);
    const won = closed.filter(l => l.stage === 'WON');
    const lostCount = closed.length - won.length;

    const pipelineChartData = [
      ...PIPELINE_STAGES.map(stage => ({
        name: stage.charAt(0) + stage.slice(1).toLowerCase(),
        value: openLeads.filter(l => l.stage === stage).reduce((sum, l) => sum + (l.estimatedBudget || 0), 0),
      })),
      { name: 'Won', value: won.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) },
    ];

    return {
      success: true,
      data: {
        totalValue,
        weightedValue,
        activeDeals: openLeads.length,
        winRate: winRate(won.length, lostCount),
        pipelineChartData,
      }
    };
  } catch (error: any) {
    console.error('Error fetching pipeline metrics:', error);
    return { success: false, error: error.message };
  }
}

// Counts a BDE's work from the CRM itself (§18.2), so reports match what actually happened
async function crmActivityCounts(userId: string, from: Date, to: Date) {
  const [newProspects, stageMoves, notes] = await Promise.all([
    prisma.lead.count({ where: { ownerId: userId, createdAt: { gte: from, lt: to } } }),
    prisma.activity.findMany({
      where: { userId, entityType: 'Lead', action: 'Stage changed', createdAt: { gte: from, lt: to } },
      select: { entityId: true, details: true },
    }),
    prisma.activity.count({
      where: { userId, entityType: 'Lead', action: 'Added Note / Update', createdAt: { gte: from, lt: to } },
    }),
  ]);

  // Each lead counts once per stage, even if it was moved back and forth
  const movedInto = (stage: string) =>
    new Set(stageMoves.filter(a => a.details?.endsWith(`→ ${stage}`)).map(a => a.entityId)).size;

  return {
    newProspects,
    contacted: movedInto(BDE_STAGE_COUNTS.contacted),
    replies: movedInto(BDE_STAGE_COUNTS.replies),
    qualified: movedInto(BDE_STAGE_COUNTS.qualified),
    meetingsBooked: movedInto(BDE_STAGE_COUNTS.meetingsBooked),
    proposalsRequested: movedInto(BDE_STAGE_COUNTS.proposalsRequested),
    followUps: notes,
  };
}

export type BdeCounts = Awaited<ReturnType<typeof crmActivityCounts>>;

// Today's CRM counts, used to pre-fill the end-of-day report
export async function getTodayCrmCounts(): Promise<BdeCounts> {
  const { id } = await requireUser();
  const from = startOfDay(new Date());
  return crmActivityCounts(id, from, addDays(from, 1));
}

/**
 * Creates or updates a BdeDailyReport in Prisma for a user.
 */
export async function logBdeActivity(data: any) {
  const user = await requireUser();
  try {
    const reportDate = data.date ? new Date(data.date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const reportData = {
      newProspects: data.newProspects || 0,
      contacted: data.contacted || 0,
      replies: data.replies || 0,
      qualified: data.qualified || 0,
      meetingsBooked: data.meetingsBooked || 0,
      followUps: data.followUps || 0,
      proposalsRequested: data.proposalsRequested || 0,
      problems: data.problems,
      tomorrowPriorities: data.tomorrowPriorities,
    };

    const report = await prisma.bdeDailyReport.upsert({
      where: {
        date_userId: {
          date: reportDate,
          userId: user.id,
        }
      },
      update: reportData,
      create: {
        date: reportDate,
        userId: user.id,
        ...reportData
      },
    });
    
    // Using Next.js cache revalidation if we were in the context, but let's assume UI handles refresh
    return { success: true, data: report };
  } catch (error: any) {
    console.error('Error logging BDE activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches BDE metrics for the current week.
 */
export async function getBdeMetrics() {
  const { id: userId } = await requireUser();
  try {
    const from = weekStart();
    const now = new Date();

    const [reports, activeLeads, crm] = await Promise.all([
      prisma.bdeDailyReport.findMany({
        where: { userId, date: { gte: from } },
        orderBy: { date: 'desc' },
      }),
      prisma.lead.findMany({
        where: { ownerId: userId, stage: { notIn: ['WON', 'LOST'] } }
      }),
      crmActivityCounts(userId, from, addDays(from, 7)),
    ]);

    // Calculate action plan metrics
    const overdueLeads = activeLeads.filter(l => l.nextActionDate && new Date(l.nextActionDate) < now);
    const missingActionLeads = activeLeads.filter(l => !l.nextAction || !l.nextActionDate);
    const untouchedLeads = activeLeads.filter(l => {
      const daysSinceUpdate = (now.getTime() - new Date(l.updatedAt).getTime()) / (1000 * 3600 * 24);
      return daysSinceUpdate > 7; // Stalled for more than 7 days
    });

    const reported = (k: keyof BdeCounts) => reports.reduce((sum, r) => sum + r[k], 0);

    const metrics = {
      // Scorecard numbers come from the CRM; the self-reported totals are shown next to them
      meetingsBooked: crm.meetingsBooked,
      prospectsContacted: crm.contacted,
      qualified: crm.qualified,
      reported: {
        meetingsBooked: reported('meetingsBooked'),
        prospectsContacted: reported('contacted'),
        qualified: reported('qualified'),
      },
      crm,
      recentReports: reports,
      actionPlan: {
        overdue: overdueLeads,
        missingAction: missingActionLeads,
        stalled: untouchedLeads
      }
    };

    return { success: true, data: metrics };
  } catch (error: any) {
    console.error('Error fetching BDE metrics:', error);
    return { success: false, error: error.message };
  }
}

export async function addLeadActivity(
  leadId: string, 
  action: string, 
  details?: string,
  updateNextAction?: { text: string; date: string }
) {
  const user = await requireUser();
  try {

    // 1. Create the activity note
    const activity = await prisma.activity.create({
      data: {
        entityType: 'Lead',
        entityId: leadId,
        action,
        details,
        userId: user.id
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // 2. Optionally update the lead's next action and log it
    if (updateNextAction && updateNextAction.text) {
      const nextDate = updateNextAction.date ? new Date(updateNextAction.date) : new Date();
      
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          nextAction: updateNextAction.text,
          nextActionDate: nextDate
        }
      });

      // Log the next action change as a system-like activity
      await prisma.activity.create({
        data: {
          entityType: 'Lead',
          entityId: leadId,
          action: 'Next Action Updated',
          details: `Set to: "${updateNextAction.text}" on ${nextDate.toLocaleDateString()}`,
          userId: user.id
        }
      });
    }
    
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/leads`);
    revalidatePath(`/dashboard`); // Since dashboard has active leads
    
    return { success: true, data: activity };
  } catch (error: any) {
    console.error('Error adding lead activity:', error);
    return { success: false, error: error.message };
  }
}
