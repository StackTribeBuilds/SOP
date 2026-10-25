'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  BarChart3, BookOpen, Briefcase, CalendarCheck, CalendarDays, CalendarRange, Columns3, FileSpreadsheet,
  FolderKanban, Gauge, Handshake, LineChart, LogOut, Mail, Menu, PiggyBank, Receipt, ScrollText, Sun, Target,
  TrendingUp, Users, Wallet, X, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { name: string; href: string; icon: LucideIcon; match?: string[] }
type NavGroup = { label: string | null; items: NavItem[] }

// Grouped in the order work flows through the business: sell, deliver, get paid, review
const founderNav: NavGroup[] = [
  { label: null, items: [{ name: 'Today', href: '/dashboard', icon: Sun }] },
  {
    label: 'Sell',
    items: [
      { name: 'Leads', href: '/leads', icon: Target, match: ['/leads'] },
      { name: 'Lead board', href: '/leads/kanban', icon: Columns3 },
      { name: 'Pipeline', href: '/sales', icon: TrendingUp },
      { name: 'BDE scorecard', href: '/bde', icon: Gauge, match: ['/bde'] },
    ],
  },
  {
    label: 'Deliver',
    items: [
      { name: 'Clients', href: '/clients', icon: Handshake },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Emails', href: '/emails', icon: Mail },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Receivables', href: '/finance/receivables', icon: Receipt },
      { name: 'Cash forecast', href: '/finance/forecast', icon: LineChart },
      { name: 'P&L', href: '/finance/pnl', icon: BarChart3 },
      { name: 'Expenses', href: '/finance/expenses', icon: Wallet },
      { name: 'Founder pay', href: '/finance/withdrawals', icon: PiggyBank },
    ],
  },
  {
    label: 'Run the company',
    items: [
      { name: 'Daily review', href: '/founder/daily', icon: CalendarCheck },
      { name: 'Weekly meeting', href: '/founder/weekly', icon: CalendarDays },
      { name: 'Monthly review', href: '/founder/monthly', icon: CalendarRange },
      { name: 'KPIs', href: '/reports', icon: ScrollText },
      { name: 'Team', href: '/founder/staff', icon: Users },
      { name: 'SOPs & docs', href: '/founder/documents', icon: BookOpen },
      { name: 'Sheets', href: '/founder/spreadsheets', icon: FileSpreadsheet },
      { name: 'Case studies', href: '/case-studies', icon: Briefcase },
    ],
  },
]

const businessNav: NavGroup[] = [
  { label: null, items: [{ name: 'My day', href: '/bde', icon: Sun }] },
  {
    label: 'Sell',
    items: [
      { name: 'Leads', href: '/leads', icon: Target, match: ['/leads'] },
      { name: 'Lead board', href: '/leads/kanban', icon: Columns3 },
      { name: 'Pipeline', href: '/sales', icon: TrendingUp },
      { name: 'Emails', href: '/emails', icon: Mail },
    ],
  },
  {
    label: 'Resources',
    items: [
      { name: 'SOPs & docs', href: '/bde/documents', icon: BookOpen },
      { name: 'Sheets', href: '/bde/spreadsheets', icon: FileSpreadsheet },
      { name: 'Case studies', href: '/case-studies', icon: Briefcase },
    ],
  },
]

const ROLE_LABEL: Record<string, string> = {
  FOUNDER: 'Founder', CEO: 'CEO', CTO: 'CTO', ADMIN: 'Admin', BDE: 'BDE', BUSINESS_ANALYST: 'Business analyst', DEVELOPER: 'Developer',
}

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role
  const isFounder = role === 'FOUNDER' || role === 'CEO' || role === 'CTO' || role === 'ADMIN'
  const isBusiness = role === 'BDE' || role === 'BUSINESS_ANALYST'
  const navigation = isFounder ? founderNav : isBusiness ? businessNav : []

  // The most specific matching link wins, so /leads/kanban doesn't also light up Leads
  const allItems = navigation.flatMap(g => g.items)
  const activeHref = allItems
    .filter(i => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <>
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-md bg-sidebar text-sidebar-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href={isFounder ? '/dashboard' : '/bde'} className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="" width={26} height={26} className="rounded-md object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">StackTribe OS</span>
          </Link>
          <button type="button" className="lg:hidden text-sidebar-muted" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-5 pt-2">
          {navigation.map((group, gi) => (
            <div key={group.label ?? gi} className="space-y-0.5">
              {group.label && <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted">{group.label}</p>}
              {group.items.map((item) => {
                const active = item.href === activeHref
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] transition-colors',
                      active
                        ? 'bg-sidebar-active text-white font-medium'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-active/60 hover:text-white'
                    )}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#a98ef0]" />}
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#c9b8ff]' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold">
              {session?.user?.name?.charAt(0) ?? '·'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{session?.user?.name}</p>
              <p className="truncate text-xs text-sidebar-muted">{role ? ROLE_LABEL[role] ?? role : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-active hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
