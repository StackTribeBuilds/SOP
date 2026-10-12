import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCommissionReport, getGlobalKPIs } from "@/lib/founder-actions"
import { formatCurrency } from "@/lib/utils"
import { IndianRupee, Target, TrendingUp, Users } from "lucide-react"
import { CommissionRateForm } from "./commission-rate-form"

export const metadata = { title: 'KPIs' };

const ZONE_BADGE = { GREEN: "success", YELLOW: "warning", RED: "danger" } as const

function Row({ label, hint, value, tone }: { label: string; hint?: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={`font-bold tabular-nums text-right ${tone ?? ""}`}>{value}</div>
    </div>
  )
}

export default async function GlobalKPIDashboardPage() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [kpis, thisMonthCommission, lastMonthCommission] = await Promise.all([
    getGlobalKPIs(),
    getCommissionReport(now.getFullYear(), now.getMonth()),
    getCommissionReport(lastMonth.getFullYear(), lastMonth.getMonth()),
  ])

  const monthName = (d: Date) => d.toLocaleDateString("en-IN", { month: "long" })
  const owners = new Map<string, { name: string; role: string; thisMonth: number; lastMonth: number }>()
  for (const r of thisMonthCommission.rows) owners.set(r.ownerId, { name: r.ownerName, role: r.role, thisMonth: r.collected, lastMonth: 0 })
  for (const r of lastMonthCommission.rows) {
    const row = owners.get(r.ownerId) ?? { name: r.ownerName, role: r.role, thisMonth: 0, lastMonth: 0 }
    row.lastMonth = r.collected
    owners.set(r.ownerId, row)
  }
  const rate = thisMonthCommission.ratePercent
  const commission = (amount: number) => (rate != null ? formatCurrency((amount * rate) / 100) : "—")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">KPIs</h1>
        <p className="text-muted-foreground">Bible §23. Every figure uses the same rules as the P&amp;L, Receivables and Sales pages.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Agency Health Score, explained part by part */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Agency Health Score</CardTitle>
            <CardDescription>Four equal parts (§23.4). Each line shows where the points came from.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
            <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 border-primary/20 mx-auto">
              <span className="text-5xl font-bold tabular-nums">{kpis.agencyHealthScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.healthParts.map(p => (
                <div key={p.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.label}</span>
                    <span className="tabular-nums text-muted-foreground">{p.points} / {p.max}</span>
                  </div>
                  <Progress value={(p.points / p.max) * 100} />
                  <p className="text-xs text-muted-foreground">{p.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial KPIs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              Financial KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Row label="Cash in bank" hint={`Minimum floor ${formatCurrency(kpis.financial.minimumFloor)}`}
              value={<span className="inline-flex items-center gap-2">{formatCurrency(kpis.financial.bankBalance)}<Badge variant={ZONE_BADGE[kpis.financial.cashZone]}>{kpis.financial.cashZone}</Badge></span>} />
            <Row label="Receivables" hint="Sent invoices still owed" value={formatCurrency(kpis.financial.totalReceivables)} />
            <Row label="Overdue" hint="Past due date" value={formatCurrency(kpis.financial.totalOverdue)}
              tone={kpis.financial.totalOverdue > 0 ? "text-red-600" : ""} />
            <Row label="Net margin" hint={`Last 3 full months, on ${formatCurrency(kpis.financial.revenue3m)} revenue`}
              value={kpis.financial.netMargin == null ? "No revenue yet" : `${kpis.financial.netMargin.toFixed(1)}%`}
              tone={kpis.financial.netMargin != null && kpis.financial.netMargin < 0 ? "text-red-600" : ""} />
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
            <Row label="Win rate" hint={`${kpis.sales.wonCount} won, ${kpis.sales.lostCount} lost`} value={`${kpis.sales.winRate}%`} />
            <Row label="Avg deal size" hint="Won deals" value={formatCurrency(kpis.sales.averageDealSize)} />
            <Row label="Pipeline" hint="Qualified open deals" value={formatCurrency(kpis.sales.pipelineValue)} />
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
            <Row label="Active projects" value={kpis.delivery.activeProjects} />
            <Row label="On track" value={kpis.delivery.projectsOnTrack} tone="text-green-600" />
            <Row label="At risk, delayed or blocked" value={kpis.delivery.projectsAtRisk}
              tone={kpis.delivery.projectsAtRisk > 0 ? "text-red-600" : ""} />
          </CardContent>
        </Card>

        {/* BDE commission on collected cash */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Commission on collected cash
              </CardTitle>
              <CardDescription>
                Bible §18.4: commission follows money received, not contracts signed. Payments are credited to the owner of the won lead behind each client.
              </CardDescription>
            </div>
            <CommissionRateForm current={rate} />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead owner</TableHead>
                  <TableHead className="text-right">Collected in {monthName(lastMonth)}</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Collected in {monthName(now)} so far</TableHead>
                  <TableHead className="text-right">Commission so far</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...owners.entries()].map(([ownerId, o]) => (
                  <TableRow key={ownerId}>
                    <TableCell className="font-medium">{o.name} <span className="text-xs text-muted-foreground">{o.role}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(o.lastMonth)}</TableCell>
                    <TableCell className="text-right tabular-nums">{commission(o.lastMonth)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(o.thisMonth)}</TableCell>
                    <TableCell className="text-right tabular-nums">{commission(o.thisMonth)}</TableCell>
                  </TableRow>
                ))}
                {owners.size === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-20">
                      No payments from CRM-sourced clients in {monthName(lastMonth)} or {monthName(now)}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {(thisMonthCommission.unattributed > 0 || lastMonthCommission.unattributed > 0) && (
              <p className="text-xs text-muted-foreground mt-3">
                Not linked to a lead (no commission): {formatCurrency(lastMonthCommission.unattributed)} in {monthName(lastMonth)},{" "}
                {formatCurrency(thisMonthCommission.unattributed)} in {monthName(now)}.
              </p>
            )}
            {rate == null && <p className="text-xs text-muted-foreground mt-1">Set a commission rate to calculate payouts.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
