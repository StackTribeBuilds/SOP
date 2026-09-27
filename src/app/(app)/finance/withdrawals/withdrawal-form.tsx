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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logWithdrawal } from '@/lib/actions'
import { Plus } from 'lucide-react'

interface Founder {
  id: string
  name: string
  role: string
}

export function WithdrawalForm({ founders }: { founders: Founder[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await logWithdrawal({
      amount: parseFloat(form.get('amount') as string),
      userId: form.get('userId') as string,
      date: form.get('date') as string,
      type: form.get('type') as string,
      notes: form.get('notes') as string || undefined,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Log Withdrawal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Founder Withdrawal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Founder</Label>
            <Select name="userId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select founder" />
              </SelectTrigger>
              <SelectContent>
                {founders.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select name="type" required defaultValue="SALARY">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                <SelectItem value="ADVANCE">Advance</SelectItem>
                <SelectItem value="BONUS">Bonus</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Log Withdrawal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
