import Link from 'next/link'
import type { LeadStage } from '@prisma/client'
import { getLeads, getPipelineMetrics } from '@/lib/crm-actions'
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PIPELINE_STAGES, STAGE_PROBABILITY } from '@/lib/kpis'
import { LEAD_STAGE_BADGE, LEAD_STAGE_LABEL, shortDate } from '@/lib/labels'
import { formatCurrency } from '@/lib/utils'
import { PipelineChart } from './pipeline-chart'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline' }

export default async function SalesPipelinePage() {
  const [result, leadsResult] = await Promise.all([getPipelineMetrics(), getLeads()])

  if (!result.success || !result.data) {
    return <p className="text-sm text-bad">The pipeline couldn&apos;t be loaded: {result.error}</p>
  }

  const { totalValue, weightedValue, activeDeals, winRate, pipelineChartData } = result.data
  const deals = (leadsResult.success && leadsResult.data ? leadsResult.data : [])
    .filter(l => (PIPELINE_STAGES as LeadStage[]).includes(l.stage))
    .map(l => ({ ...l, weighted: (l.estimatedBudget ?? 0) * (STAGE_PROBABILITY[l.stage] ?? 0) }))
    .sort((a, b) => b.weighted - a.weighted)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Qualified open deals only. Weighted value is a forecast, never money to spend (§5.3)."
      />

      <StatStrip>
        <Stat label="Pipeline value" value={formatCurrency(totalValue)} hint="Budgets of qualified open deals" />
        <Stat label="Weighted" value={formatCurrency(weightedValue)} hint="Value × chance of closing at each stage" />
        <Stat label="Open deals" value={activeDeals} />
        <Stat label="Win rate" value={`${winRate.toFixed(0)}%`} hint="Won ÷ (won + lost)" />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="surface overflow-hidden p-5">
          <h2 className="text-[15px] font-semibold">Value by stage</h2>
          <p className="text-xs text-muted-foreground">Chance of closing: qualified 10%, discovery 20%, proposal 50%, negotiation 80%</p>
          <div className="mt-4">
            <PipelineChart data={pipelineChartData} />
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-[15px] font-semibold">Deals to push</h2>
            <p className="text-xs text-muted-foreground">Largest weighted value first</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Weighted</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/leads/${d.id}`} className="font-medium hover:text-primary">{d.company}</Link>
                    <p className="figure text-xs text-muted-foreground">{formatCurrency(d.estimatedBudget ?? 0)} budget</p>
                  </TableCell>
                  <TableCell><Badge variant={LEAD_STAGE_BADGE[d.stage]}>{LEAD_STAGE_LABEL[d.stage]}</Badge></TableCell>
                  <TableCell className="figure text-right font-semibold">{formatCurrency(d.weighted)}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate">{d.nextAction}</p>
                    <p className="text-xs text-muted-foreground">{shortDate(d.nextActionDate)}</p>
                  </TableCell>
                </TableRow>
              ))}
              {deals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No qualified deals yet. Qualify leads to build the pipeline.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  )
}
