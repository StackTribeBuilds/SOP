import { getCaseStudies } from '@/lib/admin-actions'
import { CaseStudyList } from '@/components/admin/case-study-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function CaseStudiesPage() {
  const session = await getServerSession(authOptions)
  const studies = await getCaseStudies()
  
  const role = (session?.user as any)?.role
  const isFounder = role === 'FOUNDER' || role === 'CEO' || role === 'CTO' || role === 'ADMIN'

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Case Studies & Work Samples</h1>
        <p className="text-muted-foreground mt-1">View, download, and manage project case studies</p>
      </div>

      <CaseStudyList initialData={studies} userId={session?.user?.id as string} isFounder={isFounder} />
    </div>
  )
}
