import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { getProjectById } from "@/lib/project-actions";
import { notFound } from "next/navigation";
import { ProjectNav } from "./project-nav";
import { Button } from "@/components/ui/button";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const project = await getProjectById(projectId);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              Client: {project.client?.company} • Status: {project.status.replace('_', ' ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Project Settings & Info
              </Button>
            </Link>
          </div>
        </div>
        
        <ProjectNav projectId={projectId} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
