"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Download, Filter } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { DataTable, type OcdsTable } from "@/components/ocds/data-table/data-table"
import { formatCount, formatPeso } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type OcdsRegion } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"

import { COLUMN_LABELS, columns } from "./columns"
import { type Uc036Awardee } from "./types"

/** Rows shown before "View All Awardees" is clicked. */
const PREVIEW_ROWS = 10
const ALL_REGIONS = "all"

const FIELDS_USED = [
  "Award Reference No.",
  "Awardee Organization Name",
  "Region of Awardee",
  "Contract Amount",
  "Award Date",
]

type AwardeesByRegionCardProps = {
  fiscalYear: number
  /** From GET /api/ocds/fiscal-years. */
  fiscalYears: number[]
  /** Selected region code, or null for all regions. */
  region: string | null
  /** From GET /api/ocds/regions. */
  regions: OcdsRegion[]
  /** From GET /api/ocds/indicators/uc036?fy=&region= */
  awardees: Uc036Awardee[]
}

export function AwardeesByRegionCard({
  fiscalYear,
  fiscalYears,
  region,
  regions,
  awardees,
}: AwardeesByRegionCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const contractTotal = awardees.reduce((sum, a) => sum + a.contractCount, 0)
  const amountTotal = awardees.reduce((sum, a) => sum + a.totalContractAmount, 0)

  const navigate = (next: { fy?: number; region?: string | null }) => {
    const params = new URLSearchParams({ fy: String(next.fy ?? fiscalYear) })
    const nextRegion = next.region === undefined ? region : next.region
    if (nextRegion) params.set("region", nextRegion)
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const exportCsv = () =>
    downloadCsv(
      `uc036-awardees-by-region-fy${fiscalYear}${region ? `-${region}` : ""}.csv`,
      ["Supplier ID", "Awardee", "Region of awardee", "Year", "Contracts", "Contract amount (PHP)"],
      awardees.map((a) => [
        a.supplierId,
        a.supplierName,
        a.region,
        `FY ${a.fiscalYear}`,
        a.contractCount,
        a.totalContractAmount.toFixed(2),
      ])
    )

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", isPending && "opacity-60")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-semibold">
              UC036
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Indicator
            </span>
          </div>
          <h2 className="text-lg font-semibold">Awardees by Region</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Winning suppliers grouped by the region of the awardee, by year. Choose a region and
            year to see who won there; click a column header to sort.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!awardees.length}>
          <Download />
          Export CSV
        </Button>
      </div>

      {/* Summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <SummaryItem label="Awardees" value={formatCount(awardees.length)} />
          <SummaryItem label="Contracts" value={formatCount(contractTotal)} />
          <SummaryItem label="Total contract amount" value={formatPeso(amountTotal)} />
        </dl>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" aria-hidden />
          <Select
            value={region ?? ALL_REGIONS}
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
          <Select
            value={String(fiscalYear)}
            onValueChange={(v) => navigate({ fy: Number(v) })}
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

      {/* Table + "showing" bar */}
      <DataTable
        key={`${fiscalYear}-${region ?? ALL_REGIONS}`}
        columns={columns}
        data={awardees}
        initialSorting={[{ id: "totalContractAmount", desc: true }]}
        pageSize={PREVIEW_ROWS}
        footer={(table) => <TableStatus table={table} />}
      />

      {/* Footer */}
      <div className="grid gap-4 border-t bg-muted/40 px-5 py-4 text-xs md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-semibold">How it&apos;s computed</p>
          <p className="text-muted-foreground">
            Group awards by Region of Awardee (and year); count distinct suppliers and sum
            Contract Amount per region.
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function TableStatus({ table }: { table: OcdsTable<Uc036Awardee> }) {
  const total = table.getPrePaginatedRowModel().rows.length
  const shown = table.getRowModel().rows.length
  const expanded = table.state.pagination.pageSize > PREVIEW_ROWS
  const [sort] = table.state.sorting

  if (!total) return null

  const sortText = sort
    ? ` · sorted by ${COLUMN_LABELS[sort.id] ?? sort.id}, ${sort.desc ? "descending" : "ascending"}`
    : ""

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
      <p className="text-sm text-muted-foreground">
        Showing {shown === total ? formatCount(total) : `${formatCount(shown)} of ${formatCount(total)}`}{" "}
        awardee {total === 1 ? "row" : "rows"}
        {sortText}
      </p>
      {total > PREVIEW_ROWS && (
        <Button
          variant="outline"
          onClick={() => {
            table.setPageIndex(0)
            table.setPageSize(expanded ? PREVIEW_ROWS : total)
          }}
        >
          {expanded ? "Show Fewer" : "View All Awardees"}
          {!expanded && <ArrowRight />}
        </Button>
      )}
    </div>
  )
}
