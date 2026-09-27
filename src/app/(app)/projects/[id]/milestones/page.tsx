import { getMilestones } from "@/lib/project-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const milestones = await getMilestones(projectId);

  // If no milestones, show empty state
  if (!milestones || milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg p-12 text-center">
        <h3 className="mt-4 text-lg font-semibold">No milestones</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't created any milestones for this project yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative border-l-2 border-muted ml-3 md:ml-6 space-y-8 pb-4">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.status === "COMPLETED";
          const isCurrent = milestone.status === "IN_PROGRESS";
          
          return (
            <div key={milestone.id} className="relative pl-8 md:pl-12">
              <div className="absolute -left-[11px] top-1 bg-background rounded-full">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5 text-blue-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <Card className={isCurrent ? "border-blue-500/50 shadow-sm" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                    <CardTitle className="text-lg">{milestone.name}</CardTitle>
                    <Badge variant={isCompleted ? "default" : isCurrent ? "secondary" : "outline"}>
                      {milestone.status || "PENDING"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "Not set"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {milestone.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
