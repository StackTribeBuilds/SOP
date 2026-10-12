'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Banknote, ChevronDown, IndianRupee, Plus, Target, Wallet } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LeadForm } from '@/app/(app)/leads/lead-form'
import { ExpenseForm } from '@/app/(app)/finance/expenses/expense-form'
import { UpdateBalanceDialog } from '@/app/(app)/dashboard/quick-actions'

export type MoneyBarData = {
  cash: number
  cashUpdatedAt: Date | null
  cashAgeDays: number | null
  floor: number
  zone: 'GREEN' | 'YELLOW' | 'RED'
  owed: number
  overdue: number
  overdueCount: number
  dueNext7: number
  weightedPipeline: number
}

const ZONE = {
  GREEN: { dot: 'bg-good', text: 'Healthy' },
  YELLOW: { dot: 'bg-warn', text: 'Near floor' },
  RED: { dot: 'bg-bad', text: 'Below floor' },
}

// Compact rupees for the bar: ₹2.4L, ₹85k, ₹1.2Cr
function short(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`
  if (abs >= 1e3) return `${sign}₹${Math.round(abs / 1e3)}k`
  return `${sign}₹${Math.round(abs)}`
}

function daysAgo(days: number | null) {
  if (days == null) return 'never updated'
  return days <= 0 ? 'updated today' : days === 1 ? 'updated yesterday' : `updated ${days} days ago`
}

function Figure({ href, label, value, title, sub, tone }: {
  href: string
  label: string
  value: string
  title: string
  sub?: React.ReactNode
  tone?: 'bad' | 'warn'
}) {
  return (
    <Link href={href} title={title}
      className="group flex shrink-0 flex-col justify-center rounded-md px-2.5 py-1 hover:bg-muted sm:px-3">
      <span className="text-[11.5px] text-muted-foreground leading-tight whitespace-nowrap">{label}</span>
      <span className={cn('figure text-[17px] font-semibold leading-tight whitespace-nowrap',
        tone === 'bad' && 'text-bad', tone === 'warn' && 'text-warn')}>
        {value}
        {sub}
      </span>
    </Link>
  )
}

export function MoneyBar({ data }: { data: MoneyBarData }) {
  const zone = ZONE[data.zone]
  // The balance is typed in by hand, so flag it once it's more than 3 days old
  const stale = data.cashAgeDays == null || data.cashAgeDays > 3

  return (
    <div className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex h-14 items-center gap-1 pl-14 pr-3 lg:pl-4 sm:pr-6">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          <Figure
            href="/dashboard"
            label="Cash in bank"
            title={`Floor ${formatCurrency(data.floor)}, ${daysAgo(data.cashAgeDays)}`}
            value={short(data.cash)}
            sub={
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11.5px] font-normal font-sans text-muted-foreground">
                <span className={cn('h-2 w-2 rounded-full', zone.dot)} />
                <span className="hidden sm:inline">{zone.text}</span>
                {stale && <span className="hidden text-warn xl:inline">, {daysAgo(data.cashAgeDays)}</span>}
              </span>
            }
          />
          <span className="h-8 w-px shrink-0 bg-border" />
          <Figure href="/finance/receivables" label="Owed to us" title="Sent invoices not yet paid" value={short(data.owed)} />
          <Figure
            href="/finance/receivables"
            label={data.overdueCount ? `Overdue · ${data.overdueCount} invoice${data.overdueCount > 1 ? 's' : ''}` : 'Overdue'}
            title="Past due date. Chase these first (Bible §13)"
            value={short(data.overdue)}
            tone={data.overdue > 0 ? 'bad' : undefined}
          />
          <Figure href="/finance/forecast" label="Due in 7 days" title="Invoices falling due this coming week" value={short(data.dueNext7)} />
          <span className="h-8 w-px shrink-0 bg-border hidden md:block" />
          <div className="hidden md:block">
            <Figure href="/sales" label="Pipeline, weighted" title="Qualified open deals × stage probability. Not cash (Bible §5.3)" value={short(data.weightedPipeline)} />
          </div>
        </div>
        <QuickAdd />
      </div>
    </div>
  )
}

type Dialog = 'lead' | 'expense' | 'balance' | null

function QuickAdd() {
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = (open: boolean) => { if (!open) setDialog(null) }

  const item = 'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted'

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button size="sm" className="shrink-0">
            <Plus className="h-4 w-4" /> New <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6}
            className="z-50 w-56 rounded-lg border bg-popover p-1 shadow-lg">
            <DropdownMenu.Item className={item} onSelect={() => setDialog('lead')}>
              <Target className="h-4 w-4 text-muted-foreground" /> Lead
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} asChild>
              <Link href="/finance/receivables"><IndianRupee className="h-4 w-4 text-muted-foreground" /> Payment received</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => setDialog('expense')}>
              <Wallet className="h-4 w-4 text-muted-foreground" /> Expense
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item className={item} onSelect={() => setDialog('balance')}>
              <Banknote className="h-4 w-4 text-muted-foreground" /> Update bank balance
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <LeadForm hideTrigger open={dialog === 'lead'} onOpenChange={close} />
      <ExpenseForm hideTrigger open={dialog === 'expense'} onOpenChange={close} />
      <UpdateBalanceDialog hideTrigger open={dialog === 'balance'} onOpenChange={close} />
    </>
  )
}
