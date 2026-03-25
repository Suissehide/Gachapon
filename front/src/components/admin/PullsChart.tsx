import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card } from '../ui/card'

type PullsChartProps = {
  data: { day: string; count: number }[]
}

type TooltipContentProps = {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-0.5 text-[11px] font-bold text-text">{label}</p>
      <p className="text-[11px] text-text-light">
        {payload[0].value?.toLocaleString('fr-FR')} pulls
      </p>
    </div>
  )
}

export function PullsChart({ data }: PullsChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0)

  const last7 = data.slice(-7).reduce((s, d) => s + d.count, 0)
  const prev7 = data.slice(-14, -7).reduce((s, d) => s + d.count, 0)
  const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
              Pulls / jour
            </p>
            <p className="text-[10px] text-text-light/60">30 derniers jours</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-black text-text">
              {total.toLocaleString('fr-FR')}
            </p>
            <p className="text-[10px] text-text-light">total</p>
          </div>
          {trend !== null && (
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                trend > 0
                  ? 'bg-green-500/10 text-green-500'
                  : trend < 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-border text-text-light'
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      <div className="**:outline-none">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="35%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 10, fill: 'hsl(var(--text-light))' }}
              tickFormatter={(v) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 10, fill: 'hsl(var(--text-light))' }}
              width={30}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              activeBar={{ fillOpacity: 1 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
