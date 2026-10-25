'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './prisma'
import { requireUser, isFounderRole } from './session'
import { deliver, getEmailSetup } from './email/transport'
import { renderEmailHtml, renderEmailText } from './email/render'
import * as T from './email/templates'
import { EMAIL_KINDS, type EmailKind } from './email/templates'
import { invoiceOutstanding, OPEN_INVOICE_STATUSES } from './utils'
import { ONBOARDING_ITEMS } from './gates'

// What an email is about. The first id present decides the recipients and the available templates.
export type EmailContext = {
  invoiceId?: string
  changeRequestId?: string
  projectId?: string
  clientId?: string
  leadId?: string
}

export type Recipient = { name: string; email: string; role: string }

export type ComposerData = {
  kind: EmailKind
  kinds: EmailKind[]
  about: string
  recipients: Recipient[]
  to: string[]
  cc: string[]
  subject: string
  body: string
  signature: string
  sender: { mode: 'smtp' | 'outbox' | 'off'; label: string; missing?: string[] }
  canMarkInvoiceSent: boolean
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

// Bible §2.3/§2.5: pricing, contracts and money conversations are founder-only.
// The sales team can email its own leads, but not proposals or anything with prices.
const BDE_KINDS: EmailKind[] = ['GENERAL', 'MEETING_SUMMARY']

// Client-facing wording for the onboarding items the client has to supply
const ONBOARDING_ASKS: Partial<Record<(typeof ONBOARDING_ITEMS)[number]['id'], string>> = {
  agreementSigned: 'The signed agreement',
  advanceReceived: 'The advance payment as per the agreement',
  clientInfoCollected: 'Company details for invoicing: legal name, GSTIN and billing address',
  primaryContactConfirmed: 'The one person we should coordinate with day to day',
  decisionMakerConfirmed: 'The person who approves scope, designs and payments',
  requirementsApproved: 'Your approval of the requirements document',
  assetsReceived: 'Logos, content, credentials and access to existing systems',
  timelineApproved: 'Your approval of the delivery timeline',
  kickoffCompleted: 'A convenient time for the kickoff call',
}

async function getSetting(key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? ''
}

function contactsOf(client: {
  company: string
  primaryContactName: string
  primaryContactEmail: string | null
  decisionMakerName: string | null
  decisionMakerEmail: string | null
  billingContactName: string | null
  billingContactEmail: string | null
  technicalContactName: string | null
  technicalContactEmail: string | null
}): Recipient[] {
  const all: Recipient[] = []
  const add = (name: string | null, email: string | null, role: string) => {
    if (email && !all.some(r => r.email.toLowerCase() === email.toLowerCase())) all.push({ name: name || client.company, email, role })
  }
  add(client.primaryContactName, client.primaryContactEmail, 'Primary contact')
  add(client.decisionMakerName, client.decisionMakerEmail, 'Decision maker')
  add(client.billingContactName, client.billingContactEmail, 'Billing')
  add(client.technicalContactName, client.technicalContactEmail, 'Technical')
  return all
}

// ============================================
// DRAFT: recipients + template for a context
// ============================================

export async function getComposerData(context: EmailContext, requestedKind?: EmailKind): Promise<Result<{ data: ComposerData }>> {
  const user = await requireUser()
  const founder = isFounderRole(user.role)
  if (!founder && !context.leadId) return { success: false, error: 'Only founders can email clients about projects and payments' }

  const [paymentInstructions, savedSignature] = await Promise.all([
    getSetting('payment_instructions'),
    getSetting(`email_signature:${user.id}`),
  ])
  const setup = getEmailSetup()
  const signature = savedSignature || `${user.name}\nStackTribe${setup.mode !== 'off' ? `\n${setup.from}` : ''}`

  let kinds: EmailKind[] = []
  let recipients: Recipient[] = []
  let primary: Recipient | undefined
  let about = ''
  let canMarkInvoiceSent = false
  let build: (kind: EmailKind) => Promise<T.Draft>

  if (context.invoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: context.invoiceId },
      include: { client: true, project: true, milestone: true, payments: { orderBy: { date: 'desc' }, take: 1 } },
    })
    if (!inv) return { success: false, error: 'Invoice not found' }
    recipients = contactsOf(inv.client)
    // Invoices go to billing first when there is a billing contact
    primary = recipients.find(r => r.role === 'Billing') ?? recipients[0]
    // A billing desk isn't a person, so greet it generally
    const greetName = primary?.role === 'Billing' ? null : primary?.name
    about = `${inv.invoiceNumber} · ${inv.client.company}`
    const open = (OPEN_INVOICE_STATUSES as readonly string[]).includes(inv.status)
    kinds = [
      ...(inv.status === 'DRAFT' || open ? ['INVOICE' as const] : []),
      ...(open ? ['PAYMENT_REMINDER' as const] : []),
      ...(inv.paidAmount > 0 ? ['PAYMENT_RECEIPT' as const] : []),
      'GENERAL',
    ]
    canMarkInvoiceSent = inv.status === 'DRAFT'
    const lineItems = Array.isArray(inv.lineItems) ? (inv.lineItems as { description?: string }[]) : []
    const description = inv.milestone?.name ?? lineItems[0]?.description ?? inv.notes ?? 'the work completed'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(inv.dueDate); due.setHours(0, 0, 0, 0)
    build = async (kind) => {
      switch (kind) {
        case 'INVOICE':
          return T.invoice({ contactName: greetName, invoiceNumber: inv.invoiceNumber, projectName: inv.project?.name, description, amount: inv.amount - inv.paidAmount || inv.amount, dueDate: inv.dueDate, paymentInstructions })
        case 'PAYMENT_REMINDER':
          return T.paymentReminder({ contactName: greetName, invoiceNumber: inv.invoiceNumber, projectName: inv.project?.name, outstanding: invoiceOutstanding(inv), dueDate: inv.dueDate, daysOverdue: Math.round((today.getTime() - due.getTime()) / 86400000), paymentInstructions, senderName: user.name })
        case 'PAYMENT_RECEIPT': {
          const p = inv.payments[0]
          return T.paymentReceipt({ contactName: greetName, amount: p?.amount ?? inv.paidAmount, date: p?.date ?? new Date(), invoiceNumber: inv.invoiceNumber, reference: p?.reference, balance: invoiceOutstanding(inv) })
        }
        default:
          return T.general({ contactName: greetName })
      }
    }
  } else if (context.changeRequestId) {
    const cr = await prisma.changeRequest.findUnique({ where: { id: context.changeRequestId }, include: { project: { include: { client: true } } } })
    if (!cr) return { success: false, error: 'Change request not found' }
    recipients = contactsOf(cr.project.client)
    primary = recipients.find(r => r.role === 'Decision maker') ?? recipients[0]
    about = `${cr.crNumber} · ${cr.project.name}`
    kinds = ['CHANGE_REQUEST', 'GENERAL']
    build = async (kind) => kind === 'CHANGE_REQUEST'
      ? T.changeRequest({ contactName: primary?.name, projectName: cr.project.name, crNumber: cr.crNumber, description: cr.description, impactOnScope: cr.impactOnScope, impactOnTimeline: cr.impactOnTimeline, estimatedHours: cr.estimatedHours, additionalCost: cr.additionalCost })
      : T.general({ contactName: primary?.name })
  } else if (context.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: context.projectId },
      include: { client: true, milestones: { orderBy: { sortOrder: 'asc' }, include: { invoices: { where: { status: { not: 'CANCELLED' } } } } }, tasks: true },
    })
    if (!project) return { success: false, error: 'Project not found' }
    recipients = contactsOf(project.client)
    primary = recipients[0]
    about = `${project.name} · ${project.client.company}`
    kinds = ['PROJECT_UPDATE', 'MEETING_SUMMARY', 'PROPOSAL', 'CONTRACT', 'GENERAL']
    build = async (kind) => {
      switch (kind) {
        case 'PROJECT_UPDATE': {
          const titles = (s: string[]) => project.tasks.filter(t => s.includes(t.status)).map(t => t.title)
          const next = project.milestones.find(m => !m.invoices.some(i => i.status === 'PAID') && m.status !== 'APPROVED')
          return T.projectUpdate({
            contactName: primary?.name, projectName: project.name,
            done: titles(['DONE', 'APPROVED', 'IN_REVIEW']), inProgress: titles(['IN_PROGRESS']),
            clientActions: titles(['CLIENT_REVIEW']), upcoming: titles(['THIS_WEEK']),
            nextMilestone: next ? { name: next.name, dueDate: next.dueDate } : null, health: project.health,
          })
        }
        case 'PROPOSAL': {
          const p = (project.proposalData ?? {}) as { title?: string; overview?: string; features?: string[]; timeline?: string; budget?: number; milestones?: { name: string; pct: number }[] }
          return T.proposal({
            contactName: primary?.name, title: p.title || project.name, overview: p.overview || project.description || undefined,
            features: p.features?.filter(Boolean) ?? (project.scope ? project.scope.split('\n').filter(Boolean) : []),
            timeline: p.timeline, budget: Number(p.budget) || project.contractValue,
            milestones: p.milestones ?? project.milestones.map(m => ({ name: m.name, pct: Math.round((m.paymentAmount / Math.max(project.contractValue, 1)) * 100) })),
            validDays: 15,
          })
        }
        case 'CONTRACT': {
          const c = (project.contractData ?? {}) as { title?: string; total?: number; effective?: string }
          return T.contract({
            contactName: primary?.name, title: c.title || project.name, total: Number(c.total) || project.contractValue, effective: c.effective,
            milestones: project.milestones.map(m => ({ name: m.name, amount: m.paymentAmount })),
          })
        }
        case 'MEETING_SUMMARY':
          return T.meetingSummary({ contactName: primary?.name, projectName: project.name })
        default:
          return T.general({ contactName: primary?.name })
      }
    }
  } else if (context.clientId) {
    const client = await prisma.client.findUnique({ where: { id: context.clientId } })
    if (!client) return { success: false, error: 'Client not found' }
    recipients = contactsOf(client)
    primary = recipients[0]
    about = client.company
    kinds = ['ONBOARDING_REQUEST', 'MEETING_SUMMARY', 'GENERAL']
    build = async (kind) => {
      if (kind === 'ONBOARDING_REQUEST') {
        const needed = ONBOARDING_ITEMS.filter(i => !client[i.id] && ONBOARDING_ASKS[i.id]).map(i => ONBOARDING_ASKS[i.id]!)
        return T.onboardingRequest({ contactName: primary?.name, company: client.company, needed })
      }
      return kind === 'MEETING_SUMMARY' ? T.meetingSummary({ contactName: primary?.name }) : T.general({ contactName: primary?.name })
    }
  } else if (context.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: context.leadId } })
    if (!lead) return { success: false, error: 'Lead not found' }
    if (!founder && lead.ownerId !== user.id) return { success: false, error: 'You can email only the leads you own' }
    recipients = lead.email ? [{ name: lead.contactName, email: lead.email, role: 'Lead contact' }] : []
    primary = recipients[0]
    about = lead.company
    kinds = founder ? ['GENERAL', 'MEETING_SUMMARY', 'PROPOSAL'] : BDE_KINDS
    build = async (kind) => {
      if (kind === 'PROPOSAL') {
        return T.proposal({
          contactName: lead.contactName, title: `${lead.company}: ${lead.requirement}`, overview: lead.problemToSolve ?? undefined,
          features: [], timeline: lead.timeline ?? undefined, budget: lead.estimatedBudget, milestones: [], validDays: 15,
        })
      }
      return kind === 'MEETING_SUMMARY' ? T.meetingSummary({ contactName: lead.contactName }) : T.general({ contactName: lead.contactName })
    }
  } else {
    if (!founder) return { success: false, error: 'Choose a lead to email' }
    about = 'New email'
    kinds = ['GENERAL', 'MEETING_SUMMARY']
    build = async (kind) => (kind === 'MEETING_SUMMARY' ? T.meetingSummary({}) : T.general({}))
  }

  const kind = requestedKind && kinds.includes(requestedKind) ? requestedKind : kinds[0]
  const draft = await build(kind)

  return {
    success: true,
    data: {
      kind,
      kinds,
      about,
      recipients,
      to: primary ? [primary.email] : [],
      // Keep the decision maker in the loop on money and scope emails
      cc: ['INVOICE', 'PAYMENT_REMINDER', 'CHANGE_REQUEST', 'CONTRACT'].includes(kind)
        ? recipients.filter(r => r.email !== primary?.email && (r.role === 'Decision maker' || r.role === 'Primary contact')).map(r => r.email)
        : [],
      subject: draft.subject,
      body: draft.body,
      signature,
      sender: setup.mode === 'off'
        ? { mode: 'off', label: 'Not set up', missing: setup.missing }
        : { mode: setup.mode, label: `${setup.fromName} <${setup.from}>` },
      canMarkInvoiceSent,
    },
  }
}

