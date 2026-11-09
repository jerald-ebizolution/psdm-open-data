"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { SortableHeader } from "@/components/ocds/data-table/sortable-header"
import { formatCount, formatPeso } from "@/components/ocds/format"
import { type Uc036Awardee } from "./types"

const columnHelper = createColumnHelper<DataTableFeatures, Uc036Awardee>()

/** Lower-case labels used in the "sorted by …" footer text. */
export const COLUMN_LABELS: Record<string, string> = {
  supplierName: "awardee",
  region: "region of awardee",
  fiscalYear: "year",
  contractCount: "contracts",
  totalContractAmount: "contract amount",
}

export const columns = columnHelper.columns([
  columnHelper.accessor("supplierName", {
    header: ({ column }) => <SortableHeader column={column} label="Awardee" />,
    cell: ({ getValue }) => (
      <span className="font-semibold text-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("region", {
    header: ({ column }) => <SortableHeader column={column} label="Region of awardee" />,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  }),
  columnHelper.accessor("fiscalYear", {
    header: ({ column }) => <SortableHeader column={column} label="Year" />,
    cell: ({ getValue }) => <span className="text-muted-foreground">FY {getValue()}</span>,
  }),
  columnHelper.accessor("contractCount", {
    header: ({ column }) => (
      <SortableHeader column={column} label="Contracts" align="right" />
    ),
    cell: ({ getValue }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {formatCount(getValue())}
      </div>
    ),
  }),
  columnHelper.accessor("totalContractAmount", {
    header: ({ column }) => (
      <SortableHeader column={column} label="Contract amount" align="right" />
    ),
    cell: ({ getValue }) => (
      <div className="text-right font-semibold tabular-nums">{formatPeso(getValue())}</div>
    ),
  }),
])
