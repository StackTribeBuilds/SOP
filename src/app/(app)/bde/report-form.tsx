'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logBdeActivity, type BdeCounts } from '@/lib/crm-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export function BdeReportForm({ crmToday }: { crmToday: BdeCounts }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const data = {
      newProspects: parseInt(formData.get('newProspects') as string) || 0,
      contacted: parseInt(formData.get('contacted') as string) || 0,
      replies: parseInt(formData.get('replies') as string) || 0,
      qualified: parseInt(formData.get('qualified') as string) || 0,
      meetingsBooked: parseInt(formData.get('meetingsBooked') as string) || 0,
      followUps: parseInt(formData.get('followUps') as string) || 0,
      proposalsRequested: parseInt(formData.get('proposalsRequested') as string) || 0,
      problems: formData.get('problems') as string,
      tomorrowPriorities: formData.get('tomorrowPriorities') as string,
    }

    const res = await logBdeActivity(data)

    setLoading(false)

    if (res.success) {
      toast.success('Daily report saved')
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to save report')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily BDE Report</CardTitle>
        <CardDescription>
          Numbers are filled in from what you did in the CRM today (§18.2). Adjust them if you did work outside the CRM, such as calls you didn&apos;t log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newProspects">New Prospects Discovered</Label>
              <Input type="number" id="newProspects" name="newProspects" min="0" defaultValue={crmToday.newProspects} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contacted">Prospects Contacted</Label>
              <Input type="number" id="contacted" name="contacted" min="0" defaultValue={crmToday.contacted} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="replies">Replies Received</Label>
              <Input type="number" id="replies" name="replies" min="0" defaultValue={crmToday.replies} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="qualified">Qualified Leads</Label>
              <Input type="number" id="qualified" name="qualified" min="0" defaultValue={crmToday.qualified} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meetingsBooked">Meetings Booked</Label>
              <Input type="number" id="meetingsBooked" name="meetingsBooked" min="0" defaultValue={crmToday.meetingsBooked} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="followUps">Follow-ups Completed</Label>
              <Input type="number" id="followUps" name="followUps" min="0" defaultValue={crmToday.followUps} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proposalsRequested">Proposals Requested</Label>
              <Input type="number" id="proposalsRequested" name="proposalsRequested" min="0" defaultValue={crmToday.proposalsRequested} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="problems">Challenges or Roadblocks</Label>
            <Textarea id="problems" name="problems" placeholder="Any issues blocking your progress?" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tomorrowPriorities">Tomorrow's Priorities</Label>
            <Textarea id="tomorrowPriorities" name="tomorrowPriorities" placeholder="What will you focus on tomorrow?" />
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Submit Daily Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
