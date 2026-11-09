import { FilterBar } from "@/components/analytics/filter-bar"
import { BarList, KpiGrid, KpiTile, pct, SampleDataNote, SectionCard } from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import {
  COLLUSION_YEARS,
  getBidderNetwork,
  getRotationMonitor,
  parseCollusionFilter,
  SIGNALS,
} from "@/lib/collusion-data"
import { AGENCY_TYPES } from "@/lib/government-agency-data"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { NetworkGraph } from "./_components/network-graph"
import { ReferralButton, RotationTable } from "./_components/rotation-table"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const INDIGO = "#312e81"

export default async function CollusionMonitoring({ searchParams }: { searchParams: SearchParams }) {
  const [params, regions] = await Promise.all([searchParams, getRegions()])
  const filter = parseCollusionFilter(
    params,
    regions.map((r) => r.code)
  )
  const [network, rotation] = await Promise.all([getBidderNetwork(filter), getRotationMonitor(filter)])
  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))
  const highRisk = network.suppliers.filter((s) => s.band === "high").length
  const concentrated = rotation.cases.filter((c) => c.hhi > 2500).length
  const risk = rotation.overallRisk
  const range = filter.fromYear === filter.toYear ? String(filter.toYear) : `${filter.fromYear}–${filter.toYear}`

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters, key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Collusion Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              Bidder networks, bid rotation, price clustering and market concentration.
            </p>
          </div>
          <FilterBar
            yearRange={{ from: filter.fromYear, to: filter.toYear, years: COLLUSION_YEARS }}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              {
                param: "agencyType",
                label: "Agency type",
                allLabel: "All agency types",
                value: filter.agencyType,
                options: AGENCY_TYPES,
                className: "w-64 bg-white",
              },
            ]}
          />
        </div>

        <KpiGrid>
          <KpiTile tone="blue" label="Suppliers in Network" value={formatCount(network.suppliers.length)} caption={`Co-bidding in ${range}`} />
          <KpiTile
            tone="amber"
            label="Supplier Pairs with Signals"
            value={formatCount(network.flaggedPairs)}
            caption={`of ${formatCount(network.edges.length)} linked pairs`}
          />
          <KpiTile tone="red" label="High-Risk Suppliers" value={formatCount(highRisk)} caption="Risk score 60 or higher" />
          <KpiTile
            tone="violet"
            label="Rotation Patterns"
            value={formatCount(rotation.cases.length)}
            caption={`${formatCount(concentrated)} in highly concentrated markets`}
          />
        </KpiGrid>
      </Card>

      {/* 07-A Bidder network */}
      <SectionCard
        title="Bidder Network Analysis"
        description="Suppliers linked by shared bidding history, coloured by risk · search or click a supplier"
        flush
      >
        <NetworkGraph key={`${filter.fromYear}-${filter.toYear}-${filter.region}-${filter.agencyType}`} network={network} regionNames={regionNames} />
      </SectionCard>

      {/* Signals + overall risk + referral */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Risk Signals Analyzed" description="Supplier pairs showing each signal">
          <ul className="space-y-2.5">
            {network.signalCounts.map((s) => {
              const max = Math.max(1, ...network.signalCounts.map((x) => x.pairs))
              const def = SIGNALS.find((x) => x.key === s.key)!
              return (
                <li key={s.key} className="grid grid-cols-[minmax(9rem,38%)_1fr_auto] items-center gap-3 text-sm" title={def.description}>
                  <span>
                    {s.label}
                    <span className="block text-xs text-muted-foreground">{def.description}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${(s.pairs / max) * 100}%`, background: INDIGO }} />
                  </span>
                  <span className="w-8 text-right font-semibold tabular-nums">{formatCount(s.pairs)}</span>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <div className="flex flex-col gap-5">
          <SectionCard title="Overall Risk Score" description="Weighted by tenders across detected patterns">
            <p className={cn("text-4xl font-bold tabular-nums", risk >= 0.6 ? "text-red-700" : risk >= 0.35 ? "text-amber-600" : "text-indigo-900")}>
              {Math.round(risk * 100)}
              <span className="text-lg font-semibold text-muted-foreground"> / 100</span>
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", risk >= 0.6 ? "bg-red-600" : risk >= 0.35 ? "bg-amber-500" : "bg-indigo-900")}
                style={{ width: `${risk * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">0–34 low · 35–59 medium · 60–100 high</p>
          </SectionCard>

          <SectionCard title="Referral Reports" description="For the GPPB and the Philippine Competition Commission">
            <ReferralButton cases={rotation.cases} regionNames={regionNames} />
          </SectionCard>
        </div>
      </div>

      {/* 07-B Bid rotation and price fixing monitor */}
      <SectionCard
        title="Bid Rotation and Price Fixing Monitor"
        description="Rotation patterns per agency · expand a row to see who won each tender"
        flush
      >
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Patterns found</p>
            <BarList items={rotation.patterns} color="bg-red-600" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Market concentration</p>
            <p className="text-sm">
              <span className="text-2xl font-bold tabular-nums">{pct(concentrated / Math.max(1, rotation.cases.length), 0)}</span>{" "}
              <span className="text-muted-foreground">
                of flagged agency markets are highly concentrated (HHI above 2,500)
              </span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              HHI = sum of squared market shares of the suppliers winning at that agency, from 0 (open market) to 10,000
              (one supplier wins everything).
            </p>
          </div>
        </div>
        <RotationTable key={`${filter.fromYear}-${filter.toYear}-${filter.region}-${filter.agencyType}`} cases={rotation.cases} regionNames={regionNames} />
      </SectionCard>

      <p className="rounded-xl bg-white/60 px-5 py-3 text-xs text-muted-foreground ring-1 ring-foreground/5">
        Graphs on this page are published only where approved. Narrative findings remain internal.
      </p>
      <SampleDataNote />
    </div>
  )
}
