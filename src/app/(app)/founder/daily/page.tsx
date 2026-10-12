import { getDailyFounderMetrics } from "@/lib/founder-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SalesBlockTimer } from "./sales-block-timer"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DailyFounderForm } from "./daily-form"

export const metadata = { title: 'Daily review' };

export default async function DailyFounderPage() {
  const session = await getServerSession(authOptions)
  const metrics = await getDailyFounderMetrics()

  const checklistItems = [
    { id: "bank", label: `Check bank balance (Current: ₹${metrics.bankBalance.toLocaleString()})`, completed: true },
    { id: "overdue", label: `Follow up on overdue invoices (${metrics.overdueInvoicesCount} overdue, ₹${metrics.totalOverdueAmount.toLocaleString()})`, completed: metrics.overdueInvoicesCount === 0 },
    { id: "sales", label: `Review leads in negotiation (${metrics.negotiationLeadsCount} active)`, completed: metrics.negotiationLeadsCount === 0 },
    { id: "risk", label: `Check blocked projects (${metrics.blockedProjectsCount} blocked)`, completed: metrics.blockedProjectsCount === 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Daily review</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Checklist</CardTitle>
            <CardDescription>Tasks to complete every day based on live data</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyFounderForm 
              userId={session?.user?.id as string} 
              metrics={metrics} 
            />
          </CardContent>
        </Card>

        <SalesBlockTimer />
      </div>
    </div>
  )
}
