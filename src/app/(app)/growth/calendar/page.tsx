import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { canViewGrowth, getCurrentUser } from '@/lib/session';
import { getContentItems } from '@/lib/growth-actions';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CONTENT_STATUS_BADGE, CONTENT_STATUS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Content calendar' };

const WEEKS = 5;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Calendar days are India dates, keyed as YYYY-MM-DD, whatever timezone the server runs in
const dayKey = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const label = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const DOT: Record<string, string> = {
  DRAFT: 'bg-warn-soft text-warn',
  CHANGES: 'bg-bad-soft text-bad',
  APPROVED: 'bg-primary-soft text-primary',
  SENT: 'bg-good-soft text-good',
};

export default async function ContentCalendarPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canViewGrowth(user.role)) redirect('/dashboard');

  const { w } = await searchParams;
  const offset = Number.parseInt(w ?? '0', 10) || 0;

  const today = dayKey(new Date());
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -weekday + offset * 7);
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));

  const posts = (await getContentItems()).filter(i => i.kind === 'POST');
  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    if (!p.scheduledFor) continue;
    const k = dayKey(p.scheduledFor);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }
  const unscheduled = posts.filter(p => !p.scheduledFor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content calendar"
        description="LinkedIn and Instagram posts by day. Each post is reviewed in Approvals; click one to open it."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/growth/calendar?w=${offset - 1}`} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            {offset !== 0 && (
              <Button variant="outline" size="sm" asChild><Link href="/growth/calendar">This week</Link></Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/growth/calendar?w=${offset + 1}`} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </>
        }
      />

      <div className="surface overflow-x-auto p-3 sm:p-4">
        <div className="grid min-w-[760px] grid-cols-7 gap-1.5">
          {DOW.map(d => <div key={d} className="px-1 pb-1 text-xs text-muted-foreground">{d}</div>)}
          {days.map(d => (
            <div
              key={d}
              className={cn(
                'flex min-h-28 flex-col gap-1 rounded-md border bg-card p-1.5',
                d === today && 'border-primary',
                d < today && 'opacity-60'
              )}
            >
              <span className="figure px-0.5 text-xs text-muted-foreground">{label(d)}</span>
              {(byDay.get(d) ?? []).map(p => (
                <Link
                  key={p.id}
                  href={`/growth/approvals?show=all#c-${p.id}`}
                  title={CONTENT_STATUS_LABEL[p.status]}
                  className={cn('rounded px-1.5 py-1 text-[12px] leading-snug hover:underline', DOT[p.status])}
                >
                  <span className="font-medium">{p.channel}</span> · {p.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(['DRAFT', 'CHANGES', 'APPROVED', 'SENT'] as const).map(s => (
            <Badge key={s} variant={CONTENT_STATUS_BADGE[s]}>{CONTENT_STATUS_LABEL[s]}</Badge>
          ))}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="surface p-5">
          <h2 className="text-[15px] font-semibold">Not scheduled yet</h2>
          <ul className="mt-2 divide-y">
            {unscheduled.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/growth/approvals?show=all#c-${p.id}`} className="hover:text-primary">{p.title}</Link>
                <Badge variant={CONTENT_STATUS_BADGE[p.status]}>{CONTENT_STATUS_LABEL[p.status]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
