'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { formatCurrency } from '@/lib/utils'

// Stages deepen in violet as deals get closer; won is the only green
const STAGE_FILL = ['#cbbdf2', '#a58ee6', '#7d5fd6', '#5b3fb8']
const WON_FILL = '#17805a'

const lakh = (v: number) => (v >= 1e5 ? `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)}L` : v >= 1e3 ? `₹${Math.round(v / 1e3)}k` : `₹${v}`)

export function PipelineChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <YAxis tickFormatter={lakh} tickLine={false} axisLine={false} width={56} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            formatter={(value) => [formatCurrency(Number(value)), 'Value']}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.name === 'Won' ? WON_FILL : STAGE_FILL[Math.min(index, STAGE_FILL.length - 1)]} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v) => (Number(v) > 0 ? lakh(Number(v)) : '')}
              style={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
