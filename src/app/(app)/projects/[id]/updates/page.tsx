'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProjectTasks, getMilestones, getProjectById } from '@/lib/project-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Copy } from 'lucide-react';

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
    alert('Copied to clipboard!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weekly Update Generator</h1>
        <Button onClick={copyToClipboard} className="flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Copy to Clipboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Update</CardTitle>
          <CardDescription>
            Edit this message as needed before copying to WhatsApp or Email.
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
