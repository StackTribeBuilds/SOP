import { redirect } from 'next/navigation';
import { canViewGrowth, getCurrentUser, isFounderRole } from '@/lib/session';
import { getContentItems } from '@/lib/growth-actions';
import { PageHeader, Stat, StatStrip } from '@/components/layout/page-header';
import { ApprovalList } from './approval-list';

export const metadata = { title: 'Approvals' };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !canViewGrowth(user.role)) redirect('/dashboard');
  const canEdit = isFounderRole(user.role);

  const items = await getContentItems();
  const count = (s: string) => items.filter(i => i.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description={canEdit
          ? 'Posts, outreach emails and page copy. Nothing goes out on its own: approve it, send it from your own account, then mark it sent.'
          : 'Posts, outreach emails and page copy the founders are reviewing. View only: use the approved emails as your scripts, and check what is going out this week.'}
      />

      <StatStrip>
        <Stat label="Waiting for review" value={count('DRAFT')} tone={count('DRAFT') ? 'warn' : undefined} />
        <Stat label="Changes requested" value={count('CHANGES')} hint="Being revised" />
        <Stat label="Approved, not sent" value={count('APPROVED')} hint="Ready to go out" />
        <Stat label="Sent / live" value={count('SENT')} />
      </StatStrip>

      <ApprovalList items={items} showAll={show === 'all'} canEdit={canEdit} />
    </div>
  );
}
