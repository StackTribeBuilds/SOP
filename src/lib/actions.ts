'use server'

import { prisma } from './prisma'
import { requireFounder } from './session'
import { revalidatePath } from 'next/cache'
import { startOfWeek, addDays, subMonths, startOfMonth } from 'date-fns'
import { formatCurrency, invoiceOutstanding, invoiceExpectedCash, isInvoiceOverdue, OPEN_INVOICE_STATUSES } from './utils'

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

  const amount = Math.round(data.amount * 100) / 100
  if (!(amount > 0)) return { success: false, error: 'Enter an amount greater than zero' }
  const date = new Date(data.date)
  if (isNaN(date.getTime())) return { success: false, error: 'Enter a valid payment date' }

  try {
    // Payment and invoice update succeed or fail together
    await prisma.$transaction(async (tx) => {
      let clientId = data.clientId

      if (data.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } })
        if (!invoice) throw new PaymentError('Invoice not found')
        if (!(OPEN_INVOICE_STATUSES as readonly string[]).includes(invoice.status)) {
          throw new PaymentError(invoice.status === 'DRAFT'
            ? 'Send this invoice before logging a payment against it'
            : `This invoice is ${invoice.status.toLowerCase()} and can't take payments`)
        }
        const outstanding = invoiceOutstanding(invoice)
        if (amount > outstanding + 0.5) {
          throw new PaymentError(`Amount is more than the ${formatCurrency(outstanding)} still owed on this invoice`)
        }
        clientId = invoice.clientId

        const newPaidAmount = Math.min(invoice.amount, invoice.paidAmount + amount)
        const fullyPaid = newPaidAmount >= invoice.amount - 0.5
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
            paidDate: fullyPaid ? date : null,
          },
        })
      }

      if (!clientId) throw new PaymentError('Choose a client or an invoice for this payment')

      await tx.payment.create({
        data: {
          amount,
          clientId,
          invoiceId: data.invoiceId || null,
          date,
          method: data.method,
          reference: data.reference,
          notes: data.notes,
        },
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

class PaymentError extends Error {}

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

export async function getDashboardData() {
  await requireFounder()
  const [bankBalance, invoices, payments, expenses, withdrawals, projects, settings, leads, milestones, recentLeads] = await Promise.all([
    prisma.bankBalance.findFirst({ orderBy: { date: 'desc' } }),
    prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { client: true, project: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.payment.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: { client: true },
    }),
    prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.founderWithdrawal.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      include: { user: true },
    }),
    prisma.project.findMany({
      where: { status: { in: ['IN_PROGRESS', 'NOT_STARTED'] } },
      include: { client: true },
    }),
    prisma.setting.findMany(),
    prisma.lead.findMany({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
    prisma.milestone.findMany({ where: { status: 'PENDING' }, include: { project: true }, orderBy: { dueDate: 'asc' }, take: 10 }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  ])


  const currentCash = bankBalance?.amount ?? 0
  const minimumFloor = Number(settings.find(s => s.key === 'minimum_cash_floor')?.value ?? 100000)

  // Insights for Founder
  const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const delayedProjects = projects.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED' || p.health === 'BLOCKED')
  
  const overdueAttentionInvoices = invoices.filter(i => isInvoiceOverdue(i))

  // Find users who haven't submitted daily reports today
  const bdeReportsToday = await prisma.bdeDailyReport.findMany({ where: { date: { gte: todayStart } } })
  const staff = await prisma.user.findMany({ where: { role: { in: ['BDE', 'BUSINESS_ANALYST'] } } })
  
  const missingReports = staff.filter(s => !bdeReportsToday.find(r => r.userId === s.id))


  // Calculate receivables
  const now = new Date()
  // Drafts haven't been sent, so the client doesn't owe them yet
  const unpaidInvoices = invoices.filter(i => (OPEN_INVOICE_STATUSES as readonly string[]).includes(i.status))
  const totalReceivable = unpaidInvoices.reduce((sum, i) => sum + invoiceOutstanding(i), 0)
  const overdueInvoices = unpaidInvoices.filter(i => isInvoiceOverdue(i, now))
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + invoiceOutstanding(i), 0)
  
  const weekFromNow = new Date(now)
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  const dueThisWeek = unpaidInvoices
    .filter(i => new Date(i.dueDate) >= now && new Date(i.dueDate) <= weekFromNow)
    .reduce((sum, i) => sum + invoiceOutstanding(i), 0)

  const expectedCash = unpaidInvoices.reduce((sum, i) => sum + invoiceExpectedCash(i), 0)

  // Monthly expenses & withdrawals
  const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const monthlyWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)

  // Recent transactions (combined payments + expenses + withdrawals)
  const recentPayments = payments.map(p => ({
    id: p.id,
    type: 'PAYMENT' as const,
    description: `Payment from ${p.client.company}`,
    amount: p.amount,
    date: p.date,
    isIncome: true,
  }))

  return {
    insights: { delayedProjects, overdueInvoices: overdueAttentionInvoices, missingReports },
    currentCash,
    minimumFloor,
    totalReceivable,
    totalOverdue,
    dueThisWeek,
    expectedCash,
    monthlyExpenses,
    monthlyWithdrawals,
    unpaidInvoices,
    recentPayments,
    activeProjects: projects,
    activeLeads: leads,
    pendingMilestones: milestones,
    recentLeads,
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

  return { receivables, agingSummary, drafts }
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
