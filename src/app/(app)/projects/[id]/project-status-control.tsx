'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ProjectStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { changeProjectStatus, updateClosureItem } from '@/lib/project-actions'
import type { ClosureItemId } from '@/lib/gates'
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react'

type Gates = {
  status: ProjectStatus
  allowedMoves: ProjectStatus[]
  clientId: string
  clientName: string
  onboardingMissing: string[]
  milestoneCount: number
  unpaid: string[]
  closure: { id: string; label: string; auto: boolean; done: boolean }[]
}

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: 'secondary' | 'default' | 'warning' | 'success' | 'danger' }> = {
  NOT_STARTED: { label: 'Not started', variant: 'secondary' },
  IN_PROGRESS: { label: 'In progress', variant: 'default' },
  ON_HOLD: { label: 'On hold', variant: 'warning' },
  COMPLETED: { label: 'Closed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
}

export function ProjectStatusControl({ projectId, gates }: { projectId: string; gates: Gates }) {
  const can = (s: ProjectStatus) => gates.allowedMoves.includes(s)
  const badge = STATUS_BADGE[gates.status]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {gates.status === 'NOT_STARTED' && can('IN_PROGRESS') && <StartDialog projectId={projectId} gates={gates} />}
      {gates.status === 'ON_HOLD' && can('IN_PROGRESS') && (
        <ReasonDialog projectId={projectId} to="IN_PROGRESS" trigger="Resume" title="Resume project" description="What changed so work can continue?" />
      )}
      {can('ON_HOLD') && (
        <ReasonDialog projectId={projectId} to="ON_HOLD" trigger="Put on hold" title="Put project on hold"
          description="Bible §13: work can pause when payments are overdue beyond the grace period, or the client is blocking." />
      )}
      {can('COMPLETED') && <CloseDialog projectId={projectId} gates={gates} />}
      {gates.status === 'COMPLETED' && can('IN_PROGRESS') && (
        <ReasonDialog projectId={projectId} to="IN_PROGRESS" trigger="Reopen" title="Reopen project" description="Why does this project need more work?" />
      )}
      {can('CANCELLED') && (
        <ReasonDialog projectId={projectId} to="CANCELLED" trigger="Cancel project" destructive title="Cancel project"
          description="This can't be undone. Record why, for the monthly review." />
      )}
    </div>
  )
}

function useStatusChange(projectId: string) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState<{ error: string; canOverride: boolean } | null>(null)

  const submit = async (to: ProjectStatus, reason?: string) => {
    setLoading(true)
    const res = await changeProjectStatus(projectId, to, reason)
    setLoading(false)
    if (!res.success) {
      setBlocked({ error: res.error, canOverride: !!res.canOverride })
      return false
    }
    setBlocked(null)
    toast.success('Project status updated')
    router.refresh()
    return true
  }
  return { submit, loading, blocked, setBlocked }
}

