import { getClients } from "@/lib/project-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Manage and view your clients onboarding status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.company}</TableCell>
                  <TableCell>
                    {client.primaryContactName}
                    {client.primaryContactEmail && (
                      <span className="text-sm text-muted-foreground block">{client.primaryContactEmail}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.isOnboarded ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Fully Onboarded</Badge>
                    ) : (
                      <Badge variant="secondary">Onboarding Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/clients/${client.id}/onboard`}>
                        {client.isOnboarded ? 'View Onboarding' : 'Complete Onboarding'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No clients found.
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
