import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getBdeMetrics, getTodayCrmCounts } from '@/lib/crm-actions'
import { isFounderRole } from '@/lib/session'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { LEAD_STAGE_LABEL, shortDate } from '@/lib/labels'
import { CheckCircle2 } from 'lucide-react'
import { BdeReportForm } from './report-form'
import { LeadForm } from '../leads/lead-form'

export const metadata = { title: 'Sales scorecard' }

export const dynamic = 'force-dynamic'

type LeadRow = { id: string; company: string; stage: keyof typeof LEAD_STAGE_LABEL; nextAction: string | null; nextActionDate: Date | null; updatedAt: Date }

function LeadList({ leads, empty, render }: { leads: LeadRow[]; empty: string; render: (l: LeadRow) => React.ReactNode }) {
  if (leads.length === 0) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-good" /> {empty}
      </div>
    )
  }
  return (
    <ul className="divide-y">
      {leads.map(l => (
        <li key={l.id}>
          <Link href={`/leads/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{l.company}</p>
              <p className="truncate text-xs text-muted-foreground">{render(l)}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{LEAD_STAGE_LABEL[l.stage]}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function BdeDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = session.user.role
  const isBde = role === 'BDE' || role === 'BUSINESS_ANALYST'
  if (!isBde && !isFounderRole(role)) {
    return <p className="text-sm text-bad">This page is for the sales team and founders.</p>
  }

  const [result, crmToday] = await Promise.all([getBdeMetrics(), getTodayCrmCounts()])
  if (!result.success || !result.data) {
    return <p className="text-sm text-bad">The scorecard couldn&apos;t be loaded: {result.error}</p>
  }

  const { meetingsBooked, prospectsContacted, qualified, reported, actionPlan } = result.data
  const vsReported = (crm: number, self: number) => (crm === self ? 'Matches your reports' : `You reported ${self}`)
  const now = new Date()
  const hour = Number(now.toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const needsCare = [
    ...actionPlan.missingAction,
    ...actionPlan.stalled.filter(s => !actionPlan.missingAction.some(m => m.id === s.id)),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isBde ? `${greeting}, ${session.user.name?.split(' ')[0] ?? ''}` : 'BDE scorecard'}
        description={isBde
          ? `${actionPlan.overdue.length ? `${actionPlan.overdue.length} follow-up${actionPlan.overdue.length === 1 ? ' is' : 's are'} late. ` : ''}Target: 20–30 researched prospects every working day (§3.3).`
          : 'Your own scorecard as a founder; each BDE sees theirs here. Numbers come from the CRM, Monday to today.'}
        actions={<LeadForm />}
      />

      <StatStrip>
        <Stat label="Contacted this week" value={prospectsContacted} hint={vsReported(prospectsContacted, reported.prospectsContacted)} />
        <Stat label="Qualified this week" value={qualified} hint={vsReported(qualified, reported.qualified)} />
        <Stat label="Meetings booked" value={meetingsBooked} hint={vsReported(meetingsBooked, reported.meetingsBooked)} />
        <Stat label="Follow-ups late" value={actionPlan.overdue.length} tone={actionPlan.overdue.length ? 'bad' : 'good'}
          hint={actionPlan.overdue.length ? 'Clear these first' : 'All on schedule'} />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface overflow-hidden">
          <div className="border-b px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">Follow-ups due</h2>
            <p className="text-xs text-muted-foreground">Next action date has passed</p>
          </div>
          <LeadList leads={actionPlan.overdue} empty="No late follow-ups."
            render={l => <>{l.nextAction} · <span className="font-medium text-bad">{shortDate(l.nextActionDate)}</span></>} />
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">Going cold</h2>
            <p className="text-xs text-muted-foreground">No next action, or untouched for more than 7 days</p>
          </div>
          <LeadList leads={needsCare} empty="Every lead has a next step and recent activity."
            render={l => (!l.nextAction ? 'No next action set' : `Last touched ${shortDate(l.updatedAt)}`)} />
        </section>
      </div>

      <BdeReportForm crmToday={crmToday} />
    </div>
  )
}
