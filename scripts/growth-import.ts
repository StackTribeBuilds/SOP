/**
 * Loads prospects and draft content (posts, outreach emails, page copy) from a
 * JSON file into StackTribe OS.
 *
 *   npm run growth:import -- growth-data/<file>.json            # dry run: shows what would change
 *   npm run growth:import -- growth-data/<file>.json --apply    # writes it
 *
 * Safe to run again with the same or an updated file:
 * - Leads are matched on `externalKey`. A lead that already exists keeps its
 *   stage, next action and owner (the team may have worked it); only the
 *   prospect research fields are refreshed.
 * - Content is matched on `key`. A draft or a "changes requested" item is
 *   replaced with the new text and goes back to review. Approved or sent items
 *   are never overwritten.
 * - To-dos are matched on `key`. Text is refreshed, but whether an item is
 *   ticked off is only set when it's first created, so a founder's tick stays.
 *
 * File shape: { owners: { MANUFACTURER: "aditya", FOUNDER: "nimesh", ... },
 *               leads: [...], content: [...], tasks: [...] }
 * Owners are matched against an active founder's email or name.
 */
import { readFileSync } from 'fs'
import { PrismaClient, type ContentKind, type ContentStatus, type LeadSegment, type LeadStage } from '@prisma/client'

type LeadIn = {
  externalKey: string
  company: string
  contactName: string
  decisionMaker?: string | null
  segment: LeadSegment
  stage?: LeadStage
  location?: string | null
  website?: string | null
  fitReason?: string | null
  requirement: string
  estimatedBudget?: number | null
  nextAction: string
  nextActionDate?: string | null
  notes?: string | null
  email?: string | null
  phone?: string | null
}

type ContentIn = {
  key: string
  kind: ContentKind
  channel: string
  segment?: LeadSegment | null
  status?: ContentStatus
  title: string
  target?: string | null
  context?: string | null
  body: string
  scheduledFor?: string | null // YYYY-MM-DD, an India date
  sortOrder?: string | null
  feedback?: string | null
}

type TaskIn = {
  key: string
  title: string
  details?: string | null
  owner: string // "Founders", "BDE" or "Claude"
  sortOrder?: number
  done?: boolean
}

const FOUNDER_ROLES = ['FOUNDER', 'CEO', 'CTO', 'ADMIN'] as const

// Noon in India keeps the date the same whether it's read in IST or UTC
const indiaDay = (d?: string | null) => (d ? new Date(`${d}T06:30:00.000Z`) : null)

