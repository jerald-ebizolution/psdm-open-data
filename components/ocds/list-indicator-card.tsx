"use client"

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef, type RowData } from "@tanstack/react-table"
import { ArrowRight, ChevronLeft, ChevronRight, Download, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { DataTable } from "@/components/ocds/data-table/data-table"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
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
import { cn } from "@/lib/utils"

const ALL = "all"
const SEARCH_DEBOUNCE_MS = 350

export type CardBadge = "indicator" | "red-flag" | "possible-irregularity"
export type FilterOption = { code: string; name: string }
type CsvValue = string | number

export type ListIndicatorCardProps<TRow extends RowData> = {
  // Header
  code: string
  badges: CardBadge[]
  title: string
  description: string

  // Filters (values come from the URL; changes are pushed back to it)
  fiscalYear: number
  fiscalYears: number[]
  search?: { value: string; placeholder: string }
  mode?: { value: string | null; options: FilterOption[] }
  region?: { value: string | null; options: FilterOption[] }
  /** Shown on the left of the filter row when there is no search box. */
  summary?: ReactNode

  // Table
  columns: ColumnDef<DataTableFeatures, TRow>[]
  rows: TRow[]
  total: number
  page: number
  pageSize: number
  viewAll: boolean

  // Status bar, e.g. "Showing 1–5 of 23 flagged tenders"
  noun: string
  statusSuffix?: string
  viewAllLabel: string

  // Export
  csv: { filename: string; header: string[]; row: (row: TRow) => CsvValue[] }

  // Footer, e.g. [{ title: "How it's computed", body }, { title: "Basis", body }]
  notes: { title: string; body: ReactNode }[]
}

export function ListIndicatorCard<TRow extends RowData>(props: ListIndicatorCardProps<TRow>) {
  const { setParams, isPending } = useUrlParams()
  const { rows, total, page, pageSize, viewAll } = props

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = (page - 1) * pageSize + rows.length
  const status = total
    ? `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(total)} ${props.noun}${props.statusSuffix ?? ""}`
    : `No ${props.noun} for the selected filters`

  return (
    <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", isPending && "opacity-60")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border bg-muted px-2 py-0.5 text-xs font-semibold">
              {props.code}
            </span>
            {props.badges.map((b) => (
              <Badge key={b} kind={b} />
            ))}
          </div>
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{props.description}</p>
        </div>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(props.csv.filename, props.csv.header, rows.map(props.csv.row))
          }
        >
          <Download />
          Export CSV
        </Button>
      </div>

      {/* Search / summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4">
        <div className="min-w-0 flex-1">
          {props.search ? (
            <SearchBox
              initialValue={props.search.value}
              placeholder={props.search.placeholder}
              onSearch={(q) => setParams({ q })}
            />
          ) : (
            props.summary
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(props.fiscalYear)}
            onValueChange={(v) => setParams({ fy: v })}
            disabled={isPending}
          >
            <SelectTrigger className="w-32" aria-label="Fiscal year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {props.fiscalYears.map((fy) => (
                <SelectItem key={fy} value={String(fy)}>
                  FY {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {props.mode && (
            <OptionSelect
              label="Mode of procurement"
              allLabel="All modes"
              className="w-52"
              value={props.mode.value}
              options={props.mode.options}
              disabled={isPending}
              onChange={(mode) => setParams({ mode })}
            />
          )}
          {props.region && (
            <OptionSelect
              label="Region"
              allLabel="All regions"
              className="w-36"
              value={props.region.value}
              options={props.region.options}
              disabled={isPending}
              onChange={(region) => setParams({ region })}
            />
          )}
        </div>
      </div>

      {/* Table — one server page at a time */}
      <DataTable
        key={`${page}-${pageSize}-${total}`}
        columns={props.columns}
        data={rows}
        pageSize={Math.max(pageSize, rows.length)}
      />

      {/* Status + paging */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <p className="text-sm text-muted-foreground">{status}</p>
        {viewAll ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1 || isPending}
              onClick={() => setParams({ page: String(page - 1) })}
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
              onClick={() => setParams({ page: String(page + 1) })}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => setParams({ view: null })}>
              Show Fewer
            </Button>
          </div>
        ) : (
          total > pageSize && (
            <Button variant="outline" onClick={() => setParams({ view: "all" })}>
              {props.viewAllLabel}
              <ArrowRight />
            </Button>
          )
        )}
      </div>

      {/* Footer */}
      <div className="grid gap-4 border-t bg-muted/40 px-5 py-4 text-xs md:grid-cols-2">
        {props.notes.map((n) => (
          <div key={n.title} className="space-y-1">
            <p className="font-semibold">{n.title}</p>
            <p className="text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Updates query params in the URL (null/"" removes one). Any change other than
 * `page` resets paging to page 1. Runs as a transition so the current table
 * stays visible (dimmed) while the server renders the new one.
 */
function useUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    if (!("page" in changes)) params.delete("page")
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  return { setParams, isPending }
}

function Badge({ kind }: { kind: CardBadge }) {
  if (kind === "indicator")
    return (
      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        Indicator
      </span>
    )
  if (kind === "red-flag")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        Red flag
      </span>
    )
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Possible irregularity
    </span>
  )
}

function OptionSelect({
  label,
  allLabel,
  value,
  options,
  disabled,
  className,
  onChange,
}: {
  label: string
  allLabel: string
  value: string | null
  options: FilterOption[]
  disabled?: boolean
  className?: string
  onChange: (code: string | null) => void
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.code} value={o.code}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SearchBox({
  initialValue,
  placeholder,
  onSearch,
}: {
  initialValue: string
  placeholder: string
  onSearch: (q: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="relative w-full max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
        onChange={(e) => {
          const next = e.target.value
          setValue(next)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => onSearch(next.trim()), SEARCH_DEBOUNCE_MS)
        }}
      />
    </div>
  )
}
