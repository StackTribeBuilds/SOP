/**
 * Read-only snapshot of the Grow section, so Claude can pick up where the team
 * left off: review decisions and notes on drafts, lead stages and activity,
 * to-dos, and the BDE daily numbers.
 *
 *   npm run growth:export
 *
 * Writes growth-data/state-<YYYY-MM-DD>.json and growth-data/latest.json.
 * growth-data/ is gitignored because it holds prospects' names and contacts.
 * This script never writes to the database.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

const DAYS_OF_ACTIVITY = 14

async function main() {
  const prisma = new PrismaClient()
  try {
    const since = new Date(Date.now() - DAYS_OF_ACTIVITY * 24 * 60 * 60 * 1000)

    const [content, leads, tasks, bdeReports, activity, users] = await Promise.all([
      prisma.contentItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, externalKey: true, company: true, contactName: true, decisionMaker: true,
          email: true, phone: true, segment: true, location: true, website: true, fitReason: true,
          stage: true, source: true, estimatedBudget: true, nextAction: true, nextActionDate: true,
          lostReason: true, notes: true, createdAt: true, updatedAt: true,
          owner: { select: { name: true } },
        },
      }),
      prisma.growthTask.findMany({ orderBy: [{ owner: 'asc' }, { sortOrder: 'asc' }] }),
      prisma.bdeDailyReport.findMany({
        where: { date: { gte: since } },
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.activity.findMany({
        where: { createdAt: { gte: since }, entityType: { in: ['Lead', 'Content'] } },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: { user: { select: { name: true } } },
      }),
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true } }),
    ])

    // Show who reviewed or ticked something by name rather than by id
    const nameOf = new Map(users.map(u => [u.id, u.name]))
    const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const snapshot = {
      exportedAt: new Date().toISOString(),
      indiaDate: today,
      summary: {
        content: Object.fromEntries(['DRAFT', 'CHANGES', 'APPROVED', 'SENT'].map(s => [s, content.filter(c => c.status === s).length])),
        leadsByStage: leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.stage]: (acc[l.stage] ?? 0) + 1 }), {}),
        openTasks: tasks.filter(t => !t.done).length,
      },
      content: content.map(c => ({ ...c, reviewedBy: c.reviewedById ? nameOf.get(c.reviewedById) ?? null : null })),
      leads: leads.map(({ owner, ...l }) => ({ ...l, owner: owner.name })),
      tasks: tasks.map(t => ({ ...t, doneBy: t.doneById ? nameOf.get(t.doneById) ?? null : null })),
      bdeReports: bdeReports.map(({ user, ...r }) => ({ ...r, user: user.name })),
      activity: activity.map(({ user, ...a }) => ({ ...a, user: user.name })),
    }

    const dir = join(process.cwd(), 'growth-data')
    mkdirSync(dir, { recursive: true })
    const json = JSON.stringify(snapshot, null, 2)
    writeFileSync(join(dir, `state-${today}.json`), json)
    writeFileSync(join(dir, 'latest.json'), json)

    const s = snapshot.summary
    console.log(`Exported to growth-data/state-${today}.json (and latest.json)`)
    console.log(`  content: ${s.content.DRAFT} to review, ${s.content.CHANGES} changes requested, ${s.content.APPROVED} approved, ${s.content.SENT} sent`)
    console.log(`  leads:   ${leads.length} (${Object.entries(s.leadsByStage).map(([k, v]) => `${k} ${v}`).join(', ')})`)
    console.log(`  to-dos:  ${s.openTasks} open · BDE reports (${DAYS_OF_ACTIVITY}d): ${bdeReports.length} · activity: ${activity.length}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
