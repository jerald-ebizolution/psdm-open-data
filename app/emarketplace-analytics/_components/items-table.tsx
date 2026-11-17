"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { formatCount } from "@/components/ocds/format"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type CatalogueItemStats } from "@/lib/emarketplace-data"

const compact = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 })
const unit = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })

type Sort = "orders" | "value" | "savings"

export function ItemsTable({ items }: { items: CatalogueItemStats[] }) {
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Sort>("orders")
  const max = Math.max(1, ...items.map((i) => i.orders))

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items
      .filter((i) => !needle || i.name.toLowerCase().includes(needle) || i.code.includes(needle))
      .sort((a, b) =>
        sort === "orders" ? b.orders - a.orders : sort === "value" ? b.value - a.value : (b.savings?.rate ?? -1) - (a.savings?.rate ?? -1)
      )
  }, [items, q, sort])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search item or UNSPSC code"
            aria-label="Search item or UNSPSC code"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-44" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Most ordered</SelectItem>
            <SelectItem value="value">Highest value</SelectItem>
            <SelectItem value="savings">Highest savings</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="max-h-[460px] overflow-auto border-t">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-8 pl-4">#</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-[22%]">Orders</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Catalogue price</TableHead>
              <TableHead className="pr-4 text-right">Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i, n) => (
              <TableRow key={i.code}>
                <TableCell className="pl-4 text-muted-foreground tabular-nums">{n + 1}</TableCell>
                <TableCell className="whitespace-normal">
                  <p className="font-medium">{i.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">UNSPSC {i.code}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full rounded-full bg-[#6250d6]" style={{ width: `${(i.orders / max) * 100}%` }} />
                    </span>
                    <span className="w-14 text-right tabular-nums">{formatCount(i.orders)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(i.quantity)} <span className="text-xs text-muted-foreground">{i.unit}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{compact.format(i.value)}</TableCell>
                <TableCell className="text-right tabular-nums">{unit.format(i.catalogue)}</TableCell>
                <TableCell className="pr-4 text-right">
                  {i.savings ? (
                    <span className="font-semibold text-emerald-700 tabular-nums" title={`Open-market reference ${unit.format(i.reference!)}`}>
                      {Math.round(i.savings.rate * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground" title="Savings are not shown when the reference price is missing">
                      — no reference price
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No items match “{q}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
