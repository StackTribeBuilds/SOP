'use server'

import { prisma } from './prisma'
import { requireFounder } from './session'
import { revalidatePath } from 'next/cache'
import { startOfWeek, startOfDay, addDays, subMonths, startOfMonth } from 'date-fns'
import { getCashZone, invoiceOutstanding, invoiceExpectedCash, isInvoiceOverdue, OPEN_INVOICE_STATUSES } from './utils'
import { PIPELINE_STAGES, STAGE_PROBABILITY } from './kpis'
import { applyInvoicePayment, PaymentError, readPaymentInput } from './payments'

// ============================================
// BANK BALANCE
// ============================================

export async function updateBankBalance(amount: number, notes?: string) {
  await requireFounder()
  await prisma.bankBalance.create({
    data: { amount, notes },
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance')
}

export async function getLatestBankBalance() {
  await requireFounder()
  const balance = await prisma.bankBalance.findFirst({
    orderBy: { date: 'desc' },
  })
  return balance?.amount ?? 0
}

// ============================================
// PAYMENTS
// ============================================

export async function logPayment(data: {
  amount: number
  clientId?: string
  invoiceId?: string
  date: string
  method?: string
  reference?: string
  notes?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  await requireFounder()

  try {
    const payment = readPaymentInput(data)
    // Payment and invoice update succeed or fail together
    await prisma.$transaction(async (tx) => {
      if (data.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } })
        if (!invoice) throw new PaymentError('Invoice not found')
        await applyInvoicePayment(tx, invoice, payment)
        return
      }
      // Money not tied to an invoice (rare): record it against the client only
      if (!data.clientId) throw new PaymentError('Choose a client or an invoice for this payment')
      await tx.payment.create({
        data: { ...payment, clientId: data.clientId, invoiceId: null },
      })
    })
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message }
    throw e
  }

  revalidatePath('/dashboard')
  revalidatePath('/finance', 'layout')
  revalidatePath('/projects', 'layout')
  return { success: true }
}

// ============================================
// EXPENSES
// ============================================

