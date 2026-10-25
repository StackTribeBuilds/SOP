import { redirect } from 'next/navigation';
import { canViewGrowth, getCurrentUser, isFounderRole } from '@/lib/session';
import { getGrowthTasks } from '@/lib/growth-actions';
import { PageHeader } from '@/components/layout/page-header';
import { Progress } from '@/components/ui/progress';
import { TaskRow } from './task-row';

export const metadata = { title: 'Growth to-dos' };

// Shown in this order; any other owner name in the data appears after these
const OWNER_ORDER = ['Founders', 'BDE', 'Claude'];

export default async function GrowthTodosPage() {
  const user = await getCurrentUser();
  if (!user || !canViewGrowth(user.role)) redirect('/dashboard');
  const canEdit = isFounderRole(user.role);

  const tasks = await getGrowthTasks();
  const done = tasks.filter(t => t.done).length;
  const owners = [...new Set(tasks.map(t => t.owner))].sort(
    (a, b) => (OWNER_ORDER.indexOf(a) + 1 || 99) - (OWNER_ORDER.indexOf(b) + 1 || 99)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Growth to-dos"
        description={canEdit
          ? 'Setup work and recurring jobs for lead gen and content. Tick items off as they are done.'
          : 'Setup work and recurring jobs for lead gen and content. View only: founders tick items off.'}
      />

      <div className="surface px-5 py-4 sm:px-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="figure text-muted-foreground">{done} of {tasks.length} done</span>
        </div>
        <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} className="mt-2" />
      </div>

      {tasks.length === 0 ? (
        <p className="surface px-6 py-14 text-center text-sm text-muted-foreground">No to-dos yet. They arrive with the next growth import.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {owners.map(owner => {
            const list = tasks.filter(t => t.owner === owner);
            return (
              <section key={owner} className="surface">
                <header className="flex items-baseline justify-between border-b px-5 py-3 sm:px-6">
                  <h2 className="text-[15px] font-semibold">{owner}</h2>
                  <span className="figure text-xs text-muted-foreground">
                    {list.filter(t => !t.done).length} open
                  </span>
                </header>
                <ul className="divide-y">
                  {list.map(t => <TaskRow key={t.id} task={t} canEdit={canEdit} />)}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
