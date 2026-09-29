import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { getProjects, getClients } from "@/lib/project-actions";
import { ProjectForm } from "./project-form";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    getProjects(),
    getClients()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and monitor your active projects.
          </p>
        </div>
        <ProjectForm clients={clients} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge
                  variant={project.status === "IN_PROGRESS" ? "default" : "secondary"}
                >
                  {project.status.replace("_", " ")}
                </Badge>
                <Badge
                  variant={project.health === "ON_TRACK" ? "outline" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {project.health === "ON_TRACK" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {project.health.replace("_", " ")}
                </Badge>
              </div>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.client?.company}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Contract Value</span>
                <span className="font-medium">₹{project.contractValue.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <Progress value={project.completionPercentage} />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/projects/${project.id}`}>
                  View Details <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No projects found. Create a project to get started.
          </div>
        )}
      </div>
    </div>
  );
}