// ============================================
// SEND
// ============================================

export type SendEmailInput = {
  kind: EmailKind
  context: EmailContext
  to: string[]
  cc: string[]
  subject: string
  body: string
  signature: string
  attachments: { name: string; type: string; base64: string }[]
  markInvoiceSent?: boolean
}

export async function sendEmail(input: SendEmailInput): Promise<Result<{ invoiceMarkedSent: boolean }>> {
  const user = await requireUser()
  const founder = isFounderRole(user.role)

  if (!EMAIL_KINDS.includes(input.kind)) return { success: false, error: 'Unknown email type' }
  if (!founder) {
    if (!input.context.leadId || Object.keys(input.context).some(k => k !== 'leadId' && input.context[k as keyof EmailContext])) {
      return { success: false, error: 'Only founders can email clients about projects and payments' }
    }
    if (!BDE_KINDS.includes(input.kind)) return { success: false, error: 'Proposals and pricing emails need a founder (§2.5)' }
    const lead = await prisma.lead.findUnique({ where: { id: input.context.leadId }, select: { ownerId: true } })
    if (lead?.ownerId !== user.id) return { success: false, error: 'You can email only the leads you own' }
  }

  const clean = (list: string[]) => [...new Set(list.map(e => e.trim()).filter(Boolean))]
  const to = clean(input.to)
  const cc = clean(input.cc).filter(e => !to.includes(e))
  const bad = [...to, ...cc].filter(e => !EMAIL_RE.test(e))
  if (!to.length) return { success: false, error: 'Add at least one recipient' }
  if (bad.length) return { success: false, error: `Check these addresses: ${bad.join(', ')}` }
  if (to.length + cc.length > 20) return { success: false, error: 'Send to 20 people or fewer at a time' }
  if (!input.subject.trim()) return { success: false, error: 'Add a subject' }
  if (!input.body.trim()) return { success: false, error: 'Write the message' }
  if (input.attachments.length > 5) return { success: false, error: 'Attach up to 5 files' }

  const attachments = input.attachments.map(a => ({
    filename: a.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120),
    content: Buffer.from(a.base64, 'base64'),
    contentType: a.type || undefined,
  }))
  const totalBytes = attachments.reduce((s, a) => s + a.content.length, 0)
  if (totalBytes > MAX_ATTACHMENT_BYTES) return { success: false, error: 'Attachments add up to more than 10 MB' }

  // Sending a draft invoice also marks it sent, so receivables and the forecast pick it up
  let invoiceToMark: { id: string; projectId: string | null } | null = null
  if (input.kind === 'INVOICE' && input.markInvoiceSent && input.context.invoiceId) {
    if (!founder) return { success: false, error: 'Only founders send invoices' }
    const inv = await prisma.invoice.findUnique({ where: { id: input.context.invoiceId }, select: { id: true, status: true, projectId: true, amount: true } })
    if (inv?.status === 'DRAFT') {
      if (!(inv.amount > 0)) return { success: false, error: 'Set an amount on the invoice before sending' }
      invoiceToMark = { id: inv.id, projectId: inv.projectId }
    }
  }

  // Replies go to the sending mailbox unless EMAIL_REPLY_TO points somewhere else
  const replyTo = process.env.EMAIL_REPLY_TO || undefined
  let messageId: string
  try {
    const sent = await deliver({
      to, cc, replyTo,
      subject: input.subject.trim(),
      text: renderEmailText({ body: input.body, signature: input.signature }),
      html: renderEmailHtml({ body: input.body, signature: input.signature, preheader: input.body.split('\n').find(l => l.trim() && !/^Hi /.test(l))?.slice(0, 120) }),
      attachments,
    })
    messageId = sent.messageId
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Email send failed:', message)
    return {
      success: false,
      error: message.startsWith("Email isn't set up") ? message
        : /auth|login|credentials|535|534/i.test(message) ? 'The mail server rejected the login. Check SMTP_USER and the app password.'
        : 'The email could not be sent. Nothing was delivered; try again in a minute.',
    }
  }

  // Resolve the client this email belongs to, so it shows in that client's history
  const ctx = input.context
  const clientId = ctx.clientId
    ?? (ctx.invoiceId ? (await prisma.invoice.findUnique({ where: { id: ctx.invoiceId }, select: { clientId: true } }))?.clientId : undefined)
    ?? (ctx.projectId ? (await prisma.project.findUnique({ where: { id: ctx.projectId }, select: { clientId: true } }))?.clientId : undefined)
    ?? (ctx.changeRequestId ? (await prisma.changeRequest.findUnique({ where: { id: ctx.changeRequestId }, select: { project: { select: { clientId: true } } } }))?.project.clientId : undefined)

  const record = {
    kind: input.kind, to, cc, subject: input.subject.trim(), body: input.body,
    attachments: attachments.map(a => ({ name: a.filename, bytes: a.content.length })),
    ...ctx, clientId, messageId, delivery: getEmailSetup().mode,
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.create({
      data: { entityType: 'Email', entityId: clientId ?? ctx.leadId ?? 'general', action: 'Email sent', details: JSON.stringify(record), userId: user.id },
    })
    // Also show it in the lead's own activity feed
    if (ctx.leadId) {
      await tx.activity.create({
        data: { entityType: 'Lead', entityId: ctx.leadId, action: 'Email sent', details: `${record.subject} → ${to.join(', ')}`, userId: user.id },
      })
    }
    if (invoiceToMark) {
      await tx.invoice.update({ where: { id: invoiceToMark.id }, data: { status: 'SENT' } })
    }
  })

  revalidatePath('/emails')
  if (ctx.leadId) revalidatePath(`/leads/${ctx.leadId}`)
  if (invoiceToMark) {
    revalidatePath('/dashboard')
    revalidatePath('/finance', 'layout')
    if (invoiceToMark.projectId) revalidatePath(`/projects/${invoiceToMark.projectId}`, 'layout')
  }
  return { success: true, invoiceMarkedSent: !!invoiceToMark }
}

