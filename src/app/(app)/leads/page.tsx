import { getLeads } from '@/lib/crm-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { format } from 'date-fns';
import { LeadForm } from './lead-form';

export default async function LeadsPage() {
  const result = await getLeads();
  const leads = result.success ? result.data : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
        <div className="flex items-center space-x-2">
          <Link href="/leads/kanban">
            <Button variant="outline">Board View</Button>
          </Link>
          <LeadForm />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads?.map((lead: any) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.company}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{lead.contactName}</span>
                    <span className="text-sm text-muted-foreground">{lead.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={lead.stage === 'WON' ? 'default' : lead.stage === 'LOST' ? 'destructive' : 'secondary'}>
                    {lead.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.estimatedBudget ? `₹${lead.estimatedBudget.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>{lead.nextAction}</TableCell>
                <TableCell>
                  {lead.nextActionDate ? format(new Date(lead.nextActionDate), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>{lead.owner?.name || lead.ownerId}</TableCell>
              </TableRow>
            ))}
            {!leads?.length && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
