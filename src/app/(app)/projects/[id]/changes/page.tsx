'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getChangeRequests, createChangeRequest, updateChangeRequestStatus } from '@/lib/project-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ChangesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    description: '',
    impactOnScope: '',
    estimatedHours: '',
    additionalCost: '',
  });

  useEffect(() => {
    loadCRs();
  }, [projectId]);

  async function loadCRs() {
    setLoading(true);
    const crs = await getChangeRequests(projectId);
    setChangeRequests(crs);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createChangeRequest({
      projectId,
      crNumber: `CR-${Date.now()}`,
      description: formData.description,
      impactOnScope: formData.impactOnScope,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
      additionalCost: formData.additionalCost ? parseFloat(formData.additionalCost) : null,
    });
    setOpen(false);
    setFormData({ description: '', impactOnScope: '', estimatedHours: '', additionalCost: '' });
    loadCRs();
  }

  async function updateStatus(id: string, status: string) {
    await updateChangeRequestStatus(id, status);
    loadCRs();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Change Requests</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create CR</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Change Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Impact on Scope</Label>
                <Textarea
                  value={formData.impactOnScope}
                  onChange={(e) => setFormData({ ...formData, impactOnScope: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Cost (INR)</Label>
                  <Input
                    type="number"
                    value={formData.additionalCost}
                    onChange={(e) => setFormData({ ...formData, additionalCost: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Create CR</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Changes</CardTitle>
          <CardDescription>Track and manage changes to project scope.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>CR Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Est. Hours</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Approved (Y/N)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((cr) => (
                  <TableRow key={cr.id}>
                    <TableCell>{new Date(cr.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{cr.crNumber}</TableCell>
                    <TableCell className="max-w-xs truncate" title={cr.description}>{cr.description}</TableCell>
                    <TableCell>{cr.estimatedHours || '-'}</TableCell>
                    <TableCell>{cr.additionalCost ? `₹${cr.additionalCost}` : '-'}</TableCell>
                    <TableCell>{['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(cr.status) ? 'Y' : 'N'}</TableCell>
                    <TableCell>{cr.status}</TableCell>
                    <TableCell>
                      <Select
                        value={cr.status}
                        onValueChange={(val) => updateStatus(cr.id, val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REQUESTED">Requested</SelectItem>
                          <SelectItem value="ESTIMATED">Estimated</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {changeRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No change requests found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