// ============================================
// HISTORY + SETTINGS
// ============================================

export type SentEmail = {
  id: string
  sentAt: Date
  sentBy: string
  kind: EmailKind
  to: string[]
  cc: string[]
  subject: string
  body: string
  attachments: { name: string; bytes: number }[]
  clientId?: string
  projectId?: string
  invoiceId?: string
  leadId?: string
  delivery: string
}

export async function getSentEmails(filter: { clientId?: string; take?: number } = {}): Promise<SentEmail[]> {
  const user = await requireUser()
  const founder = isFounderRole(user.role)
  const rows = await prisma.activity.findMany({
    where: {
      entityType: 'Email',
      action: 'Email sent',
      ...(filter.clientId ? { entityId: filter.clientId } : {}),
      // The sales team sees only what it sent itself
      ...(founder ? {} : { userId: user.id }),
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: filter.take ?? 200,
  })
  return rows.flatMap(r => {
    try {
      const d = JSON.parse(r.details ?? '{}')
      return [{
        id: r.id, sentAt: r.createdAt, sentBy: r.user.name, kind: d.kind, to: d.to ?? [], cc: d.cc ?? [],
        subject: d.subject ?? '', body: d.body ?? '', attachments: d.attachments ?? [],
        clientId: d.clientId, projectId: d.projectId, invoiceId: d.invoiceId, leadId: d.leadId, delivery: d.delivery ?? 'smtp',
      }]
    } catch {
      return []
    }
  })
}

export async function getEmailSettings() {
  const user = await requireUser()
  const setup = getEmailSetup()
  const [signature, paymentInstructions] = await Promise.all([getSetting(`email_signature:${user.id}`), getSetting('payment_instructions')])
  return {
    signature,
    paymentInstructions,
    canEditPaymentInstructions: isFounderRole(user.role),
    sender: setup.mode === 'off'
      ? { mode: 'off' as const, label: 'Not set up', missing: setup.missing }
      : { mode: setup.mode, label: `${setup.fromName} <${setup.from}>`, missing: [] as string[] },
  }
}

export async function saveEmailSettings(data: { signature: string; paymentInstructions?: string }): Promise<Result> {
  const user = await requireUser()
  const upsert = (key: string, value: string) =>
    prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
  await upsert(`email_signature:${user.id}`, data.signature.slice(0, 1000))
  if (data.paymentInstructions !== undefined) {
    if (!isFounderRole(user.role)) return { success: false, error: 'Only founders can change payment details' }
    await upsert('payment_instructions', data.paymentInstructions.slice(0, 2000))
  }
  revalidatePath('/emails')
  return { success: true }
}
