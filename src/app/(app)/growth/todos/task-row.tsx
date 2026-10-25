'use client';

import { useTransition } from 'react';
import type { GrowthTask } from '@prisma/client';
import { toast } from 'sonner';
import { setGrowthTaskDone } from '@/lib/growth-actions';
import { shortDate } from '@/lib/labels';
import { cn } from '@/lib/utils';

export function TaskRow({ task, canEdit }: { task: GrowthTask; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();

  const toggle = (done: boolean) =>
    startTransition(async () => {
      const res = await setGrowthTaskDone(task.id, done);
      if (!res.success) toast.error(res.error);
    });

  return (
    <li className="flex gap-3 px-5 py-3 sm:px-6">
      <input
        id={`task-${task.id}`}
        type="checkbox"
        checked={task.done}
        disabled={!canEdit || pending}
        onChange={e => toggle(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed"
        aria-describedby={task.details ? `task-${task.id}-details` : undefined}
      />
      <label htmlFor={`task-${task.id}`} className={cn('min-w-0 text-sm', canEdit && 'cursor-pointer')}>
        <span className={cn('font-medium', task.done && 'text-muted-foreground line-through')}>{task.title}</span>
        {task.details && (
          <span id={`task-${task.id}-details`} className="mt-0.5 block text-[13px] text-muted-foreground">{task.details}</span>
        )}
        {task.done && task.doneAt && (
          <span className="mt-0.5 block text-xs text-muted-foreground">Done {shortDate(task.doneAt)}</span>
        )}
      </label>
    </li>
  );
}
