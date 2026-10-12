'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { LeadStage } from '@prisma/client';
import { updateLeadStage } from '@/lib/crm-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STAGES: LeadStage[] = [
  'NEW', 'CONTACTED', 'CONNECTED', 'QUALIFIED', 
  'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'
];

interface Lead {
  id: string;
  company: string;
  contactName: string;
  stage: LeadStage;
  estimatedBudget?: number | null;
  nextAction?: string | null;
  nextActionDate?: string | Date | null;
}

export function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isMounted, setIsMounted] = useState(false);
  // A drop onto LOST waits here until a reason is given
  const [pendingLost, setPendingLost] = useState<{ id: string; company: string } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [savingLost, setSavingLost] = useState(false);

  useEffect(() => {
    // Sync if initialLeads change (e.g. from server mutation)
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as LeadStage;

    if (newStage === 'LOST') {
      const lead = leads.find(l => l.id === draggableId);
      setLostReason('');
      setPendingLost({ id: draggableId, company: lead?.company ?? 'this lead' });
      return;
    }

    await moveLead(draggableId, newStage);
  };

  const moveLead = async (id: string, newStage: LeadStage, reason?: string) => {
    const before = leads;
    // Optimistic update
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, stage: newStage } : lead));

    const res = await updateLeadStage(id, newStage, reason);
    if (!res.success) {
      // Gate rules come back as plain sentences, so show them as they are
      toast.error(res.error);
      setLeads(before);
      return false;
    }
    if (newStage === 'WON') toast.success('Deal won. The client was created, so set up onboarding next.');
    return true;
  };

  const confirmLost = async () => {
    if (!pendingLost || !lostReason.trim()) return;
    setSavingLost(true);
    const ok = await moveLead(pendingLost.id, 'LOST', lostReason);
    setSavingLost(false);
    if (ok) setPendingLost(null);
  };

  if (!isMounted) return null;

  return (
    <>
    <Dialog open={!!pendingLost} onOpenChange={(o) => { if (!o) setPendingLost(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why was {pendingLost?.company} lost?</DialogTitle>
          <DialogDescription>Lost reasons show which leads to stop chasing and what to change in sales.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="lost-reason">Reason</Label>
          <Textarea id="lost-reason" value={lostReason} onChange={e => setLostReason(e.target.value)} rows={3}
            placeholder="e.g. Budget below ₹50,000; chose a cheaper freelancer" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingLost(null)}>Keep lead open</Button>
          <Button variant="destructive" onClick={confirmLost} disabled={!lostReason.trim() || savingLost}>
            {savingLost ? 'Saving...' : 'Mark as lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 h-full pb-4">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-80 flex flex-col bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold">{stage.replace('_', ' ')}</h3>
                <Badge variant="secondary">{stageLeads.length}</Badge>
              </div>
              
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] p-1 rounded-md transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted/80' : ''
                    }`}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`shadow-sm ${snapshot.isDragging ? 'shadow-md ring-2 ring-primary/20' : ''}`}
                          >
                            <CardHeader className="p-3 pb-2">
                              <CardTitle className="text-base">
                                <Link href={`/leads/${lead.id}`} className="hover:underline text-primary">
                                  {lead.company}
                                </Link>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 text-sm space-y-2">
                              <div className="text-muted-foreground">{lead.contactName}</div>
                              {lead.estimatedBudget && (
                                <div className="font-medium">
                                  ₹{lead.estimatedBudget.toLocaleString()}
                                </div>
                              )}
                              {(lead.nextAction || lead.nextActionDate) && (
                                <div className="text-xs bg-muted p-2 rounded-md mt-2">
                                  <div className="font-medium truncate">{lead.nextAction}</div>
                                  {lead.nextActionDate && (
                                    <div className="text-muted-foreground mt-1">
                                      {format(new Date(lead.nextActionDate), 'MMM d, yyyy')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
    </>
  );
}
