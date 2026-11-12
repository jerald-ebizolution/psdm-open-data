"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react"

import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AGENCY_TYPE_SHORT,
  AGENCY_VIEWS,
  type AgencyPage,
  type AgencyView,
  type SubmissionStatus,
} from "@/lib/government-agency-data"
import { cn } from "@/lib/utils"

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
})

const STATUS: Record<SubmissionStatus, { label: string; className: string }> = {
  "on-time": { label: "On time", className: "bg-emerald-50 text-emerald-700" },
  late: { label: "Late", className: "bg-amber-50 text-amber-800" },
  missing: { label: "Not submitted", className: "bg-red-50 text-red-700" },
  "n/a": { label: "Not required", className: "bg-muted text-muted-foreground" },
  "not-due": { label: "Not yet due", className: "bg-muted text-muted-foreground" },
}

function Status({ status }: { status: SubmissionStatus }) {
  const s = STATUS[status]
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", s.className)}>{s.label}</span>
}

export function AgencyTable({
  data,
  view,
  q,
  viewCounts,
  regionNames,
}: {
  data: AgencyPage
  view: AgencyView
  q: string
  viewCounts: Record<AgencyView, number>
  regionNames: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    if (!("page" in changes)) params.delete("page")
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const [text, setText] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const { rows, total, page, pageSize } = data
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0

  return (
    <div className={cn("transition-opacity", isPending && "opacity-60")}>
      {/* Views */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {AGENCY_VIEWS.map((v) => {
          const active = v.code === view
          return (
            <button
              key={v.code}
              type="button"
              aria-pressed={active}
              onClick={() => setParams({ view: v.code === "all" ? null : v.code })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors",
                active ? "bg-[#313D85] text-white ring-[#313D85]" : "bg-white text-foreground ring-foreground/15 hover:bg-muted"
              )}
            >
              {v.name}
              <span className={cn("tabular-nums", active ? "text-white/75" : "text-muted-foreground")}>
                {formatCount(viewCounts[v.code])}
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t px-4 py-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={text}
            placeholder="Search agency"
            aria-label="Search agency"
            className="pl-9"
            onChange={(e) => {
              const next = e.target.value
              setText(next)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => setParams({ q: next.trim() || null }), 350)
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Agency</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>APP</TableHead>
              <TableHead>APP-CSE</TableHead>
              <TableHead className="text-right">Total budget</TableHead>
              <TableHead className="w-44">Orders vs. plan</TableHead>
              <TableHead className="pr-4 text-right">Procurements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => {
              const execution = a.plannedOrders ? a.actualOrders / a.plannedOrders : null
              const idle = a.app !== "missing" && a.procurements === 0
              return (
                <TableRow key={a.id}>
                  <TableCell className="max-w-80 pl-4 whitespace-normal">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {AGENCY_TYPE_SHORT[a.type]} · {regionNames[a.region] ?? a.region}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        a.centralized ? "bg-teal-50 text-teal-800" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {a.centralized ? "Centralized" : "Decentralized"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Status status={a.app} />
                  </TableCell>
                  <TableCell>
                    <Status status={a.appCse} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{a.budget ? peso.format(a.budget) : "—"}</TableCell>
                  <TableCell>
                    {execution === null ? (
                      <span className="text-xs text-muted-foreground">No APP-CSE</span>
                    ) : (
                      <div className="flex items-center gap-2" title={`${peso.format(a.actualOrders)} of ${peso.format(a.plannedOrders)}`}>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-[#0f766e]" style={{ width: `${Math.min(1, execution) * 100}%` }} />
                        </span>
                        <span className="w-10 text-right text-xs tabular-nums">{Math.round(execution * 100)}%</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    {idle ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        <AlertTriangle className="size-3" aria-hidden /> None
                      </span>
                    ) : (
                      formatCount(a.procurements)
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No agencies match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total
            ? `Showing ${formatCount(from)}–${formatCount(from + rows.length - 1)} of ${formatCount(total)} agencies, largest budget first`
            : "No agencies"}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1 || isPending}
              onClick={() => setParams({ page: String(page - 1) })}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
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
          </div>
        )}
      </div>
    </div>
  )
}
