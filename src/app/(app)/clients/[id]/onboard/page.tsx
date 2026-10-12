import { getClientById } from "@/lib/project-actions";
import { notFound } from "next/navigation";
import { OnboardClientForm } from "./onboard-client-form";

export const metadata = { title: 'Onboarding' };

export default async function ClientOnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const client = await getClientById(resolvedParams.id);

  if (!client) {
    notFound();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Onboarding</h1>
        <p className="text-muted-foreground mt-2">
          Complete the onboarding checklist for {client.company}.
        </p>
      </div>
      
      <OnboardClientForm client={client} />
    </div>
  );
}
