"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveFounderMonthlyReport } from "@/lib/founder-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function MonthlyRetrospectiveForm({ userId, year, month, initialData }: { userId: string, year: number, month: number, initialData: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      revenue: parseFloat(formData.get("revenue") as string) || 0,
      collections: parseFloat(formData.get("collections") as string) || 0,
      grossMargin: parseFloat(formData.get("grossMargin") as string) || 0,
      netProfit: parseFloat(formData.get("netProfit") as string) || 0,
      retrospective: formData.get("retrospective") as string,
    }

    try {
      await saveFounderMonthlyReport(userId, year, month, data)
      toast.success("Monthly report saved successfully")
      router.refresh()
    } catch (err) {
      toast.error("Failed to save report")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="revenue">Confirmed Revenue Logged (INR)</Label>
          <Input id="revenue" name="revenue" type="number" defaultValue={initialData?.revenue} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collections">Total Collections (INR)</Label>
          <Input id="collections" name="collections" type="number" defaultValue={initialData?.collectedCash} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grossMargin">Gross Margin %</Label>
          <Input id="grossMargin" name="grossMargin" type="number" step="0.1" defaultValue={initialData?.grossMargin || 0} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="netProfit">Net Profit (INR)</Label>
          <Input id="netProfit" name="netProfit" type="number" defaultValue={initialData?.netProfit || 0} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="retrospective">What happened this month that we never want to happen again?</Label>
        <Textarea 
          id="retrospective" 
          name="retrospective"
          placeholder="Describe the issue, process failure, and how it can be prevented..." 
          className="min-h-[100px]" 
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save Monthly Report"}
      </Button>
    </form>
  )
}
