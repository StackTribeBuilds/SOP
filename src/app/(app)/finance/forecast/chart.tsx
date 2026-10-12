'use client'

import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface WeekData {
  week: string
  opening: number
  closing: number
  inflow: number
  outflow: number
}

const lakh = (v: number) => {
  const a = Math.abs(v)
  const s = v < 0 ? '−' : ''
  return a >= 1e5 ? `${s}₹${(a / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L` : a >= 1e3 ? `${s}₹${Math.round(a / 1e3)}k` : `${s}₹${Math.round(a)}`
}

const LABEL: Record<string, string> = { closing: 'Closing cash', inflow: 'Coming in', outflow: 'Going out' }

export function ForecastChart({ weeks, floor }: { weeks: WeekData[]; floor: number }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={weeks} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="closingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b3fb8" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#5b3fb8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <YAxis tickFormatter={lakh} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), LABEL[String(name)] ?? String(name)]}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
            cursor={{ fill: 'var(--muted)' }}
          />
          <ReferenceLine y={floor} stroke="var(--bad)" strokeDasharray="4 4"
            label={{ value: `Floor ${lakh(floor)}`, position: 'insideTopRight', fontSize: 11, fill: 'var(--bad)' }} />
          <Bar isAnimationActive={false} dataKey="inflow" fill="#17805a" fillOpacity={0.55} radius={[3, 3, 0, 0]} barSize={10} />
          <Bar isAnimationActive={false} dataKey="outflow" fill="#c2363f" fillOpacity={0.45} radius={[3, 3, 0, 0]} barSize={10} />
          <Area isAnimationActive={false} type="monotone" dataKey="closing" stroke="#5b3fb8" strokeWidth={2.5} fill="url(#closingFill)"
            dot={{ r: 3, fill: '#5b3fb8', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
