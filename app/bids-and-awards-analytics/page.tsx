import { ArrowRight, X } from "lucide-react"
import Link from "next/link"

import { ColumnChart, SERIES, TrendChart } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import {
  BarList,
  change,
  KpiGrid,
  KpiTile,
  pct,
  pesoCompact,
  RankedList,
  SampleDataNote,
  SectionCard,
} from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import {
  type BidsFilter,
  getAgencies,
  getBidActivity,
  getBreakdown,
  getModeBoard,
  getOcdsIndicators,
  getRankings,
  getSupplierProfile,
  getTenderOverview,
  parseBidsFilter,
} from "@/lib/bids-awards-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getProcurementModes } from "@/lib/ocds-procurement-modes"
import { getRegions } from "@/lib/ocds-regions"
import { getSupplierOptions } from "@/lib/ocds-suppliers"
import { cn } from "@/lib/utils"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function BidsAndAwardsAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, modes, regions] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getProcurementModes(),
    getRegions(),
  ])
  const fiscalYear = resolveFiscalYear(params.fy, fiscalYears)
  const [agencies, suppliers] = await Promise.all([getAgencies(regions), getSupplierOptions(fiscalYear)])
  const filter = parseBidsFilter(params, { fiscalYear, regions, agencies, suppliers, modes })

  const [overview, board, breakdown, bids, rankings, profile, ocds] = await Promise.all([
    getTenderOverview(filter),
    getModeBoard(filter),
    getBreakdown(filter, regions, agencies),
    getBidActivity(filter),
    getRankings(filter, agencies, suppliers),
    getSupplierProfile(filter),
    getOcdsIndicators(filter),
  ])

  /** Link to this page with some filters changed (null removes one). */
  const href = (changes: Partial<Record<keyof BidsFilter, string | null>>) => {
    const next: Record<string, string | number | null> = { ...filter, ...changes }
    const qs = new URLSearchParams()
    if (next.fiscalYear) qs.set("fy", String(next.fiscalYear))
    for (const k of ["region", "agency", "supplier", "mode"] as const) if (next[k]) qs.set(k, String(next[k]))
    return `?${qs}`
  }

  const agency = agencies.find((a) => a.id === filter.agency)
  const modeName = modes.find((m) => m.code === filter.mode)?.name
  const maxBoard = Math.max(1, ...board.map((m) => m.notices))
  const fy = filter.fiscalYear

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters and key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Bids and Awards Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Bid notices, approved budgets and awarded amounts, procurement modes, bid activity and top agencies
              and suppliers.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.agency ? null : filter.region, options: regions },
              {
                param: "agency",
                label: "Procuring entity",
                allLabel: "All agencies",
                value: filter.agency,
                options: agencies
                  .filter((a) => !filter.region || filter.agency || a.region === filter.region)
                  .map((a) => ({ code: a.id, name: a.name })),
                className: "w-60 bg-white",
              },
              {
                param: "supplier",
                label: "Supplier",
                allLabel: "All suppliers",
                value: filter.supplier,
                options: suppliers.map((s) => ({ code: s.supplierId, name: s.supplierName })),
                className: "w-56 bg-white",
              },
              {
                param: "mode",
                label: "Procurement mode",
                allLabel: "All modes",
                value: filter.mode,
                options: modes,
                className: "w-52 bg-white",
              },
            ]}
          />
        </div>

        {(agency || profile || modeName) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Viewing</span>
            {agency && <Chip label={agency.name} clear={href({ agency: null, region: null })} />}
            {profile && <Chip label={profile.name} clear={href({ supplier: null })} />}
            {modeName && <Chip label={modeName} clear={href({ mode: null })} />}
          </div>
        )}

        <KpiGrid columns={5}>
          <KpiTile
            tone="blue"
            label="Bid Notices"
            value={formatCount(overview.notices)}
            delta={
              overview.noticesPriorYear
                ? { value: change(overview.notices, overview.noticesPriorYear), label: "vs last year" }
                : undefined
            }
            caption={overview.noticesPriorYear ? undefined : "Published this year"}
          />
          <KpiTile tone="plain" label="Total ABC" value={pesoCompact(overview.totalAbc)} caption="Approved budget of all notices" />
          <KpiTile
            tone="green"
            label="Total Awarded"
            value={pesoCompact(overview.awardedAmount)}
            caption={`${pct(1 - overview.awardedAmount / overview.awardedAbc)} below the ABC of awarded lots`}
          />
          <KpiTile
            tone="amber"
            label="Cancelled Bids"
            value={pesoCompact(overview.cancelled.value)}
            caption={`${formatCount(overview.cancelled.count)} lots cancelled`}
          />
          <KpiTile
            tone="red"
            label="Failed Biddings"
            value={formatCount(overview.failed.count)}
            caption={`${pesoCompact(overview.failed.value)} in ABC`}
          />
        </KpiGrid>
      </Card>

      {/* Supplier drill-down */}
      {profile && (
        <SectionCard
          title={profile.name}
          description={`Supplier profile · FY ${fy}${profile.region ? ` · ${profile.region}` : ""}`}
          action={
            <Link href={href({ supplier: null })} scroll={false} className="text-sm text-[#2a78d6] hover:underline">
              Back to all suppliers
            </Link>
          }
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="grid grid-cols-3 gap-3 lg:col-span-1 lg:grid-cols-1">
              <MiniStat label="Total awarded" value={pesoCompact(profile.awardedAmount)} />
              <MiniStat label="Contracts" value={formatCount(profile.contracts)} />
              <MiniStat label="Procuring entities supplied" value={formatCount(profile.procuringEntityCount)} />
            </div>
            <div className="lg:col-span-2">
              <p className="mb-2 text-sm font-semibold">Procuring entities supplied</p>
              <RankedList
                valueFormatter={pesoCompact}
                items={profile.entities.slice(0, 8).map((e) => ({
                  label: e.name,
                  detail: `${formatCount(e.contracts)} contracts`,
                  value: e.amount,
                }))}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* 02-A Tender overview */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Published vs. Awarded"
          description={`Lots per month · ${formatCount(overview.lotsAwarded)} of ${formatCount(overview.lotsPublished)} lots awarded (${pct(overview.lotsAwarded / Math.max(1, overview.lotsPublished))})`}
        >
          <ColumnChart
            data={overview.monthly}
            xKey="month"
            height={260}
            series={[
              { key: "lotsPublished", label: "Published", color: SERIES.blue },
              { key: "lotsAwarded", label: "Awarded", color: SERIES.aqua },
            ]}
          />
        </SectionCard>

        <SectionCard title="Awarded Amount vs. ABC" description="Monthly, for awarded lots">
          <ColumnChart
            data={overview.monthly}
            xKey="month"
            format="peso"
            height={260}
            series={[
              { key: "abc", label: "ABC", color: SERIES.blue },
              { key: "awardedAmount", label: "Awarded", color: SERIES.aqua },
            ]}
          />
        </SectionCard>
      </div>

      {/* 02-B Procurement mode board */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="By Procurement Mode" description="Click a mode for its breakdown" flush>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pl-5 font-medium">Mode</th>
                  <th className="py-2 font-medium">Notices</th>
                  <th className="py-2 text-right font-medium">ABC</th>
                  <th className="py-2 text-right font-medium">Lots awarded</th>
                  <th className="py-2 pr-5 text-right font-medium">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {board.map((m) => {
                  const active = m.code === filter.mode
                  return (
                    <tr
                      key={m.code}
                      className={cn(
                        "border-t transition-colors hover:bg-muted/50",
                        active && "bg-blue-50 font-semibold hover:bg-blue-50",
                        filter.mode && !active && "opacity-50 hover:opacity-100"
                      )}
                    >
                      <td className="py-2 pl-5">
                        <Link
                          href={href({ mode: active ? null : m.code })}
                          scroll={false}
                          className="hover:text-[#313D85] hover:underline"
                        >
                          {m.name}
                        </Link>
                      </td>
                      <td className="w-[30%] py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <span
                              className="block h-full rounded-full bg-[#2a78d6]"
                              style={{ width: `${(m.notices / maxBoard) * 100}%` }}
                            />
                          </span>
                          <span className="w-12 text-right tabular-nums">{formatCount(m.notices)}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums">{pesoCompact(m.abc)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCount(m.lotsAwarded)}</td>
                      <td className="py-2 pr-5 text-right tabular-nums">{pesoCompact(m.awardedAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="py-2 pl-5">Total</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatCount(board.reduce((a, m) => a + m.notices, 0))}
                  </td>
                  <td className="py-2 text-right tabular-nums">{pesoCompact(board.reduce((a, m) => a + m.abc, 0))}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCount(board.reduce((a, m) => a + m.lotsAwarded, 0))}
                  </td>
                  <td className="py-2 pr-5 text-right tabular-nums">
                    {pesoCompact(board.reduce((a, m) => a + m.awardedAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={`${modeName ?? "All Modes"} by ${breakdown.by === "region" ? "Region" : "Agency"}`}
          description={breakdown.by === "region" ? "Click a region to filter" : "Click an agency for its view"}
        >
          <ul className="space-y-0.5">
            {breakdown.rows.slice(0, 10).map((row) => {
              const active = row.id === (breakdown.by === "region" ? filter.region : filter.agency)
              return (
                <li key={row.id}>
                  <Link
                    href={breakdown.by === "region" ? href({ region: row.id }) : href({ agency: active ? null : row.id })}
                    scroll={false}
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                      active && "bg-blue-50 font-semibold"
                    )}
                  >
                    <span className="truncate">{row.label}</span>
                    <span className="text-muted-foreground tabular-nums">{formatCount(row.notices)}</span>
                    <span className="w-20 text-right tabular-nums">{pesoCompact(row.awardedAmount)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 px-2 text-xs text-muted-foreground">Notices · awarded amount</p>
        </SectionCard>
      </div>

      {/* 02-C Bid activity */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Bid Activity" description="Bids submitted per month">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MiniStat label="Bids submitted" value={formatCount(bids.bidsSubmitted)} />
            <MiniStat label="Avg. bidders per lot" value={bids.avgBidders.toFixed(1)} />
            <MiniStat label="Single-bidder lots" value={pct(bids.singleBidderShare)} warn={bids.singleBidderShare > 0.3} />
          </div>
          <TrendChart
            data={bids.monthly}
            xKey="month"
            height={240}
            series={[
              { key: "current", label: `FY ${fy}`, color: SERIES.blue, variant: "area" },
              ...(bids.monthly.some((m) => m.prior !== null)
                ? [{ key: "prior", label: `FY ${fy - 1}`, color: SERIES.muted, dashed: true }]
                : []),
            ]}
          />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Why Biddings Failed"
          description={`${formatCount(overview.failed.count)} failed lots`}
        >
          <BarList
            color="bg-[#eb6834]"
            items={[
              { label: "No bidder", value: overview.failureReasons.noBidder },
              { label: "All bidders ineligible", value: overview.failureReasons.ineligible },
              { label: "All bidders disqualified", value: overview.failureReasons.disqualified },
              { label: "Other reasons", value: overview.failureReasons.other },
            ]}
          />
        </SectionCard>
      </div>

      {/* 02-D / 02-E Rankings */}
      <div className={cn("grid gap-5", !filter.agency && "lg:grid-cols-2")}>
        {!filter.agency && (
          <SectionCard title="Top Procuring Agencies" description="By awarded amount · click for the agency view">
            <RankedList
              valueFormatter={pesoCompact}
              items={rankings.agencies.map((a) => ({
                label: a.name,
                detail: `${formatCount(a.contracts)} contracts`,
                value: a.awarded,
                href: href({ agency: a.id }),
              }))}
            />
          </SectionCard>
        )}
        <SectionCard
          title={agency ? `Top Suppliers of ${agency.name}` : "Top Awarded Suppliers"}
          description="By awarded amount · click for the supplier profile"
        >
          <RankedList
            valueFormatter={pesoCompact}
            items={rankings.suppliers.map((s) => ({
              label: s.name,
              detail: `${formatCount(s.contracts)} contracts`,
              value: s.awarded,
              href: href({ supplier: s.id }),
            }))}
          />
        </SectionCard>
      </div>

      {/* OCDS priority indicators */}
      <SectionCard title="OCDS Priority Indicators" description={`FY ${fy}, all agencies and modes`}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Indicator
            code="UC025"
            title="Top 10 suppliers' share of contract value"
            value={ocds.uc025 ? pct(ocds.uc025.top10Share) : "—"}
            detail={ocds.uc025 ? `${pesoCompact(ocds.uc025.top10Amount)} to 10 suppliers` : undefined}
            href={`/ocds/indicators/uc025?fy=${fy}`}
          />
          <Indicator
            code="UC036"
            title="Awards by region of awardee"
            value={ocds.uc036?.regions[0]?.region ?? "—"}
            detail={
              ocds.uc036
                ? ocds.uc036.regions
                    .slice(0, 3)
                    .map((r) => `${r.region} ${pesoCompact(r.amount)}`)
                    .join(" · ")
                : undefined
            }
            href={`/ocds/indicators/uc036?fy=${fy}`}
          />
          <Indicator
            code="UC040"
            title="Total value awarded per supplier"
            value={ocds.uc040 ? formatCount(ocds.uc040.suppliers) : "—"}
            detail={ocds.uc040 ? `suppliers · top: ${ocds.uc040.topSupplier} (${pesoCompact(ocds.uc040.topAmount)})` : undefined}
            href={`/ocds/indicators/uc040?fy=${fy}`}
          />
          <Indicator
            code="UC043"
            title="Procuring entities per supplier"
            value={ocds.uc043 ? formatCount(ocds.uc043.procuringEntities) : "—"}
            detail={ocds.uc043 ? `entities supplied by ${ocds.uc043.supplier}` : undefined}
            href={`/ocds/indicators/uc043?fy=${fy}${filter.supplier ? `&supplier=${filter.supplier}` : ""}`}
          />
          <Indicator
            code="UC053"
            title="Tenders with short titles"
            value={ocds.uc053 ? formatCount(ocds.uc053.count) : "—"}
            detail={
              ocds.uc053
                ? `${pct(ocds.uc053.share)} of notices · under ${ocds.uc053.thresholdChars} characters`
                : undefined
            }
            href={`/ocds/indicators/uc053?fy=${fy}`}
          />
        </div>
      </SectionCard>

      <SampleDataNote />
    </div>
  )
}

function Chip({ label, clear }: { label: string; clear: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#313D85]/10 py-0.5 pr-1 pl-3 font-medium text-[#313D85]">
      {label}
      <Link href={clear} scroll={false} aria-label={`Clear ${label}`} className="rounded-full p-0.5 hover:bg-[#313D85]/15">
        <X className="size-3.5" />
      </Link>
    </span>
  )
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg px-3 py-2", warn ? "bg-amber-50" : "bg-muted/60")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

function Indicator({
  code,
  title,
  value,
  detail,
  href,
}: {
  code: string
  title: string
  value: string
  detail?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg p-4 ring-1 ring-foreground/10 transition hover:bg-muted/40 hover:ring-foreground/20"
    >
      <span className="mb-2 w-fit rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700">
        {code}
      </span>
      <span className="text-sm font-medium">{title}</span>
      <span className="mt-2 text-2xl font-bold tabular-nums">{value}</span>
      {detail && <span className="mt-1 text-xs text-muted-foreground">{detail}</span>}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-[#2a78d6]">
        View details <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
