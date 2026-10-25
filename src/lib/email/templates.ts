// Starting drafts for every email the dashboard sends. Pure functions: data in, subject and body out.
// The wording follows the OS Bible: professional tone in money matters (§13.1), written approval
// for anything that changes scope, price or timeline (§7.4, §11), structured weekly updates (§10.2).

import { formatCurrency } from '@/lib/utils'

export const EMAIL_KINDS = [
  'PROJECT_UPDATE',
  'CHANGE_REQUEST',
  'INVOICE',
  'PAYMENT_REMINDER',
  'PAYMENT_RECEIPT',
  'PROPOSAL',
  'CONTRACT',
  'ONBOARDING_REQUEST',
  'MEETING_SUMMARY',
  'GENERAL',
] as const

export type EmailKind = (typeof EMAIL_KINDS)[number]

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  PROJECT_UPDATE: 'Project update',
  CHANGE_REQUEST: 'Change request for approval',
  INVOICE: 'Invoice',
  PAYMENT_REMINDER: 'Payment reminder',
  PAYMENT_RECEIPT: 'Payment received',
  PROPOSAL: 'Proposal',
  CONTRACT: 'Contract',
  ONBOARDING_REQUEST: 'Onboarding: what we need',
  MEETING_SUMMARY: 'Meeting summary',
  GENERAL: 'Blank email',
}

export type Draft = { subject: string; body: string }

const date = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'to be confirmed'

const hello = (name?: string | null) => (name?.trim() ? `Hi ${name.trim().split(' ')[0]},` : 'Hello,')

const list = (items: string[], empty: string) => (items.length ? items.map(i => `- ${i}`).join('\n') : `- ${empty}`)

// ---------- Project update (§10.2) ----------

export function projectUpdate(d: {
  contactName?: string | null
  projectName: string
  done: string[]
  inProgress: string[]
  clientActions: string[]
  upcoming: string[]
  nextMilestone?: { name: string; dueDate: Date | null } | null
  health: string
}): Draft {
  const status = { ON_TRACK: 'On track', AT_RISK: 'At risk', DELAYED: 'Delayed', BLOCKED: 'Blocked' }[d.health] ?? 'On track'
  return {
    subject: `${d.projectName}: weekly update, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    body: `${hello(d.contactName)}

Here's where ${d.projectName} stands this week.

This week's progress:
${list(d.done, 'Groundwork for the next features')}

Currently working on:
${list(d.inProgress, 'Planning the next set of features')}

${d.clientActions.length ? `Needed from you:\n${list(d.clientActions, '')}\n\n` : ''}Coming up:
${list(d.upcoming, 'To be planned in our next review')}

| Timeline | ${status}
${d.nextMilestone ? `| Next milestone | ${d.nextMilestone.name}, due ${date(d.nextMilestone.dueDate)}` : ''}

Reply here if anything needs a change in priority.`.replace(/\n\n\n+/g, '\n\n'),
  }
}

// ---------- Change request (§11.2–11.3) ----------

export function changeRequest(d: {
  contactName?: string | null
  projectName: string
  crNumber: string
  description: string
  impactOnScope?: string | null
  impactOnTimeline?: string | null
  estimatedHours?: number | null
  additionalCost?: number | null
}): Draft {
  const priced = d.additionalCost != null
  return {
    subject: `${d.crNumber} for ${d.projectName}: ${priced ? 'estimate for your approval' : 'change request'}`,
    body: `${hello(d.contactName)}

Thanks for the request. As it's outside the scope we agreed, here's the estimate as a change request.

${d.description}

| Change request | ${d.crNumber}
| Project | ${d.projectName}
${d.impactOnScope ? `| Scope | ${d.impactOnScope}\n` : ''}${d.impactOnTimeline ? `| Timeline | ${d.impactOnTimeline}\n` : ''}${d.estimatedHours != null ? `| Estimated effort | ${d.estimatedHours} hours\n` : ''}${priced ? `| Additional cost | ${formatCurrency(d.additionalCost!)}` : ''}

${priced
  ? `If you'd like us to go ahead, please reply "Approved" to this email. Work starts once we have your written approval${d.additionalCost! > 0 ? ' and the invoice for this change is settled per our terms' : ''}.`
  : 'Please reply to confirm you would like us to go ahead, and we will schedule it.'}`,
  }
}

// ---------- Invoice ----------

export function invoice(d: {
  contactName?: string | null
  invoiceNumber: string
  projectName?: string | null
  description: string
  amount: number
  dueDate: Date
  paymentInstructions: string
}): Draft {
  return {
    subject: `Invoice ${d.invoiceNumber}${d.projectName ? ` for ${d.projectName}` : ''}: ${formatCurrency(d.amount)} due ${date(d.dueDate)}`,
    body: `${hello(d.contactName)}

Please find the invoice for ${d.description} below.

| Invoice | ${d.invoiceNumber}
${d.projectName ? `| Project | ${d.projectName}\n` : ''}| For | ${d.description}
| Amount | ${formatCurrency(d.amount)}
| Due by | ${date(d.dueDate)}

${d.paymentInstructions.trim() || 'Payment details are on the attached invoice.'}

Please share the transaction reference once paid so we can confirm receipt.`,
  }
}

// ---------- Payment reminder (§13.1 ladder) ----------

export function paymentReminder(d: {
  contactName?: string | null
  invoiceNumber: string
  projectName?: string | null
  outstanding: number
  dueDate: Date
  daysOverdue: number // negative = days until due
  paymentInstructions: string
  senderName: string
}): Draft {
  const facts = `| Invoice | ${d.invoiceNumber}
${d.projectName ? `| Project | ${d.projectName}\n` : ''}| Outstanding | ${formatCurrency(d.outstanding)}
| Due date | ${date(d.dueDate)}`
  const pay = d.paymentInstructions.trim()

  if (d.daysOverdue < 0) {
    return {
      subject: `Reminder: invoice ${d.invoiceNumber} is due on ${date(d.dueDate)}`,
      body: `${hello(d.contactName)}

A quick reminder that invoice ${d.invoiceNumber} falls due in ${-d.daysOverdue} day${d.daysOverdue === -1 ? '' : 's'}.

${facts}

${pay ? `${pay}\n\n` : ''}Thank you.`,
    }
  }
  if (d.daysOverdue === 0) {
    return {
      subject: `Invoice ${d.invoiceNumber} is due today`,
      body: `${hello(d.contactName)}

Invoice ${d.invoiceNumber} is due today.

${facts}

${pay ? `${pay}\n\n` : ''}If it has already been paid, please share the transaction reference and we'll update our records.`,
    }
  }
  if (d.daysOverdue < 7) {
    return {
      subject: `Overdue: invoice ${d.invoiceNumber} (${d.daysOverdue} day${d.daysOverdue === 1 ? '' : 's'})`,
      body: `${hello(d.contactName)}

Invoice ${d.invoiceNumber} is now ${d.daysOverdue} day${d.daysOverdue === 1 ? '' : 's'} past its due date.

${facts}

Please arrange payment at the earliest, or let us know the date it will be made.

${pay ? `${pay}\n\n` : ''}Thank you.`,
    }
  }
  return {
    subject: `Action needed: invoice ${d.invoiceNumber} is ${d.daysOverdue} days overdue`,
    body: `${hello(d.contactName)}

I'm following up personally on invoice ${d.invoiceNumber}, which is now ${d.daysOverdue} days overdue.

${facts}

Under our agreement, work linked to unpaid milestones may need to pause until the account is up to date. We'd much rather keep things moving, so please confirm the payment date by reply.

${pay ? `${pay}\n\n` : ''}Regards,
${d.senderName}`,
  }
}

