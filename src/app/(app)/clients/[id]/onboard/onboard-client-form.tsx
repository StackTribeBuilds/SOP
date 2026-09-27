'use client';

import { useState, useTransition } from "react";
import { updateClientOnboarding } from "@/lib/project-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CHECKLIST_ITEMS = [
  { id: 'agreementSigned', label: 'Agreement Signed', desc: 'MSA & SOW have been signed by the client.' },
  { id: 'advanceReceived', label: 'Advance Received', desc: 'Initial advance payment has been credited.' },
  { id: 'clientInfoCollected', label: 'Client Info Collected', desc: 'GST, Address, and basic details are filled.' },
  { id: 'primaryContactConfirmed', label: 'Primary Contact Confirmed', desc: 'Primary contact person is assigned.' },
  { id: 'decisionMakerConfirmed', label: 'Decision Maker Confirmed', desc: 'Decision maker for the project is identified.' },
  { id: 'commChannelEstablished', label: 'Comm Channel Established', desc: 'WhatsApp group or Slack channel is created.' },
  { id: 'requirementsApproved', label: 'Requirements Approved', desc: 'Final requirements document is approved.' },
  { id: 'assetsReceived', label: 'Assets Received', desc: 'Logos, branding, and required access received.' },
  { id: 'timelineApproved', label: 'Timeline Approved', desc: 'Project timeline and delivery dates approved.' },
  { id: 'milestonesEstablished', label: 'Milestones Established', desc: 'Payment milestones are set up in the system.' },
  { id: 'responsibilitiesDocumented', label: 'Responsibilities Documented', desc: 'Client and agency responsibilities clarified.' },
  { id: 'kickoffCompleted', label: 'Kickoff Completed', desc: 'Kickoff meeting has been conducted.' },
] as const;

export function OnboardClientForm({ client }: { client: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initial[item.id] = !!client[item.id];
    });
    return initial;
  });

  const handleToggle = (id: string, checked: boolean) => {
    const newData = { ...formData, [id]: checked };
    setFormData(newData);
    
    startTransition(async () => {
      await updateClientOnboarding(client.id, newData);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Gate Checklist</CardTitle>
        <CardDescription>Section 8 SOP - Complete all required steps to fully onboard the client.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <Checkbox
                id={item.id}
                checked={formData[item.id]}
                onCheckedChange={(checked: boolean) => handleToggle(item.id, checked)}
                disabled={isPending}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor={item.id} className="font-semibold text-base">
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => router.push('/clients')} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Back to Clients
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
