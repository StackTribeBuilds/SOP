'use client';

import { useState, useTransition } from "react";
import { updateClientOnboarding } from "@/lib/project-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_ITEMS } from "@/lib/gates";

// Bible §8.1: development starts only when all 12 are done
const CHECKLIST_ITEMS = ONBOARDING_ITEMS;

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
      try {
        await updateClientOnboarding(client.id, { [id]: checked });
        router.refresh();
      } catch {
        setFormData(formData);
        toast.error("Could not save that item. Try again.");
      }
    });
  };

  const doneCount = CHECKLIST_ITEMS.filter(i => formData[i.id]).length;
  const complete = doneCount === CHECKLIST_ITEMS.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Gate Checklist</CardTitle>
        <CardDescription>
          Bible §8.1. A client is onboarded only when all 12 items are done. Until then, the project can&apos;t start without a recorded founder exception (Gate 4).
        </CardDescription>
        <div className="pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className={complete ? "font-medium text-green-700" : "text-muted-foreground"}>
              {complete ? "Fully onboarded. Development can start." : `${doneCount} of ${CHECKLIST_ITEMS.length} done`}
            </span>
          </div>
          <Progress value={(doneCount / CHECKLIST_ITEMS.length) * 100} />
        </div>
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
