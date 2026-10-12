import { getCaseStudies } from '@/lib/admin-actions'
import { CaseStudyList } from '@/components/admin/case-study-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = { title: 'Case studies' };

export default async function CaseStudiesPage() {
  const session = await getServerSession(authOptions)
  const studies = await getCaseStudies()
  
  const role = (session?.user as any)?.role
  const isFounder = role === 'FOUNDER' || role === 'CEO' || role === 'CTO' || role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Case studies</h1>
        <p className="text-muted-foreground mt-1">View, download, and manage project case studies</p>
      </div>

      <CaseStudyList initialData={studies} userId={session?.user?.id as string} isFounder={isFounder} />
    </div>
  )
}
