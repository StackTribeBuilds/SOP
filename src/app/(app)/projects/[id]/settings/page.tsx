import { getProjectById } from "@/lib/project-actions";
import { notFound } from "next/navigation";
import { ProjectSettingsForm } from "./settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const project = await getProjectById(resolvedParams.id);
  
  if (!project) notFound();

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectSettingsForm project={project} />
        </CardContent>
      </Card>
    </div>
  );
}
