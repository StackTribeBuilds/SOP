import { getDealRoomData } from "@/lib/deal-room-actions";
import { DealRoomClient } from "./deal-room-client";
import { notFound } from "next/navigation";

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const project = await getDealRoomData(projectId);
  if (!project) return notFound();

  return <DealRoomClient project={project} />;
}
