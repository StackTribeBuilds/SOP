import { getChangeRequests } from '@/lib/project-actions';
import { ChangeRequests } from './change-requests';

export const metadata = { title: 'Change requests' };

export default async function ChangesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const changeRequests = await getChangeRequests(projectId);

  return <ChangeRequests projectId={projectId} changeRequests={changeRequests} />;
}
