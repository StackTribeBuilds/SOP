'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ChangeRequestStatus } from '@prisma/client';
import { createChangeRequest, estimateChangeRequest, updateChangeRequestStatus } from '@/lib/project-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { EmailButton } from '@/components/email/email-button';

type CR = {
  id: string;
  crNumber: string;
  description: string;
  impactOnScope: string | null;
  impactOnTimeline: string | null;
  estimatedHours: number | null;
  additionalCost: number | null;
  status: ChangeRequestStatus;
  clientApprovalDate: Date | null;
  clientApprovalNote: string | null;
  createdAt: Date;
};

const STATUS: Record<ChangeRequestStatus, { label: string; variant: 'secondary' | 'warning' | 'success' | 'danger' | 'default' | 'outline' }> = {
  REQUESTED: { label: 'Requested', variant: 'secondary' },
  ESTIMATED: { label: 'Awaiting client', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  IN_PROGRESS: { label: 'In progress', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'outline' },
};

type Result = { success: true } | { success: false; error: string };

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<Result>, ok: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  };
  return { run, busy };
}

export function ChangeRequests({ projectId, changeRequests }: { projectId: string; changeRequests: CR[] }) {
  const approvedValue = changeRequests
    .filter(c => ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(c.status))
    .reduce((s, c) => s + (c.additionalCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Change requests</h2>
          <p className="text-sm text-muted-foreground">
            Outside scope means estimated, approved in writing, then built (Gate 6). Approved changes so far: {formatCurrency(approvedValue)}.
          </p>
        </div>
        <NewCrDialog projectId={projectId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All changes</CardTitle>
          <CardDescription>&ldquo;It&apos;s only a small change, we&apos;ll do it&rdquo; is how agencies bleed profit (§11.3).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CR</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Timeline impact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Next step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changeRequests.map(cr => (
                <TableRow key={cr.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {cr.crNumber}
                    <span className="block text-xs text-muted-foreground font-normal">
                      {new Date(cr.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-2" title={cr.description}>{cr.description}</p>
                    {cr.clientApprovalNote && (
                      <p className="text-xs text-green-700 mt-1">Approved: {cr.clientApprovalNote}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{cr.estimatedHours ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{cr.additionalCost != null ? formatCurrency(cr.additionalCost) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">{cr.impactOnTimeline || '—'}</TableCell>
                  <TableCell><Badge variant={STATUS[cr.status].variant}>{STATUS[cr.status].label}</Badge></TableCell>
                  <TableCell className="text-right"><NextStep cr={cr} /></TableCell>
                </TableRow>
              ))}
              {changeRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No change requests yet. Log every out-of-scope ask here, even small ones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NextStep({ cr }: { cr: CR }) {
  const { run, busy } = useAction();
  const move = (to: ChangeRequestStatus, ok: string) => run(() => updateChangeRequestStatus(cr.id, to), ok);

  return (
    <div className="flex justify-end flex-wrap gap-1">
      {(cr.status === 'REQUESTED' || cr.status === 'ESTIMATED') && <EstimateDialog cr={cr} />}
      {cr.status === 'ESTIMATED' && <EmailButton context={{ changeRequestId: cr.id }} kind="CHANGE_REQUEST" label="Email for approval" />}
      {cr.status === 'ESTIMATED' && <ApproveDialog cr={cr} />}
      {(cr.status === 'REQUESTED' || cr.status === 'ESTIMATED') && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => move('REJECTED', `${cr.crNumber} marked rejected`)}>Rejected</Button>
      )}
      {cr.status === 'APPROVED' && (
        <Button size="sm" disabled={busy} onClick={() => move('IN_PROGRESS', `Work started on ${cr.crNumber}`)}>Start work</Button>
      )}
      {cr.status === 'IN_PROGRESS' && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => move('COMPLETED', `${cr.crNumber} completed`)}>Mark done</Button>
      )}
    </div>
  );
}

function NewCrDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ok = await run(() => createChangeRequest(projectId, {
      description: form.get('description') as string,
      impactOnScope: (form.get('impactOnScope') as string) || undefined,
    }), 'Change request logged');
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Log change request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New change request</DialogTitle>
          <DialogDescription>Step 1 of §11.2: write down exactly what the client asked for.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cr-desc">What the client wants</Label>
            <Textarea id="cr-desc" name="description" rows={3} required placeholder="e.g. Add WhatsApp notifications when an order ships" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-scope">How it differs from the agreed scope</Label>
            <Textarea id="cr-scope" name="impactOnScope" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Log request'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EstimateDialog({ cr }: { cr: CR }) {
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ok = await run(() => estimateChangeRequest(cr.id, {
      estimatedHours: parseFloat(form.get('hours') as string),
      additionalCost: parseFloat(form.get('cost') as string),
      impactOnTimeline: form.get('timeline') as string,
      impactOnScope: (form.get('scope') as string) || undefined,
    }), `${cr.crNumber} estimated. Send it to the client for written approval.`);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={cr.status === 'REQUESTED' ? 'default' : 'outline'}>{cr.status === 'REQUESTED' ? 'Estimate' : 'Re-estimate'}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estimate {cr.crNumber}</DialogTitle>
          <DialogDescription>Steps 3 to 5 of §11.2: hours, timeline and price, before asking the client.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`est-h-${cr.id}`}>Estimated hours</Label>
              <Input id={`est-h-${cr.id}`} name="hours" type="number" step="0.5" min="0" required defaultValue={cr.estimatedHours ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`est-c-${cr.id}`}>Price to client (₹)</Label>
              <Input id={`est-c-${cr.id}`} name="cost" type="number" step="1" min="0" required defaultValue={cr.additionalCost ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`est-t-${cr.id}`}>Impact on timeline</Label>
            <Input id={`est-t-${cr.id}`} name="timeline" required defaultValue={cr.impactOnTimeline ?? ''} placeholder="e.g. +4 working days to M3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`est-s-${cr.id}`}>Impact on scope</Label>
            <Textarea id={`est-s-${cr.id}`} name="scope" rows={2} defaultValue={cr.impactOnScope ?? ''} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save estimate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApproveDialog({ cr }: { cr: CR }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const { run, busy } = useAction();
  const paid = (cr.additionalCost ?? 0) > 0;

  const approve = async () => {
    const ok = await run(
      () => updateChangeRequestStatus(cr.id, 'APPROVED', note),
      paid ? `${cr.crNumber} approved. A draft invoice is waiting on Receivables.` : `${cr.crNumber} approved`,
    );
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Client approved</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record client approval for {cr.crNumber}</DialogTitle>
          <DialogDescription>
            Gate 6: only written approval counts (§7.4). {paid
              ? `Approving creates a draft invoice for ${formatCurrency(cr.additionalCost!)}.`
              : 'This change is free, so no invoice is created.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`appr-${cr.id}`}>Where the client approved in writing</Label>
          <Textarea id={`appr-${cr.id}`} rows={2} value={note} onChange={e => setNote(e.target.value)}
            placeholder='e.g. Email from Rahul Mehta, 12 Oct: "Approved, go ahead"' />
        </div>
        <DialogFooter>
          <Button onClick={approve} disabled={busy || !note.trim()}>{busy ? 'Saving...' : 'Record approval'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
