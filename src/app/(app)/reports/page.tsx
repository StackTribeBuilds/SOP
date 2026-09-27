import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getGlobalKPIs } from "@/lib/founder-actions"
import { Activity, DollarSign, Target, TrendingUp } from "lucide-react"

export default async function GlobalKPIDashboardPage() {
  const kpis = await getGlobalKPIs()

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive KPI Dashboard</h1>
        <p className="text-muted-foreground">High-level overview of agency performance metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Agency Health Score */}
        <Card className="lg:col-span-4 bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Agency Health Score</CardTitle>
            <CardDescription className="text-primary-foreground/80">Composite score based on all key metrics</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-6">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-primary-foreground/20 bg-background/10">
              <span className="text-5xl font-bold">{kpis.agencyHealthScore}</span>
              <span className="absolute bottom-6 text-sm opacity-80">/ 100</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPIs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Financial KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Receivables</p>
                <p className="text-sm text-muted-foreground">Outstanding payments</p>
              </div>
              <div className="font-bold">${kpis.financial.totalReceivables.toLocaleString()}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Profit Margin</p>
                <p className="text-sm text-muted-foreground">Average margin</p>
              </div>
              <div className="font-bold">{kpis.financial.margin}%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Cash Flow Health</p>
                <p className="text-sm text-muted-foreground">Current status</p>
              </div>
              <div className="font-bold text-green-500">{kpis.financial.cashFlowHealth}</div>
            </div>
          </CardContent>
        </Card>

        {/* Sales KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Sales KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Win Rate</span>
              <span className="font-bold">{kpis.sales.winRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg Deal Size</span>
              <span className="font-bold">${kpis.sales.averageDealSize.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pipeline Value</span>
              <span className="font-bold">${kpis.sales.pipelineValue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery KPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Delivery KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Projects On Track</p>
              </div>
              <div className="font-bold text-green-500">{kpis.delivery.projectsOnTrack}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Projects At Risk</p>
              </div>
              <div className="font-bold text-destructive">{kpis.delivery.projectsAtRisk}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
