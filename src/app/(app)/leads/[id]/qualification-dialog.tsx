'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateLeadQualification } from '@/lib/crm-actions'
import { ClipboardCheck } from 'lucide-react'

type Lead = {
  id: string
  estimatedBudget: number | null
  timeline: string | null
  decisionMaker: string | null
  businessDescription: string | null
  problemToSolve: string | null
  whoWillUse: string | null
  whyBuilding: string | null
  projectType: string | null
  existingSystem: boolean | null
  integrationsNeeded: string | null
  budgetConfirmed: boolean
  paymentStructure: string | null
  otherApprovers: string | null
}

export function QualificationDialog({ lead, missing }: { lead: Lead; missing: string[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [budgetConfirmed, setBudgetConfirmed] = useState(lead.budgetConfirmed)
  const [existingSystem, setExistingSystem] = useState(!!lead.existingSystem)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const text = (k: string) => (form.get(k) as string) || ''
    const res = await updateLeadQualification(lead.id, {
      estimatedBudget: parseFloat(text('estimatedBudget')) || null,
      timeline: text('timeline'),
      decisionMaker: text('decisionMaker'),
      businessDescription: text('businessDescription'),
      problemToSolve: text('problemToSolve'),
      whoWillUse: text('whoWillUse'),
      whyBuilding: text('whyBuilding'),
      projectType: text('projectType'),
      existingSystem,
      integrationsNeeded: text('integrationsNeeded'),
      budgetConfirmed,
      paymentStructure: text('paymentStructure'),
      otherApprovers: text('otherApprovers'),
    })
    setLoading(false)
    if (!res.success) return toast.error(res.error)
    toast.success('Qualification saved')
    setOpen(false)
    router.refresh()
  }

  const field = (id: keyof Lead, label: string, opts: { placeholder?: string; type?: string; area?: boolean } = {}) => {
    const value = lead[id]
    const defaultValue = typeof value === 'string' || typeof value === 'number' ? value : ''
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`q-${id}`}>{label}</Label>
        {opts.area
          ? <Textarea id={`q-${id}`} name={id} rows={2} defaultValue={defaultValue} placeholder={opts.placeholder} />
          : <Input id={`q-${id}`} name={id} type={opts.type ?? 'text'} defaultValue={defaultValue} placeholder={opts.placeholder} />}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={missing.length ? 'default' : 'outline'}>
          <ClipboardCheck className="h-4 w-4 mr-2" /> {missing.length ? 'Qualify lead' : 'Edit qualification'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead qualification</DialogTitle>
          <DialogDescription>
            Bible §4.1. Budget, timeline and decision maker are required before this lead can move to Qualified (Gate 2).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Gate 2 essentials</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {field('estimatedBudget', 'Budget (₹)', { type: 'number', placeholder: '150000' })}
              {field('timeline', 'Timeline', { placeholder: 'e.g. 2 months' })}
              {field('decisionMaker', 'Decision maker', { placeholder: 'Name and role' })}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="q-budgetConfirmed" checked={budgetConfirmed} onCheckedChange={(c) => setBudgetConfirmed(c === true)} />
              <Label htmlFor="q-budgetConfirmed" className="font-normal">The client confirmed this budget</Label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Business</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('businessDescription', 'What does the company do?', { area: true })}
              {field('problemToSolve', 'What problem are they solving?', { area: true })}
              {field('whoWillUse', 'Who will use the software?')}
              {field('whyBuilding', 'Why are they building it now?')}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Project</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('projectType', 'Web, mobile or software?')}
              {field('integrationsNeeded', 'Integrations needed')}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="q-existingSystem" checked={existingSystem} onCheckedChange={(c) => setExistingSystem(c === true)} />
              <Label htmlFor="q-existingSystem" className="font-normal">They have an existing system</Label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Commercial and authority</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('paymentStructure', 'How will payment be handled?')}
              {field('otherApprovers', 'Who else approves the project?', { placeholder: 'Ask: "Apart from you, is anyone else involved?"' })}
            </div>
          </section>

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save qualification'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
