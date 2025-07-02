"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, Legend, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { DailyFinancialActivity } from "@/lib/types"

interface FinancialActivityChartProps {
  data: DailyFinancialActivity[]
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  deposits: {
    label: "Deposits",
    color: "hsl(var(--chart-2))",
  },
  withdrawals: {
    label: "Withdrawals",
    color: "hsl(var(--chart-5))",
  },
}

export function FinancialActivityChart({ data }: FinancialActivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Activity - Last 30 Days</CardTitle>
        <CardDescription>
          Daily revenue (bets - payouts), deposits, and withdrawals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
                tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                labelFormatter={(label, payload) => {
                    if (!payload || !payload.length) {
                        return label;
                    }
                    return new Date(payload[0].payload.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    });
                }}
                formatter={(value) => `INR ${value.toFixed(2)}`}
              />}
            />
            <Legend />
            <Bar dataKey="deposits" fill="var(--color-deposits)" radius={4} />
            <Bar dataKey="withdrawals" fill="var(--color-withdrawals)" radius={4} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
