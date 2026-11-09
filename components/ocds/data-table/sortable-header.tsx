"use client"

import { type CellData, type Column, type RowData } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { type DataTableFeatures } from "./features"

/**
 * Header for a column the backend already sorts by (server-paged lists):
 * looks like an active sort, but isn't clickable.
 */
export function FixedSortHeader({
  label,
  direction = "desc",
  align = "left",
}: {
  label: string
  direction?: "asc" | "desc"
  align?: "left" | "right"
}) {
  const Icon = direction === "asc" ? ArrowUp : ArrowDown
  return (
    <div className={cn("flex", align === "right" && "justify-end")}>
      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
        {label}
        <Icon className="size-3.5" aria-label={direction === "asc" ? "ascending" : "descending"} />
      </span>
    </div>
  )
}

export function SortableHeader<TData extends RowData, TValue extends CellData>({
  column,
  label,
  align = "left",
  showUnsortedHint = true,
}: {
  column: Column<DataTableFeatures, TData, TValue>
  label: string
  align?: "left" | "right"
  /** Show a faint chevron on columns that are sortable but not sorted. */
  showUnsortedHint?: boolean
}) {
  const sorted = column.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronDown

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "inline-flex w-full items-center gap-1 hover:text-foreground",
        align === "right" && "justify-end",
        sorted && "font-semibold text-foreground"
      )}
    >
      {label}
      <Icon
        aria-hidden
        className={cn(
          "size-3.5",
          !sorted && (showUnsortedHint ? "opacity-60" : "invisible")
        )}
      />
    </button>
  )
}
