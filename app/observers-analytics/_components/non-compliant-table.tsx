"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type AgencyCompliance } from "@/lib/observers-data"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 })
const pct = (n: number) => `${Math.round(n * 100)}%`

function Score({ value, floor }: { value: number; floor: number }) {
  return (
    <span className={cn("font-semibold tabular-nums", value < floor ? "text-red-700" : "text-foreground")}>{pct(value)}</span>
  )
}

export function NonCompliantTable({
  agencies,
  floor,
  regionNames,
}: {
  agencies: AgencyCompliance[]
  floor: number
  regionNames: Record<string, string>
}) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? agencies.filter((a) => a.name.toLowerCase().includes(needle)) : agencies
  }, [agencies, q])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search agency"
            aria-label="Search agency"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "non-compliant-agencies.csv",
              ["Agency", "Region", "Composite", "Timeliness", "Completeness", "Accuracy", "Procurements", "Main mode", "ABC", "Procurement staff"],
              rows.map((a) => [
                a.name, regionNames[a.region] ?? a.region, pct(a.composite), pct(a.timeliness), pct(a.completeness),
                pct(a.accuracy), a.procurements, a.mainMode, Math.round(a.abc), a.staff,
              ])
            )
          }
        >
          <Download /> Export non-compliant list
        </Button>
      </div>

      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Agency</TableHead>
              <TableHead className="text-right">Composite</TableHead>
              <TableHead className="text-right">Timeliness</TableHead>
              <TableHead className="text-right">Completeness</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead className="pr-4">Context</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-80 pl-4 whitespace-normal">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{regionNames[a.region] ?? a.region}</p>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      a.composite < floor ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                    )}
                  >
                    {pct(a.composite)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Score value={a.timeliness} floor={floor} />
                </TableCell>
                <TableCell className="text-right">
                  <Score value={a.completeness} floor={floor} />
                </TableCell>
                <TableCell className="text-right">
                  <Score value={a.accuracy} floor={floor} />
                </TableCell>
                <TableCell className="pr-4 text-xs whitespace-normal text-muted-foreground">
                  {formatCount(a.procurements)} procurements · mostly {a.mainMode} · {peso.format(a.abc)} ABC · {a.staff}{" "}
                  procurement staff
                </TableCell>
              </TableRow>
            ))}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No non-compliant agencies for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {rows.length
            ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${(current - 1) * PAGE_SIZE + visible.length} of ${formatCount(rows.length)} agencies, lowest score first`
            : "No agencies"}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {current} of {formatCount(pageCount)}
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
