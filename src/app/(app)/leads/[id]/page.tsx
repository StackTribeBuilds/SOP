import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const leadId = resolvedParams.id;
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: { select: { name: true, email: true } }
    }
  });

  if (!lead) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{lead.company}</h2>
            <Badge variant={lead.stage === 'WON' ? 'default' : lead.stage === 'LOST' ? 'destructive' : 'secondary'} className="text-sm">
              {lead.stage.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Lead Details & History</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/leads">
            <Button variant="outline">Back to Leads</Button>
          </Link>
          {/* We can add an Edit button here later */}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-semibold">Contact Name</div>
              <div className="col-span-2">{lead.contactName}</div>
              
              <div className="font-semibold">Email</div>
              <div className="col-span-2">{lead.email || '-'}</div>
              
              <div className="font-semibold">Phone</div>
              <div className="col-span-2">{lead.phone || '-'}</div>
              
              <div className="font-semibold">Decision Maker</div>
              <div className="col-span-2">{lead.decisionMaker || '-'}</div>

              <div className="font-semibold">Source</div>
              <div className="col-span-2">{lead.source.replace('_', ' ')}</div>

              <div className="font-semibold">Owner</div>
              <div className="col-span-2">{lead.owner?.name || 'Unassigned'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-semibold">Budget</div>
              <div className="col-span-2 text-lg font-bold">
                {lead.estimatedBudget ? `₹${lead.estimatedBudget.toLocaleString()}` : 'TBD'}
              </div>
              
              <div className="font-semibold">Timeline</div>
              <div className="col-span-2">{lead.timeline || '-'}</div>
              
              <div className="font-semibold">Next Action</div>
              <div className="col-span-2">{lead.nextAction}</div>
              
              <div className="font-semibold">Next Date</div>
              <div className="col-span-2">
                {lead.nextActionDate ? format(new Date(lead.nextActionDate), 'PPP') : '-'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requirement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{lead.requirement || 'No requirements specified.'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-muted-foreground">{lead.notes || 'No notes added yet.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
