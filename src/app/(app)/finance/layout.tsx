import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) redirect('/login')
  
  const role = (session.user as any).role
  if (role === 'BDE' || role === 'BUSINESS_ANALYST') {
    redirect('/bde') // BDE shouldn't see finance
  }

  return <>{children}</>
}
