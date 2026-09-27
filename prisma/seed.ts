import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create founder users
  const hashedPassword = await bcrypt.hash('stacktribe2026', 10)

  const ceo = await prisma.user.upsert({
    where: { email: 'nimesh@stacktribe.com' },
    update: {},
    create: {
      name: 'Nimesh',
      email: 'nimesh@stacktribe.com',
      password: hashedPassword,
      role: 'CEO',
    },
  })

  const cto = await prisma.user.upsert({
    where: { email: 'cofounder@stacktribe.com' },
    update: {},
    create: {
      name: 'Cofounder',
      email: 'cofounder@stacktribe.com',
      password: hashedPassword,
      role: 'CTO',
    },
  })

  const bde = await prisma.user.upsert({
    where: { email: 'bde@stacktribe.com' },
    update: {},
    create: {
      name: 'BDE',
      email: 'bde@stacktribe.com',
      password: hashedPassword,
      role: 'BDE',
    },
  })

  // Set default settings
  await prisma.setting.upsert({
    where: { key: 'minimum_cash_floor' },
    update: {},
    create: { key: 'minimum_cash_floor', value: '100000' },
  })

  await prisma.setting.upsert({
    where: { key: 'yellow_zone_multiplier' },
    update: {},
    create: { key: 'yellow_zone_multiplier', value: '1.5' },
  })

  await prisma.setting.upsert({
    where: { key: 'tax_provision_percent' },
    update: {},
    create: { key: 'tax_provision_percent', value: '15' },
  })

  // Set initial bank balance
  await prisma.bankBalance.create({
    data: {
      amount: 0,
      notes: 'Initial balance',
    },
  })

  // Create sample clients based on real StackTribe data
  const probodyline = await prisma.client.create({
    data: {
      company: 'Probodyline',
      primaryContactName: 'Probodyline Contact',
      isOnboarded: true,
      agreementSigned: true,
      advanceReceived: true,
    },
  })

  const funcall = await prisma.client.create({
    data: {
      company: 'Funcall',
      primaryContactName: 'Funcall Contact',
      isOnboarded: true,
      agreementSigned: true,
      advanceReceived: true,
    },
  })

  const dbc = await prisma.client.create({
    data: {
      company: 'DBC',
      primaryContactName: 'DBC Contact',
      isOnboarded: true,
      agreementSigned: true,
      advanceReceived: true,
    },
  })

  const mayaAi = await prisma.client.create({
    data: {
      company: 'Maya AI',
      primaryContactName: 'Maya AI Contact',
      isOnboarded: true,
      agreementSigned: true,
      advanceReceived: true,
    },
  })

  // Create projects
  const probodylineProject = await prisma.project.create({
    data: {
      name: 'Probodyline Platform',
      contractValue: 325000,
      status: 'IN_PROGRESS',
      completionPercentage: 70,
      clientId: probodyline.id,
      projectOwnerId: ceo.id,
      techOwnerId: cto.id,
    },
  })

  const funcallProject = await prisma.project.create({
    data: {
      name: 'Funcall App',
      contractValue: 50000,
      status: 'IN_PROGRESS',
      completionPercentage: 60,
      clientId: funcall.id,
      projectOwnerId: ceo.id,
      techOwnerId: cto.id,
    },
  })

  // Create invoices (receivables)
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-001',
      amount: 165000,
      dueDate: new Date('2026-10-15'),
      status: 'SENT',
      probability: 'PROBABLE',
      probabilityPercent: 70,
      expectedCash: 115500,
      clientId: probodyline.id,
      projectId: probodylineProject.id,
      ownerId: ceo.id,
      nextAction: 'Establish payment schedule',
      notes: 'Outstanding balance - need to tie to milestone',
    },
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-002',
      amount: 20000,
      dueDate: new Date('2026-10-06'),
      status: 'SENT',
      probability: 'COMMITTED',
      probabilityPercent: 90,
      expectedCash: 18000,
      clientId: funcall.id,
      projectId: funcallProject.id,
      ownerId: ceo.id,
      nextAction: 'Confirm payment date',
    },
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-003',
      amount: 10000,
      dueDate: new Date('2026-10-09'),
      status: 'SENT',
      probability: 'COMMITTED',
      probabilityPercent: 90,
      expectedCash: 9000,
      clientId: dbc.id,
      ownerId: ceo.id,
      nextAction: 'Confirm Oct 9 payment',
    },
  })

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-004',
      amount: 24000,
      dueDate: new Date('2026-10-20'),
      status: 'SENT',
      probability: 'PROBABLE',
      probabilityPercent: 60,
      expectedCash: 14400,
      clientId: mayaAi.id,
      ownerId: ceo.id,
      nextAction: 'Establish payment date immediately',
      notes: 'No payment date established yet',
    },
  })

  console.log('Seed data created successfully!')
  console.log('Users created:', { ceo: ceo.email, cto: cto.email, bde: bde.email })
  console.log('Default password: stacktribe2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
