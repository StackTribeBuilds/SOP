import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { getProjectById, getProjectGates } from "@/lib/project-actions";
import { ProjectStatusControl } from "./project-status-control";
import { notFound } from "next/navigation";
import { ProjectNav } from "./project-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const [project, gates] = await Promise.all([getProjectById(projectId), getProjectGates(projectId)]);
  if (!project || !gates) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="mb-3 flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{project.name}</h1>
              {project.isRecurring && <Badge variant="success">Recurring</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href={`/clients/${project.clientId}/onboard`} className="hover:text-foreground">{project.client?.company}</Link>
              {project.projectOwner && <> · Owner {project.projectOwner.name}</>}
              {project.techOwner && project.techOwner.id !== project.projectOwner?.id && <> · Tech {project.techOwner.name}</>}
            </p>
            <div className="mt-3">
              <ProjectStatusControl projectId={projectId} gates={gates} />
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="h-4 w-4" />
              Edit details
            </Link>
          </Button>
        </div>
        
        <ProjectNav projectId={projectId} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
