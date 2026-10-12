'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/actions'
import { Plus } from 'lucide-react'

export function NewClientDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const value = (k: string) => ((form.get(k) as string) || '').trim() || undefined
    try {
      const client = await createClient({
        company: value('company')!,
        primaryContactName: value('primaryContactName')!,
        primaryContactPhone: value('primaryContactPhone'),
        primaryContactEmail: value('primaryContactEmail'),
        decisionMakerName: value('decisionMakerName'),
        gstin: value('gstin'),
      })
      toast.success(`${client.company} added. Complete onboarding next.`)
      setOpen(false)
      router.push(`/clients/${client.id}/onboard`)
    } catch {
      toast.error('Could not add the client. Check the details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> New client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Won leads become clients automatically. Use this for clients that didn&apos;t come through the CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nc-company">Company</Label>
            <Input id="nc-company" name="company" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nc-contact">Primary contact</Label>
              <Input id="nc-contact" name="primaryContactName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-dm">Decision maker</Label>
              <Input id="nc-dm" name="decisionMakerName" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nc-phone">Phone</Label>
              <Input id="nc-phone" name="primaryContactPhone" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-email">Email</Label>
              <Input id="nc-email" name="primaryContactEmail" type="email" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-gstin">GSTIN (optional)</Label>
            <Input id="nc-gstin" name="gstin" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add client'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
