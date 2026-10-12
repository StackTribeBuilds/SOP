import Link from "next/link";
import { getClients, getProjectsOverview } from "@/lib/project-actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Stat, StatStrip } from "@/components/layout/page-header";
import { MoneyProgress } from "@/components/layout/money-progress";
import { PROJECT_HEALTH_LABEL, PROJECT_STATUS_LABEL, shortDate } from "@/lib/labels";
import { cn, formatCurrency } from "@/lib/utils";
import { ProjectForm } from "./project-form";

export const metadata = { title: "Projects" };

const STATUS_BADGE: Record<string, "secondary" | "default" | "warning" | "success" | "danger"> = {
  NOT_STARTED: "secondary", IN_PROGRESS: "default", ON_HOLD: "warning", COMPLETED: "success", CANCELLED: "danger",
};
const HEALTH_TONE: Record<string, string> = {
  ON_TRACK: "text-good", AT_RISK: "text-warn", DELAYED: "text-bad", BLOCKED: "text-bad",
};
const ORDER = ["IN_PROGRESS", "NOT_STARTED", "ON_HOLD", "COMPLETED", "CANCELLED"];

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([getProjectsOverview(), getClients()]);
  const sorted = [...projects].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const active = projects.filter(p => p.status === "IN_PROGRESS");
  const troubled = active.filter(p => p.health !== "ON_TRACK");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Money and delivery for every project. A project starts only after onboarding and milestones are in place."
        actions={<ProjectForm clients={clients} />}
      />

      <StatStrip>
        <Stat label="In progress" value={active.length} hint={`${projects.filter(p => p.status === "NOT_STARTED").length} waiting to start`} />
        <Stat label="At risk, delayed or blocked" value={troubled.length} tone={troubled.length ? "bad" : undefined} />
        <Stat label="Contracted (active)" value={formatCurrency(active.reduce((s, p) => s + p.contractValue, 0))} />
        <Stat label="Collected (active)" value={formatCurrency(active.reduce((s, p) => s + p.collected, 0))} tone="good"
          hint={`${formatCurrency(active.reduce((s, p) => s + p.owed, 0))} invoiced and owed`} />
      </StatStrip>

      <div className="surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Money</TableHead>
              <TableHead>Next milestone</TableHead>
              <TableHead className="text-right">Delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                  <p className="text-xs text-muted-foreground">
                    {p.client.company}{p.isRecurring ? " · recurring" : ""}{!p.client.isOnboarded && p.status === "NOT_STARTED" ? " · onboarding incomplete" : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                  {p.status === "IN_PROGRESS" && (
                    <p className={cn("mt-1 text-xs font-medium", HEALTH_TONE[p.health])}>{PROJECT_HEALTH_LABEL[p.health]}</p>
                  )}
                </TableCell>
                <TableCell><MoneyProgress total={p.contractValue} collected={p.collected} owed={p.owed} /></TableCell>
                <TableCell className="max-w-[240px]">
                  {p.milestoneCount === 0 ? (
                    <Link href={`/projects/${p.id}/milestones`} className="text-xs font-medium text-primary hover:underline">Add milestones</Link>
                  ) : p.nextMilestone ? (
                    <>
                      <p className="truncate text-sm">{p.nextMilestone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="figure">{formatCurrency(p.nextMilestone.amount)}</span> · due {shortDate(p.nextMilestone.dueDate)}
                        {!p.nextMilestone.invoiced && " · not invoiced"}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-good">All milestones paid</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="figure text-[15px] font-semibold">{p.completionPercentage}%</span>
                  <p className="text-xs text-muted-foreground">{p.expectedEndDate ? `ends ${shortDate(p.expectedEndDate)}` : "no end date"}</p>
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  No projects yet. Win a deal, then create its project here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
