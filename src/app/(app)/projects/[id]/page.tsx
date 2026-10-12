import Link from "next/link";
import { getChangeRequests, getMilestones, getProjectById, getProjectTasks } from "@/lib/project-actions";
import { Badge } from "@/components/ui/badge";
import { Stat, StatStrip } from "@/components/layout/page-header";
import { MoneyProgress } from "@/components/layout/money-progress";
import { PROJECT_HEALTH_LABEL, shortDate } from "@/lib/labels";
import { cn, formatCurrency } from "@/lib/utils";

const TASK_LABEL: Record<string, string> = {
  THIS_WEEK: "This week", IN_PROGRESS: "In progress", IN_REVIEW: "In review", CLIENT_REVIEW: "Client review",
};
const HEALTH_TONE: Record<string, "good" | "warn" | "bad"> = { ON_TRACK: "good", AT_RISK: "warn", DELAYED: "bad", BLOCKED: "bad" };

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const [project, tasks, milestones, crs] = await Promise.all([
    getProjectById(projectId),
    getProjectTasks(projectId),
    getMilestones(projectId),
    getChangeRequests(projectId),
  ]);
  if (!project) return null;

  const invoices = milestones.flatMap(m => m.invoices);
  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const owed = invoices.filter(i => i.status !== "DRAFT").reduce((s, i) => s + i.amount - i.paidAmount, 0);
  const nextMilestone = milestones.find(m => !m.invoices.some(i => i.status === "PAID"));
  const activeTasks = tasks.filter(t => ["THIS_WEEK", "IN_PROGRESS", "IN_REVIEW", "CLIENT_REVIEW"].includes(t.status));
  const openCrs = crs.filter(c => ["REQUESTED", "ESTIMATED", "APPROVED", "IN_PROGRESS"].includes(c.status));
  const approvedCrValue = crs.filter(c => ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(c.status)).reduce((s, c) => s + (c.additionalCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <StatStrip>
        <Stat label="Contract" value={formatCurrency(project.contractValue)}
          hint={approvedCrValue > 0 ? `+${formatCurrency(approvedCrValue)} approved changes` : "No paid changes yet"} />
        <Stat label="Collected" value={formatCurrency(collected)} tone="good"
          hint={`${project.contractValue > 0 ? Math.round((collected / project.contractValue) * 100) : 0}% of contract`} />
        <Stat label="Invoiced, not paid" value={formatCurrency(owed)} tone={owed > 0 ? "warn" : undefined} />
        <Stat label="Delivery" value={`${project.completionPercentage}%`}
          hint={<span className={cn(project.status === "IN_PROGRESS" && `text-${HEALTH_TONE[project.health]}`)}>{PROJECT_HEALTH_LABEL[project.health]}</span>} />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Money</h2>
              <Link href={`/projects/${projectId}/milestones`} className="text-xs font-medium text-primary hover:underline">Milestones & billing</Link>
            </div>
            <div className="mt-3"><MoneyProgress total={project.contractValue} collected={collected} owed={owed} /></div>
            {nextMilestone ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/60 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Next milestone</p>
                  <p className="font-medium">{nextMilestone.name}</p>
                  <p className="text-xs text-muted-foreground">Due {shortDate(nextMilestone.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="figure text-lg font-semibold">{formatCurrency(nextMilestone.paymentAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextMilestone.invoices[0] ? `${nextMilestone.invoices[0].invoiceNumber} · ${nextMilestone.invoices[0].status.toLowerCase().replace("_", " ")}` : "Not invoiced yet"}
                  </p>
                </div>
              </div>
            ) : milestones.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No milestones yet. <Link href={`/projects/${projectId}/milestones`} className="font-medium text-primary hover:underline">Split the contract into payment milestones</Link> before starting.
              </p>
            ) : (
              <p className="mt-4 text-sm text-good">Every milestone is paid.</p>
            )}
          </section>

          <section className="surface">
            <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
              <h2 className="text-[15px] font-semibold">Work in progress</h2>
              <Link href={`/projects/${projectId}/board`} className="text-xs font-medium text-primary hover:underline">Open tasks</Link>
            </div>
            {activeTasks.length ? (
              <ul className="mt-3 divide-y">
                {activeTasks.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.assignee?.name ?? "Unassigned"}</p>
                    </div>
                    <Badge variant={t.status === "CLIENT_REVIEW" ? "warning" : "secondary"}>{TASK_LABEL[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">Nothing in progress. Plan this week&apos;s work on the task board.</p>
            )}
            <div className="h-2" />
          </section>

          <section className="surface p-5">
            <h2 className="text-[15px] font-semibold">Scope</h2>
            {project.scope || project.description ? (
              <div className="mt-2 space-y-3 text-sm">
                {project.description && <p className="whitespace-pre-wrap text-muted-foreground">{project.description}</p>}
                {project.scope && <p className="whitespace-pre-wrap">{project.scope}</p>}
                {project.exclusions && (
                  <p className="whitespace-pre-wrap text-muted-foreground"><span className="font-medium text-foreground">Not included: </span>{project.exclusions}</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No scope written down. <Link href={`/projects/${projectId}/settings`} className="font-medium text-primary hover:underline">Add the agreed scope</Link> so change requests have something to compare against.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Change requests</h2>
              <Link href={`/projects/${projectId}/changes`} className="text-xs font-medium text-primary hover:underline">All changes</Link>
            </div>
            {openCrs.length ? (
              <ul className="mt-3 space-y-2.5">
                {openCrs.map(c => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{c.crNumber}</span>
                      {c.additionalCost != null && <span className="figure font-semibold">{formatCurrency(c.additionalCost)}</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                    <p className="text-xs text-warn">{c.status === "ESTIMATED" ? "Waiting for client approval" : c.status === "REQUESTED" ? "Needs an estimate" : c.status === "APPROVED" ? "Approved, not started" : "In progress"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No open changes.</p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="text-[15px] font-semibold">Key dates</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Started</dt><dd>{shortDate(project.startDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Expected end</dt><dd>{shortDate(project.expectedEndDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Estimated hours</dt><dd className="figure">{project.estimatedHours ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Logged hours</dt><dd className="figure">{project.actualHours}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
