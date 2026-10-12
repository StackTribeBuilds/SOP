'use client';

import { toast } from 'sonner';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/project-actions';
import { Plus } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProjectForm({ clients }: { clients: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    contractValue: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId || !formData.contractValue) return;

    setLoading(true);
    try {
      const result = await createProject({
        name: formData.name,
        clientId: formData.clientId,
        contractValue: parseFloat(formData.contractValue),
        description: formData.description,
        startDate: new Date(),
      });

      if (result.success) {
        setOpen(false);
        router.refresh();
        setFormData({ name: '', clientId: '', contractValue: '', description: '' });
      } else {
        toast.error(`Could not create the project: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not create the project. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Acme Mobile App"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select
              required
              value={formData.clientId}
              onValueChange={(val) => setFormData({ ...formData, clientId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractValue">Contract Value (₹)</Label>
            <Input
              id="contractValue"
              type="number"
              required
              min="0"
              value={formData.contractValue}
              onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Short Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief summary of the project scope"
            />
          </div>
          
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