function StartDialog({ projectId, gates }: { projectId: string; gates: Gates }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { submit, loading, blocked, setBlocked } = useStatusChange(projectId)
  const ready = gates.onboardingMissing.length === 0 && gates.milestoneCount > 0

  const start = async () => {
    if (await submit('IN_PROGRESS', gates.onboardingMissing.length ? reason : undefined)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setBlocked(null); setReason('') } }}>
      <DialogTrigger asChild>
        <Button size="sm">{ready ? 'Start project' : <><Lock className="h-3.5 w-3.5 mr-1.5" /> Start project</>}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start development</DialogTitle>
          <DialogDescription>
            Gates 3 to 5: signed agreement, advance received and approved scope before anyone builds.
          </DialogDescription>
        </DialogHeader>

        {gates.milestoneCount === 0 && (
          <Blocker>
            Add the payment milestones first.{' '}
            <Link className="underline" href={`/projects/${projectId}/milestones`} onClick={() => setOpen(false)}>Go to milestones</Link>
          </Blocker>
        )}

        {gates.onboardingMissing.length > 0 ? (
          <div className="space-y-3">
            <Blocker>
              {gates.clientName} isn&apos;t fully onboarded. Missing:
              <ul className="list-disc pl-5 mt-1">
                {gates.onboardingMissing.map(m => <li key={m}>{m}</li>)}
              </ul>
              <Link className="underline mt-2 inline-block" href={`/clients/${gates.clientId}/onboard`} onClick={() => setOpen(false)}>
                Complete onboarding
              </Link>
            </Blocker>
            {gates.milestoneCount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="start-exception">Founder exception (logged)</Label>
                <Textarea id="start-exception" rows={2} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Why start now? e.g. Advance confirmed by bank, credit expected tomorrow" />
              </div>
            )}
          </div>
        ) : gates.milestoneCount > 0 && (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Onboarding complete. Ready to start.
          </p>
        )}

        {blocked && <Blocker>{blocked.error}</Blocker>}

        <DialogFooter>
          <Button onClick={start}
            disabled={loading || gates.milestoneCount === 0 || (gates.onboardingMissing.length > 0 && !reason.trim())}
            variant={gates.onboardingMissing.length ? 'destructive' : 'default'}>
            {loading ? 'Starting...' : gates.onboardingMissing.length ? 'Start with exception' : 'Start project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseDialog({ projectId, gates }: { projectId: string; gates: Gates }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const { submit, loading, blocked, setBlocked } = useStatusChange(projectId)
  const openItems = gates.closure.filter(c => !c.done && !c.auto)

  const toggle = async (id: string, done: boolean) => {
    setSaving(id)
    const res = await updateClosureItem(projectId, id as ClosureItemId, done)
    setSaving(null)
    if (!res.success) return toast.error(res.error)
    router.refresh()
  }

  const close = async () => {
    if (await submit('COMPLETED', gates.unpaid.length ? reason : undefined)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setBlocked(null); setReason('') } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Close project</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Closure checklist</DialogTitle>
          <DialogDescription>
            Bible §14.1. &ldquo;Developer finished coding&rdquo; isn&apos;t completion. Every item must be done (Gate 9).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {gates.closure.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox id={`close-${item.id}`} checked={item.done} disabled={item.auto || saving === item.id}
                onCheckedChange={(c) => toggle(item.id, c === true)} />
              <Label htmlFor={`close-${item.id}`} className="font-normal flex-1">{item.label}</Label>
              {item.auto && <span className="text-xs text-muted-foreground">from invoices</span>}
            </div>
          ))}
        </div>

        {gates.unpaid.length > 0 && (
          <div className="space-y-2">
            <Blocker>
              Gate 8: unpaid milestones: {gates.unpaid.join(', ')}. Final handover waits for final payment unless the contract says otherwise.
            </Blocker>
            <Label htmlFor="close-exception">Founder exception (logged)</Label>
            <Textarea id="close-exception" rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Contract allows 30 days after handover; invoice STMS-2026-014 sent" />
          </div>
        )}

        {blocked && <Blocker>{blocked.error}</Blocker>}

        <DialogFooter>
          <Button onClick={close} disabled={loading || openItems.length > 0 || (gates.unpaid.length > 0 && !reason.trim())}>
            {loading ? 'Closing...' : openItems.length ? `${openItems.length} items left` : 'Close project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReasonDialog({ projectId, to, trigger, title, description, destructive }: {
  projectId: string
  to: ProjectStatus
  trigger: string
  title: string
  description: string
  destructive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { submit, loading, blocked, setBlocked } = useStatusChange(projectId)
  const id = `reason-${to}`

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setBlocked(null); setReason('') } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant={destructive ? 'ghost' : 'outline'} className={destructive ? 'text-red-600' : ''}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={id}>Reason</Label>
          <Textarea id={id} rows={3} value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        {blocked && <Blocker>{blocked.error}</Blocker>}
        <DialogFooter>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={loading || !reason.trim()}
            onClick={async () => { if (await submit(to, reason)) setOpen(false) }}>
            {loading ? 'Saving...' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Blocker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
