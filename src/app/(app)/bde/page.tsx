import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getBdeMetrics } from '@/lib/crm-actions'
import { BdeReportForm } from './report-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar, Users, Target, AlertTriangle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function BdeDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/login')
  }

  const role = (session.user as any).role
  if (role !== 'BDE' && role !== 'BUSINESS_ANALYST' && role !== 'FOUNDER' && role !== 'ADMIN') {
    return (
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-red-500">Unauthorized</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  const result = await getBdeMetrics(session.user.id)
  
  if (!result.success) {
    return <div className="p-8">Error loading metrics: {result.error}</div>
  }

  const { meetingsBooked, prospectsContacted, qualified, actionPlan } = (result.data || {}) as any

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings Booked (This Week)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingsBooked}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects Contacted (This Week)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prospectsContacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads (This Week)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualified}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-red-200">
          <CardHeader className="bg-red-50/50 pb-4">
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Attention Required
            </CardTitle>
            <CardDescription>Leads missing information or updates</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium flex items-center text-amber-700 mb-2">
                <XCircle className="w-4 h-4 mr-1" /> Missing Next Action
              </h4>
              {actionPlan?.missingAction?.length === 0 ? (
                <p className="text-sm text-muted-foreground">All leads have next actions!</p>
              ) : (
                <div className="space-y-2">
                  {actionPlan?.missingAction?.map((lead: any) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-sm p-2 bg-slate-50 rounded-md hover:bg-slate-100 border">
                      <span className="font-semibold">{lead.company}</span> - Needs next step
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium flex items-center text-slate-700 mb-2">
                <Clock className="w-4 h-4 mr-1" /> Stalled Leads (No Activity &gt; 7 Days)
              </h4>
              {actionPlan?.stalled?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stalled leads!</p>
              ) : (
                <div className="space-y-2">
                  {actionPlan?.stalled?.map((lead: any) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-sm p-2 bg-slate-50 rounded-md hover:bg-slate-100 border">
                      <span className="font-semibold">{lead.company}</span> - Stalled
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50/50 pb-4">
            <CardTitle className="flex items-center text-amber-700">
              <Clock className="w-5 h-5 mr-2" />
              Overdue Actions
            </CardTitle>
            <CardDescription>Follow-ups that missed their scheduled date</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {actionPlan?.overdue?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">You're all caught up!</p>
            ) : (
              <div className="space-y-2">
                {actionPlan?.overdue?.map((lead: any) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex flex-col text-sm p-3 bg-white rounded-md hover:bg-slate-50 border border-amber-100 shadow-sm">
                    <span className="font-semibold text-slate-900">{lead.company}</span>
                    <span className="text-amber-700 mt-1">{lead.nextAction}</span>
                    <span className="text-xs text-muted-foreground mt-1 text-red-500 font-medium">
                      Due: {new Date(lead.nextActionDate).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 pt-6 border-t">
        <h3 className="text-xl font-semibold mb-4">Log Daily Activity</h3>
        <BdeReportForm userId={session.user.id} />
      </div>
    </div>
  )
}