'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProjectTasks, getMilestones, getProjectById } from '@/lib/project-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Copy } from 'lucide-react';
import { EmailButton } from '@/components/email/email-button';

export default function UpdatesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [updateText, setUpdateText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateUpdate() {
      setLoading(true);
      const [tasks, milestones, project] = await Promise.all([
        getProjectTasks(projectId),
        getMilestones(projectId),
        getProjectById(projectId)
      ]);

      const inReviewOrDone = tasks.filter((t: any) => ['IN_REVIEW', 'DONE', 'APPROVED'].includes(t.status));
      const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS');
      const clientReview = tasks.filter((t: any) => t.status === 'CLIENT_REVIEW');
      const upcoming = tasks.filter((t: any) => t.status === 'THIS_WEEK');
      
      const nextMilestone = milestones.find((m: any) => m.status !== 'COMPLETED' && m.status !== 'APPROVED');

      let text = `*Weekly Project Update*\n\n`;
      
      text += `*✅ This week's progress:*\n`;
      if (inReviewOrDone.length > 0) {
        inReviewOrDone.forEach((t: any) => {
          text += `- ${t.title}\n`;
        });
      } else {
        text += `- Continuous improvements and backend work\n`;
      }
      
      text += `\n*🔄 Currently working on:*\n`;
      if (inProgress.length > 0) {
        inProgress.forEach((t: any) => {
          text += `- ${t.title}\n`;
        });
      } else {
        text += `- Gearing up for next sprint tasks\n`;
      }
      
      if (clientReview.length > 0) {
        text += `\n*⚠️ Client action required:*\n`;
        clientReview.forEach((t: any) => {
          text += `- ${t.title}\n`;
        });
      }
      
      text += `\n*📅 Upcoming:*\n`;
      if (upcoming.length > 0) {
        upcoming.forEach((t: any) => {
          text += `- ${t.title}\n`;
        });
      } else {
        text += `- Project planning\n`;
      }

      if (nextMilestone) {
        text += `\n*🎯 Next Milestone:* ${nextMilestone.name} (Due: ${nextMilestone.dueDate ? new Date(nextMilestone.dueDate).toLocaleDateString() : 'TBD'})\n`;
      }

      text += `\n*⏱️ Timeline status:* ${
        project?.health === 'ON_TRACK' ? 'On track' :
        project?.health === 'AT_RISK' ? 'At risk' :
        project?.health === 'DELAYED' ? 'Delayed' :
        project?.health === 'BLOCKED' ? 'Blocked' : 'On track'
      }\n`;

      setUpdateText(text);
      setLoading(false);
    }
    
    generateUpdate();
  }, [projectId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(updateText);
    toast.success('Update copied. Paste it into WhatsApp or email.');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Client update</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
            Copy for WhatsApp
          </Button>
          <EmailButton context={{ projectId }} kind="PROJECT_UPDATE" label="Email update" variant="default" size="default" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Update</CardTitle>
          <CardDescription>
            Copy this for WhatsApp, or use Email update for a formatted email version (§10.2).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Generating update...</p>
          ) : (
            <Textarea
              className="min-h-[400px] font-mono whitespace-pre-wrap"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
