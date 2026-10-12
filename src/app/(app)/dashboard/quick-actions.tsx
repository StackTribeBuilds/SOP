'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { updateBankBalance } from '@/lib/actions'
import { Banknote } from 'lucide-react'

export function UpdateBalanceDialog({ open: openProp, onOpenChange, hideTrigger, compact }: { open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean; compact?: boolean } = {}) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v) }
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await updateBankBalance(parseFloat(amount), notes || undefined)
    setLoading(false)
    setOpen(false)
    setAmount('')
    setNotes('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {compact ? (
            <Button variant="outline" size="sm">Update</Button>
          ) : (
            <Button variant="outline" className="w-full justify-start gap-2">
              <Banknote className="h-4 w-4" />
              Update bank balance
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update bank balance</DialogTitle>
          <DialogDescription>
            Enter today&apos;s balance from the bank app. The cash zone and forecast start from this number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Balance today (₹)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Updated from bank app"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save balance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
