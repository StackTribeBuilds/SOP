import { redirect } from 'next/navigation'
import { Mail } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isFounderRole } from '@/lib/session'
import { getEmailSettings, getSentEmails } from '@/lib/email-actions'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { EmailComposer } from '@/components/email/email-composer'
import { Button } from '@/components/ui/button'
import { SentList } from './sent-list'
import { EmailSettings } from './email-settings'

export const metadata = { title: 'Emails' }

const sentWithinDays = (sentAt: Date, days: number) => new Date(sentAt).getTime() >= Date.now() - days * 86400000

export default async function EmailsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?reason=session')

  const [emails, settings, clients] = await Promise.all([
    getSentEmails(),
    getEmailSettings(),
    isFounderRole(user.role) ? prisma.client.findMany({ select: { id: true, company: true } }) : Promise.resolve([]),
  ])
  const clientNames = Object.fromEntries(clients.map(c => [c.id, c.company]))

  const thisWeek = emails.filter(e => sentWithinDays(e.sentAt, 7))
  const money = emails.filter(e => ['INVOICE', 'PAYMENT_REMINDER', 'PAYMENT_RECEIPT'].includes(e.kind))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emails"
        description="Everything sent to clients and leads from the dashboard. Email from an invoice, change request, project or lead to start with the right template."
        actions={isFounderRole(user.role)
          ? <EmailComposer context={{}} trigger={<Button><Mail className="h-4 w-4" /> New email</Button>} />
          : undefined}
      />

      <StatStrip>
        <Stat label="Sent this week" value={thisWeek.length} />
        <Stat label="Invoices & reminders" value={money.length} hint="All time" />
        <Stat label="Change requests sent" value={emails.filter(e => e.kind === 'CHANGE_REQUEST').length} hint="Awaiting written approval until recorded" />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SentList emails={emails} clientNames={clientNames} />
        <EmailSettings settings={settings} userName={user.name} />
      </div>
    </div>
  )
}
