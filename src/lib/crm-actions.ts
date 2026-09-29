'use server';

import { prisma } from '@/lib/prisma';
import { LeadStage } from '@prisma/client';

/**
 * Fetches all leads, optionally filtered by stage.
 */
export async function getLeads(stage?: string) {
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
        ownerId: data.ownerId, // Assumes ownerId is provided in data
      },
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
export async function updateLeadStage(id: string, stage: string) {
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { stage: stage as LeadStage },
    });
    return { success: true, data: lead };
  } catch (error: any) {
    console.error('Error updating lead stage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the qualification fields of a lead.
 */
export async function updateLeadQualification(id: string, data: any) {
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        businessDescription: data.businessDescription,
        problemToSolve: data.problemToSolve,
        whoWillUse: data.whoWillUse,
        whyBuilding: data.whyBuilding,
        projectType: data.projectType,
        existingSystem: data.existingSystem,
        integrationsNeeded: data.integrationsNeeded,
        budgetConfirmed: data.budgetConfirmed,
        paymentStructure: data.paymentStructure,
        otherApprovers: data.otherApprovers,
      },
    });
    return { success: true, data: lead };
  } catch (error: any) {
    console.error('Error updating lead qualification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Returns metrics for the sales dashboard.
 */
export async function getPipelineMetrics() {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        stage: {
          in: ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
        }
      }
    });

    let totalValue = 0;
    let weightedValue = 0;
    let activeDeals = 0;
    let wonDeals = 0;
    let totalDeals = 0;

    const stageData = {
      DISCOVERY: { name: 'Discovery', value: 0 },
      PROPOSAL: { name: 'Proposal', value: 0 },
      NEGOTIATION: { name: 'Negotiation', value: 0 },
      WON: { name: 'Won', value: 0 }
    };

    leads.forEach((lead: any) => {
      if (lead.stage !== 'LOST') {
        totalDeals++;
        const value = lead.estimatedBudget || 0;
        
        // Basic probabilities for weighted value if none exists
        let prob = 0;
        if (lead.stage === 'DISCOVERY') prob = 0.2;
        if (lead.stage === 'PROPOSAL') prob = 0.5;
        if (lead.stage === 'NEGOTIATION') prob = 0.8;
        if (lead.stage === 'WON') prob = 1;

        if (lead.stage !== 'WON') {
          activeDeals++;
        } else {
          wonDeals++;
        }

        totalValue += value;
        weightedValue += (value * prob);

        if (stageData[lead.stage as keyof typeof stageData]) {
          stageData[lead.stage as keyof typeof stageData].value += value;
        }
      } else {
        totalDeals++; // Count LOST in total for win rate
      }
    });

    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
    
    const pipelineChartData = [
      stageData.DISCOVERY,
      stageData.PROPOSAL,
      stageData.NEGOTIATION,
      stageData.WON
    ];

    return { 
      success: true, 
      data: {
        totalValue,
        weightedValue,
        activeDeals,
        winRate,
        pipelineChartData
      }
    };
  } catch (error: any) {
    console.error('Error fetching pipeline metrics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates or updates a BdeDailyReport in Prisma for a user.
 */
export async function logBdeActivity(data: any) {
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
          userId: data.userId,
        }
      },
      update: reportData,
      create: {
        date: reportDate,
        userId: data.userId,
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
export async function getBdeMetrics(userId: string) {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const reports = await prisma.bdeDailyReport.findMany({
      where: { 
        userId,
        date: {
          gte: startOfWeek
        }
      },
      orderBy: { date: 'desc' },
    });

    const metrics = {
      meetingsBooked: reports.reduce((sum: number, r: any) => sum + r.meetingsBooked, 0),
      prospectsContacted: reports.reduce((sum: number, r: any) => sum + r.contacted, 0),
      qualified: reports.reduce((sum: number, r: any) => sum + r.qualified, 0),
      recentReports: reports
    };

    return { success: true, data: metrics };
  } catch (error: any) {
    console.error('Error fetching BDE metrics:', error);
    return { success: false, error: error.message };
  }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { revalidatePath } from "next/cache";

export async function addLeadActivity(
  leadId: string, 
  action: string, 
  details?: string,
  updateNextAction?: { text: string; date: string }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 1. Create the activity note
    const activity = await prisma.activity.create({
      data: {
        entityType: 'Lead',
        entityId: leadId,
        action,
        details,
        userId: session.user.id
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
          userId: session.user.id
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
