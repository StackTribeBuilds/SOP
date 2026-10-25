import Link from 'next/link';
import { startOfDay } from 'date-fns';
import type { LeadStage } from '@prisma/client';
import { getLeads } from '@/lib/crm-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header';
import { LEAD_SEGMENT_LABEL, LEAD_STAGE_BADGE, LEAD_STAGE_LABEL, shortDate } from '@/lib/labels';
import { PIPELINE_STAGES, STAGE_PROBABILITY } from '@/lib/kpis';
import { cn, formatCurrency } from '@/lib/utils';
import { Columns3 } from 'lucide-react';
import { LeadForm } from './lead-form';

export const metadata = { title: 'Leads' };

const VIEWS = [
  { key: 'open', label: 'Open', stages: ['NEW', 'CONTACTED', 'CONNECTED', 'QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION'] },
  { key: 'late', label: 'Follow-up late', stages: null },
  { key: 'pipeline', label: 'Qualified pipeline', stages: PIPELINE_STAGES },
  { key: 'won', label: 'Won', stages: ['WON'] },
  { key: 'lost', label: 'Lost', stages: ['LOST'] },
  { key: 'all', label: 'All', stages: null },
] as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'open' } = await searchParams;
  const result = await getLeads();
  const leads = result.success && result.data ? result.data : [];
  const today = startOfDay(new Date());

  const isOpen = (l: (typeof leads)[number]) => l.stage !== 'WON' && l.stage !== 'LOST';
  const isLate = (l: (typeof leads)[number]) => isOpen(l) && !!l.nextActionDate && new Date(l.nextActionDate) < today;

  const filtered = leads.filter(l => {
    if (view === 'late') return isLate(l);
    const v = VIEWS.find(x => x.key === view);
    if (!v || !v.stages) return true;
    return (v.stages as readonly LeadStage[]).includes(l.stage);
  });
  const countFor = (key: string) => key === 'late' ? leads.filter(isLate).length
    : key === 'all' ? leads.length
    : leads.filter(l => (VIEWS.find(v => v.key === key)!.stages as readonly LeadStage[] | null)?.includes(l.stage)).length;

  const open = leads.filter(isOpen);
  const pipeline = leads.filter(l => (PIPELINE_STAGES as LeadStage[]).includes(l.stage));
  const late = leads.filter(isLate);
  const unqualified = open.filter(l => !(PIPELINE_STAGES as LeadStage[]).includes(l.stage));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Every lead needs an owner, a next action and a date (§3.2). Late follow-ups are shown in red."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/leads/kanban"><Columns3 className="h-4 w-4" /> Board</Link>
            </Button>
            <LeadForm />
          </>
        }
      />

      <StatStrip>
        <Stat label="Open leads" value={open.length} hint={`${unqualified.length} not qualified yet`} />
        <Stat label="Follow-ups late" value={late.length} tone={late.length ? 'bad' : undefined} hint="Next action date passed" />
        <Stat label="Qualified pipeline" value={formatCurrency(pipeline.reduce((s, l) => s + (l.estimatedBudget ?? 0), 0))}
          hint={`${formatCurrency(pipeline.reduce((s, l) => s + (l.estimatedBudget ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0), 0))} weighted`} />
        <Stat label="Won" value={leads.filter(l => l.stage === 'WON').length} hint={`${leads.filter(l => l.stage === 'LOST').length} lost`} />
      </StatStrip>

      <div className="surface overflow-hidden">
        <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2" aria-label="Lead views">
          {VIEWS.map(v => (
            <Link
              key={v.key}
              href={v.key === 'open' ? '/leads' : `/leads?view=${v.key}`}
              aria-current={view === v.key ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] transition-colors',
                view === v.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {v.label} <span className="figure ml-0.5 opacity-70">{countFor(v.key)}</span>
            </Link>
          ))}
        </nav>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(lead => {
              const lateLead = isLate(lead);
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-primary">{lead.company}</Link>
                    <p className="text-xs text-muted-foreground">{lead.contactName}{lead.decisionMaker ? '' : ' · no decision maker yet'}</p>
                    {(lead.segment || lead.location) && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {lead.segment && <Badge variant="outline">{LEAD_SEGMENT_LABEL[lead.segment]}</Badge>}
                        {lead.location}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={LEAD_STAGE_BADGE[lead.stage]}>{LEAD_STAGE_LABEL[lead.stage]}</Badge>
                  </TableCell>
                  <TableCell className="figure text-right font-medium">
                    {lead.estimatedBudget ? formatCurrency(lead.estimatedBudget) : <span className="text-muted-foreground font-normal">Not known</span>}
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    {isOpen(lead) ? (
                      <>
                        <p className="truncate">{lead.nextAction}</p>
                        <p className={cn('text-xs', lateLead ? 'text-bad font-medium' : 'text-muted-foreground')}>
                          {shortDate(lead.nextActionDate)}{lateLead ? ' · late' : ''}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{lead.stage === 'LOST' ? lead.lostReason ?? 'Lost' : 'Won'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.owner?.name}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  {view === 'late' ? 'No late follow-ups. Every open lead is on schedule.' : 'No leads here yet. Add one with New lead.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
