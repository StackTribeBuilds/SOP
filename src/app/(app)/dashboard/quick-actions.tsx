'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Banknote,
  Plus,
  Wallet,
  ArrowDownUp,
} from 'lucide-react'

export function DashboardQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <UpdateBalanceDialog />
        <Button variant="outline" className="w-full justify-start gap-2" asChild>
          <a href="/finance/receivables">
            <Plus className="h-4 w-4" />
            Add Invoice
          </a>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" asChild>
          <a href="/finance/expenses">
            <Wallet className="h-4 w-4" />
            Log Expense
          </a>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" asChild>
          <a href="/finance/withdrawals">
            <ArrowDownUp className="h-4 w-4" />
            Log Withdrawal
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function UpdateBalanceDialog() {
  const [open, setOpen] = useState(false)
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
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Banknote className="h-4 w-4" />
          Update Bank Balance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Bank Balance</DialogTitle>
          <DialogDescription>
            Enter the current balance in your bank account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance (₹)</Label>
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
              {loading ? 'Saving...' : 'Update Balance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
