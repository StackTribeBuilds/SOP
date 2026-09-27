'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface WeekData {
  week: string
  opening: number
  closing: number
  inflow: number
  outflow: number
}

export function ForecastChart({ weeks }: { weeks: WeekData[] }) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={weeks} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              formatCurrency(value),
              name === 'closing' ? 'Closing Cash' :
              name === 'inflow' ? 'Expected Inflow' :
              name === 'outflow' ? 'Expected Outflow' : name
            ]}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Legend />
          <Bar dataKey="inflow" name="Inflow" fill="#22c55e" opacity={0.7} />
          <Bar dataKey="outflow" name="Outflow" fill="#ef4444" opacity={0.7} />
          <Line
            type="monotone"
            dataKey="closing"
            name="Closing Cash"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ fill: '#3b82f6', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