async function main() {
  const args = process.argv.slice(2)
  const file = args.find(a => !a.startsWith('--'))
  const apply = args.includes('--apply')
  if (!file) {
    console.error('Usage: npm run growth:import -- <file.json> [--apply]')
    process.exit(1)
  }

  const input = JSON.parse(readFileSync(file, 'utf8')) as {
    owners: Partial<Record<LeadSegment, string>>
    leads?: LeadIn[]
    content?: ContentIn[]
    tasks?: TaskIn[]
  }
  const prisma = new PrismaClient()

  try {
    // Resolve each segment's owner to exactly one active founder
    const founders = await prisma.user.findMany({
      where: { isActive: true, role: { in: [...FOUNDER_ROLES] } },
      select: { id: true, name: true, email: true },
    })
    const ownerFor: Partial<Record<LeadSegment, string>> = {}
    for (const [segment, needle] of Object.entries(input.owners ?? {})) {
      const n = needle!.toLowerCase()
      const hits = founders.filter(f => f.email.toLowerCase().includes(n) || f.name.toLowerCase().includes(n))
      if (hits.length !== 1) {
        console.error(`Owner "${needle}" for ${segment} matched ${hits.length} founders. Active founders:`)
        founders.forEach(f => console.error(`  - ${f.name} <${f.email}>`))
        console.error('Edit "owners" in the file to a unique part of the right email or name, then run again.')
        process.exit(1)
      }
      ownerFor[segment as LeadSegment] = hits[0].id
      console.log(`${segment} leads → ${hits[0].name}`)
    }

    let created = 0, refreshed = 0, skipped = 0

    for (const l of input.leads ?? []) {
      const existing = await prisma.lead.findUnique({ where: { externalKey: l.externalKey } })
      const research = {
        segment: l.segment,
        location: l.location ?? null,
        website: l.website ?? null,
        fitReason: l.fitReason ?? null,
        decisionMaker: l.decisionMaker ?? null,
        estimatedBudget: l.estimatedBudget ?? null,
      }
      if (existing) {
        console.log(`  lead     refresh  ${l.company}`)
        if (apply) await prisma.lead.update({ where: { id: existing.id }, data: research })
        refreshed++
        continue
      }
      const ownerId = ownerFor[l.segment]
      if (!ownerId) {
        console.log(`  lead     SKIP     ${l.company} (no owner set for ${l.segment})`)
        skipped++
        continue
      }
      console.log(`  lead     create   ${l.company}`)
      if (apply) {
        const lead = await prisma.lead.create({
          data: {
            ...research,
            externalKey: l.externalKey,
            company: l.company,
            contactName: l.contactName,
            email: l.email ?? null,
            phone: l.phone ?? null,
            source: 'COLD_OUTBOUND',
            requirement: l.requirement,
            nextAction: l.nextAction,
            nextActionDate: indiaDay(l.nextActionDate) ?? new Date(),
            notes: l.notes ?? null,
            stage: l.stage ?? 'NEW',
            ownerId,
          },
        })
        await prisma.activity.create({
          data: { entityType: 'Lead', entityId: lead.id, action: 'Created', details: 'Imported by growth-import', userId: ownerId },
        })
      }
      created++
    }

    for (const c of input.content ?? []) {
      const existing = await prisma.contentItem.findUnique({ where: { key: c.key } })
      const fields = {
        kind: c.kind,
        channel: c.channel,
        segment: c.segment ?? null,
        title: c.title,
        target: c.target ?? null,
        context: c.context ?? null,
        body: c.body,
        scheduledFor: indiaDay(c.scheduledFor),
        sortOrder: c.sortOrder ?? null,
      }
      if (existing) {
        if (existing.status === 'APPROVED' || existing.status === 'SENT') {
          console.log(`  content  keep     ${c.title} (already ${existing.status.toLowerCase()})`)
          skipped++
          continue
        }
        console.log(`  content  revise   ${c.title}`)
        // A revision goes back to review; the old change note is kept for reference in Activity
        if (apply) await prisma.contentItem.update({ where: { id: existing.id }, data: { ...fields, status: 'DRAFT', feedback: null } })
        refreshed++
        continue
      }
      console.log(`  content  create   ${c.title}`)
      if (apply) {
        await prisma.contentItem.create({
          data: { ...fields, key: c.key, status: c.status ?? 'DRAFT', feedback: c.feedback ?? null },
        })
      }
      created++
    }

    for (const t of input.tasks ?? []) {
      const existing = await prisma.growthTask.findUnique({ where: { key: t.key } })
      const fields = { title: t.title, details: t.details ?? null, owner: t.owner, sortOrder: t.sortOrder ?? 0 }
      if (existing) {
        console.log(`  to-do    refresh  ${t.title}`)
        if (apply) await prisma.growthTask.update({ where: { id: existing.id }, data: fields })
        refreshed++
        continue
      }
      console.log(`  to-do    create   ${t.title}${t.done ? ' (done)' : ''}`)
      if (apply) {
        await prisma.growthTask.create({ data: { ...fields, key: t.key, done: !!t.done, doneAt: t.done ? new Date() : null } })
      }
      created++
    }

    console.log(`\n${apply ? 'Done' : 'Dry run'}: ${created} to create, ${refreshed} to update, ${skipped} left as they are.`)
    if (!apply) console.log('Nothing was written. Run again with --apply to save.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
