"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Download, ExternalLink, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { formatAwardDate } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FLAG_STATUSES, type FlagCase, type Severity } from "@/lib/observers-data"
import { SEVERITY, SEVERITY_ORDER, SeverityBadge } from "./severity"

const PAGE_SIZE = 10
const ALL = "all"
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 })
const statusName = Object.fromEntries(FLAG_STATUSES.map((s) => [s.code, s.name]))

export function FlagCasesTable({
  cases,
  flags,
  regionNames,
  modeNames,
}: {
  cases: FlagCase[]
  flags: { code: string; name: string }[]
  regionNames: Record<string, string>
  modeNames: Record<string, string>
}) {
  const [q, setQ] = useState("")
  const [flag, setFlag] = useState(ALL)
  const [severity, setSeverity] = useState<Severity | typeof ALL>(ALL)
  const [page, setPage] = useState(1)
  const flagName = Object.fromEntries(flags.map((f) => [f.code, f.name]))

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return cases.filter(
      (c) =>
        (flag === ALL || c.flag === flag) &&
        (severity === ALL || c.severity === severity) &&
        (!needle || [c.title, c.agency, c.id].some((v) => v.toLowerCase().includes(needle)))
    )
  }, [cases, q, flag, severity])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search project or agency"
            aria-label="Search project or agency"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={flag} onValueChange={(v) => { setFlag(v); setPage(1) }}>
            <SelectTrigger className="w-56" aria-label="Flag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All flags</SelectItem>
              {flags.map((f) => (
                <SelectItem key={f.code} value={f.code}>
                  {f.code} · {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => { setSeverity(v as Severity | typeof ALL); setPage(1) }}>
            <SelectTrigger className="w-36" aria-label="Severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All severities</SelectItem>
              {SEVERITY_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                "red-flags.csv",
                ["Case", "Flag", "Project", "Agency", "Region", "Mode", "Amount", "Detected", "Severity", "Status", "Source"],
                rows.map((c) => [
                  c.id, `${c.flag} ${flagName[c.flag] ?? ""}`, c.title, c.agency, regionNames[c.region] ?? c.region,
                  modeNames[c.mode] ?? c.mode, Math.round(c.amount), c.detectedOn, SEVERITY[c.severity].label,
                  statusName[c.status], c.source.url,
                ])
              )
            }
          >
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Flag</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-5">
                  <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-red-800">{c.flag}</span>
                </TableCell>
                <TableCell className="max-w-96 whitespace-normal">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.agency} · {regionNames[c.region] ?? c.region} · {modeNames[c.mode] ?? c.mode}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{peso.format(c.amount)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatAwardDate(c.detectedOn)}</TableCell>
                <TableCell>
                  <SeverityBadge severity={c.severity} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{statusName[c.status]}</TableCell>
                <TableCell className="pr-5">
                  {c.source.external ? (
                    <a href={c.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#2a78d6] hover:underline">
                      {c.source.label} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <Link href={c.source.url} className="text-sm text-[#2a78d6] hover:underline">
                      {c.source.label}
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No flagged cases match the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <p className="text-sm text-muted-foreground">
          {rows.length
            ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + visible.length} of ${rows.length} cases, newest first`
            : "No cases"}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {current} of {pageCount}
            </span>
            <Button variant="outline" size="icon" aria-label="Next page" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
