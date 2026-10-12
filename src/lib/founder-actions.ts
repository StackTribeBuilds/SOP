'use server';

import { prisma } from '@/lib/prisma';
import { requireFounder } from '@/lib/session';
import { OPEN_INVOICE_STATUSES, invoiceOutstanding, invoiceExpectedCash, isInvoiceOverdue } from '@/lib/utils';
import { startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function getDailyFounderMetrics() {
  await requireFounder();
  // Current bank balance
  const latestBalance = await prisma.bankBalance.findFirst({
    orderBy: { date: 'desc' },
  });

  // Overdue is worked out from due dates (no job ever sets the OVERDUE status)
  const openInvoices = await prisma.invoice.findMany({
    where: { status: { in: [...OPEN_INVOICE_STATUSES] }, dueDate: { lt: new Date() } },
  });
  const overdue = openInvoices.filter(i => isInvoiceOverdue(i));
  const totalOverdueAmount = overdue.reduce((sum, i) => sum + invoiceOutstanding(i), 0);

  // Leads in active negotiation
  const negotiationLeadsCount = await prisma.lead.count({
    where: {
      stage: 'NEGOTIATION',
    }
  });

  // Projects blocked
  const blockedProjectsCount = await prisma.project.count({
    where: {
      health: 'BLOCKED',
    }
  });

  return {
    bankBalance: latestBalance?.amount || 0,
    overdueInvoicesCount: overdue.length,
    totalOverdueAmount,
    negotiationLeadsCount,
    blockedProjectsCount,
  };
}

export async function getWeeklyMeetingData() {
  await requireFounder();
  const now = new Date();
  
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  const [
    expectedCashThisWeek,
    expectedCashNextWeek,
    newLeadsThisWeek,
    dealsWonThisWeek,
    projectsAtRisk
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { dueDate: { gte: thisWeekStart, lte: thisWeekEnd }, status: { in: [...OPEN_INVOICE_STATUSES] } },
    }),
    prisma.invoice.findMany({
      where: { dueDate: { gte: nextWeekStart, lte: nextWeekEnd }, status: { in: [...OPEN_INVOICE_STATUSES] } },
    }),
    prisma.lead.count({ where: { createdAt: { gte: thisWeekStart, lte: thisWeekEnd } } }),
    prisma.lead.count({ where: { stage: 'WON', updatedAt: { gte: thisWeekStart, lte: thisWeekEnd } } }),
    prisma.project.count({ where: { health: 'AT_RISK' } })
  ]);

  const cashThisWeek = expectedCashThisWeek.reduce((sum, i) => sum + invoiceExpectedCash(i), 0);
  const cashNextWeek = expectedCashNextWeek.reduce((sum, i) => sum + invoiceExpectedCash(i), 0);

  return {
    expectedCashThisWeek: cashThisWeek,
    expectedCashNextWeek: cashNextWeek,
    newLeadsThisWeek,
    dealsWonThisWeek,
    projectsAtRisk
  };
}

export async function getMonthlyReviewData(year: number, month: number) {
  await requireFounder();
  // month is 1-indexed here, convert to 0-indexed for Date
  const date = new Date(year, month - 1, 1);
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  const [revenueAgg, collectedAgg, expensesAgg, withdrawalsAgg] = await Promise.all([
    prisma.invoice.aggregate({ where: { dueDate: { gte: start, lte: end }, status: { notIn: ['DRAFT', 'CANCELLED'] } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.founderWithdrawal.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } })
  ]);
  const revenue = revenueAgg._sum.amount || 0;
  const collectedCash = collectedAgg._sum.amount || 0;
  const expenses = expensesAgg._sum.amount || 0;
  const founderWithdrawals = withdrawalsAgg._sum.amount || 0;

  const netMargin = collectedCash - expenses;

  // Mock saving of monthly review data via Settings
  const key = `monthly_review_${year}_${month}`;
  const value = JSON.stringify({ revenue, collectedCash, expenses, founderWithdrawals, netMargin });
  
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });

  return {
    revenue,
    collectedCash,
    expenses,
    founderWithdrawals,
    netMargin
  };
}

