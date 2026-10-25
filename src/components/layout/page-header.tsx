import { cn } from '@/lib/utils'

// One header shape for every page: what this page is for, and its main action on the right
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {/* A div, not a p: descriptions may contain badges, which render as divs */}
        {description && <div className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// A labelled figure. Used for the handful of numbers a page is about, not as decoration.
export function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'good' | 'warn' | 'bad'
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('figure mt-1 text-[28px] font-semibold leading-none tracking-tight',
        tone === 'good' && 'text-good', tone === 'warn' && 'text-warn', tone === 'bad' && 'text-bad')}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// A row of stats sharing one surface, divided by hairlines, instead of a grid of identical cards
export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'surface grid grid-cols-2 gap-px overflow-hidden !bg-border md:grid-flow-col md:auto-cols-fr md:grid-cols-none',
      '[&>*]:bg-card [&>*]:px-5 [&>*]:py-4 [&>*]:sm:px-6',
      // On phones an odd last stat takes the full row instead of leaving a gap
      '[&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1',
      className
    )}>
      {children}
    </div>
  )
}
