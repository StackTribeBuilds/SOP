"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveFounderWeeklyReport } from "@/lib/founder-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function WeeklyForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    moneyNotes: "",
    salesNotes: "",
    deliveryNotes: "",
    peopleNotes: "",
    decisions: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
      
      await saveFounderWeeklyReport(userId, startOfWeek, form)
      toast.success("Weekly report saved successfully")
      router.refresh()
    } catch (err) {
      toast.error("Failed to save report")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="moneyNotes">Money Review Notes</Label>
        <Textarea name="moneyNotes" placeholder="Notes on cash, receivables, overdue..." value={form.moneyNotes} onChange={handleChange} />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="salesNotes">Sales Review Notes</Label>
        <Textarea name="salesNotes" placeholder="Notes on leads, pipeline, proposals..." value={form.salesNotes} onChange={handleChange} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryNotes">Delivery Review Notes</Label>
        <Textarea name="deliveryNotes" placeholder="Notes on projects on schedule, at risk..." value={form.deliveryNotes} onChange={handleChange} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="peopleNotes">People Review Notes</Label>
        <Textarea name="peopleNotes" placeholder="Notes on BDE performance, founder workload..." value={form.peopleNotes} onChange={handleChange} />
      </div>

      <div className="pt-4 border-t space-y-2">
        <Label htmlFor="decisions">Decisions & Action Items</Label>
        <Textarea name="decisions" placeholder="What must be decided this week? Assign owner + deadline" value={form.decisions} onChange={handleChange} rows={4} required />
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save Weekly Report"}
      </Button>
    </div>
  )
}
