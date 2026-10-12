import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { LeadActivityFeed } from './lead-activity-feed';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { LEAD_STAGE_BADGE, LEAD_STAGE_LABEL } from '@/lib/labels';
import { QualificationDialog } from './qualification-dialog';
import { missingQualification } from '@/lib/gates';

export const metadata = { title: 'Lead' };

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

  const missing = missingQualification(lead);

  const activities = await prisma.activity.findMany({
    where: { entityType: 'Lead', entityId: leadId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="mb-3 flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Leads
        </Link>
        <PageHeader
          title={lead.company}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge variant={LEAD_STAGE_BADGE[lead.stage]}>{LEAD_STAGE_LABEL[lead.stage]}</Badge>
              <span>{lead.contactName} · owned by {lead.owner?.name ?? 'nobody'}</span>
            </span>
          }
          actions={<QualificationDialog lead={lead} missing={missing} />}
        />
      </div>

      {missing.length > 0 && !['WON', 'LOST'].includes(lead.stage) && (
        <div className="rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
          Not qualified yet. Add the {missing.join(', ')} before this lead can move to Qualified (Gate 2).
        </div>
      )}
      {lead.stage === 'LOST' && lead.lostReason && (
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          <span className="font-medium">Lost reason:</span> {lead.lostReason}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="font-semibold text-muted-foreground">Contact Name</div>
                <div className="col-span-2">{lead.contactName}</div>
                
                <div className="font-semibold text-muted-foreground">Email</div>
                <div className="col-span-2">{lead.email || '-'}</div>
                
                <div className="font-semibold text-muted-foreground">Phone</div>
                <div className="col-span-2">{lead.phone || '-'}</div>
                
                <div className="font-semibold text-muted-foreground">Decision Maker</div>
                <div className="col-span-2">{lead.decisionMaker || '-'}</div>

                <div className="font-semibold text-muted-foreground">Source</div>
                <div className="col-span-2">{lead.source.replace('_', ' ')}</div>

                <div className="font-semibold text-muted-foreground">Owner</div>
                <div className="col-span-2">{lead.owner?.name || 'Unassigned'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="font-semibold text-muted-foreground">Budget</div>
                <div className="col-span-2 text-lg font-bold text-foreground">
                  {lead.estimatedBudget ? `₹${lead.estimatedBudget.toLocaleString()}` : 'TBD'}
                </div>
                
                <div className="font-semibold text-muted-foreground">Timeline</div>
                <div className="col-span-2">{lead.timeline || '-'}</div>
                
                <div className="font-semibold text-muted-foreground">Next Action</div>
                <div className="col-span-2">{lead.nextAction}</div>
                
                <div className="font-semibold text-muted-foreground">Next Date</div>
                <div className="col-span-2">
                  {lead.nextActionDate ? format(new Date(lead.nextActionDate), 'PPP') : '-'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{lead.requirement || 'No requirements specified.'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <LeadActivityFeed leadId={leadId} initialActivities={activities} />
        </div>
      </div>
    </div>
  );
}
