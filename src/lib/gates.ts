// The 9 Gates of StackTribe (OS Bible §1.4), as plain rules.
// Server actions enforce these; screens use the same functions to explain what's blocking.
// No database access here, so the rules stay easy to read and test.

import type { ChangeRequestStatus, LeadStage, ProjectStatus, Role } from '@prisma/client'

const FOUNDER_ROLES: Role[] = ['FOUNDER', 'CEO', 'CTO', 'ADMIN']
const isFounder = (role: Role) => FOUNDER_ROLES.includes(role)

// ---------- Gates 1–3: leads ----------

export const LEAD_PIPELINE: LeadStage[] = ['NEW', 'CONTACTED', 'CONNECTED', 'QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION']
const QUALIFIED_INDEX = LEAD_PIPELINE.indexOf('QUALIFIED')

type LeadForGate = {
  stage: LeadStage
  estimatedBudget: number | null
  timeline: string | null
  decisionMaker: string | null
  clientProjectCount?: number
}

// Gate 2: no budget, timeline or decision maker means no serious proposal (§4.1)
export function missingQualification(lead: LeadForGate): string[] {
  const missing: string[] = []
  if (!(lead.estimatedBudget && lead.estimatedBudget > 0)) missing.push('estimated budget')
  if (!lead.timeline?.trim()) missing.push('timeline')
  if (!lead.decisionMaker?.trim()) missing.push('decision maker')
  return missing
}

export function checkLeadMove(lead: LeadForGate, to: LeadStage, role: Role, lostReason?: string): string | null {
  const from = lead.stage
  if (from === to) return null

  if (from === 'WON') {
    if (!isFounder(role)) return 'Only a founder can reopen a won deal'
    if ((lead.clientProjectCount ?? 0) > 0) return 'This deal already has a project, so it stays won'
    if (to === 'LOST') return 'Move the deal back to Negotiation first'
  }

  if (to === 'LOST') {
    if (!lostReason?.trim()) return 'Add a reason for losing this lead'
    return null
  }

  // Pricing and contracts are founder decisions (§2.3), so only a founder marks a deal won
  if (to === 'WON') {
    if (!isFounder(role)) return 'Only a founder can mark a deal as won (pricing and contracts need founder approval)'
    if (from !== 'PROPOSAL' && from !== 'NEGOTIATION') return 'A deal is won from Proposal or Negotiation, after the agreement is signed'
  }

  const toIndex = to === 'WON' ? LEAD_PIPELINE.length : LEAD_PIPELINE.indexOf(to)
  if (toIndex >= QUALIFIED_INDEX) {
    const missing = missingQualification(lead)
    if (missing.length) return `Gate 2: add the ${missing.join(', ')} before moving to ${to.toLowerCase()}`
  }
  return null
}

// ---------- Gates 3–5: onboarding and kickoff ----------

export const ONBOARDING_ITEMS = [
  { id: 'agreementSigned', label: 'Agreement signed', desc: 'Agreement and scope signed by the client.' },
  { id: 'advanceReceived', label: 'Advance received', desc: 'Advance payment is in the bank.' },
  { id: 'clientInfoCollected', label: 'Client info collected', desc: 'GSTIN, address and billing details are filled in.' },
  { id: 'primaryContactConfirmed', label: 'Primary contact confirmed', desc: 'One named person for day-to-day communication.' },
  { id: 'decisionMakerConfirmed', label: 'Decision maker confirmed', desc: 'The person who approves scope and payments.' },
  { id: 'commChannelEstablished', label: 'Communication channel set up', desc: 'WhatsApp group or email thread created.' },
  { id: 'requirementsApproved', label: 'Requirements approved', desc: 'Client approved the requirements document (Gate 5).' },
  { id: 'assetsReceived', label: 'Assets and access received', desc: 'Logos, content, credentials and access.' },
  { id: 'timelineApproved', label: 'Timeline approved', desc: 'Client approved delivery dates.' },
  { id: 'milestonesEstablished', label: 'Milestones established', desc: 'Payment milestones are set up on the project.' },
  { id: 'responsibilitiesDocumented', label: 'Responsibilities documented', desc: 'What the client must provide, and by when.' },
  { id: 'kickoffCompleted', label: 'Kickoff completed', desc: 'Kickoff meeting held and summary sent.' },
] as const

export type OnboardingField = (typeof ONBOARDING_ITEMS)[number]['id']

export function missingOnboarding(client: Record<OnboardingField, boolean>): string[] {
  return ONBOARDING_ITEMS.filter(i => !client[i.id]).map(i => i.label)
}

