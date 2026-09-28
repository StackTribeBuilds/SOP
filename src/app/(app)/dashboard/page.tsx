import { getDashboardData } from '@/lib/actions'
import { formatCurrency, getCashZone } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CashZoneIndicator } from '@/components/layout/cash-zone-indicator'
import { DashboardQuickActions } from './quick-actions'
import Link from 'next/link'
import {
  Banknote,
  TrendingDown,
  AlertTriangle,
  Clock,
  IndianRupee,
  FolderKanban,
  Users,
  Target,
  Bell,
  ArrowRight
} from 'lucide-react'

export default async function DashboardPage() {
  const data = await getDashboardData()
  const zone = getCashZone(data.currentCash, data.minimumFloor)
  
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Action Plan logic
  const urgentLeads = data.activeLeads?.filter((l: any) => l.nextActionDate && new Date(l.nextActionDate) <= now) || []
  const upcomingMilestones = data.pendingMilestones?.filter((m: any) => m.dueDate && new Date(m.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">StackTribe Operations & Financial Overview</p>
        </div>
        <CashZoneIndicator
          currentCash={data.currentCash}
          minimumFloor={data.minimumFloor}
        />
      </div>

      {/* Zone Alert */}
      {zone === 'RED' && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">🔴 RED ZONE — Cash Below Minimum Floor</p>
            <p className="text-sm text-red-700 mt-1">
              Freeze discretionary spending. Stop founder withdrawals. Aggressive collections mode.
              Minimum floor: {formatCurrency(data.minimumFloor)}
            </p>
          </div>
        </div>
      )}

      {/* Operations & Pipeline Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeProjects?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        {/* Active Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeLeads?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
          </CardContent>
        </Card>
        
        {/* Cash in Bank */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash in Bank</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.currentCash)}</div>
            <p className="text-xs text-muted-foreground mt-1">Floor: {formatCurrency(data.minimumFloor)}</p>
          </CardContent>
        </Card>

        {/* Total Receivable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
            <IndianRupee className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalReceivable)}</div>
            <p className="text-xs text-muted-foreground mt-1">Expected: {formatCurrency(data.expectedCash)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Action Plan for Today */}
        <Card className="lg:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Action Plan for Today</CardTitle>
            </div>
            <CardDescription>Your immediate priorities across leads and projects</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {urgentLeads.length > 0 ? (
                urgentLeads.map((lead: any) => (
                  <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">LEAD</Badge>
                        {lead.company}
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">Action: {lead.nextAction}</span>
                    </div>
                    <Link href={`/leads/${lead.id}`}>
                      <Button size="sm" variant="ghost">View <ArrowRight className="h-4 w-4 ml-1"/></Button>
                    </Link>
                  </div>
                ))
              ) : null}

              {upcomingMilestones.length > 0 ? (
                upcomingMilestones.map((ms: any) => (
                  <div key={ms.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">PROJECT</Badge>
                        {ms.project?.name || 'Milestone Due'}
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">{ms.title} (Due: {new Date(ms.dueDate).toLocaleDateString()})</span>
                    </div>
                    <Link href={`/projects/${ms.projectId}/milestones`}>
                      <Button size="sm" variant="ghost">View <ArrowRight className="h-4 w-4 ml-1"/></Button>
                    </Link>
                  </div>
                ))
              ) : null}

              {urgentLeads.length === 0 && upcomingMilestones.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No immediate actions required today. You're all caught up! 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <DashboardQuickActions />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Receivables Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-muted-foreground"/> Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {data.unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No outstanding invoices.</p>
            ) : (
              <div className="space-y-4">
                {data.unpaidInvoices.map((invoice) => {
                  const isOverdue = new Date(invoice.dueDate) < new Date()
                  return (
                    <div key={invoice.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{invoice.client.company}</p>
                        <p className="text-xs text-muted-foreground">{invoice.invoiceNumber} • {new Date(invoice.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(invoice.amount - invoice.paidAmount)}</p>
                        <Badge variant={isOverdue ? 'danger' : 'secondary'} className="mt-1 text-[10px]">
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities (Leads & Payments) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-muted-foreground"/> Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentLeads?.slice(0, 3).map((lead: any) => (
                <div key={lead.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New Lead Added: {lead.company}</p>
                    <p className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              
              {data.recentPayments?.slice(0, 3).map((payment: any) => (
                <div key={payment.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 rounded-full bg-green-100 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                    <Banknote className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Received</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(payment.amount)} — {payment.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
