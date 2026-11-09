"use client"

import { Fragment, useState } from "react"
import { ChevronDown, FileDown, Lock } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bandOf, type RotationCase } from "@/lib/collusion-data"
import { cn } from "@/lib/utils"
import { BAND } from "./network-graph"

// Categorical colours for suppliers within one case (fixed order).
const MEMBER_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"]
const REFERRAL_THRESHOLD = 60

export function RotationTable({ cases, regionNames }: { cases: RotationCase[]; regionNames: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(cases[0]?.id ?? null)

  return (
    <div className="overflow-x-auto border-t">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 pl-5" />
            <TableHead>Agency</TableHead>
            <TableHead>Suppliers involved</TableHead>
            <TableHead className="text-right">Tenders</TableHead>
            <TableHead className="text-right">Rotation cycles</TableHead>
            <TableHead className="text-right">Within ±0.5%</TableHead>
            <TableHead className="text-right">HHI</TableHead>
            <TableHead className="pr-5 text-right">Risk score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => {
            const expanded = open === c.id
            const band = bandOf(c.risk)
            return (
              <Fragment key={c.id}>
                <TableRow className={cn("cursor-pointer", expanded && "bg-muted/40")} onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}>
                  <TableCell className="pl-5">
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")} aria-hidden />
                  </TableCell>
                  <TableCell className="max-w-72 whitespace-normal">
                    <p className="font-medium">{c.agency}</p>
                    <p className="text-xs text-muted-foreground">{regionNames[c.region] ?? c.region}</p>
                  </TableCell>
                  <TableCell className="max-w-72 text-xs whitespace-normal">{c.suppliers.join(", ")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(c.tenders)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(c.cycles)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(c.clustered)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", c.hhi > 2500 && "font-semibold text-red-700")}>{formatCount(c.hhi)}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", BAND[band].badge)}>{c.risk}</span>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell />
                    <TableCell colSpan={7} className="py-4 pr-5 whitespace-normal">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Winner of each tender, in date order
                      </p>
                      <div className="flex flex-wrap gap-1" role="img" aria-label="Sequence of winning suppliers">
                        {c.sequence.map((w, i) => (
                          <span
                            key={i}
                            title={`Tender ${i + 1}: ${c.suppliers[w]}`}
                            className="flex size-6 items-center justify-center rounded text-[10px] font-bold text-white"
                            style={{ background: MEMBER_COLORS[w % MEMBER_COLORS.length] }}
                          >
                            {String.fromCharCode(65 + w)}
                          </span>
                        ))}
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {c.suppliers.map((s, i) => (
                          <li key={s} className="flex items-center gap-1.5">
                            <span className="flex size-4 items-center justify-center rounded text-[9px] font-bold text-white" style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <Stat label="Cover bids" value={c.coverBids} />
                        <Stat label="Complementary bids" value={c.complementaryBids} />
                        <Stat label="Prices within ±0.5%" value={c.clustered} />
                        <Stat label="Rotation cycles" value={c.cycles} />
                      </dl>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
          {!cases.length && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No rotation patterns detected for the selected filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background px-3 py-2 ring-1 ring-foreground/10">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-bold tabular-nums">{formatCount(value)}</dd>
    </div>
  )
}

/** Structured GPPB/PCC referral file for high-risk cases (no narrative — that is prepared internally). */
export function ReferralButton({ cases, regionNames }: { cases: RotationCase[]; regionNames: Record<string, string> }) {
  const eligible = cases.filter((c) => c.risk >= REFERRAL_THRESHOLD)
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="text-2xl font-bold tabular-nums">{eligible.length}</span>{" "}
        <span className="text-muted-foreground">cases score {REFERRAL_THRESHOLD} or higher</span>
      </p>
      <Button
        disabled={!eligible.length}
        className="bg-[#312e81] hover:bg-[#312e81]/90"
        onClick={() =>
          downloadCsv(
            "gppb-pcc-referral.csv",
            ["Case", "Agency", "Region", "Suppliers", "Tenders", "Rotation cycles", "Cover bids", "Complementary bids", "Prices within 0.5%", "HHI", "Risk score"],
            eligible.map((c) => [
              c.id, c.agency, regionNames[c.region] ?? c.region, c.suppliers.join("; "), c.tenders, c.cycles,
              c.coverBids, c.complementaryBids, c.clustered, c.hhi, c.risk,
            ])
          )
        }
      >
        <FileDown /> Generate GPPB / PCC referral
      </Button>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
        The file holds the figures only. Narrative findings are written internally and are not published.
      </p>
    </div>
  )
}
