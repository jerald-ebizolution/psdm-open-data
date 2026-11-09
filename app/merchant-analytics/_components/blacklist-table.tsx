"use client"

import { Fragment, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, Link2, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { daysBetween, formatAwardDate, formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  type BlacklistedSupplier,
  type BlacklistOrder,
  type BlacklistReport,
  type BlacklistStatus,
} from "@/lib/merchant-analytics-data"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const STATUS: Record<BlacklistStatus, { label: string; className: string }> = {
  active: { label: "Blacklisted", className: "bg-red-50 text-red-700 ring-red-200" },
  perpetual: { label: "Perpetual", className: "bg-red-700 text-white ring-red-700" },
  delisted: { label: "Delisted / Cleared", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
}

type View = "current" | "perpetual" | "delisted" | "linked" | "all"

function StatusBadge({ status }: { status: BlacklistStatus }) {
  const s = STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1",
        s.className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </span>
  )
}

const period = (o: BlacklistOrder) =>
  `${formatAwardDate(o.startDate)} – ${o.endDate ? formatAwardDate(o.endDate) : "No end date"}`

function duration(o: BlacklistOrder) {
  if (!o.endDate) return "Perpetual"
  const years = Math.round(daysBetween(o.startDate, o.endDate) / 365)
  return `${years} year${years > 1 ? "s" : ""}`
}

export function BlacklistTable({
  report,
  regionNames,
}: {
  report: BlacklistReport
  regionNames: Record<string, string>
}) {
  const [q, setQ] = useState("")
  const [view, setView] = useState<View>("current")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)

  const views: { key: View; label: string; value: number; tone: string }[] = [
    { key: "current", label: "Currently blacklisted", value: report.current, tone: "bg-red-50 text-red-900" },
    { key: "perpetual", label: "Perpetually blacklisted", value: report.perpetual, tone: "bg-red-100 text-red-950" },
    { key: "delisted", label: "Delisted / cleared", value: report.delisted, tone: "bg-emerald-50 text-emerald-900" },
    {
      key: "linked",
      label: "New companies of blacklisted owners",
      value: report.newLinkedCompanies,
      tone: "bg-amber-50 text-amber-900",
    },
  ]

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return report.suppliers.filter((s) => {
      const inView =
        view === "all" ||
        (view === "current" && s.status !== "delisted") ||
        (view === "linked" && s.linked.some((l) => l.registeredAfterBlacklisting)) ||
        s.status === view
      if (!inView) return false
      if (!needle) return true
      return [s.name, s.id, ...s.orders.map((o) => o.agency), ...s.linked.map((l) => l.name)].some((v) =>
        v.toLowerCase().includes(needle)
      )
    })
  }, [report.suppliers, q, view])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const exportCsv = () =>
    downloadCsv(
      "blacklisted-merchants.csv",
      ["Supplier", "Organization type", "Local / Foreign", "Region", "Blacklist count", "Blacklisted by", "Latest period", "Status", "Linked companies"],
      rows.map((s) => {
        const latest = s.orders.at(-1)!
        return [
          s.name,
          s.businessType,
          s.orgType === "local" ? "Local" : "Foreign",
          regionNames[s.region] ?? s.region,
          s.orders.length,
          [...new Set(s.orders.map((o) => o.agency))].join("; "),
          period(latest),
          STATUS[s.status].label,
          s.linked.map((l) => l.name).join("; "),
        ]
      })
    )

  return (
    <div>
      {/* Summary — each tile is also a filter */}
      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2 xl:grid-cols-4">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            aria-pressed={view === v.key}
            onClick={() => {
              setView(view === v.key ? "all" : v.key)
              setPage(1)
            }}
            className={cn(
              "rounded-lg px-4 py-3 text-left ring-1 ring-transparent transition",
              v.tone,
              view === v.key ? "ring-2 ring-[#313D85]" : "hover:ring-foreground/15"
            )}
          >
            <p className="text-xs font-medium opacity-80">{v.label}</p>
            <p className="text-2xl font-bold tabular-nums">{formatCount(v.value)}</p>
          </button>
        ))}
      </div>

      {/* Search + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search supplier or agency"
            aria-label="Search supplier or agency"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          {view !== "all" && (
            <button type="button" className="text-sm text-[#2a78d6] hover:underline" onClick={() => setView("all")}>
              Show all suppliers
            </button>
          )}
          <Button variant="outline" disabled={!rows.length} onClick={exportCsv}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#313D85] hover:bg-[#313D85]">
              <TableHead className="w-8 pl-5" />
              <TableHead className="text-white">Supplier</TableHead>
              <TableHead className="text-white">Organization type</TableHead>
              <TableHead className="text-center text-white">Times blacklisted</TableHead>
              <TableHead className="text-white">Latest blacklisting</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="pr-5 text-white">Linked companies</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((s) => {
              const latest = s.orders.at(-1)!
              const expanded = open === s.id
              const newLinks = s.linked.filter((l) => l.registeredAfterBlacklisting).length
              return (
                <Fragment key={s.id}>
                  <TableRow
                    className={cn("cursor-pointer", expanded && "bg-muted/50")}
                    onClick={() => setOpen(expanded ? null : s.id)}
                    aria-expanded={expanded}
                  >
                    <TableCell className="pl-5">
                      <ChevronDown
                        className={cn("size-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")}
                        aria-hidden
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{regionNames[s.region] ?? s.region}</p>
                    </TableCell>
                    <TableCell>
                      <p>{s.businessType}</p>
                      <p className="text-xs text-muted-foreground">{s.orgType === "local" ? "Local" : "Foreign"}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                          s.orders.length > 1 ? "bg-red-100 text-red-800" : "bg-muted"
                        )}
                      >
                        {s.orders.length}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p>{latest.agency}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{period(latest)}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="pr-5">
                      {s.linked.length ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            newLinks ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {newLinks ? <AlertTriangle className="size-3" aria-hidden /> : <Link2 className="size-3" aria-hidden />}
                          {s.linked.length} linked
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>

                  {expanded && <SupplierDetail supplier={s} />}
                </Fragment>
              )
            })}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No suppliers match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <p className="text-sm text-muted-foreground">
          {rows.length
            ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + visible.length} of ${rows.length} suppliers`
            : "No suppliers"}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {current} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SupplierDetail({ supplier: s }: { supplier: BlacklistedSupplier }) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell />
      <TableCell colSpan={6} className="py-4 pr-5 whitespace-normal">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Blacklisting history</p>
            <ol className="space-y-2">
              {[...s.orders].reverse().map((o) => (
                <li key={o.startDate} className="rounded-md bg-background p-3 text-sm ring-1 ring-foreground/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{o.agency}</span>
                    <span className="text-xs text-muted-foreground">{duration(o)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{period(o)}</p>
                  <p className="mt-1 text-xs">{o.reason}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Companies with the same beneficial owner
            </p>
            {s.linked.length ? (
              <ul className="space-y-2">
                {s.linked.map((l) => (
                  <li key={l.name} className="rounded-md bg-background p-3 text-sm ring-1 ring-foreground/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{l.name}</span>
                      {l.registeredAfterBlacklisting && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          <AlertTriangle className="size-3" aria-hidden /> Registered after blacklisting
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registered {formatAwardDate(l.registeredOn)} · Shared owner {l.sharedOwner}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No other registered company shares an owner with this supplier.</p>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
