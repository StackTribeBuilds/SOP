import { getProjectById, getProjectTasks } from "@/lib/project-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const [project, tasks] = await Promise.all([
    getProjectById(projectId),
    getProjectTasks(projectId)
  ]);

  if (!project) return null;

  const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'THIS_WEEK');

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main Content: Readme & Scope */}
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Scope & Readme</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            {project.description ? (
              <p className="whitespace-pre-wrap">{project.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description or readme provided yet.</p>
            )}
            
            {project.scope && (
              <>
                <h3 className="text-lg font-semibold mt-6 mb-2">Scope of Work</h3>
                <p className="whitespace-pre-wrap">{project.scope}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Active Work</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTasks.length > 0 ? (
              <div className="space-y-4">
                {activeTasks.map(task => (
                  <div key={task.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.assignee?.name || 'Unassigned'}</p>
                    </div>
                    <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active tasks right now. Check the Task Board.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Contract Value</span>
              <span className="font-semibold text-lg">{formatCurrency(project.contractValue)}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground block mb-1">Health</span>
              <Badge variant={project.health === 'ON_TRACK' ? 'outline' : 'destructive'}>
                {project.health.replace('_', ' ')}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Start Date</span>
              <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'}</span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Expected End Date</span>
              <span>{project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : 'TBD'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
