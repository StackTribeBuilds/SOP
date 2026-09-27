import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getBdeMetrics } from '@/lib/crm-actions'
import { BdeReportForm } from './report-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, Target } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BdeDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/login')
  }

  // Check if user is BDE or Founder
  const role = (session.user as any).role
  if (role !== 'BUSINESS_ANALYST' && role !== 'FOUNDER' && role !== 'ADMIN') {
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

  const { meetingsBooked, prospectsContacted, qualified } = (result.data || {}) as any

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">BDE Dashboard</h2>
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
            <CardTitle className="text-sm font-medium">Prospects Contacted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prospectsContacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualified}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <BdeReportForm userId={session.user.id} />
      </div>
    </div>
  )
}