export async function getGlobalKPIs() {
  await requireFounder();
  const [
    closedLeads,
    wonLeadsAgg,
    pipelineAgg,
    receivablesAgg,
    atRiskProjects,
    bankResult,
    projectsOnTrack
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ['stage'], where: { stage: { in: ['WON', 'LOST'] } }, _count: { id: true } }),
    prisma.lead.aggregate({ where: { stage: 'WON' }, _avg: { estimatedBudget: true } }),
    prisma.lead.aggregate({ where: { stage: { notIn: ['WON', 'LOST'] } }, _sum: { estimatedBudget: true } }),
    prisma.invoice.aggregate({ where: { status: { in: [...OPEN_INVOICE_STATUSES] } }, _sum: { amount: true, paidAmount: true } }),
    prisma.project.count({ where: { health: 'AT_RISK' } }),
    prisma.bankBalance.findFirst({ orderBy: { date: 'desc' } }),
    prisma.project.count({ where: { health: 'ON_TRACK' } })
  ]);
  
  let wonCount = 0;
  let lostCount = 0;
  
  closedLeads.forEach(g => {
    if (g.stage === 'WON') wonCount = g._count.id;
    if (g.stage === 'LOST') lostCount = g._count.id;
  });
  
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
  const averageDealSize = wonLeadsAgg._avg.estimatedBudget || 0;
  const totalPipelineValue = pipelineAgg._sum.estimatedBudget || 0;
  const totalReceivables = (receivablesAgg._sum.amount || 0) - (receivablesAgg._sum.paidAmount || 0);
  
  const bankBalance = bankResult?.amount || 0;
  
  let healthScore = 50;
  healthScore += Math.min(20, winRate / 2);
  healthScore += Math.max(0, 20 - (atRiskProjects * 5));
  if (bankBalance > 1000000) healthScore += 10;
  else if (bankBalance > 500000) healthScore += 5;

  return {
    agencyHealthScore: Math.round(healthScore),
    financial: {
      totalReceivables,
      margin: 40, 
      cashFlowHealth: bankBalance > 50000 ? "Healthy" : "Needs Attention"
    },
    sales: {
      winRate: Math.round(winRate),
      averageDealSize: Math.round(averageDealSize),
      pipelineValue: totalPipelineValue
    },
    delivery: {
      projectsOnTrack,
      projectsAtRisk: atRiskProjects
    }
  };
}

export async function saveMonthlyReview(year: number, month: number, retrospective: string) {
  await requireFounder();
  const key = `monthly_retro_${year}_${month}`;
  await prisma.setting.upsert({
    where: { key },
    update: { value: retrospective },
    create: { key, value: retrospective }
  });
}

// Founder Reports actions
export async function saveFounderDailyReport(date: Date, data: any) {
  const { id: userId } = await requireFounder();
  // Normalize date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  return await prisma.founderDailyReport.upsert({
    where: {
      date_userId: {
        date: normalizedDate,
        userId: userId,
      }
    },
    update: data,
    create: {
      ...data,
      date: normalizedDate,
      userId: userId,
    }
  });
}

export async function saveFounderWeeklyReport(weekStartDate: Date, data: any) {
  const { id: userId } = await requireFounder();
  const normalizedDate = new Date(weekStartDate);
  normalizedDate.setHours(0, 0, 0, 0);

  return await prisma.founderWeeklyReport.upsert({
    where: {
      weekStartDate_userId: {
        weekStartDate: normalizedDate,
        userId: userId,
      }
    },
    update: data,
    create: {
      ...data,
      weekStartDate: normalizedDate,
      userId: userId,
    }
  });
}

export async function saveFounderMonthlyReport(year: number, month: number, data: any) {
  const { id: userId } = await requireFounder();
  return await prisma.founderMonthlyReport.upsert({
    where: {
      month_year_userId: {
        month,
        year,
        userId,
      }
    },
    update: data,
    create: {
      ...data,
      month,
      year,
      userId,
    }
  });
}
