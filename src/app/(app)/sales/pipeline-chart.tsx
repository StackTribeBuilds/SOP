'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function PipelineChart({ data }: { data: any[] }) {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981']

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
          <Tooltip 
            formatter={(value: any) => [formatCurrency(value), 'Value']}
            labelStyle={{ color: 'black' }}
          />
          <Bar dataKey="value" name="Value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
