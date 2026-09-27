"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveFounderDailyReport } from "@/lib/founder-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function DailyFounderForm({ userId, metrics }: { userId: string, metrics: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const data = {
      bankBalance: metrics.bankBalance,
      collectionsToday: parseFloat(formData.get("collectionsToday") as string) || 0,
      overduePayments: formData.get("overduePayments") as string,
      criticalIssues: formData.get("criticalIssues") as string,
      completedYesterday: formData.get("completedYesterday") as string,
      happeningToday: formData.get("happeningToday") as string,
      blockedItems: formData.get("blockedItems") as string,
    }

    try {
      await saveFounderDailyReport(userId, new Date(), data)
      toast.success("Daily report saved successfully")
      router.refresh()
    } catch (err) {
      toast.error("Failed to save report")
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Auto-logged: Bank: ₹{metrics.bankBalance.toLocaleString()} | Overdue: {metrics.overdueInvoicesCount} | Blocked Projects: {metrics.blockedProjectsCount}
      </div>

      <div className="space-y-2">
        <Label>Any Collections Today? (INR)</Label>
        <Input type="number" name="collectionsToday" defaultValue="0" />
      </div>

      <div className="space-y-2">
        <Label>Critical Client Issues or Overdue Action Plan</Label>
        <Textarea name="criticalIssues" placeholder="e.g. Escalate payment for Client X" />
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-4 text-sm text-muted-foreground">Delivery Standup</h4>
      </div>

      <div className="space-y-2">
        <Label>What was completed yesterday?</Label>
        <Textarea name="completedYesterday" required />
      </div>

      <div className="space-y-2">
        <Label>What is happening today?</Label>
        <Textarea name="happeningToday" required />
      </div>

      <div className="space-y-2">
        <Label>What is blocked or at risk?</Label>
        <Textarea name="blockedItems" required />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save Daily Report"}
      </Button>
    </form>
  )
}
