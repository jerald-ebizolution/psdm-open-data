"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { SortableHeader } from "@/components/ocds/data-table/sortable-header"
import { formatCount, formatPercent, formatPeso } from "@/components/ocds/format"
import { type SupplierRow } from "./types"

const columnHelper = createColumnHelper<DataTableFeatures, SupplierRow>()

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
      <span className="font-semibold text-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("region", {
    header: "Region",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("contractCount", {
    header: ({ column }) => (
      <SortableHeader column={column} label="Contracts" align="right" showUnsortedHint={false} />
    ),
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {formatCount(getValue())}
      </div>
    ),
  }),
  columnHelper.accessor("totalContractAmount", {
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Total contract amount"
        align="right"
        showUnsortedHint={false}
      />
    ),
    cell: ({ getValue }) => (
      <div className="text-right font-semibold tabular-nums">
        {formatPeso(getValue())}
      </div>
    ),
  }),
  columnHelper.accessor("share", {
    header: "Share of total value",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <div
          className="h-1.5 w-full min-w-24 overflow-hidden rounded-full bg-muted"
          role="presentation"
        >
          <div
            className="h-full rounded-full bg-[#1e3a5f] dark:bg-sky-400"
            style={{ width: `${row.original.relativeShare * 100}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
          {formatPercent(row.original.share)}
        </span>
      </div>
    ),
  }),
])
