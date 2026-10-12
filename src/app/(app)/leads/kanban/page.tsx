import Link from 'next/link';
import { List } from 'lucide-react';
import { getLeads } from '@/lib/crm-actions';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { KanbanBoard } from './kanban-board';
import { LeadForm } from '../lead-form';

export const metadata = { title: 'Lead board' };

export default async function KanbanPage() {
  const result = await getLeads();
  const leads = result.success ? result.data : [];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-5">
      <PageHeader
        title="Lead board"
        description="Drag a lead to move it. Qualified needs budget, timeline and decision maker. Only founders can mark a deal won."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/leads"><List className="h-4 w-4" /> List</Link>
            </Button>
            <LeadForm />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-x-auto">
        <KanbanBoard initialLeads={leads || []} />
      </div>
    </div>
  );
}
