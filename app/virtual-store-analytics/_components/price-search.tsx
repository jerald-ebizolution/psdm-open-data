"use client"

import { useMemo, useState } from "react"
import { Check, Search } from "lucide-react"

import { formatAwardDate, formatCount } from "@/components/ocds/format"
import { Input } from "@/components/ui/input"
import {
  PO_STATUS_LABEL,
  type PriceSearchData,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type SearchItem,
} from "@/lib/virtual-store-data"
import { cn } from "@/lib/utils"

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })

/** One colour per year, used everywhere a price is shown by year. */
export const YEAR_COLOR: Record<number, string> = { 2024: "#1baf7a", 2025: "#2a78d6", 2026: "#c2410c" }

type Result = { kind: "item"; item: SearchItem } | { kind: "po"; po: PurchaseOrder }

export function PriceSearch({ data }: { data: PriceSearchData }) {
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<Result | null>(null)

  const matches = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const pos = data.orders
      .filter((po) => po.number.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((po) => ({ kind: "po" as const, po }))
    const items = data.items
      .filter((i) => i.name.toLowerCase().includes(needle) || i.code.includes(needle))
      .slice(0, 6)
      .map((item) => ({ kind: "item" as const, item }))
    return [...pos, ...items]
  }, [q, data])

  const result = picked ?? matches[0] ?? { kind: "item" as const, item: data.items[0] }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPicked(null)
          }}
          placeholder={`Item name, UNSPSC code or PO number (e.g. ${data.orders[0]?.number ?? "PO-…"})`}
          aria-label="Search item or PO number"
          className="pl-9"
        />
      </div>

      {q && (
        <ul className="flex flex-wrap gap-2">
          {matches.map((m) => {
            const label = m.kind === "po" ? m.po.number : m.item.name
            const active =
              (result.kind === "po" && m.kind === "po" && result.po.number === m.po.number) ||
              (result.kind === "item" && m.kind === "item" && result.item.code === m.item.code)
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setPicked(m)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1",
                    active ? "bg-orange-700 text-white ring-orange-700" : "ring-foreground/15 hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              </li>
            )
          })}
          {!matches.length && <li className="text-sm text-muted-foreground">No item or PO matches “{q}”.</li>}
        </ul>
      )}

      {result.kind === "item" ? <ItemResult item={result.item} /> : <PoResult po={result.po} />}
    </div>
  )
}

function ItemResult({ item }: { item: SearchItem }) {
  const current = item.prices.at(-1)!
  const diff = item.external ? current.price / item.external - 1 : null
  const max = Math.max(...item.prices.map((p) => p.price), item.external ?? 0)
  return (
    <div className="rounded-lg p-4 border border-gray-200">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="font-mono text-xs text-muted-foreground">
        UNSPSC {item.code} · per {item.unit}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Store price, {current.year}</p>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: YEAR_COLOR[current.year] }}>
            {peso.format(current.price)}
          </p>
        </div>
        {diff !== null ? (
          <p className={cn("rounded-full px-3 py-1 text-sm font-semibold", diff <= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
            {Math.abs(Math.round(diff * 100))}% {diff <= 0 ? "below" : "above"} external price
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No external benchmark for this item</p>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {item.prices.map((p) => (
          <li key={p.year} className="grid grid-cols-[3.5rem_1fr_6rem] items-center gap-3">
            <span className="font-semibold" style={{ color: YEAR_COLOR[p.year] }}>
              {p.year}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full" style={{ width: `${(p.price / max) * 100}%`, background: YEAR_COLOR[p.year] }} />
            </span>
            <span className="text-right tabular-nums">{peso.format(p.price)}</span>
          </li>
        ))}
        {item.external !== null && (
          <li className="grid grid-cols-[3.5rem_1fr_6rem] items-center gap-3 border-t pt-2">
            <span className="text-xs font-semibold text-muted-foreground">External</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full bg-gray-400" style={{ width: `${(item.external / max) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums">{peso.format(item.external)}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

const STEPS: PurchaseOrderStatus[] = ["ordered", "delivered", "iar", "fact"]

function PoResult({ po }: { po: PurchaseOrder }) {
  const reached = STEPS.indexOf(po.status)
  return (
    <div className="rounded-lg p-4 border border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold">{po.number}</p>
          <p className="text-xs text-muted-foreground">
            {po.agency} · {formatAwardDate(po.date)}
          </p>
        </div>
        <p className="text-2xl font-semibold text-orange-700 tabular-nums">{peso.format(po.total)}</p>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-1 text-center text-[11px]">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-1">
            <span
              className={cn(
                "mx-auto flex size-6 items-center justify-center rounded-full",
                i <= reached ? "bg-orange-700 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {i <= reached ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(i <= reached ? "font-semibold" : "text-muted-foreground")}>{PO_STATUS_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      <table className="mt-4 w-full text-sm">
        <tbody>
          {po.lines.map((l) => (
            <tr key={l.code} className="border-t">
              <td className="py-1.5">{l.name}</td>
              <td className="py-1.5 text-right text-muted-foreground tabular-nums">
                {formatCount(l.quantity)} × {peso.format(l.unitPrice)}
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums">{peso.format(l.quantity * l.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
