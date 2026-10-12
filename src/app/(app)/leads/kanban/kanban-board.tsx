'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { LeadStage } from '@prisma/client';
import { updateLeadStage } from '@/lib/crm-actions';
import { LEAD_STAGE_LABEL } from '@/lib/labels';
import { formatCurrency } from '@/lib/utils';
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
  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
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
      <div className="flex gap-3 h-full pb-4">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage);
          const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0);
          const closed = stage === 'WON' || stage === 'LOST';
          return (
            <div key={stage} className={`flex-shrink-0 w-72 flex flex-col rounded-lg p-2 ${closed ? 'bg-muted/40' : 'bg-muted/70'}`}>
              <div className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
                <h3 className="text-[13px] font-semibold">
                  {LEAD_STAGE_LABEL[stage]} <span className="figure ml-1 font-normal text-muted-foreground">{stageLeads.length}</span>
                </h3>
                {stageValue > 0 && <span className="figure text-xs text-muted-foreground">{formatCurrency(stageValue)}</span>}
              </div>
              
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 overflow-y-auto space-y-2 min-h-[150px] p-0.5 rounded-md transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary-soft' : ''
                    }`}
                  >
                    {stageLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`rounded-md border bg-card p-3 text-sm ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30' : 'hover:border-primary/40'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/leads/${lead.id}`} className="font-medium leading-snug hover:text-primary">
                                {lead.company}
                              </Link>
                              {lead.estimatedBudget ? (
                                <span className="figure shrink-0 text-[13px] font-semibold">{formatCurrency(lead.estimatedBudget)}</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                            {!closed && (lead.nextAction || lead.nextActionDate) && (() => {
                              const late = !!lead.nextActionDate && new Date(lead.nextActionDate) < todayStart;
                              return (
                                <div className={`mt-2.5 border-t pt-2 text-xs ${late ? 'text-bad' : 'text-muted-foreground'}`}>
                                  <p className="truncate text-foreground">{lead.nextAction}</p>
                                  {lead.nextActionDate && (
                                    <p className={late ? 'font-medium' : ''}>
                                      {format(new Date(lead.nextActionDate), 'd MMM')}{late ? ' · late' : ''}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
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
