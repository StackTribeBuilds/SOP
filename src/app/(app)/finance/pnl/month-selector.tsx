'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function MonthSelector({ currentYear, currentMonth }: { currentYear: number; currentMonth: number }) {
  const router = useRouter()

  const goTo = (year: number, month: number) => {
    router.push(`/finance/pnl?year=${year}&month=${month}`)
  }

  const prevMonth = () => {
    if (currentMonth === 0) goTo(currentYear - 1, 11)
    else goTo(currentYear, currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) goTo(currentYear + 1, 0)
    else goTo(currentYear, currentMonth + 1)
  }

  const label = new Date(currentYear, currentMonth).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={prevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[120px] text-center">{label}</span>
      <Button variant="outline" size="icon" onClick={nextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
