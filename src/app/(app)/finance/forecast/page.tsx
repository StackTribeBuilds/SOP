import { getCashFlowForecast } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ForecastChart } from './chart'
import { AlertTriangle } from 'lucide-react'

export default async function ForecastPage() {
  const weeks = await getCashFlowForecast()
  
  // Find weeks with negative closing cash
  const negativeWeeks = weeks.filter(w => w.closingCash < 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">13-Week Cash Flow Forecast</h1>
        <p className="text-muted-foreground">See the cash crisis before it happens</p>
      </div>

      {/* Alerts */}
      {negativeWeeks.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">⚠️ Cash Deficit Detected</p>
            <p className="text-sm text-red-700 mt-1">
              Week(s) {negativeWeeks.map(w => w.weekNumber).join(', ')} show negative closing cash.
              Take action now: accelerate collections, push invoices, or close new advance-heavy projects.
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trajectory</CardTitle>
          <CardDescription>Projected cash position over 13 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastChart weeks={weeks.map(w => ({
            week: `W${w.weekNumber}`,
            opening: w.openingCash,
            closing: w.closingCash,
            inflow: w.expectedIn,
            outflow: w.expectedOut,
          }))} />
        </CardContent>
      </Card>

      {/* Weekly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Week</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Opening</th>
                  <th className="text-right py-2 px-3 font-medium text-green-600">Committed In</th>
                  <th className="text-right py-2 px-3 font-medium text-yellow-600">Probable In</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-400">Pipeline In</th>
                  <th className="text-right py-2 px-3 font-medium text-red-600">Expected Out</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Closing</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.weekNumber} className={`border-b last:border-0 ${week.closingCash < 0 ? 'bg-red-50' : ''}`}>
                    <td className="py-2 px-3 font-medium">W{week.weekNumber}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {new Date(week.weekStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' — '}
                      {new Date(week.weekEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(week.openingCash)}</td>
                    <td className="py-2 px-3 text-right text-green-600">
                      {week.committedIn > 0 ? `+${formatCurrency(week.committedIn)}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-yellow-600">
                      {week.probableIn > 0 ? `+${formatCurrency(week.probableIn)}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">
                      {week.pipelineIn > 0 ? `+${formatCurrency(week.pipelineIn)}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-red-600">
                      {week.expectedOut > 0 ? `-${formatCurrency(week.expectedOut)}` : '—'}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${
                      week.closingCash < 0 ? 'text-red-700' : 'text-foreground'
                    }`}>
                      {formatCurrency(week.closingCash)}
                      {week.closingCash < 0 && (
                        <Badge variant="danger" className="ml-2 text-[10px]">DEFICIT</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
