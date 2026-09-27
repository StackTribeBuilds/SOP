'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createLead } from '@/lib/crm-actions';
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

export function LeadForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    company: '',
    contactName: '',
    email: '',
    phone: '',
    source: '',
    requirement: '',
    estimatedBudget: '',
    timeline: '',
    decisionMaker: '',
    nextAction: '',
    nextActionDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = {
        ...formData,
        ownerId: (session?.user as any)?.id || 'default-owner-id', // Fallback if no session
      };
      
      const res = await createLead(data);
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        alert('Failed to create lead');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input id="company" name="company" required value={formData.company} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input id="contactName" name="contactName" required value={formData.contactName} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select onValueChange={(value) => handleSelectChange('source', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLD_OUTBOUND">Cold Outbound</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimatedBudget">Estimated Budget</Label>
              <Input id="estimatedBudget" name="estimatedBudget" type="number" value={formData.estimatedBudget} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline</Label>
              <Input id="timeline" name="timeline" placeholder="e.g. 2 months" value={formData.timeline} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decisionMaker">Decision Maker</Label>
              <Input id="decisionMaker" name="decisionMaker" value={formData.decisionMaker} onChange={handleChange} />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="requirement">Requirement *</Label>
              <Input id="requirement" name="requirement" required value={formData.requirement} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nextAction">Next Action *</Label>
              <Input id="nextAction" name="nextAction" required value={formData.nextAction} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextActionDate">Next Action Date *</Label>
              <Input id="nextActionDate" name="nextActionDate" type="date" required value={formData.nextActionDate} onChange={handleChange} />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
