/**
 * Marks prospects as Lost after a research audit, with the reason on each lead.
 *
 *   npm run growth:disqualify -- growth-data/<file>.json            # dry run: shows what would change
 *   npm run growth:disqualify -- growth-data/<file>.json --apply    # writes it
 *
 * Only leads still at New are touched. Anything the team has already worked
 * (contacted, qualified, ...) is skipped, so a real conversation is never closed
 * by an audit. Nothing is deleted: the lead, its history and research stay.
 *
 * File shape: { by: "nimesh", label: "6 Nov audit",
 *               leads: [{ externalKey: "f-inve", why: "..." }, ...] }
 * `by` is matched against an active founder's email or name.
 */
import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

type FileIn = { by: string; label: string; leads: { externalKey: string; why: string }[] }

async function main() {
  const args = process.argv.slice(2)
  const file = args.find(a => !a.startsWith('--'))
  const apply = args.includes('--apply')
  if (!file) {
    console.error('Usage: npm run growth:disqualify -- <file.json> [--apply]')
    process.exit(1)
  }
  const data = JSON.parse(readFileSync(file, 'utf8')) as FileIn
  const prisma = new PrismaClient()

  try {
    const needle = data.by.toLowerCase()
    const founders = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['FOUNDER', 'CEO', 'CTO', 'ADMIN'] } },
      select: { id: true, name: true, email: true },
    })
    const hits = founders.filter(f => f.email.toLowerCase().includes(needle) || f.name.toLowerCase().includes(needle))
    if (hits.length !== 1) {
      console.error(`"${data.by}" matched ${hits.length} founders.`)
      process.exit(1)
    }
    const userId = hits[0].id

    let changed = 0
    for (const item of data.leads) {
      const lead = await prisma.lead.findUnique({ where: { externalKey: item.externalKey } })
      if (!lead) {
        console.log(`  missing   ${item.externalKey}`)
        continue
      }
      if (lead.stage !== 'NEW') {
        console.log(`  skipped   ${lead.company} (at ${lead.stage}, already being worked)`)
        continue
      }
      const reason = `Disqualified in ${data.label}: ${item.why}`
      console.log(`  lost      ${lead.company}: ${item.why}`)
      changed++
      if (!apply) continue
      await prisma.lead.update({ where: { id: lead.id }, data: { stage: 'LOST', lostReason: reason } })
      await prisma.activity.create({
        data: { entityType: 'Lead', entityId: lead.id, action: 'Stage changed to Lost', details: reason, userId },
      })
    }
    console.log(`\n${changed} lead(s) ${apply ? 'marked Lost' : 'would be marked Lost (dry run, add --apply to write)'}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
