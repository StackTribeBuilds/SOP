import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MoneyBar } from '@/components/layout/money-bar'
import { getMoneyBar } from '@/lib/actions'
import { getCurrentUser, isFounderRole } from '@/lib/session'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Checked against the database, not just the cookie: a cookie for a missing
  // or deactivated account is treated as signed out
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?reason=session')
  }

  // Founders see the money on every page; BDEs don't have finance access
  const moneyBar = isFounderRole(user.role) ? await getMoneyBar() : null

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
