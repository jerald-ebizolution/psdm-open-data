"use client"

import Link from "next/link"
import { createColumnHelper } from "@tanstack/react-table"
import { ArrowDown, ChevronRight } from "lucide-react"

import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import {
  formatAwardDate,
  formatCount,
  formatPercent,
  formatPeso,
} from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { type SupplierRow } from "./types"

const columnHelper = createColumnHelper<DataTableFeatures, SupplierRow>()

// TODO: point at the real supplier detail route once it exists.
export const supplierHref = (supplierId: string) => `/ocds/suppliers/${supplierId}`

const right = (content: React.ReactNode) => <div className="text-right">{content}</div>

// Ranked server-side and paginated, so client sorting is off; the header arrow
// shows the fixed order (Total awarded, descending).
export const columns = columnHelper.columns([
  columnHelper.accessor("rank", {
    header: "Rank",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("supplierName", {
    header: "Supplier",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="font-semibold text-[#1e3a5f] dark:text-sky-300">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("region", {
    header: "Region",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  }),
  columnHelper.accessor("totalAwardedAmount", {
    header: () =>
      right(
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          Total awarded
          <ArrowDown className="size-3.5" aria-hidden />
        </span>
      ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-right font-semibold tabular-nums">{formatPeso(getValue())}</div>
    ),
  }),
  columnHelper.accessor("contractCount", {
    header: () => right("Contracts"),
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums text-muted-foreground">{formatCount(getValue())}</div>
    ),
  }),
  columnHelper.accessor("procuringEntityCount", {
    header: () => right("Procuring entities"),
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums text-muted-foreground">{formatCount(getValue())}</div>
    ),
  }),
  columnHelper.accessor("share", {
    header: () => right("Share of total"),
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums text-muted-foreground">{formatPercent(getValue())}</div>
    ),
  }),
  columnHelper.accessor("latestAwardDate", {
    header: "Latest award",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="tabular-nums text-muted-foreground">{formatAwardDate(getValue())}</span>
    ),
  }),
  columnHelper.display({
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button variant="outline" size="icon" className="size-8" asChild>
          <Link
            href={supplierHref(row.original.supplierId)}
            aria-label={`View ${row.original.supplierName}`}
          >
            <ChevronRight />
          </Link>
        </Button>
      </div>
    ),
  }),
])
