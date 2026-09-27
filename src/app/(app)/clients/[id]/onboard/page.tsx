import { getClientById } from "@/lib/project-actions";
import { notFound } from "next/navigation";
import { OnboardClientForm } from "./onboard-client-form";

export default async function ClientOnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const client = await getClientById(resolvedParams.id);

  if (!client) {
    notFound();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Client Onboarding</h1>
        <p className="text-muted-foreground mt-2">
          Complete the onboarding checklist for {client.company}.
        </p>
      </div>
      
      <OnboardClientForm client={client} />
    </div>
  );
}
