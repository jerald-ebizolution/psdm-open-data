"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, ChevronLeft, ChevronRight, Download, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { DataTable } from "@/components/ocds/data-table/data-table"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type OcdsRegion } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"

import { columns } from "./columns"
import { type SupplierRow, type Uc040Page } from "./types"

const ALL_REGIONS = "all"
const SEARCH_DEBOUNCE_MS = 350

const FIELDS_USED = [
  "Award Reference No.",
  "Awardee Organization Name",
  "Contract Amount",
  "Procuring Entity",
  "Award Date",
]

export type Uc040Filters = {
  fiscalYear: number
  region: string | null
  q: string
  /** false = top-10 preview, true = paged "View All Suppliers" mode. */
  viewAll: boolean
  page: number
}

type SupplierAwardsCardProps = {
  filters: Uc040Filters
  /** From GET /api/ocds/fiscal-years. */
  fiscalYears: number[]
  /** From GET /api/ocds/regions. */
  regions: OcdsRegion[]
  /** From GET /api/ocds/indicators/uc040 */
  data: Uc040Page
  /** From GET /api/ocds/total-contract?fy= → `amount`. */
  totalContractValue: number
}

export function SupplierAwardsCard({
  filters,
  fiscalYears,
  regions,
  data,
  totalContractValue,
}: SupplierAwardsCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const rows: SupplierRow[] = useMemo(
    () =>
      data.items.map((s) => ({
        ...s,
        share: totalContractValue ? s.totalAwardedAmount / totalContractValue : 0,
      })),
    [data.items, totalContractValue]
  )

  /** Pushes new filters to the URL; any filter change except paging resets to page 1. */
  const navigate = (next: Partial<Uc040Filters>) => {
    const merged = { ...filters, page: 1, ...next }
    const params = new URLSearchParams({ fy: String(merged.fiscalYear) })
    if (merged.region) params.set("region", merged.region)
    if (merged.q) params.set("q", merged.q)
    if (merged.viewAll) params.set("view", "all")
    if (merged.viewAll && merged.page > 1) params.set("page", String(merged.page))
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const onSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => navigate({ q: value.trim() }), SEARCH_DEBOUNCE_MS)
  }

  const exportCsv = () =>
    downloadCsv(
      `uc040-supplier-awards-fy${filters.fiscalYear}${filters.region ? `-${filters.region}` : ""}.csv`,
      [
        "Rank",
        "Supplier ID",
        "Supplier",
        "Region",
        "Total awarded (PHP)",
        "Contracts",
        "Procuring entities",
        "Share of total (%)",
        "Latest award",
      ],
      rows.map((r) => [
        r.rank,
        r.supplierId,
        r.supplierName,
        r.region,
        r.totalAwardedAmount.toFixed(2),
        r.contractCount,
        r.procuringEntityCount,
        (r.share * 100).toFixed(2),
        r.latestAwardDate,
      ])
    )

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize))
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const to = (data.page - 1) * data.pageSize + rows.length
  const matching = filters.q ? ` matching “${filters.q}”` : ""

  const statusText = !data.total
    ? `No suppliers${matching}`
    : filters.viewAll
      ? `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(data.total)} suppliers${matching}`
      : data.total <= data.pageSize
        ? `Showing ${formatCount(data.total)} ${data.total === 1 ? "supplier" : "suppliers"}${matching}`
        : `Showing the top ${formatCount(rows.length)} of ${formatCount(data.total)} suppliers${matching}`

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", isPending && "opacity-60")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-semibold">
              UC040
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Indicator
            </span>
          </div>
          <h2 className="text-lg font-semibold">Total Value Awarded per Supplier</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Every supplier with the total amount it has been awarded, how many contracts and
            agencies that covers, and when it last won.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download />
          Export CSV
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search supplier name"
            aria-label="Search supplier name"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(filters.fiscalYear)}
            onValueChange={(v) => navigate({ fiscalYear: Number(v) })}
            disabled={isPending}
          >
            <SelectTrigger className="w-32" aria-label="Fiscal year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map((fy) => (
                <SelectItem key={fy} value={String(fy)}>
                  FY {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.region ?? ALL_REGIONS}
            onValueChange={(v) => navigate({ region: v === ALL_REGIONS ? null : v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-36" aria-label="Region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_REGIONS}>All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table — one server page at a time */}
      <DataTable
        key={`${filters.fiscalYear}-${filters.region}-${filters.q}-${data.page}-${data.pageSize}`}
        columns={columns}
        data={rows}
        pageSize={Math.max(data.pageSize, rows.length)}
      />

      {/* Status + paging */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <p className="text-sm text-muted-foreground">{statusText}</p>
        {filters.viewAll ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={data.page <= 1 || isPending}
              onClick={() => navigate({ page: data.page - 1 })}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {formatCount(data.page)} of {formatCount(pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={data.page >= pageCount || isPending}
              onClick={() => navigate({ page: data.page + 1 })}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => navigate({ viewAll: false })}>
              Show Top 10
            </Button>
          </div>
        ) : (
          data.total > data.pageSize && (
            <Button variant="outline" onClick={() => navigate({ viewAll: true })}>
              View All Suppliers
              <ArrowRight />
            </Button>
          )
        )}
      </div>

      {/* Footer */}
      <div className="grid gap-4 border-t bg-muted/40 px-5 py-4 text-xs md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-semibold">How it&apos;s computed</p>
          <p className="text-muted-foreground">
            Sum Contract Amount grouped by Awardee Organization Name. Contracts and procuring
            entities are distinct counts for the same supplier.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Fields used</p>
          <p className="text-muted-foreground">{FIELDS_USED.join(" · ")}</p>
        </div>
      </div>
    </Card>
  )
}
