"use client"

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type ValueFormat = "count" | "peso"

const FORMATS: Record<ValueFormat, { full: Intl.NumberFormat; axis: Intl.NumberFormat }> = {
  count: {
    full: new Intl.NumberFormat("en-PH"),
    axis: new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }),
  },
  peso: {
    full: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 2 }),
    axis: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }),
  },
}

// Categorical slots of the validated reference palette, plus a muted ink
// for "prior period" comparison lines.
export const SERIES = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  muted: "#9ca3af",
} as const

const GRID = "#e5e7eb"
const AXIS_TICK = { fill: "#6b7280", fontSize: 12 }

export type ChartSeries = {
  key: string
  label: string
  color: string
  /** TrendChart only: filled area (primary) or line. */
  variant?: "area" | "line"
  dashed?: boolean
}

/** Time series with crosshair tooltip and a legend when there are ≥ 2 series. */
export function TrendChart({
  data,
  xKey,
  series,
  height = 280,
  format = "count",
}: {
  data: Record<string, string | number | null>[]
  xKey: string
  series: ChartSeries[]
  height?: number
  format?: ValueFormat
}) {
  return (
    <div>
      {series.length > 1 && <Legend series={series} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS_TICK} />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickFormatter={(v: number) => FORMATS[format].axis.format(v)}
            />
            <Tooltip
              cursor={{ stroke: "#9ca3af", strokeDasharray: "3 3" }}
              content={<ChartTooltip series={series} format={format} />}
            />
            {series.map((s) =>
              s.variant === "area" ? (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
              ) : (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Column chart: one bar per series per period, side by side (or stacked).
 * Rows with `forecast: true` are drawn faded with a dashed outline.
 */
export function ColumnChart({
  data,
  xKey,
  series,
  height = 260,
  format = "count",
  stacked = false,
}: {
  data: Record<string, string | number | boolean | null | undefined>[]
  xKey: string
  series: ChartSeries[]
  height?: number
  format?: ValueFormat
  stacked?: boolean
}) {
  const hasForecast = data.some((d) => d.forecast)
  return (
    <div>
      {(series.length > 1 || hasForecast) && (
        <div className="flex flex-wrap items-center gap-x-4">
          {series.length > 1 && <Legend series={series} swatch="square" />}
          {hasForecast && (
            <span className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm border border-dashed border-[#2a78d6] bg-[#2a78d6]/30" aria-hidden />
              Forecast
            </span>
          )}
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS_TICK} />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              allowDecimals={false}
              tickFormatter={(v: number) => FORMATS[format].axis.format(v)}
            />
            <Tooltip cursor={{ fill: "#f3f4f6" }} content={<ChartTooltip series={series} format={format} />} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                stackId={stacked ? "stack" : undefined}
                // Only the top segment of a stack gets rounded ends.
                radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={stacked ? 44 : 22}
              >
                {data.map((d, j) => (
                  <Cell
                    key={j}
                    fillOpacity={d.forecast ? 0.3 : 1}
                    stroke={d.forecast ? s.color : undefined}
                    strokeDasharray={d.forecast ? "4 3" : undefined}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Legend({ series, swatch = "line" }: { series: ChartSeries[]; swatch?: "line" | "square" }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {swatch === "square" ? (
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          ) : (
            <svg width="16" height="8" aria-hidden>
              <line
                x1="0"
                x2="16"
                y1="4"
                y2="4"
                stroke={s.color}
                strokeWidth="2.5"
                strokeDasharray={s.dashed ? "4 3" : undefined}
              />
            </svg>
          )}
          {s.label}
        </li>
      ))}
    </ul>
  )
}

type TooltipPayload = { dataKey?: string | number; value?: number | string | null }

function ChartTooltip({
  active,
  payload,
  label,
  series,
  format,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
  series: ChartSeries[]
  format: ValueFormat
}) {
  if (!active || !payload?.length) return null
  const rows = series
    .map((s) => ({ ...s, value: payload.find((p) => p.dataKey === s.key)?.value }))
    .filter((r) => r.value !== null && r.value !== undefined)
  if (!rows.length) return null

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />
          <span className="text-muted-foreground">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{FORMATS[format].full.format(Number(r.value))}</span>
        </p>
      ))}
    </div>
  )
}
