"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { formatCount } from "@/components/ocds/format"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { COI_STATUS, type CoiStatus, type BoEntity } from "@/lib/beneficial-ownership-data"
import { cn } from "@/lib/utils"

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 })
const STATUS_STYLE: Record<CoiStatus, string> = {
  review: "bg-amber-500 text-white",
  cleared: "bg-emerald-600 text-white",
  referred: "bg-red-600 text-white",
}

export function CoiTable({ entities }: { entities: BoEntity[] }) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<CoiStatus | null>(null)
  const all = useMemo(() => entities.flatMap((e) => e.coi.map((m) => ({ entity: e, m }))), [entities])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(
      ({ entity, m }) =>
        (!status || m.status === status) &&
        (!needle || [entity.name, m.official.agency, m.official.position].some((v) => v.toLowerCase().includes(needle)))
    )
  }, [all, q, status])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplier or agency" aria-label="Search supplier or agency" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {([null, "review", "cleared", "referred"] as const).map((s) => (
            <button
              key={s ?? "all"}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium ring-1",
                status === s ? "bg-[#4338ca] text-white ring-[#4338ca]" : "ring-foreground/15 hover:bg-muted"
              )}
            >
              {s ? COI_STATUS[s] : "All"}{" "}
              <span className={cn("tabular-nums", status === s ? "text-white/75" : "text-muted-foreground")}>
                {s ? all.filter((x) => x.m.status === s).length : all.length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#4338ca] hover:bg-[#4338ca]">
              <TableHead className="pl-5 text-white">Supplier</TableHead>
              <TableHead className="text-white">Owner</TableHead>
              <TableHead className="text-white">Linked official</TableHead>
              <TableHead className="text-white">Relationship</TableHead>
              <TableHead className="text-right text-white">Awards from the official’s agency</TableHead>
              <TableHead className="text-white">SALN</TableHead>
              <TableHead className="pr-5 text-white">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ entity, m }) => (
              <TableRow key={`${entity.id}-${m.official.id}`}>
                <TableCell className="pl-5 font-medium">{entity.name}</TableCell>
                <TableCell className="font-mono text-xs">{m.owner.initials}</TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <p className="font-mono text-xs">{m.official.initials}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.official.position} · {m.official.agency}
                  </p>
                </TableCell>
                <TableCell>{m.relationship === "Self" ? "Same person" : m.relationship}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(m.awards)} · {peso.format(m.awardValue)}
                </TableCell>
                <TableCell className="text-xs">
                  {m.saln === "recorded" ? "Linkage recorded" : <span className="text-muted-foreground">Awaiting CSC data</span>}
                </TableCell>
                <TableCell className="pr-5">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[m.status])}>{COI_STATUS[m.status]}</span>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No conflict-of-interest matches for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Matches compare owners and directors with officials and their relatives listed in the CSC Personal Data Sheet. Names are
        masked; full identities are available to authorized reviewers only.
      </p>
    </div>
  )
}
