import { cn } from '@/lib/utils'
import { formatCurrency, getCashZone } from '@/lib/utils'

interface CashZoneIndicatorProps {
  currentCash: number
  minimumFloor: number
}

export function CashZoneIndicator({ currentCash, minimumFloor }: CashZoneIndicatorProps) {
  const zone = getCashZone(currentCash, minimumFloor)
  
  const zoneConfig = {
    GREEN: {
      label: 'GREEN',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Cash reserve healthy',
    },
    YELLOW: {
      label: 'YELLOW',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Approaching minimum',
    },
    RED: {
      label: 'RED',
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Below minimum floor',
    },
  }

  const config = zoneConfig[zone]

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5', config.bgColor, config.borderColor)}>
      <div className={cn('h-2.5 w-2.5 rounded-full animate-pulse', config.color)} />
      <div className="flex flex-col">
        <span className={cn('text-xs font-semibold', config.textColor)}>
          {config.label} ZONE
        </span>
        <span className="text-[10px] text-muted-foreground">
          {config.description}
        </span>
      </div>
    </div>
  )
}
