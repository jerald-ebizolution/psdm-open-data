import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { ColumnChart } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import { KpiGrid, KpiTile, pct, pesoCompact, SampleDataNote, SectionCard, SplitBar } from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getProcurementModes } from "@/lib/ocds-procurement-modes"
import { getRegions } from "@/lib/ocds-regions"
import {
  COMPLETENESS_FLOOR,
  COMPLIANCE_WEIGHTS,
  FLAG_STATUSES,
  getAwardConcentration,
  getCompliance,
  getFlagSummary,
  getPriceDisparity,
  IMPACT,
  LIKELIHOOD,
  parseObserversFilter,
  severityOf,
} from "@/lib/observers-data"
import { cn } from "@/lib/utils"
import { FlagCasesTable } from "./_components/flag-cases-table"
import { NonCompliantTable } from "./_components/non-compliant-table"
import { SEVERITY, SEVERITY_ORDER, SeverityBadge } from "./_components/severity"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

// Red ramp for flags per 100 tenders (light → dark).
const RISK_RAMP = ["bg-red-50 text-red-950", "bg-red-100 text-red-950", "bg-red-300 text-red-950", "bg-red-600 text-white", "bg-red-800 text-white"]

export default async function ObserversAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions, modes] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getRegions(),
    getProcurementModes(),
  ])
  const filter = parseObserversFilter(
    params,
    resolveFiscalYear(params.fy, fiscalYears),
    regions.map((r) => r.code),
    modes
  )

  const [flags, prices, compliance, concentration] = await Promise.all([
    getFlagSummary(filter),
    getPriceDisparity(filter),
    getCompliance(filter),
    getAwardConcentration(filter),
  ])

  const fy = filter.fiscalYear
  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))
  const modeNames = Object.fromEntries(modes.map((m) => [m.code, m.name]))
  const maxCell = Math.max(1, ...flags.matrix.flat())
  const maxPer100 = Math.max(0.01, ...flags.byRegion.map((r) => r.per100))

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | null> = {
      fy: String(fy),
      region: filter.region,
      mode: filter.mode,
      status: filter.status,
      ...changes,
    }
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v)
    return `?${next}`
  }

  const operational = flags.defs.filter((d) => d.group === "operational")
  const ocds = flags.defs.filter((d) => d.group === "ocds")

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters, status slicers, key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Observers Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Procurement red flags, risk severity, cross-agency price gaps and agency compliance.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              { param: "mode", label: "Procurement mode", allLabel: "All modes", value: filter.mode, options: modes, className: "w-52 bg-white" },
            ]}
          />
        </div>

        {/* Verification / investigation status slicers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          {[{ code: null, name: "All" }, ...FLAG_STATUSES].map((s) => {
            const active = filter.status === s.code
            const count = s.code ? flags.statusCounts[s.code] : Object.values(flags.statusCounts).reduce((a, b) => a + b, 0)
            return (
              <Link
                key={s.name}
                href={link({ status: s.code })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 transition-colors",
                  active ? "bg-[#313D85] text-white ring-[#313D85]" : "bg-white ring-foreground/15 hover:bg-muted"
                )}
              >
                {s.name}
                <span className={cn("tabular-nums", active ? "text-white/75" : "text-muted-foreground")}>{formatCount(count)}</span>
              </Link>
            )
          })}
        </div>

        <KpiGrid columns={5}>
          <KpiTile tone="red" label="Flagged Cases" value={formatCount(flags.total)} caption={`${flags.defs.length} red-flag checks`} />
          <KpiTile
            tone="red"
            label="High-Risk Cases"
            value={formatCount(flags.highRisk)}
            caption={`${pct(flags.highRisk / Math.max(1, flags.total))} rated high or critical`}
          />
          <KpiTile tone="amber" label="Under Investigation" value={formatCount(flags.investigating)} caption="Referred after verification" />
          <KpiTile tone="plain" label="Agencies Flagged" value={formatCount(flags.agencies)} caption="With at least one case" />
          <KpiTile tone="plain" label="Value of Flagged Procurements" value={pesoCompact(flags.value)} caption="Total ABC of flagged cases" />
        </KpiGrid>
      </Card>

      {/* 04-A Risk matrix + flag list */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-2" title="Risk Severity Matrix" description="Flagged cases by likelihood and impact">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="w-16" />
                  {LIKELIHOOD.map((l) => (
                    <th key={l} className="pb-1 font-medium text-muted-foreground">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IMPACT.map((impact, row) => (
                  <tr key={impact}>
                    <th className="pr-1 text-left font-medium text-muted-foreground">{impact}</th>
                    {LIKELIHOOD.map((l, col) => {
                      const sev = severityOf(col, 3 - row)
                      const n = flags.matrix[row][col]
                      return (
                        <td
                          key={l}
                          title={`${impact} impact · ${l}: ${n} cases (${SEVERITY[sev].label})`}
                          className="h-12 rounded-md text-center text-sm font-bold tabular-nums"
                          style={{
                            background: SEVERITY[sev].color,
                            opacity: n ? 0.35 + 0.65 * (n / maxCell) : 0.15,
                            color: sev === "low" || sev === "medium" ? "#111827" : "#ffffff",
                          }}
                        >
                          {n || ""}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-center text-xs text-muted-foreground">Likelihood →</p>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {SEVERITY_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: SEVERITY[s].color }} aria-hidden />
                {SEVERITY[s].label}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard className="lg:col-span-3" title="Red Flags Tracked" description="Each flag with its threshold and the basis for it">
          {[
            ["Operational flags", operational],
            ["OCDS priority red flags (OCDS Data Store)", ocds],
          ].map(([heading, list]) => (
            <div key={heading as string} className="mb-4 last:mb-0">
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{heading as string}</p>
              <ul className="divide-y">
                {(list as typeof flags.defs).map((d) => {
                  const top = SEVERITY_ORDER.find((s) => d.bySeverity[s] > 0) ?? "low"
                  return (
                    <li key={d.code}>
                      <details className="group py-2">
                        <summary className="flex cursor-pointer list-none items-center gap-3 text-sm">
                          <span className="w-12 shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-center font-mono text-xs font-semibold text-red-800">
                            {d.code}
                          </span>
                          <span className="flex-1 font-medium">{d.name}</span>
                          {d.count > 0 && <SeverityBadge severity={top} />}
                          <span className="w-10 text-right font-semibold tabular-nums">{formatCount(d.count)}</span>
                        </summary>
                        <div className="mt-2 ml-15 space-y-1 text-xs text-muted-foreground">
                          <p>
                            <span className="font-semibold text-foreground">Threshold:</span> {d.threshold}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">Basis:</span> {d.basis}
                          </p>
                          {d.href && (
                            <Link href={d.href(fy)} className="inline-flex items-center gap-1 font-semibold text-[#2a78d6] hover:underline">
                              Open {d.code} in the OCDS Data Store <ArrowRight className="size-3" />
                            </Link>
                          )}
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Trend + geographic risk */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Red Flags per Month" description="New cases detected, by severity">
          <ColumnChart
            data={flags.trend}
            xKey="month"
            stacked
            height={280}
            series={[...SEVERITY_ORDER].reverse().map((s) => ({ key: s, label: SEVERITY[s].label, color: SEVERITY[s].color }))}
          />
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Geographic Risk" description="Flagged cases per 100 tenders · click a region to filter">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {flags.byRegion.map((r) => {
              const active = r.code === filter.region
              const step = Math.min(RISK_RAMP.length - 1, Math.floor((r.per100 / maxPer100) * RISK_RAMP.length))
              return (
                <li key={r.code}>
                  <Link
                    href={link({ region: active ? null : r.code })}
                    scroll={false}
                    title={`${regionNames[r.code]}: ${r.cases} cases`}
                    className={cn(
                      "block rounded-lg px-3 py-2 transition hover:ring-2 hover:ring-[#313D85]/40",
                      RISK_RAMP[step],
                      active && "ring-2 ring-[#313D85]",
                      filter.region && !active && "opacity-50"
                    )}
                  >
                    <p className="truncate text-xs font-semibold">{regionNames[r.code]}</p>
                    <p className="text-lg font-bold tabular-nums">{r.per100.toFixed(1)}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </div>

      {/* Flagged cases with source links */}
      <SectionCard title="Flagged Cases" description="Every case links to its source notice or OCDS red-flag list" flush>
        <FlagCasesTable
          key={`${fy}-${filter.region}-${filter.mode}-${filter.status}`}
          cases={flags.cases}
          flags={flags.defs.map((d) => ({ code: d.code, name: d.name }))}
          regionNames={regionNames}
          modeNames={modeNames}
        />
      </SectionCard>

      {/* Price disparity + award concentration */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Cross-Agency Price Disparity"
          description="Unit prices paid by different agencies for identical items"
          flush
        >
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pl-5 font-medium">Item</th>
                  <th className="py-2 text-right font-medium">Median</th>
                  <th className="py-2 text-right font-medium">Range</th>
                  <th className="py-2 pr-5 text-right font-medium">Highest vs. median</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.item} className="border-t align-top">
                    <td className="py-2 pl-5">
                      <p className="font-medium">{p.item}</p>
                      <p className="text-xs text-muted-foreground">
                        per {p.unit} · {p.agencies} agencies · highest: {p.highest[0]?.agency}
                      </p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{peso(p.median)}</td>
                    <td className="py-2 text-right text-muted-foreground tabular-nums">
                      {peso(p.min)} – {peso(p.max)}
                    </td>
                    <td className="py-2 pr-5 text-right">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                          p.disparity > 0.5 ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground"
                        )}
                      >
                        +{Math.round(p.disparity * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t px-5 py-3 text-xs text-muted-foreground">Prices more than 50% above the median raise flag PD.</p>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Award Concentration" description="Agencies where one supplier won most of the contract value">
          <p className="mb-3 text-sm">
            <span className="text-2xl font-bold tabular-nums">{pct(concentration.concentratedShare)}</span>{" "}
            <span className="text-muted-foreground">of agencies gave over half their contract value to one supplier</span>
          </p>
          <ol className="divide-y text-sm">
            {concentration.top.map((c, i) => (
              <li key={c.agency} className="grid grid-cols-[1.25rem_1fr_auto] gap-2 py-2">
                <span className="font-semibold text-red-700 tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium" title={c.agency}>
                    {c.agency}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.supplier} · {c.contracts} contracts
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{pct(c.share)}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      {/* 04-B Agency compliance monitor */}
      <SectionCard
        title="Agency Compliance Monitor"
        description={`Composite score = timeliness ${pct(COMPLIANCE_WEIGHTS.timeliness, 0)} + completeness ${pct(COMPLIANCE_WEIGHTS.completeness, 0)} + accuracy ${pct(COMPLIANCE_WEIGHTS.accuracy, 0)} (criteria to be defined) · ${formatCount(compliance.agencies)} active agencies`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["Composite score", compliance.averages.composite],
              ["Timeliness", compliance.averages.timeliness],
              ["Completeness", compliance.averages.completeness],
              ["Accuracy", compliance.averages.accuracy],
            ] as const
          ).map(([label, value], i) => (
            <div key={label} className={cn("rounded-xl px-4 py-3 ring-1 ring-foreground/10", i === 0 && "bg-[#313D85]/5")}>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{pct(value, 0)}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", value < COMPLETENESS_FLOOR ? "bg-red-600" : value < 0.75 ? "bg-amber-500" : "bg-[#0f766e]")}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="mb-3 text-sm font-semibold">PMR Submissions</p>
            <div className="space-y-5">
              {compliance.pmr.map((p) => (
                <div key={p.semester}>
                  <p className="mb-2 text-xs text-muted-foreground">{p.semester}</p>
                  {p.notDue ? (
                    <p className="text-sm text-muted-foreground">Not yet due for FY {fy}.</p>
                  ) : (
                    <SplitBar
                      parts={[
                        { label: "On time", value: p.onTime, color: "#0f766e" },
                        { label: "Late", value: p.late, color: "#eda100" },
                        { label: "Not submitted", value: p.missing, color: "#e34948" },
                      ]}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">Awards Within 60 Calendar Days</p>
              <p className="text-sm">
                <span className="font-bold tabular-nums">{pct(compliance.awardsWithin60)}</span>{" "}
                <span className="text-muted-foreground">of awards on time</span>
              </p>
            </div>
            <ColumnChart
              data={compliance.awards}
              xKey="month"
              stacked
              height={240}
              series={[
                { key: "within", label: "Within 60 days", color: "#0f766e" },
                { key: "over", label: "Over 60 days", color: "#dc2626" },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Non-Compliant Agencies"
        description={`Auto-flagged: completeness or composite score below ${pct(COMPLETENESS_FLOOR, 0)} · ${formatCount(compliance.nonCompliant.length)} agencies`}
        flush
      >
        <NonCompliantTable
          key={`${fy}-${filter.region}-${filter.mode}`}
          agencies={compliance.nonCompliant}
          floor={COMPLETENESS_FLOOR}
          regionNames={regionNames}
        />
      </SectionCard>

      <SampleDataNote />
    </div>
  )
}

const unitPeso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })
const peso = (n: number) => unitPeso.format(n)
