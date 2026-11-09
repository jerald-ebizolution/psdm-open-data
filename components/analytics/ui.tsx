import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Pastel tile tones from the Merchant Analytics visual design.
const TONES = {
  blue: "bg-blue-50 ring-blue-100",
  green: "bg-emerald-50 ring-emerald-100",
  red: "bg-red-50 ring-red-100",
  violet: "bg-violet-50 ring-violet-100",
  amber: "bg-amber-50 ring-amber-100",
  plain: "bg-card ring-foreground/10",
} as const
export type Tone = keyof typeof TONES

export function KpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: 4 | 5 }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", columns === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4")}>
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
    <div className={cn("rounded-xl px-5 py-4 ring-1", TONES[tone])}>
      <p className="text-sm font-medium text-foreground/80">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Remove body padding (for full-bleed tables). */
  flush?: boolean
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("flex-1", !flush && "px-5 pb-5")}>{children}</div>
    </Card>
  )
}

/**
 * Horizontal bar list (label · bar · value), as in the "Merchants by Region"
 * panel of the design. Rank lists read better as text + bars than as a chart.
 */
export function BarList({
  items,
  valueFormatter = formatCount,
  highlight,
  color = "bg-[#2a78d6]",
}: {
  items: { label: string; value: number; sublabel?: string }[]
  valueFormatter?: (n: number) => string
  /** Label of the row to emphasise; other rows are dimmed. */
  highlight?: string | null
  color?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const dim = highlight && item.label !== highlight
        return (
          <li
            key={item.label}
            title={`${item.label}: ${valueFormatter(item.value)}`}
            className={cn(
              "grid grid-cols-[minmax(7rem,40%)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
              dim && "opacity-45"
            )}
          >
            <span className="truncate">
              {item.label}
              {item.sublabel && <span className="ml-1 text-xs text-muted-foreground">{item.sublabel}</span>}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className={cn("block h-full rounded-full", color)}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="min-w-12 text-right font-medium tabular-nums">{valueFormatter(item.value)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function SampleDataNote() {
  return (
    <p className="rounded-xl bg-white/60 px-5 py-3 text-xs font-medium text-muted-foreground ring-1 ring-foreground/5">
      SAMPLE DATA. Figures are generated for layout purposes and are not official PhilGEPS or PS-DBM values.
    </p>
  )
}

/** One 100% bar split into parts of a whole, labelled directly below. */
export function SplitBar({
  parts,
  valueFormatter = formatCount,
}: {
  parts: { label: string; value: number; color: string }[]
  valueFormatter?: (n: number) => string
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div className="space-y-4">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Share breakdown">
        {parts.map((p) => (
          <div
            key={p.label}
            title={`${p.label}: ${valueFormatter(p.value)}`}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-3 text-sm">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="flex-1">{p.label}</span>
            <span className="font-semibold tabular-nums">{valueFormatter(p.value)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{pct(p.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Numbered top-N list: rank · name (+ detail) · value, with a thin bar under each row. */
export function RankedList({
  items,
  valueFormatter = formatCount,
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
          <span className="font-semibold tabular-nums">{valueFormatter(item.value)}</span>
          <span className="col-span-2 col-start-2 mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-[#2a78d6]" style={{ width: `${(item.value / max) * 100}%` }} />
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
