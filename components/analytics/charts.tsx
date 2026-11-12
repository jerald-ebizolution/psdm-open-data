"use client"

/**
 * Charts styled after BetterGov.ph (flood-control-projects): Recharts, dashed
 * 3-3 grid, small axis text, plain white tooltip, legend under the plot,
 * square-ended bars, pies with labels and a dot legend beside them.
 */

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { PALETTE, type ValueFormat } from "./palette"

export type { ValueFormat } from "./palette"

const FORMATS: Record<ValueFormat, { full: (n: number) => string; axis: (n: number) => string }> = {
  count: {
    full: (n) => new Intl.NumberFormat("en-PH").format(n),
    axis: (n) => new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(n),
  },
  peso: {
    full: (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 2 }).format(n),
    axis: (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }).format(n),
  },
  percent: {
    full: (n) => `${(n * 100).toFixed(1)}%`,
    axis: (n) => `${Math.round(n * 100)}%`,
  },
}

const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 6, borderColor: "#e5e7eb", fontSize: 12, padding: "6px 10px" },
  labelStyle: { fontWeight: 600, color: "#1f2937", marginBottom: 2 },
  itemStyle: { padding: 0 },
}
const LEGEND_STYLE = { fontSize: 11, paddingTop: 4 }

/** Sizes that adapt to phones. */
function useChartLayout(height: number) {
  const isMobile = useIsMobile()
  return {
    isMobile,
    height: isMobile ? Math.max(220, Math.round(height * 0.85)) : height,
    margin: { top: 16, right: isMobile ? 8 : 24, left: isMobile ? 0 : 8, bottom: 4 },
    tick: { fontSize: isMobile ? 9 : 10, fill: "#4b5563" },
    yWidth: isMobile ? 44 : 56,
    xAxis: { interval: "preserveStartEnd" as const, minTickGap: isMobile ? 2 : 6 },
  }
}

export type ChartSeries = {
  key: string
  label: string
  color: string
  /** TrendChart only: filled area (primary) or line. */
  variant?: "area" | "line"
  dashed?: boolean
}

// ---------------------------------------------------------------------------
// Time series (area / line)
// ---------------------------------------------------------------------------

export function TrendChart({
  data,
  xKey,
  series,
  height = 300,
  format = "count",
}: {
  data: Record<string, string | number | null>[]
  xKey: string
  series: ChartSeries[]
  height?: number
  format?: ValueFormat
}) {
  const l = useChartLayout(height)
  const f = FORMATS[format]
  return (
    <div className="min-w-0" style={{ height: l.height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={l.margin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={l.tick} {...l.xAxis} />
          <YAxis width={l.yWidth} tick={l.tick} tickFormatter={f.axis} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (v === null || v === undefined ? "—" : f.full(Number(v)))} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} itemSorter={null} />}
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
                fillOpacity={0.25}
                dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
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
                dot={s.dashed ? false : { r: 2.5, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column chart (grouped or stacked). Rows with `forecast: true` are faded.
// ---------------------------------------------------------------------------

export function ColumnChart({
  data,
  xKey,
  series,
  height = 300,
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
  const l = useChartLayout(height)
  const f = FORMATS[format]
  return (
    <div className="min-w-0">
      <div style={{ height: l.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={l.margin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={l.tick} {...l.xAxis} />
            <YAxis width={l.yWidth} tick={l.tick} allowDecimals={false} tickFormatter={f.axis} />
            <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#f3f4f6" }} formatter={(v) => f.full(Number(v))} />
            <Legend wrapperStyle={LEGEND_STYLE} itemSorter={null} />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                stackId={stacked ? "stack" : undefined}
                maxBarSize={stacked ? 48 : 28}
                isAnimationActive={false}
              >
                {/* Per-bar cells only when needed (forecast rows are faded). */}
                {hasForecast &&
                  data.map((d, j) => (
                    <Cell
                      key={j}
                      fill={s.color}
                      fillOpacity={d.forecast ? 0.35 : 1}
                      stroke={d.forecast ? s.color : undefined}
                      strokeDasharray={d.forecast ? "4 3" : undefined}
                    />
                  ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasForecast && <p className="mt-1 text-center text-[11px] text-gray-500">Faded bar = forecast</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Horizontal bar chart — rankings ("Top 10 …")
// ---------------------------------------------------------------------------

export function HorizontalBarChart({
  items,
  label = "Value",
  color = PALETTE[0],
  format = "count",
  labelWidth,
}: {
  items: { label: string; value: number }[]
  label?: string
  color?: string
  format?: ValueFormat
  /** Width of the category labels (px); defaults to a responsive size. */
  labelWidth?: number
}) {
  const isMobile = useIsMobile()
  const f = FORMATS[format]
  const width = labelWidth ?? (isMobile ? 104 : 168)
  const maxChars = Math.floor(width / 5.6)
  const data = items.map((i) => ({ name: i.label, value: i.value }))
  const height = Math.max(160, data.length * (isMobile ? 30 : 34) + 40)
  return (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: isMobile ? 12 : 28, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 10, fill: "#4b5563" }} tickFormatter={f.axis} />
          <YAxis
            type="category"
            dataKey="name"
            width={width}
            interval={0}
            tick={{ fontSize: isMobile ? 9 : 10, fill: "#374151" }}
            tickFormatter={(v: string) => (v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v)}
          />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#f3f4f6" }} formatter={(v) => [f.full(Number(v)), label]} />
          <Bar dataKey="value" name={label} fill={color} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pie chart with a dot legend beside it (BetterGov "Types of Work")
// ---------------------------------------------------------------------------

export function PieChart({
  parts,
  format = "count",
  height = 250,
}: {
  parts: { label: string; value: number; color?: string }[]
  format?: ValueFormat
  height?: number
}) {
  const isMobile = useIsMobile()
  const f = FORMATS[format]
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  const data = parts.map((p, i) => ({ name: p.label, value: p.value, color: p.color ?? PALETTE[i % PALETTE.length] }))
  const size = isMobile ? Math.min(220, height) : height

  // Legend sits beside the pie only when the card itself is wide enough
  // (container query), so pies in narrow cards are never clipped.
  return (
    <div className="@container min-w-0">
    <div className="flex flex-col items-center gap-3 @md:flex-row">
      <div className="w-full @md:w-[58%]" style={{ height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="78%"
              labelLine={false}
              label={({ percent }) => ((percent ?? 0) >= 0.06 ? `${Math.round((percent ?? 0) * 100)}%` : "")}
              stroke="#fff"
              strokeWidth={1}
              isAnimationActive={false}
              className="text-[11px] font-semibold"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [`${f.full(Number(v))} (${((Number(v) / total) * 100).toFixed(1)}%)`, name]} />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 @md:w-[42%]">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="size-3 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="flex-1 leading-tight text-gray-700">{d.name}</span>
            <span className="font-semibold text-gray-900 tabular-nums">{f.full(d.value)}</span>
            <span className="w-11 text-right text-gray-500 tabular-nums">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  )
}
