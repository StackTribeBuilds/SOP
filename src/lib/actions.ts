'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'

// ============================================
// BANK BALANCE
// ============================================

export async function updateBankBalance(amount: number, notes?: string) {
  await prisma.bankBalance.create({
    data: { amount, notes },
  })
  revalidatePath('/dashboard')
  revalidatePath('/finance')
}

export async function getLatestBankBalance() {
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
  clientId: string
  invoiceId?: string
  date: string
  method?: string
  reference?: string
  notes?: string
}) {
  const payment = await prisma.payment.create({
    data: {
      amount: data.amount,
      clientId: data.clientId,
      invoiceId: data.invoiceId || null,
      date: new Date(data.date),
      method: data.method,
      reference: data.reference,
      notes: data.notes,
    },
  })

  // Update invoice if linked
  if (data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    })
    if (invoice) {
      const newPaidAmount = invoice.paidAmount + data.amount
      const newStatus = newPaidAmount >= invoice.amount ? 'PAID' : 'PARTIALLY_PAID'
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: newStatus === 'PAID' ? new Date(data.date) : undefined,
          status: newStatus,
        },
      })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/finance/receivables')
  return payment
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
// PROJECTS
// ============================================

export async function createProject(data: {
  name: string
  description?: string
  contractValue: number
  clientId: string
  projectOwnerId: string
  techOwnerId: string
  startDate?: string
  expectedEndDate?: string
  scope?: string
  exclusions?: string
  estimatedHours?: number
}) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      contractValue: data.contractValue,
      clientId: data.clientId,
      projectOwnerId: data.projectOwnerId,
      techOwnerId: data.techOwnerId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
      scope: data.scope,
      exclusions: data.exclusions,
      estimatedHours: data.estimatedHours,
      status: 'IN_PROGRESS',
    },
  })
  revalidatePath('/projects')
  return project
}

// ============================================
// SETTINGS
// ============================================

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function setSetting(key: string, value: string) {
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

  // Calculate receivables
  const now = new Date()
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
  const totalReceivable = unpaidInvoices.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0)
  const overdueInvoices = unpaidInvoices.filter(i => new Date(i.dueDate) < now)
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0)
  
  const weekFromNow = new Date(now)
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  const dueThisWeek = unpaidInvoices
    .filter(i => new Date(i.dueDate) >= now && new Date(i.dueDate) <= weekFromNow)
    .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0)

  const expectedCash = unpaidInvoices.reduce((sum, i) => sum + (i.expectedCash ?? (i.amount - i.paidAmount)), 0)

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
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ['PAID', 'CANCELLED'] },
    },
    include: {
      client: true,
      project: true,
      owner: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  
  const receivables = invoices.map(invoice => {
    const outstanding = invoice.amount - invoice.paidAmount
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
      expectedCash: outstanding * (invoice.probabilityPercent / 100),
    }
  })

  // Aging summary
  const agingSummary = {
    current: receivables.filter(r => r.agingBucket === 'Current').reduce((s, r) => s + r.outstanding, 0),
    '1-30': receivables.filter(r => r.agingBucket === '1-30 days').reduce((s, r) => s + r.outstanding, 0),
    '31-60': receivables.filter(r => r.agingBucket === '31-60 days').reduce((s, r) => s + r.outstanding, 0),
    '60+': receivables.filter(r => r.agingBucket === '60+ days').reduce((s, r) => s + r.outstanding, 0),
  }

  return { receivables, agingSummary }
}

// ============================================
// P&L DATA
// ============================================

export async function getPnLData(year: number, month: number) {
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
    prisma.invoice.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
  ])

  const collections = payments.reduce((sum, p) => sum + p.amount, 0)
  const revenue = invoices.reduce((sum, i) => sum + i.amount, 0)
  
  const projectExpenses = expenses.filter(e => e.projectId).reduce((sum, e) => sum + e.amount, 0)
  const operatingExpenses = expenses.filter(e => !e.projectId).reduce((sum, e) => sum + e.amount, 0)
  const founderComp = withdrawals.reduce((sum, w) => sum + w.amount, 0)
  
  const grossProfit = collections - projectExpenses
  const taxProvision = Math.max(0, grossProfit * 0.15) // 15% estimate
  const netProfit = grossProfit - operatingExpenses - founderComp - taxProvision

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
  const bankBalance = await prisma.bankBalance.findFirst({
    orderBy: { date: 'desc' },
  })
  const currentCash = bankBalance?.amount ?? 0

  const invoices = await prisma.invoice.findMany({
    where: { status: { notIn: ['PAID', 'CANCELLED'] } },
    include: { client: true },
  })

  const expenses = await prisma.expense.findMany({
    where: { isRecurring: true },
  })

  // Generate 13 weeks
  const weeks = []
  const today = new Date()
  // Start from the beginning of current week (Monday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)

  let openingCash = currentCash

  for (let i = 0; i < 13; i++) {
    const weekStart = new Date(startOfWeek)
    weekStart.setDate(startOfWeek.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    // Expected inflows based on invoice due dates
    let committedIn = 0
    let probableIn = 0
    let pipelineIn = 0

    for (const inv of invoices) {
      if (inv.dueDate >= weekStart && inv.dueDate <= weekEnd) {
        const outstanding = inv.amount - inv.paidAmount
        const weighted = outstanding * (inv.probabilityPercent / 100)
        
        if (inv.probability === 'COMMITTED') committedIn += weighted
        else if (inv.probability === 'PROBABLE') probableIn += weighted
        else pipelineIn += weighted
      }
    }

    const expectedIn = committedIn + probableIn + pipelineIn

    // Expected outflows (recurring expenses spread weekly)
    const weeklyRecurring = expenses.reduce((sum, e) => sum + e.amount / 4.33, 0)
    const expectedOut = weeklyRecurring

    const closingCash = openingCash + expectedIn - expectedOut

    weeks.push({
      weekNumber: i + 1,
      weekStart,
      weekEnd,
      openingCash,
      committedIn,
      probableIn,
      pipelineIn,
      expectedIn,
      expectedOut,
      closingCash,
    })

    openingCash = closingCash
  }

  return weeks
}
