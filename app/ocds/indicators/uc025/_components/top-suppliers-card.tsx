"use client"

import { useMemo, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { columns } from "./columns"
import { DataTable } from "@/components/ocds/data-table/data-table"
import { downloadCsv } from "@/components/ocds/csv"
import { formatPercent, formatPeso } from "@/components/ocds/format"
import { type SupplierRow, type Uc025Supplier } from "./types"

const FIELDS_USED = [
  "Award Reference No.",
  "Awardee Organization Name",
  "Contract Amount",
  "Award Date (for the year filter)",
]

function toRows(suppliers: Uc025Supplier[], totalContractValue: number): SupplierRow[] {
  const max = Math.max(...suppliers.map((s) => s.totalContractAmount), 1)
  return suppliers.map((s) => ({
    ...s,
    share: totalContractValue ? s.totalContractAmount / totalContractValue : 0,
    relativeShare: s.totalContractAmount / max,
  }))
}

function exportCsv(rows: SupplierRow[], fiscalYear: number) {
  downloadCsv(
    `uc025-top-10-suppliers-fy${fiscalYear}.csv`,
    [
      "Rank",
      "Supplier ID",
      "Supplier",
      "Region",
      "Contracts",
      "Total contract amount (PHP)",
      "Share of total value (%)",
    ],
    rows.map((r) => [
      r.rank,
      r.supplierId,
      r.supplierName,
      r.region,
      r.contractCount,
      r.totalContractAmount.toFixed(2),
      (r.share * 100).toFixed(2),
    ])
  )
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" })

type TopSuppliersCardProps = {
  fiscalYear: number
  /** From GET /api/ocds/fiscal-years. */
  fiscalYears: number[]
  /** From GET /api/ocds/indicators/uc025?fy= */
  suppliers: Uc025Supplier[]
  /** From GET /api/ocds/total-contract?fy= → `amount`. */
  totalContractValue: number
  /** From GET /api/ocds/total-contract?fy= → `dataAsOf`. */
  dataAsOf?: string
}

export function TopSuppliersCard({
  fiscalYear,
  fiscalYears,
  suppliers,
  totalContractValue,
  dataAsOf,
}: TopSuppliersCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const rows = useMemo(
    () => toRows(suppliers, totalContractValue),
    [suppliers, totalContractValue]
  )
  const top10Total = rows.reduce((sum, r) => sum + r.totalContractAmount, 0)
  const top10Share = totalContractValue ? top10Total / totalContractValue : 0

  const changeYear = (fy: string) =>
    startTransition(() => router.push(`${pathname}?fy=${fy}`, { scroll: false }))

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", isPending && "opacity-60")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-semibold">
              UC025
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Indicator
            </span>
          </div>
          <h2 className="text-lg font-semibold">Top 10 Suppliers by Contract Value</h2>
          <p className="text-sm text-muted-foreground">
            The 10 suppliers with the largest total contracted amount nationwide, and their share of
            all contracted value.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCsv(rows, fiscalYear)}
          disabled={!rows.length}
        >
          <Download />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Top 10 share of contract value</p>
            <p className="text-3xl font-bold tabular-nums">{formatPercent(top10Share, 1)}</p>
          </div>
          <div className="mb-1.5 space-y-1.5">
            <div className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#1e3a5f] dark:bg-sky-400"
                style={{ width: `${top10Share * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatPeso(top10Total)} of {formatPeso(totalContractValue)}
            </p>
          </div>
        </div>
        <Select value={String(fiscalYear)} onValueChange={changeYear} disabled={isPending}>
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        initialSorting={[{ id: "totalContractAmount", desc: true }]}
      />

      {/* Footer */}
      <div className="grid gap-4 border-t bg-muted/40 px-5 py-4 text-xs md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-semibold">How it&apos;s computed</p>
          <p className="text-muted-foreground">
            Rank suppliers by total Contract Amount; add up the top 10 and divide by total
            contracted value × 100.
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Fields used</p>
          <p className="text-muted-foreground">{FIELDS_USED.join(" · ")}</p>
          {dataAsOf && (
            <p className="text-muted-foreground">
              Data as of {dateFormatter.format(new Date(dataAsOf))}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
