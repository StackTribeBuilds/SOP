const fs = require('fs');

let content = fs.readFileSync('src/lib/actions.ts', 'utf8');

// We need to add leads and milestones to getDashboardData
content = content.replace(
  'const [bankBalance, invoices, payments, expenses, withdrawals, projects, settings] = await Promise.all([',
  'const [bankBalance, invoices, payments, expenses, withdrawals, projects, settings, leads, milestones, recentLeads] = await Promise.all(['
);

content = content.replace(
  '    prisma.setting.findMany(),\n  ])',
`    prisma.setting.findMany(),
    prisma.lead.findMany({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
    prisma.milestone.findMany({ where: { status: 'PENDING' }, include: { project: true }, orderBy: { dueDate: 'asc' }, take: 10 }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  ])`
);

// We need to pass them down to the return object
const returnStatement = `  return {
    currentCash,
    minimumFloor,
    totalReceivable,
    expectedCash,
    totalOverdue,
    dueThisWeek,
    monthlyExpenses,
    monthlyWithdrawals,
    unpaidInvoices,
    recentPayments,
    projects,
    activeLeads: leads,
    pendingMilestones: milestones,
    recentLeads,
  }`;

content = content.replace(/  return \{\n    currentCash[\s\S]*?recentPayments,\n  \}/, returnStatement);

fs.writeFileSync('src/lib/actions.ts', content);
