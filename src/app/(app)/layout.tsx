import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { MoneyBar } from '@/components/layout/money-bar'
import { getMoneyBar } from '@/lib/actions'
import { isFounderRole } from '@/lib/session'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Founders see the money on every page; BDEs don't have finance access
  const moneyBar = isFounderRole(session.user.role) ? await getMoneyBar() : null

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-60">
        {moneyBar ? (
          <MoneyBar data={moneyBar} />
        ) : (
          <div className="h-14 lg:hidden" />
        )}
        <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