// ---------- Gate 7: milestones ----------

type MilestoneForGate = {
  id: string
  name: string
  sortOrder: number
  paymentAmount: number
  status: string
  invoices: { status: string }[]
}

// No approval or payment on earlier milestones means the next one doesn't start (§7.3)
export function milestoneStartBlockers(all: MilestoneForGate[], target: MilestoneForGate): string[] {
  const earlier = all.filter(m => m.sortOrder < target.sortOrder || (m.sortOrder === target.sortOrder && m.id < target.id))
  const blockers: string[] = []
  for (const m of earlier) {
    if (m.paymentAmount > 0 && !m.invoices.some(i => i.status === 'PAID')) blockers.push(`${m.name} isn't paid`)
    else if (m.paymentAmount === 0 && !['COMPLETED', 'APPROVED'].includes(m.status)) blockers.push(`${m.name} isn't approved`)
  }
  return blockers
}

// Statuses that mean work on the milestone has begun
export const MILESTONE_ACTIVE_STATUSES = ['IN_PROGRESS', 'CLIENT_REVIEW', 'COMPLETED', 'APPROVED']

// ---------- Gates 8–9: launch and closure ----------

// Gate 8: no final payment, no final handover
export function unpaidMilestones(all: MilestoneForGate[]): string[] {
  return all
    .filter(m => m.paymentAmount > 0 && !m.invoices.some(i => i.status === 'PAID'))
    .map(m => m.name)
}

// Gate 9: Bible §14.1. The two payment items are worked out from invoices, not ticked by hand.
export const CLOSURE_ITEMS = [
  { id: 'scopeCompleted', label: 'Scope completed' },
  { id: 'qaCompleted', label: 'QA completed' },
  { id: 'clientAcceptance', label: 'Client acceptance received' },
  { id: 'finalInvoiceIssued', label: 'Final invoice issued', auto: true },
  { id: 'finalPaymentReceived', label: 'Final payment received', auto: true },
  { id: 'deploymentCompleted', label: 'Deployment completed' },
  { id: 'credentialsTransferred', label: 'Credentials transferred' },
  { id: 'documentationTransferred', label: 'Documentation transferred' },
  { id: 'sourceCodeTransferred', label: 'Source code transferred per agreement' },
  { id: 'warrantyStarted', label: 'Warranty / support period started' },
  { id: 'testimonialRequested', label: 'Testimonial requested' },
  { id: 'referralRequested', label: 'Referral requested' },
  { id: 'caseStudyIdentified', label: 'Case study opportunity identified' },
] as const

export type ClosureItemId = (typeof CLOSURE_ITEMS)[number]['id']

export function closureAutoItems(all: MilestoneForGate[]) {
  const billable = all.filter(m => m.paymentAmount > 0)
  return {
    finalInvoiceIssued: billable.length > 0 && billable.every(m => m.invoices.some(i => i.status !== 'DRAFT' && i.status !== 'CANCELLED')),
    finalPaymentReceived: billable.length > 0 && billable.every(m => m.invoices.some(i => i.status === 'PAID')),
  }
}

// ---------- Project status ----------

export const PROJECT_MOVES: Record<ProjectStatus, ProjectStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: [],
}

// ---------- Gate 6: change requests ----------

export const CR_MOVES: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  REQUESTED: ['ESTIMATED', 'REJECTED'],
  ESTIMATED: ['APPROVED', 'REJECTED', 'REQUESTED'],
  APPROVED: ['IN_PROGRESS'],
  REJECTED: [],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
}

type CrForGate = { status: ChangeRequestStatus; estimatedHours: number | null; additionalCost: number | null; impactOnTimeline: string | null }

export function checkCrMove(cr: CrForGate, to: ChangeRequestStatus, approvalNote?: string): string | null {
  if (!CR_MOVES[cr.status].includes(to)) {
    return `A change request can't go from ${cr.status.toLowerCase().replace('_', ' ')} to ${to.toLowerCase().replace('_', ' ')}`
  }
  if (to === 'ESTIMATED' || to === 'APPROVED') {
    if (cr.estimatedHours == null || cr.additionalCost == null || !cr.impactOnTimeline?.trim()) {
      return 'Estimate the hours, cost and timeline impact first (§11.2)'
    }
  }
  if (to === 'APPROVED' && !approvalNote?.trim()) {
    return "Gate 6: record how the client approved in writing (for example, \"Email from Rahul, 12 Oct\")"
  }
  return null
}
