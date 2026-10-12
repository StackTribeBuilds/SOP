import { getDocuments } from '@/lib/admin-actions'
import { DocumentList } from '@/components/admin/document-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = { title: 'SOPs & docs' };

export default async function BDEDocumentsPage() {
  const session = await getServerSession(authOptions)
  const docs = await getDocuments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">SOPs & docs</h1>
        <p className="text-muted-foreground mt-1">View company procedures and work documents</p>
      </div>

      <DocumentList initialData={docs} userId={session?.user?.id as string} isFounder={false} />
    </div>
  )
}
