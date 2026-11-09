"use client"

import { type ReactNode } from "react"
import {
  useTable,
  type ColumnDef,
  type ReactTable,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./features"

export type OcdsTable<TData extends RowData> = ReactTable<DataTableFeatures, TData>

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  initialSorting?: SortingState
  /** Rows per page on first render (default 10). Change it via `table.setPageSize`. */
  pageSize?: number
  /** Rendered under the table with access to the table instance (sorting, paging…). */
  footer?: (table: OcdsTable<TData>) => ReactNode
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  initialSorting = [],
  pageSize = 10,
  footer,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    data,
    columns,
    initialState: {
      sorting: initialSorting,
      pagination: { pageIndex: 0, pageSize },
    },
  })

  return (
    <>
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                  }
                  className="h-11 px-4 text-xs font-medium text-muted-foreground last:pr-5"
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="h-14 px-4 last:pr-5">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {footer?.(table)}
    </>
  )
}
