'use server';

import { prisma } from '@/lib/prisma';
import { requireFounder } from '@/lib/session';
import { OPEN_INVOICE_STATUSES, invoiceOutstanding, invoiceExpectedCash, isInvoiceOverdue, getCashZone } from '@/lib/utils';
import { PIPELINE_STAGES, healthScore, winRate } from '@/lib/kpis';
import { getPnLData } from '@/lib/actions';
import { revalidatePath } from 'next/cache';
import { startOfWeek, endOfWeek, addWeeks, startOfMonth, subMonths } from 'date-fns';

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
    // Counted from the stage-change log, so editing an old won lead doesn't count it again
    prisma.activity.findMany({
      where: { entityType: 'Lead', action: 'Stage changed', details: { endsWith: '→ WON' }, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
      select: { entityId: true },
      distinct: ['entityId'],
    }).then(rows => rows.length),
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
  // month is 1-indexed here; the P&L takes 0-indexed months. Same numbers as the P&L page.
  const pnl = await getPnLData(year, month - 1);

  const revenue = pnl.revenue;
  const collectedCash = pnl.collections;
  const expenses = pnl.projectCosts + pnl.operatingExpenses;
  const founderWithdrawals = pnl.founderCompensation;
  const netMargin = pnl.netProfit;

  // Snapshot for the month-end review history
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
  const now = new Date();

  const [closedLeads, wonLeadsAgg, pipelineAgg, openInvoices, activeProjects, bankResult, floorSetting] = await Promise.all([
    prisma.lead.groupBy({ by: ['stage'], where: { stage: { in: ['WON', 'LOST'] } }, _count: { id: true } }),
    prisma.lead.aggregate({ where: { stage: 'WON' }, _avg: { estimatedBudget: true } }),
    prisma.lead.aggregate({ where: { stage: { in: PIPELINE_STAGES } }, _sum: { estimatedBudget: true } }),
    prisma.invoice.findMany({ where: { status: { in: [...OPEN_INVOICE_STATUSES] } } }),
    prisma.project.findMany({ where: { status: 'IN_PROGRESS' }, select: { health: true } }),
    prisma.bankBalance.findFirst({ orderBy: { date: 'desc' } }),
    prisma.setting.findUnique({ where: { key: 'minimum_cash_floor' } }),
  ]);

  const wonCount = closedLeads.find(g => g.stage === 'WON')?._count.id ?? 0;
  const lostCount = closedLeads.find(g => g.stage === 'LOST')?._count.id ?? 0;
  const rate = winRate(wonCount, lostCount);

  const totalReceivables = openInvoices.reduce((sum, i) => sum + invoiceOutstanding(i), 0);
  const totalOverdue = openInvoices.filter(i => isInvoiceOverdue(i, now)).reduce((sum, i) => sum + invoiceOutstanding(i), 0);

  const bankBalance = bankResult?.amount ?? 0;
  const minimumFloor = Number(floorSetting?.value ?? 100000);
  const cashZone = getCashZone(bankBalance, minimumFloor);

  // Margin over the last 3 full months, using the same P&L rules as the P&L page
  const months = [1, 2, 3].map(n => subMonths(startOfMonth(now), n));
  const pnls = await Promise.all(months.map(m => getPnLData(m.getFullYear(), m.getMonth())));
  const revenue3m = pnls.reduce((sum, p) => sum + p.revenue, 0);
  const net3m = pnls.reduce((sum, p) => sum + p.netProfit, 0);
  const netMargin = revenue3m > 0 ? (net3m / revenue3m) * 100 : null;

  const troubled = activeProjects.filter(p => p.health !== 'ON_TRACK').length;
  const health = healthScore({
    cashZone,
    receivables: totalReceivables,
    overdue: totalOverdue,
    winRatePercent: rate,
    closedDeals: wonCount + lostCount,
    activeProjects: activeProjects.length,
    troubledProjects: troubled,
  });

  return {
    agencyHealthScore: health.score,
    healthParts: health.parts,
    financial: {
      totalReceivables,
      totalOverdue,
      netMargin,
      revenue3m,
      bankBalance,
      minimumFloor,
      cashZone,
    },
    sales: {
      winRate: Math.round(rate),
      wonCount,
      lostCount,
      averageDealSize: Math.round(wonLeadsAgg._avg.estimatedBudget || 0),
      pipelineValue: pipelineAgg._sum.estimatedBudget || 0,
    },
    delivery: {
      activeProjects: activeProjects.length,
      projectsOnTrack: activeProjects.length - troubled,
      projectsAtRisk: troubled,
    }
  };
}

// ============================================
// BDE COMMISSION (§18.4): on collected cash, never on signed value
// ============================================

export async function getCommissionReport(year: number, month: number) {
  await requireFounder();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const [payments, rateSetting] = await Promise.all([
    prisma.payment.findMany({
      where: { date: { gte: start, lt: end } },
      include: {
        client: {
          include: {
            // The won lead that created this client carries the BDE who brought it in
            leads: { where: { stage: 'WON' }, orderBy: { updatedAt: 'desc' }, take: 1, include: { owner: { select: { id: true, name: true, role: true } } } },
          },
        },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.setting.findUnique({ where: { key: 'bde_commission_percent' } }),
  ]);

  const ratePercent = rateSetting ? Number(rateSetting.value) : null;
  const byOwner = new Map<string, { ownerId: string; ownerName: string; role: string; collected: number; payments: { client: string; amount: number; date: Date }[] }>();
  let unattributed = 0;

  for (const p of payments) {
    const owner = p.client.leads[0]?.owner;
    if (!owner) {
      unattributed += p.amount;
      continue;
    }
    const row = byOwner.get(owner.id) ?? { ownerId: owner.id, ownerName: owner.name, role: owner.role, collected: 0, payments: [] };
    row.collected += p.amount;
    row.payments.push({ client: p.client.company, amount: p.amount, date: p.date });
    byOwner.set(owner.id, row);
  }

  const rows = [...byOwner.values()]
    .map(r => ({ ...r, commission: ratePercent != null ? (r.collected * ratePercent) / 100 : null }))
    .sort((a, b) => b.collected - a.collected);

  return { ratePercent, rows, unattributed, totalCollected: payments.reduce((sum, p) => sum + p.amount, 0) };
}

export async function setCommissionRate(percent: number) {
  await requireFounder();
  if (!(percent >= 0 && percent <= 50)) return { success: false as const, error: 'Enter a rate between 0 and 50%' };
  await prisma.setting.upsert({
    where: { key: 'bde_commission_percent' },
    create: { key: 'bde_commission_percent', value: String(percent) },
    update: { value: String(percent) },
  });
  revalidatePath('/reports');
  return { success: true as const };
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
