'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'las la-tachometer-alt' },
  { name: 'Leads', href: '/leads', icon: 'las la-bullhorn' },
  { name: 'Sales Pipeline', href: '/sales', icon: 'las la-chart-line' },
  { name: 'BDE Dashboard', href: '/bde', icon: 'las la-bullseye' },
  { name: 'Receivables', href: '/finance/receivables', icon: 'las la-receipt' },
  { name: 'Cash Flow Forecast', href: '/finance/forecast', icon: 'las la-chart-bar' },
  { name: 'P&L Statement', href: '/finance/pnl', icon: 'las la-file-invoice-dollar' },
  { name: 'Projects', href: '/projects', icon: 'las la-folder-open' },
  { name: 'Daily Founder OS', href: '/founder/daily', icon: 'las la-calendar-day' },
  { name: 'Weekly Founder OS', href: '/founder/weekly', icon: 'las la-calendar-week' },
  { name: 'Monthly Founder OS', href: '/founder/monthly', icon: 'las la-calendar-alt' },
  { name: 'Reports', href: '/reports', icon: 'las la-chart-pie' },
]

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="bg-background"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="StackTribe" width={28} height={28} className="rounded-md object-cover" />
            <span className="text-lg font-bold">StackTribe</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <i className={cn(item.icon, "text-xl shrink-0")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <i className="las la-sign-out-alt text-xl shrink-0" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
