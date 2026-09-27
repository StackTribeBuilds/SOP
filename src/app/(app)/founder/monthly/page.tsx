import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getMonthlyReviewData } from "@/lib/founder-actions"
import { MonthlyRetrospectiveForm } from "./monthly-form"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function MonthlyReviewPage() {
  const session = await getServerSession(authOptions)
  const now = new Date();
  const data = await getMonthlyReviewData(now.getFullYear(), now.getMonth() + 1)

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Review</h1>
        <p className="text-muted-foreground">Review your monthly performance and retrospectives.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.collectedCash.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.expenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.netMargin.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retrospective</CardTitle>
          <CardDescription>Reflect on the past month to improve processes.</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyRetrospectiveForm 
            userId={session?.user?.id as string} 
            year={now.getFullYear()} 
            month={now.getMonth() + 1} 
            initialData={data} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