export async function logExpense(data: {
  description: string
  amount: number
  category: string
  date: string
  isRecurring?: boolean
  recurringDay?: number
  notes?: string
  projectId?: string
}) {
  await requireFounder()
  const expense = await prisma.expense.create({
    data: {
      description: data.description,
      amount: data.amount,
      category: data.category as any,
      date: new Date(data.date),
      isRecurring: data.isRecurring || false,
      recurringDay: data.recurringDay,
      notes: data.notes,
      projectId: data.projectId,
    },
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance/expenses')
  return expense
}

// ============================================
// FOUNDER WITHDRAWALS
// ============================================

export async function logWithdrawal(data: {
  amount: number
  userId: string
  date: string
  type: string
  notes?: string
}) {
  await requireFounder()
  const withdrawal = await prisma.founderWithdrawal.create({
    data: {
      amount: data.amount,
      userId: data.userId,
      date: new Date(data.date),
      type: data.type as any,
      notes: data.notes,
    },
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance/withdrawals')
  return withdrawal
}

// ============================================
// INVOICES
// ============================================

export async function createInvoice(data: {
  invoiceNumber: string
  amount: number
  dueDate: string
  clientId: string
  projectId?: string
  milestoneId?: string
  ownerId: string
  probability?: string
  probabilityPercent?: number
  nextAction?: string
  nextActionDate?: string
  notes?: string
}) {
  await requireFounder()
  const expectedCash = data.amount * ((data.probabilityPercent ?? 100) / 100)
  
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      clientId: data.clientId,
      projectId: data.projectId || null,
      milestoneId: data.milestoneId || null,
      ownerId: data.ownerId,
      probability: (data.probability as any) || 'COMMITTED',
      probabilityPercent: data.probabilityPercent ?? 100,
      expectedCash,
      nextAction: data.nextAction,
      nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : null,
      notes: data.notes,
      status: 'SENT',
    },
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance/receivables')
  return invoice
}

export async function updateInvoice(id: string, data: {
  amount?: number
  dueDate?: string
  status?: string
  probability?: string
  probabilityPercent?: number
  nextAction?: string
  nextActionDate?: string
  notes?: string
}) {
  await requireFounder()
  const updateData: any = { ...data }
  
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
  if (data.nextActionDate) updateData.nextActionDate = new Date(data.nextActionDate)
  if (data.probabilityPercent !== undefined && data.amount !== undefined) {
    updateData.expectedCash = data.amount * (data.probabilityPercent / 100)
  }
  
  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance/receivables')
  return invoice
}

// ============================================
// CLIENTS
// ============================================

export async function createClient(data: {
  company: string
  primaryContactName: string
  primaryContactPhone?: string
  primaryContactEmail?: string
  gstin?: string
  address?: string
  decisionMakerName?: string
  communicationChannel?: string
}) {
  await requireFounder()
  const client = await prisma.client.create({
    data: {
      company: data.company,
      primaryContactName: data.primaryContactName,
      primaryContactPhone: data.primaryContactPhone,
      primaryContactEmail: data.primaryContactEmail,
      gstin: data.gstin,
      address: data.address,
      decisionMakerName: data.decisionMakerName,
      communicationChannel: data.communicationChannel || 'WhatsApp',
    },
  })
  revalidatePath('/clients')
  return client
}

// ============================================
// SETTINGS
// ============================================

export async function getSetting(key: string): Promise<string | null> {
  await requireFounder()
  const setting = await prisma.setting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function setSetting(key: string, value: string) {
  await requireFounder()
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
  revalidatePath('/dashboard')
}

// ============================================
// DASHBOARD DATA
// ============================================

export type TodayItem = {
  id: string
  group: 'Collect' | 'Send' | 'Follow up' | 'Unblock' | 'Waiting on client' | 'Team'
  title: string
  context: string
  amount?: number
  href: string
  action: string
  severity: 0 | 1 | 2 // 2 = act now, 1 = today, 0 = keep an eye on
  date?: Date | null
}

// The founder's 9:00 review (Bible §19.1) as one ranked list of things to do
export async function getTodayData() {
  await requireFounder()
  const now = new Date()
  const todayStart = startOfDay(now)
  const in7Days = addDays(now, 7)

  const [invoices, leads, projects, milestones, crs, pendingClients, bdeStaff, bdeReportsToday, recentPayments, pipelineLeads] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ['DRAFT', ...OPEN_INVOICE_STATUSES] } },
      include: { client: { select: { company: true } }, milestone: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.lead.findMany({
      where: { stage: { notIn: ['WON', 'LOST'] }, nextActionDate: { lt: addDays(todayStart, 1) } },
      orderBy: { nextActionDate: 'asc' },
      include: { owner: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { status: 'IN_PROGRESS', health: { not: 'ON_TRACK' } },
      include: { client: { select: { company: true } } },
    }),
    prisma.milestone.findMany({
      where: {
        // Due within a week, or already finished: either way the money needs billing
        OR: [
          { dueDate: { lte: in7Days }, status: { in: ['PENDING', 'IN_PROGRESS', 'CLIENT_REVIEW'] } },
          { status: { in: ['COMPLETED', 'APPROVED'] } },
        ],
        project: { status: { in: ['IN_PROGRESS', 'ON_HOLD', 'COMPLETED'] } },
        invoices: { none: { status: { not: 'CANCELLED' } } },
        paymentAmount: { gt: 0 },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.changeRequest.findMany({
      where: { status: 'ESTIMATED' },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.client.findMany({
      where: { isOnboarded: false, projects: { some: { status: 'NOT_STARTED' } } },
      select: { id: true, company: true, projects: { where: { status: 'NOT_STARTED' }, select: { id: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ['BDE', 'BUSINESS_ANALYST'] }, isActive: true }, select: { id: true, name: true } }),
    prisma.bdeDailyReport.findMany({ where: { date: { gte: todayStart } }, select: { userId: true } }),
    prisma.payment.findMany({ orderBy: { date: 'desc' }, take: 5, include: { client: { select: { company: true } } } }),
    prisma.lead.findMany({ where: { stage: { in: PIPELINE_STAGES } }, select: { stage: true, estimatedBudget: true } }),
  ])

  const items: TodayItem[] = []
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const daysLate = (d: Date) => Math.floor((todayStart.getTime() - startOfDay(d).getTime()) / 86400000)

  for (const inv of invoices) {
    if (inv.status === 'DRAFT') {
      items.push({
        id: `draft-${inv.id}`, group: 'Send', severity: 1, date: inv.dueDate,
        title: `Send ${inv.invoiceNumber} to ${inv.client.company}`,
        context: inv.milestone ? inv.milestone.name : 'Draft invoice',
        amount: inv.amount, href: '/finance/receivables', action: 'Send',
      })
    } else if (isInvoiceOverdue(inv, now)) {
      const late = daysLate(inv.dueDate)
      items.push({
        id: `overdue-${inv.id}`, group: 'Collect', severity: 2, date: inv.dueDate,
        title: `Collect from ${inv.client.company}`,
        // Bible §13.1 escalation ladder
        context: `${inv.invoiceNumber} · ${late} day${late === 1 ? '' : 's'} overdue${late >= 7 ? ' · founder escalation' : ''}`,
        amount: invoiceOutstanding(inv), href: '/finance/receivables', action: 'Log payment',
      })
    }
  }

  for (const lead of leads) {
    const due = lead.nextActionDate
    const late = due ? daysLate(due) : 0
    items.push({
      id: `lead-${lead.id}`, group: 'Follow up', severity: late > 0 ? 2 : 1, date: due,
      title: `${lead.company}: ${lead.nextAction}`,
      context: `${lead.stage.charAt(0) + lead.stage.slice(1).toLowerCase()} · ${lead.owner.name}${late > 0 ? ` · ${late} day${late === 1 ? '' : 's'} late` : ' · due today'}`,
      amount: lead.estimatedBudget ?? undefined, href: `/leads/${lead.id}`, action: 'Open lead',
    })
  }

  for (const p of projects) {
    items.push({
      id: `project-${p.id}`, group: 'Unblock', severity: p.health === 'BLOCKED' || p.health === 'DELAYED' ? 2 : 1,
      title: `${p.name} is ${p.health.toLowerCase().replace('_', ' ')}`,
      context: p.client.company, href: `/projects/${p.id}`, action: 'Open project',
    })
  }

  for (const m of milestones) {
    const finished = m.status === 'COMPLETED' || m.status === 'APPROVED'
    items.push({
      id: `ms-${m.id}`, group: 'Send', severity: finished || (m.dueDate && m.dueDate < now) ? 2 : 1, date: m.dueDate,
      title: `Invoice ${m.name}`,
      context: finished
        ? `${m.project.name} · finished, not billed yet`
        : `${m.project.name} · due ${m.dueDate ? fmtDate(m.dueDate) : 'soon'} · invoice 7 days before (§13)`,
      amount: m.paymentAmount, href: `/projects/${m.project.id}/milestones`, action: 'Create invoice',
    })
  }

  for (const cr of crs) {
    items.push({
      id: `cr-${cr.id}`, group: 'Waiting on client', severity: 0,
      title: `${cr.crNumber} needs client approval`,
      context: `${cr.project.name} · ${cr.description}`,
      amount: cr.additionalCost ?? undefined, href: `/projects/${cr.project.id}/changes`, action: 'Record approval',
    })
  }

  for (const c of pendingClients) {
    items.push({
      id: `onboard-${c.id}`, group: 'Waiting on client', severity: 1,
      title: `Finish onboarding ${c.company}`,
      context: `${c.projects.length} project${c.projects.length > 1 ? 's' : ''} can't start until the 12 checks are done`,
      href: `/clients/${c.id}/onboard`, action: 'Open checklist',
    })
  }

  const reported = new Set(bdeReportsToday.map(r => r.userId))
  for (const u of bdeStaff.filter(u => !reported.has(u.id))) {
    items.push({
      id: `report-${u.id}`, group: 'Team', severity: 0,
      title: `${u.name} hasn't sent today's report`,
      context: 'End-of-day report (§18.2)', href: '/bde', action: 'View scorecard',
    })
  }

  items.sort((a, b) => b.severity - a.severity || (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity))

  const forecast = await getCashFlowForecast()
  const lowest = forecast.weeks.reduce((min, w) => (w.closingCash < min.closingCash ? w : min), forecast.weeks[0])

  const pipelineByStage = PIPELINE_STAGES.map(stage => {
    const inStage = pipelineLeads.filter(l => l.stage === stage)
    return { stage, count: inStage.length, value: inStage.reduce((s, l) => s + (l.estimatedBudget ?? 0), 0) }
  })

  return {
    items,
    thisWeek: forecast.weeks[0],
    lowestWeek: lowest,
    atRiskOverdue: forecast.atRiskOverdue,
    pipelineByStage,
    recentPayments,
  }
}

// ============================================
// RECEIVABLES DATA
// ============================================

export async function getReceivablesData() {
  await requireFounder()
  const [invoices, drafts] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: [...OPEN_INVOICE_STATUSES] } },
      include: { client: true, project: true, owner: true, milestone: true },
      orderBy: { dueDate: 'asc' },
    }),
    // Drafts are listed separately: they aren't owed until they're sent
    prisma.invoice.findMany({
      where: { status: 'DRAFT' },
      include: { client: true, project: true, milestone: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Milestones that are finished, or due within two weeks, with no invoice yet:
  // money earned or coming due that would otherwise be invisible here
  const soon = addDays(new Date(), 14)
  const unbilled = await prisma.milestone.findMany({
    where: {
      paymentAmount: { gt: 0 },
      invoices: { none: { status: { not: 'CANCELLED' } } },
      project: { status: { in: ['IN_PROGRESS', 'ON_HOLD', 'COMPLETED'] } },
      OR: [{ status: { in: ['COMPLETED', 'APPROVED'] } }, { dueDate: { lte: soon } }],
    },
    include: { project: { include: { client: true } } },
    orderBy: [{ dueDate: 'asc' }],
  })

  const now = new Date()
  
  const receivables = invoices.map(invoice => {
    const outstanding = invoiceOutstanding(invoice)
    const daysOverdue = invoice.dueDate < now
      ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    let agingBucket: string
    if (daysOverdue <= 0) agingBucket = 'Current'
    else if (daysOverdue <= 30) agingBucket = '1-30 days'
    else if (daysOverdue <= 60) agingBucket = '31-60 days'
    else agingBucket = '60+ days'

    return {
      ...invoice,
      outstanding,
      daysOverdue,
      agingBucket,
      expectedCash: invoiceExpectedCash(invoice),
    }
  })

  // Aging summary
  const agingSummary = {
    current: receivables.filter(r => r.agingBucket === 'Current').reduce((s, r) => s + r.outstanding, 0),
    '1-30': receivables.filter(r => r.agingBucket === '1-30 days').reduce((s, r) => s + r.outstanding, 0),
    '31-60': receivables.filter(r => r.agingBucket === '31-60 days').reduce((s, r) => s + r.outstanding, 0),
    '60+': receivables.filter(r => r.agingBucket === '60+ days').reduce((s, r) => s + r.outstanding, 0),
  }

  return { receivables, agingSummary, drafts, unbilled }
}

// ============================================
// P&L DATA
// ============================================

export async function getPnLData(year: number, month: number) {
  await requireFounder()
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0, 23, 59, 59)

  const [payments, expenses, withdrawals, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    }),
    prisma.founderWithdrawal.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { user: true },
    }),
    // Revenue = invoices raised this month; drafts and cancelled ones aren't revenue
    prisma.invoice.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
    }),
  ])

  const collections = payments.reduce((sum, p) => sum + p.amount, 0)
  const revenue = invoices.reduce((sum, i) => sum + i.amount, 0)
  
  const projectExpenses = expenses.filter(e => e.projectId).reduce((sum, e) => sum + e.amount, 0)
  const operatingExpenses = expenses.filter(e => !e.projectId).reduce((sum, e) => sum + e.amount, 0)
  const founderComp = withdrawals.reduce((sum, w) => sum + w.amount, 0)
  
  // Bible §16.2: profit is revenue minus all costs; collections are reported alongside, never mixed in
  const grossProfit = revenue - projectExpenses
  const profitBeforeTax = grossProfit - operatingExpenses - founderComp
  const taxProvision = Math.max(0, profitBeforeTax * 0.15) // 15% estimate
  const netProfit = profitBeforeTax - taxProvision

  return {
    month: startDate,
    revenue,
    collections,
    projectCosts: projectExpenses,
    grossProfit,
    operatingExpenses,
    founderCompensation: founderComp,
    taxProvision,
    netProfit,
    expenseBreakdown: expenses,
    withdrawalBreakdown: withdrawals,
  }
}

