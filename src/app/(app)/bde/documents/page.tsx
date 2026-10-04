import { getDocuments } from '@/lib/admin-actions'
import { DocumentList } from '@/components/admin/document-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function BDEDocumentsPage() {
  const session = await getServerSession(authOptions)
  const docs = await getDocuments()

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold">SOPs & Documents</h1>
        <p className="text-muted-foreground mt-1">View company procedures and work documents</p>
      </div>

      <DocumentList initialData={docs} userId={session?.user?.id as string} isFounder={false} />
    </div>
  )
}
