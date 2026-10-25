// Display names for enum values, so every screen uses the same words

import type { ContentKind, ContentStatus, LeadSegment, LeadStage } from '@prisma/client'

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  CONNECTED: 'Connected',
  QUALIFIED: 'Qualified',
  DISCOVERY: 'Discovery',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
}

// Early stages are neutral, qualified pipeline is brand, outcomes are green/red
export const LEAD_STAGE_BADGE: Record<LeadStage, 'secondary' | 'default' | 'success' | 'danger'> = {
  NEW: 'secondary',
  CONTACTED: 'secondary',
  CONNECTED: 'secondary',
  QUALIFIED: 'default',
  DISCOVERY: 'default',
  PROPOSAL: 'default',
  NEGOTIATION: 'default',
  WON: 'success',
  LOST: 'danger',
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Closed',
  CANCELLED: 'Cancelled',
}

export const PROJECT_HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  DELAYED: 'Delayed',
  BLOCKED: 'Blocked',
}

export const LEAD_SEGMENT_LABEL: Record<LeadSegment, string> = {
  FOUNDER: 'Founders',
  MANUFACTURER: 'Manufacturers',
  RESTAURANT: 'Restaurants & hospitality',
  D2C: 'D2C brands',
}

export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  POST: 'Post',
  EMAIL: 'Email',
  DM: 'DM',
  CONNECTION: 'Connection note',
  PROFILE: 'Profile copy',
  PAGE: 'Page copy',
}

// What the reviewer needs to do next, in their words
export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: 'Waiting for review',
  CHANGES: 'Changes requested',
  APPROVED: 'Approved · ready to send',
  SENT: 'Sent / live',
}

export const CONTENT_STATUS_BADGE: Record<ContentStatus, 'warning' | 'danger' | 'default' | 'success'> = {
  DRAFT: 'warning',
  CHANGES: 'danger',
  APPROVED: 'default',
  SENT: 'success',
}

export function shortDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
