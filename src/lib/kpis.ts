// One definition for every KPI shown in STMS (OS Bible §23).
// If two screens show the same number, they must both come from here.

import { startOfWeek } from 'date-fns'
import type { LeadStage } from '@prisma/client'

// Weeks run Monday to Sunday everywhere (founder Monday meeting, §20)
export const weekStart = (d: Date = new Date()) => startOfWeek(d, { weekStartsOn: 1 })

// Proposal-to-close: of the deals that ended, how many did we win. Open deals aren't counted.
export function winRate(won: number, lost: number): number {
  return won + lost > 0 ? (won / (won + lost)) * 100 : 0
}

// Pipeline = qualified, open deals (Gate 2). Unqualified leads aren't pipeline yet.
export const PIPELINE_STAGES: LeadStage[] = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION']

// Default chance of closing at each stage, used for weighted pipeline value
export const STAGE_PROBABILITY: Record<string, number> = {
  QUALIFIED: 0.1,
  DISCOVERY: 0.2,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.8,
}

// BDE end-of-day report fields (§18.2) and the CRM stage move that counts for each
export const BDE_STAGE_COUNTS = {
  contacted: 'CONTACTED',
  replies: 'CONNECTED',
  qualified: 'QUALIFIED',
  meetingsBooked: 'DISCOVERY',
  proposalsRequested: 'PROPOSAL',
} as const satisfies Record<string, LeadStage>

// Agency health score (§23.4): four equal parts, each 0–25, so the score can be explained line by line
export const HEALTH_TARGETS = {
  winRatePercent: 30, // full sales points at a 30% win rate
}

export type HealthPart = { label: string; points: number; max: number; detail: string }

export function healthScore(input: {
  cashZone: 'GREEN' | 'YELLOW' | 'RED'
  receivables: number
  overdue: number
  winRatePercent: number
  closedDeals: number
  activeProjects: number
  troubledProjects: number
}): { score: number; parts: HealthPart[] } {
  const cash = input.cashZone === 'GREEN' ? 25 : input.cashZone === 'YELLOW' ? 12 : 0
  const collections = input.receivables > 0 ? 25 * (1 - input.overdue / input.receivables) : 25
  const sales = input.closedDeals > 0 ? 25 * Math.min(1, input.winRatePercent / HEALTH_TARGETS.winRatePercent) : 12
  const delivery = input.activeProjects > 0 ? 25 * (1 - input.troubledProjects / input.activeProjects) : 25

  const parts: HealthPart[] = [
    { label: 'Cash', points: cash, max: 25, detail: `${input.cashZone.toLowerCase()} zone` },
    { label: 'Collections', points: collections, max: 25, detail: input.receivables > 0 ? `${Math.round((input.overdue / input.receivables) * 100)}% of receivables overdue` : 'nothing owed' },
    { label: 'Sales', points: sales, max: 25, detail: input.closedDeals > 0 ? `${Math.round(input.winRatePercent)}% win rate (target ${HEALTH_TARGETS.winRatePercent}%)` : 'no closed deals yet' },
    { label: 'Delivery', points: delivery, max: 25, detail: input.activeProjects > 0 ? `${input.troubledProjects} of ${input.activeProjects} projects at risk, delayed or blocked` : 'no active projects' },
  ].map(p => ({ ...p, points: Math.round(p.points) }))

  return { score: parts.reduce((s, p) => s + p.points, 0), parts }
}
