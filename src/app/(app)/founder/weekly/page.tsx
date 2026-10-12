import { getWeeklyMeetingData } from "@/lib/founder-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { WeeklyForm } from "./weekly-form"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const metadata = { title: 'Weekly meeting' };

export default async function WeeklyFounderPage() {
  const session = await getServerSession(authOptions)
  const data = await getWeeklyMeetingData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Weekly meeting</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agenda & Metrics</CardTitle>
            <CardDescription>Pre-populated meeting data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Money</h3>
              <p className="text-sm text-muted-foreground">Expected Cash This Week: ₹{data.expectedCashThisWeek.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Expected Cash Next Week: ₹{data.expectedCashNextWeek.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Sales</h3>
              <p className="text-sm text-muted-foreground">New Leads This Week: {data.newLeadsThisWeek}</p>
              <p className="text-sm text-muted-foreground">Deals Won This Week: {data.dealsWonThisWeek}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Delivery</h3>
              <p className="text-sm text-muted-foreground">Projects At Risk: {data.projectsAtRisk}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Notes</CardTitle>
            <CardDescription>Log decisions and action items</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyForm userId={session?.user?.id as string} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
