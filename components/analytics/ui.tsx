import { ArrowDownRight, ArrowUpRight, BarChart3, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { HorizontalBarChart, PieChart } from "@/components/analytics/charts"
import { type ValueFormat } from "@/components/analytics/palette"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Stat-card tones (BetterGov.ph style): pale panel, bold figure in the matching colour.
const TONES = {
  blue: { box: "border-blue-100 bg-blue-50/70", value: "text-blue-700" },
  green: { box: "border-green-100 bg-green-50/70", value: "text-green-700" },
  red: { box: "border-red-100 bg-red-50/70", value: "text-red-700" },
  violet: { box: "border-purple-100 bg-purple-50/70", value: "text-purple-700" },
  amber: { box: "border-orange-100 bg-orange-50/70", value: "text-orange-700" },
  plain: { box: "border-gray-200 bg-white", value: "text-gray-900" },
} as const
export type Tone = keyof typeof TONES

export function KpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: 4 | 5 }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:gap-4", columns === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4")}>
      {children}
    </div>
  )
}

export function KpiTile({
  label,
  value,
  caption,
  delta,
  tone = "plain",
}: {
  label: string
  value: string
  caption?: ReactNode
  /** Ratio change, e.g. 0.072 → "+7.2%". `goodWhen` sets which direction is green. */
  delta?: { value: number; goodWhen?: "up" | "down"; label?: string }
  tone?: Tone
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3", TONES[tone].box)}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={cn("mt-0.5 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl", TONES[tone].value)} title={value}>{value}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">
        {delta && <Delta {...delta} />}
        {caption && <span>{caption}</span>}
      </div>
    </div>
  )
}

export function Delta({
  value,
  goodWhen = "up",
  label,
}: {
  value: number
  goodWhen?: "up" | "down"
  label?: string
}) {
  const up = value >= 0
  const good = up === (goodWhen === "up")
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold tabular-nums",
        good ? "text-emerald-700" : "text-red-700"
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(value * 100).toFixed(1)}%{label && <span className="font-normal text-muted-foreground"> {label}</span>}
    </span>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush,
  icon: Icon = BarChart3,
  iconClassName = "text-blue-600",
}: {
  title: string
  /** Header icon (BetterGov style); defaults to a bar-chart icon. */
  icon?: LucideIcon
  iconClassName?: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Remove body padding (for full-bleed tables). */
  flush?: boolean
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center text-sm font-semibold text-gray-900">
            <Icon className={cn("mr-2 size-4 shrink-0", iconClassName)} aria-hidden />
            {title}
          </h2>
          {description && <p className="pl-6 text-xs text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("flex-1", !flush && "px-4 pb-4")}>{children}</div>
    </Card>
  )
}

/**
 * Ranked values as a horizontal bar chart (BetterGov "Top 10" style).
 * `color` is a hex colour; `format` sets how values are written.
 */
export function BarList({
  items,
  format = "count",
  color,
  label,
}: {
  items: { label: string; value: number }[]
  format?: ValueFormat
  color?: string
  /** Series name shown in the tooltip */
  label?: string
}) {
  return <HorizontalBarChart items={items} format={format} color={color} label={label} />
}

export function SampleDataNote() {
  return (
    <p className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500">
      SAMPLE DATA. Figures are generated for layout purposes and are not official PhilGEPS or PS-DBM values.
    </p>
  )
}

/** Parts of a whole as a pie chart with a dot legend (BetterGov style). */
export function SplitBar({
  parts,
  format = "count",
}: {
  parts: { label: string; value: number; color?: string }[]
  format?: ValueFormat
}) {
  return <PieChart parts={parts} format={format} />
}

/** Numbered top-N list: rank · name (+ detail) · value, with a thin bar under each row. */
export function RankedList({
  items,
  valueFormatter = (n: number) => n.toLocaleString("en-PH"),
}: {
  /** `href` makes the name a drill-down link. */
  items: { label: string; detail?: string; value: number; href?: string }[]
  valueFormatter?: (n: number) => string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.label} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-x-2 text-sm">
          <span className="text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="min-w-0">
            {item.href ? (
              <Link
                href={item.href}
                scroll={false}
                className="block truncate font-medium hover:text-[#313D85] hover:underline"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span className="block truncate font-medium" title={item.label}>
                {item.label}
              </span>
            )}
            {item.detail && <span className="text-xs text-muted-foreground">{item.detail}</span>}
          </span>
          <span className="font-medium tabular-nums">{valueFormatter(item.value)}</span>
          <span className="col-span-2 col-start-2 mt-1 h-2 overflow-hidden bg-gray-100" aria-hidden>
            <span className="block h-full bg-[#0088FE]" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

export const pesoCompact = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 2 }).format(n)

export const pct = (ratio: number, digits = 1) => `${(ratio * 100).toFixed(digits)}%`
export const change = (current: number, prior: number) => (prior ? (current - prior) / prior : 0)
