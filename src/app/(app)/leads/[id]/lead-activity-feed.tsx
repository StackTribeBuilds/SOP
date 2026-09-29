"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLeadActivity } from "@/lib/crm-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export function LeadActivityFeed({ leadId, initialActivities }: { leadId: string, initialActivities: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    
    setLoading(true);
    try {
      const res = await addLeadActivity(leadId, "Added Note / Update", note);
      if (res.success) {
        setNote("");
        router.refresh(); // Refresh page to get new data
      } else {
        alert("Failed to add note: " + res.error);
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Activity & Updates</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea 
            placeholder="Log a call, meeting, or update what happened today..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={loading}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !note.trim()}>
              {loading ? "Saving..." : "Add Update"}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {initialActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet.</p>
          ) : (
            initialActivities.map((act) => (
              <div key={act.id} className="border-l-2 border-primary/30 pl-4 py-1 relative">
                <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-2" />
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-semibold text-sm">{act.user?.name || "User"}</span>
                    <span className="text-muted-foreground text-xs ml-2">{act.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground" title={new Date(act.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {act.details && (
                  <p className="text-sm whitespace-pre-wrap mt-1 text-slate-700 dark:text-slate-300">
                    {act.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