// ============================================
// CASH FLOW FORECAST
// ============================================

export async function getCashFlowForecast() {
  await requireFounder()
  const now = new Date()
  // Week 1 is the current Monday–Sunday week
  const firstWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const salaryWindowStart = startOfMonth(subMonths(now, 3))
  const salaryWindowEnd = startOfMonth(now)

  const [bankBalance, invoices, recurringExpenses, recentWithdrawals] = await Promise.all([
    prisma.bankBalance.findFirst({ orderBy: { date: 'desc' } }),
    prisma.invoice.findMany({
      where: { status: { in: [...OPEN_INVOICE_STATUSES] } },
      include: { client: true },
    }),
    prisma.expense.findMany({ where: { isRecurring: true } }),
    prisma.founderWithdrawal.findMany({
      where: { date: { gte: salaryWindowStart, lt: salaryWindowEnd }, type: 'SALARY' },
    }),
  ])
  const currentCash = bankBalance?.amount ?? 0

  // Outflows: recurring expenses are monthly; founder salaries use the last 3 full months' average
  const weeklyRecurring = recurringExpenses.reduce((sum, e) => sum + e.amount, 0) * 12 / 52
  const monthlySalaries = recentWithdrawals.reduce((sum, w) => sum + w.amount, 0) / 3
  const weeklySalaries = monthlySalaries * 12 / 52

  // Overdue up to 30 days is chased in week 1. Older than that is too uncertain to plan
  // around, so it's reported as at risk and kept out of closing cash.
  const atRiskCutoff = addDays(firstWeekStart, -30)
  let atRiskOverdue = 0

  const weeks = Array.from({ length: 13 }, (_, i) => {
    const weekStart = addDays(firstWeekStart, i * 7)
    const weekEnd = addDays(weekStart, 7) // exclusive
    return {
      weekNumber: i + 1,
      weekStart,
      weekEnd: addDays(weekEnd, -1),
      openingCash: 0,
      committedIn: 0,
      probableIn: 0,
      overdueIn: 0,
      pipelineIn: 0, // shown for visibility, never counted (Bible §5.3)
      expectedIn: 0,
      expectedOut: weeklyRecurring + weeklySalaries,
      closingCash: 0,
      _end: weekEnd,
    }
  })

  for (const inv of invoices) {
    const weighted = invoiceExpectedCash(inv)
    if (weighted <= 0) continue
    const due = new Date(inv.dueDate)

    if (due < firstWeekStart) {
      if (due < atRiskCutoff) atRiskOverdue += invoiceOutstanding(inv)
      else weeks[0].overdueIn += weighted
      continue
    }
    const week = weeks.find(w => due >= w.weekStart && due < w._end)
    if (!week) continue
    if (inv.probability === 'COMMITTED') week.committedIn += weighted
    else if (inv.probability === 'PROBABLE') week.probableIn += weighted
    else week.pipelineIn += weighted
  }

  let openingCash = currentCash
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = weeks.map(({ _end, ...w }) => {
    const expectedIn = w.committedIn + w.probableIn + w.overdueIn
    const closingCash = openingCash + expectedIn - w.expectedOut
    const week = { ...w, openingCash, expectedIn, closingCash }
    openingCash = closingCash
    return week
  })

  return {
    weeks: result,
    atRiskOverdue,
    weeklyRecurring,
    weeklySalaries,
  }
}

