import { getLeads } from '@/lib/crm-actions';
import { KanbanBoard } from './kanban-board';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function KanbanPage() {
  const result = await getLeads();
  const leads = result.success ? result.data : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between space-y-2 flex-shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Leads Board</h2>
        <div className="flex items-center space-x-2">
          <Link href="/leads">
            <Button variant="outline">List View</Button>
          </Link>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard initialLeads={leads || []} />
      </div>
    </div>
  );
}
