import Link from "next/link";
import { getClientsOverview } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Stat, StatStrip } from "@/components/layout/page-header";
import { MoneyProgress } from "@/components/layout/money-progress";
import { formatCurrency } from "@/lib/utils";
import { NewClientDialog } from "./new-client-dialog";
import { EmailButton } from "@/components/email/email-button";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const clients = await getClientsOverview();
  const pending = clients.filter(c => c.onboardingDone < c.onboardingTotal);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Won deals become clients. Development starts only when all 12 onboarding checks are done (§8.1)."
        actions={<NewClientDialog />}
      />

      <StatStrip>
        <Stat label="Clients" value={clients.length} />
        <Stat label="Onboarding pending" value={pending.length} tone={pending.length ? "warn" : undefined} />
        <Stat label="Collected to date" value={formatCurrency(clients.reduce((s, c) => s + c.collected, 0))} tone="good" />
        <Stat label="Owed by clients" value={formatCurrency(clients.reduce((s, c) => s + c.owed, 0))} />
      </StatStrip>

      <div className="surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Money</TableHead>
              <TableHead className="text-right">Active projects</TableHead>
              <TableHead className="text-right"><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(c => {
              const done = c.onboardingDone === c.onboardingTotal;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.company}</p>
                    <p className="text-xs text-muted-foreground">{c.primaryContactName}{c.primaryContactEmail ? ` · ${c.primaryContactEmail}` : ""}</p>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className={done ? "h-full bg-good" : "h-full bg-primary"} style={{ width: `${(c.onboardingDone / c.onboardingTotal) * 100}%` }} />
                      </div>
                      <span className="figure text-xs font-medium">{c.onboardingDone}/{c.onboardingTotal}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{done ? "Fully onboarded" : `Next: ${c.nextOnboardingStep}`}</p>
                  </TableCell>
                  <TableCell>
                    {c.contracted > 0
                      ? <MoneyProgress total={c.contracted} collected={c.collected} owed={c.owed} />
                      : <span className="text-xs text-muted-foreground">No project yet</span>}
                  </TableCell>
                  <TableCell className="figure text-right font-medium">{c.activeProjects}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <EmailButton context={{ clientId: c.id }} kind={done ? "GENERAL" : "ONBOARDING_REQUEST"}
                      label={done ? "Email client" : "Email what we need"} iconOnly variant="ghost" />
                    <Button asChild size="sm" variant={done ? "ghost" : "outline"}>
                      <Link href={`/clients/${c.id}/onboard`}>{done ? "View checklist" : "Continue onboarding"}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  No clients yet. Moving a lead to Won creates its client automatically.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
