"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Building2, ChevronLeft, ChevronRight, Download } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { DataTable } from "@/components/ocds/data-table/data-table"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type OcdsSupplierOption } from "@/lib/ocds-suppliers"
import { cn } from "@/lib/utils"

import { columns } from "./columns"
import { type Uc043Page } from "./types"

const FIELDS_USED = [
  "Award Reference No.",
  "Notice Title (project)",
  "Procuring Entity",
  "Awardee Organization Name",
  "Contract Amount",
  "Award Date",
]

export type Uc043Filters = {
  fiscalYear: number
  supplierId: string | null
  /** false = most-recent preview, true = paged "View All Projects" mode. */
  viewAll: boolean
  page: number
}

type SupplierProjectsCardProps = {
  filters: Uc043Filters
  /** From GET /api/ocds/fiscal-years. */
  fiscalYears: number[]
  /** From GET /api/ocds/suppliers?fy= */
  suppliers: OcdsSupplierOption[]
  /** From GET /api/ocds/indicators/uc043 — null when there is no data. */
  data: Uc043Page | null
}

export function SupplierProjectsCard({
  filters,
  fiscalYears,
  suppliers,
  data,
}: SupplierProjectsCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  /** Pushes new filters to the URL; any change except paging resets to page 1. */
  const navigate = (next: Partial<Uc043Filters>) => {
    const merged = { ...filters, page: 1, ...next }
    const params = new URLSearchParams({ fy: String(merged.fiscalYear) })
    // A supplier id from another year may not exist there; the page falls back to the top supplier.
    if (merged.supplierId) params.set("supplier", merged.supplierId)
    if (merged.viewAll) params.set("view", "all")
    if (merged.viewAll && merged.page > 1) params.set("page", String(merged.page))
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 1
  const page = data?.page ?? 1
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = (page - 1) * pageSize + items.length

  const exportCsv = () =>
    data &&
    downloadCsv(
      `uc043-${data.supplierId}-fy${filters.fiscalYear}.csv`,
      [
        "Award reference no.",
        "Project name",
        "Procuring entity",
        "Winning bidder",
        "Contract amount (PHP)",
        "Award date",
      ],
      items.map((p) => [
        p.awardReferenceNo,
        p.projectName,
        p.procuringEntity,
        p.winningBidder,
        p.contractAmount.toFixed(2),
        p.awardDate,
      ])
    )

  const statusText = !total
    ? "No projects for this supplier in the selected year"
    : filters.viewAll
      ? `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(total)} projects`
      : `Showing ${formatCount(items.length)} of ${formatCount(total)} projects`

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", isPending && "opacity-60")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-semibold">
              UC043
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Indicator
            </span>
          </div>
          <h2 className="text-lg font-semibold">Procuring Entities Supplied by a Supplier</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Pick a supplier to see the projects it won — project first, then the procuring entity
            it supplied, then the winning bidder.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
          <Download />
          Export CSV
        </Button>
      </div>

      {/* Supplier summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Building2 className="size-5 text-muted-foreground" aria-hidden />
          </span>
          {data ? (
            <div>
              <p className="font-semibold">{data.supplierName}</p>
              <p className="text-sm text-muted-foreground">
                Supplied{" "}
                <span className="font-semibold text-foreground">
                  {formatCount(data.procuringEntityCount)} procuring{" "}
                  {data.procuringEntityCount === 1 ? "entity" : "entities"}
                </span>{" "}
                in FY {filters.fiscalYear}
                {!filters.viewAll && items.length > 0 &&
                  ` · showing the ${formatCount(items.length)} most recent ${items.length === 1 ? "project" : "projects"}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No supplier data for FY {filters.fiscalYear}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.supplierId ?? undefined}
            onValueChange={(v) => navigate({ supplierId: v })}
            disabled={isPending || !suppliers.length}
          >
            <SelectTrigger className="w-64" aria-label="Supplier">
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.supplierId} value={s.supplierId}>
                  {s.supplierName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>

      {/* Table — one server page at a time */}
      <DataTable
        key={`${filters.fiscalYear}-${filters.supplierId}-${page}-${pageSize}`}
        columns={columns}
        data={items}
        pageSize={Math.max(pageSize, items.length)}
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
              disabled={page <= 1 || isPending}
              onClick={() => navigate({ page: page - 1 })}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {formatCount(page)} of {formatCount(pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= pageCount || isPending}
              onClick={() => navigate({ page: page + 1 })}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => navigate({ viewAll: false })}>
              Show Most Recent
            </Button>
          </div>
        ) : (
          total > pageSize && (
            <Button variant="outline" onClick={() => navigate({ viewAll: true })}>
              View All Projects
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
            Count distinct Procuring Entity values per Awardee Organization Name; list each award
            with its project and entity.
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
