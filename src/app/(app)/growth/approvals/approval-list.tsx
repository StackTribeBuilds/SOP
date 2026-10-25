'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ContentItem, ContentStatus } from '@prisma/client';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { updateContentStatus } from '@/lib/growth-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CONTENT_KIND_LABEL, CONTENT_STATUS_BADGE, CONTENT_STATUS_LABEL, LEAD_SEGMENT_LABEL, shortDate } from '@/lib/labels';
import { cn } from '@/lib/utils';

const FILTERS: { key: 'review' | ContentStatus | 'all'; label: string }[] = [
  { key: 'review', label: 'Waiting for review' },
  { key: 'CHANGES', label: 'Changes requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SENT', label: 'Sent / live' },
  { key: 'all', label: 'All' },
];

const KINDS = [
  { key: 'all', label: 'Everything' },
  { key: 'posts', label: 'Posts', kinds: ['POST'] },
  { key: 'outreach', label: 'Outreach', kinds: ['EMAIL', 'DM', 'CONNECTION'] },
  { key: 'copy', label: 'Profile & page copy', kinds: ['PROFILE', 'PAGE'] },
] as const;

export function ApprovalList({ items, showAll = false, canEdit }: { items: ContentItem[]; showAll?: boolean; canEdit: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>(showAll ? 'all' : 'review');
  const [kind, setKind] = useState<(typeof KINDS)[number]['key']>('all');

  // A link from the calendar (?show=all#c-<id>) scrolls to that item once the list has rendered
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id.startsWith('c-')) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, []);

  const matchesStatus = (i: ContentItem) => filter === 'all' || (filter === 'review' ? i.status === 'DRAFT' : i.status === filter);
  const kindDef = KINDS.find(k => k.key === kind)!;
  const matchesKind = (i: ContentItem) => !('kinds' in kindDef) || (kindDef.kinds as readonly string[]).includes(i.kind);
  const visible = items.filter(i => matchesStatus(i) && matchesKind(i));
  const countFor = (key: (typeof FILTERS)[number]['key']) =>
    items.filter(i => matchesKind(i) && (key === 'all' || (key === 'review' ? i.status === 'DRAFT' : i.status === key))).length;

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-col gap-2 border-b px-3 py-2 md:flex-row md:items-center md:justify-between">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Review status">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                'whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] transition-colors',
                filter === f.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label} <span className="figure ml-0.5 opacity-70">{countFor(f.key)}</span>
            </button>
          ))}
        </nav>
        <nav className="flex gap-1 overflow-x-auto" aria-label="Type">
          {KINDS.map(k => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              aria-pressed={kind === k.key}
              className={cn(
                'whitespace-nowrap rounded-md border px-2.5 py-1 text-[13px] transition-colors',
                kind === k.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted'
              )}
            >
              {k.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="divide-y">
        {visible.map(item => <ApprovalCard key={item.id} item={item} canEdit={canEdit} />)}
        {visible.length === 0 && (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">
            {filter === 'review' ? 'Nothing waiting for review right now.' : 'Nothing here.'}
          </p>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({ item, canEdit }: { item: ContentItem; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const long = item.body.length > 700;

  const move = (status: ContentStatus, feedback?: string) =>
    startTransition(async () => {
      const res = await updateContentStatus(item.id, status, feedback);
      if (!res.success) { toast.error(res.error); return; }
      toast.success({ APPROVED: 'Approved', SENT: 'Marked as sent', CHANGES: 'Sent back with your note', DRAFT: 'Moved back to drafts' }[status]);
      setAsking(false);
      setNote('');
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.body);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.');
    }
  };

  return (
    <article id={`c-${item.id}`} className="scroll-mt-20 space-y-3 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{CONTENT_KIND_LABEL[item.kind]}</Badge>
          <Badge variant="secondary">{item.channel}</Badge>
          {item.segment && <Badge variant="secondary">{LEAD_SEGMENT_LABEL[item.segment]}</Badge>}
          {item.scheduledFor && <span className="text-xs text-muted-foreground">Scheduled {shortDate(item.scheduledFor)}</span>}
        </div>
        <Badge variant={CONTENT_STATUS_BADGE[item.status]}>{CONTENT_STATUS_LABEL[item.status]}</Badge>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold leading-snug">{item.title}</h2>
        {item.target && <p className="text-[13px] text-muted-foreground">For: {item.target}</p>}
        {item.context && <p className="mt-1 max-w-[75ch] text-[13px] text-muted-foreground">{item.context}</p>}
      </div>

      <div
        className={cn(
          'max-w-[75ch] whitespace-pre-wrap break-words rounded-md bg-muted/60 px-4 py-3 text-[13.5px] leading-relaxed',
          long && !expanded && 'max-h-64 overflow-hidden [mask-image:linear-gradient(#000_70%,transparent)]'
        )}
      >
        {item.body}
      </div>
      {long && (
        <button type="button" onClick={() => setExpanded(e => !e)} className="text-[13px] font-medium text-primary hover:underline">
          {expanded ? 'Show less' : 'Show full text'}
        </button>
      )}

      {item.status === 'CHANGES' && item.feedback && (
        <p className="max-w-[75ch] rounded-md border border-bad/20 bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {canEdit ? 'Your note' : 'Founder note'}: {item.feedback}
        </p>
      )}

      {canEdit && asking && (
        <div className="max-w-[75ch] space-y-2">
          <label htmlFor={`note-${item.id}`} className="text-[13px] font-medium">What should change?</label>
          <Textarea id={`note-${item.id}`} value={note} onChange={e => setNote(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || !note.trim()} onClick={() => move('CHANGES', note)}>Send back</Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canEdit && (item.status === 'DRAFT' || item.status === 'CHANGES') && (
          <Button size="sm" disabled={pending} onClick={() => move('APPROVED')}>Approve</Button>
        )}
        {canEdit && (item.status === 'DRAFT' || item.status === 'APPROVED') && !asking && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setAsking(true)}>Request changes</Button>
        )}
        {canEdit && item.status === 'APPROVED' && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => move('SENT')}>Mark as sent / live</Button>
        )}
        {canEdit && (item.status === 'APPROVED' || item.status === 'SENT') && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => move('DRAFT')}>Move back to drafts</Button>
        )}
        <Button size="sm" variant="ghost" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copy text</Button>
      </div>
    </article>
  );
}