// ---------- Payment received ----------

export function paymentReceipt(d: {
  contactName?: string | null
  amount: number
  date: Date
  invoiceNumber?: string | null
  reference?: string | null
  balance: number
}): Draft {
  return {
    subject: `Payment received: ${formatCurrency(d.amount)}${d.invoiceNumber ? ` for ${d.invoiceNumber}` : ''}`,
    body: `${hello(d.contactName)}

Thank you. We've received your payment.

| Amount | ${formatCurrency(d.amount)}
| Received on | ${date(d.date)}
${d.invoiceNumber ? `| Invoice | ${d.invoiceNumber}\n` : ''}${d.reference ? `| Reference | ${d.reference}\n` : ''}| Balance on this invoice | ${formatCurrency(d.balance)}`,
  }
}

// ---------- Proposal (§6) ----------

export function proposal(d: {
  contactName?: string | null
  title: string
  overview?: string
  features: string[]
  timeline?: string
  budget?: number | null
  milestones: { name: string; pct: number }[]
  validDays: number
}): Draft {
  return {
    subject: `Proposal: ${d.title}`,
    body: `${hello(d.contactName)}

Thank you for the time you spent walking us through the project. Our proposal for ${d.title} is attached, and the summary is below.

${d.overview ?? ''}

What we will build:
${list(d.features, 'As described in the attached proposal')}

${d.timeline ? `| Timeline | ${d.timeline}\n` : ''}${d.budget ? `| Investment | ${formatCurrency(d.budget)}\n` : ''}${d.milestones.map(m => `| ${m.name} | ${m.pct}%`).join('\n')}

This proposal is valid for ${d.validDays} days. Anything outside the scope above is estimated separately as a change request.

Happy to walk you through it on a call. Just reply with a time that suits you.`.replace(/\n\n\n+/g, '\n\n'),
  }
}

// ---------- Contract (§7) ----------

export function contract(d: {
  contactName?: string | null
  title: string
  total?: number | null
  effective?: string
  milestones: { name: string; amount: number }[]
}): Draft {
  return {
    subject: `Agreement for ${d.title}: for your signature`,
    body: `${hello(d.contactName)}

Please find the agreement for ${d.title} attached for your review and signature.

${d.total ? `| Contract value | ${formatCurrency(d.total)}\n` : ''}${d.effective ? `| Effective from | ${date(d.effective)}\n` : ''}${d.milestones.map(m => `| ${m.name} | ${formatCurrency(m.amount)}`).join('\n')}

It covers scope, the milestone payment schedule, change requests, IP transfer on final payment, warranty and confidentiality.

Once signed, please reply with the signed copy. We begin kickoff after the signed agreement and the advance are received.`.replace(/\n\n\n+/g, '\n\n'),
  }
}

// ---------- Onboarding (§8) ----------

export function onboardingRequest(d: { contactName?: string | null; company: string; needed: string[] }): Draft {
  return {
    subject: `Getting started: what we need from ${d.company}`,
    body: `${hello(d.contactName)}

To start development on schedule, we need a few things from your side:

${list(d.needed, 'Nothing pending, thank you')}

You can reply with the details and attachments, or share access to a folder. Our timeline begins once these are in.`,
  }
}

// ---------- Meeting summary (§12.2) ----------

export function meetingSummary(d: { contactName?: string | null; projectName?: string | null }): Draft {
  return {
    subject: `Summary of today's discussion${d.projectName ? `: ${d.projectName}` : ''}`,
    body: `${hello(d.contactName)}

Thanks for the time today. As discussed, we agreed that:

-
-

Outside the current scope (to be estimated separately):

-

Next steps:

-

Please reply if anything here doesn't match your understanding.`,
  }
}

export function general(d: { contactName?: string | null }): Draft {
  return { subject: '', body: `${hello(d.contactName)}\n\n` }
}
