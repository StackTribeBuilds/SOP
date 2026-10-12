'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setCommissionRate } from '@/lib/founder-actions'

export function CommissionRateForm({ current }: { current: number | null }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const value = parseFloat(new FormData(e.currentTarget).get('rate') as string)
    const res = await setCommissionRate(value)
    setLoading(false)
    if (!res.success) return toast.error(res.error)
    toast.success(`Commission rate set to ${value}% of collected cash`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="commission-rate" className="text-xs">Commission (% of collected)</Label>
        <Input id="commission-rate" name="rate" type="number" step="0.5" min="0" max="50" required
          defaultValue={current ?? ''} placeholder="e.g. 5" className="w-28 h-9" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={loading}>{loading ? 'Saving...' : 'Save rate'}</Button>
    </form>
  )
}
