import { notFound } from "next/navigation";
import { getMilestones, getProjectById } from "@/lib/project-actions";
import { MilestoneManager } from "./milestone-manager";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const [project, milestones] = await Promise.all([
    getProjectById(projectId),
    getMilestones(projectId),
  ]);
  if (!project) notFound();

  return (
    <MilestoneManager
      projectId={projectId}
      contractValue={project.contractValue}
      clientName={project.client.company}
      milestones={milestones}
    />
  );
}
