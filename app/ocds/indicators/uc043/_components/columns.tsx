"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { ArrowDown } from "lucide-react"

import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { formatAwardDate, formatPeso } from "@/components/ocds/format"
import { type Uc043Project } from "./types"

const columnHelper = createColumnHelper<DataTableFeatures, Uc043Project>()

// Rows come pre-sorted (Award Date, newest first) and paginated by the
// backend, so client sorting is off; the header arrow shows the fixed order.
export const columns = columnHelper.columns([
  columnHelper.accessor("projectName", {
    header: "Project name",
    enableSorting: false,
    cell: ({ row, getValue }) => (
      <div className="min-w-64 max-w-sm space-y-0.5 py-1 whitespace-normal">
        <p className="font-semibold leading-snug text-[#1e3a5f] dark:text-sky-300">{getValue()}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {row.original.awardReferenceNo}
        </p>
      </div>
    ),
  }),
  columnHelper.accessor("procuringEntity", {
    header: "Procuring entity",
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="min-w-56 max-w-sm whitespace-normal leading-snug">{getValue()}</div>
    ),
  }),
  columnHelper.accessor("winningBidder", {
    header: "Winning bidder",
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="max-w-40 min-w-32 font-semibold whitespace-normal leading-snug">
        {getValue()}
      </div>
    ),
  }),
  columnHelper.accessor("contractAmount", {
    header: () => <div className="text-right">Contract amount</div>,
    enableSorting: false,
    cell: ({ getValue }) => (
      <div className="text-right font-semibold tabular-nums">{formatPeso(getValue())}</div>
    ),
  }),
  columnHelper.accessor("awardDate", {
    header: () => (
      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
        Award date
        <ArrowDown className="size-3.5" aria-hidden />
      </span>
    ),
    enableSorting: false,
    cell: ({ getValue }) => <span className="tabular-nums">{formatAwardDate(getValue())}</span>,
  }),
])