// ============================================
// MONEY BAR: the Bible's numbers, pinned above every founder page
// ============================================

export async function getMoneyBar() {
  await requireFounder()
  const now = new Date()
  const in7Days = addDays(now, 7)

  const [bank, floorSetting, invoices, pipelineLeads] = await Promise.all([
    prisma.bankBalance.findFirst({ orderBy: { date: 'desc' } }),
    prisma.setting.findUnique({ where: { key: 'minimum_cash_floor' } }),
    prisma.invoice.findMany({
      where: { status: { in: [...OPEN_INVOICE_STATUSES] } },
      select: { amount: true, paidAmount: true, dueDate: true, status: true, probabilityPercent: true },
    }),
    prisma.lead.findMany({
      where: { stage: { in: PIPELINE_STAGES } },
      select: { stage: true, estimatedBudget: true },
    }),
  ])

  const cash = bank?.amount ?? 0
  const floor = Number(floorSetting?.value ?? 100000)
  const overdueInvoices = invoices.filter(i => isInvoiceOverdue(i, now))

  return {
    cash,
    cashUpdatedAt: bank?.date ?? null,
    // Whole days since the balance was last entered; null if never
    cashAgeDays: bank ? Math.floor((now.getTime() - bank.date.getTime()) / 86400000) : null,
    floor,
    zone: getCashZone(cash, floor),
    owed: invoices.reduce((s, i) => s + invoiceOutstanding(i), 0),
    overdue: overdueInvoices.reduce((s, i) => s + invoiceOutstanding(i), 0),
    overdueCount: overdueInvoices.length,
    dueNext7: invoices
      .filter(i => new Date(i.dueDate) >= now && new Date(i.dueDate) <= in7Days)
      .reduce((s, i) => s + invoiceOutstanding(i), 0),
    weightedPipeline: pipelineLeads.reduce((s, l) => s + (l.estimatedBudget ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0), 0),
  }
}
