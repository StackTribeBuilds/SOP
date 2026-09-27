import { getProjectTasks } from "@/lib/project-actions";
import { TaskBoard } from "./task-board";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const tasks = await getProjectTasks(projectId);

  return (
    <div>
      <TaskBoard initialTasks={tasks} projectId={projectId} />
    </div>
  );
}
