import { CalendarClock, Send } from "lucide-react"
import Link from "next/link"

import { ColumnChart, SERIES } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import {
  BarList,
  change,
  KpiGrid,
  KpiTile,
  pct,
  pesoCompact,
  SampleDataNote,
  SectionCard,
  SplitBar,
} from "@/components/analytics/ui"
import { formatAwardDate, formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import {
  AGENCY_TYPES,
  AGENCY_VIEWS,
  type AgencyView,
  getAgencyPage,
  getAgencySummary,
  parseAgencyFilter,
  SUBMISSION_RULES,
} from "@/lib/government-agency-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { AgencyTable } from "./_components/agency-table"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const PAGE_SIZE = 10
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

// Teal ramp for the region tiles (light → dark), as in the module design.
const TILE_RAMP = [
  "bg-teal-50 text-teal-900",
  "bg-teal-100 text-teal-900",
  "bg-teal-300 text-teal-950",
  "bg-teal-600 text-white",
  "bg-teal-800 text-white",
]

export default async function GovernmentAgencyAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions] = await Promise.all([searchParams, getFiscalYears(), getRegions()])
  const filter = parseAgencyFilter(
    params,
    resolveFiscalYear(params.fy, fiscalYears),
    regions.map((r) => r.code)
  )
  const viewParam = first(params.view)
  const view: AgencyView = AGENCY_VIEWS.some((v) => v.code === viewParam) ? (viewParam as AgencyView) : "all"
  const q = first(params.q)?.trim() ?? ""

  const [summary, agencyPage] = await Promise.all([
    getAgencySummary(filter),
    getAgencyPage(filter, { view, q, page: Number(first(params.page)) || 1, pageSize: PAGE_SIZE }),
  ])

  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))
  const fy = filter.fiscalYear
  const s = summary
  const execution = s.orders.planned ? s.orders.actual / s.orders.planned : 0
  const maxRegion = Math.max(1, ...s.byRegion.map((r) => r.agencies))

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | null> = { fy: String(fy), region: filter.region, type: filter.type, ...changes }
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v)
    return `?${next}`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters and key figures (03-A) */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Government Agency Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Registered agencies, Annual Procurement Plans and budgets, centralized and decentralized buyers, and
              report compliance.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              {
                param: "type",
                label: "Agency type",
                allLabel: "All agency types",
                value: filter.type,
                options: AGENCY_TYPES,
                className: "w-64 bg-white",
              },
            ]}
          />
        </div>

        <KpiGrid columns={5}>
          <KpiTile
            tone="blue"
            label="Registered Agencies"
            value={formatCount(s.registered)}
            delta={{ value: change(s.registered, s.registeredPriorYear), label: "vs last year" }}
          />
          <KpiTile
            tone="green"
            label="Active Agencies"
            value={formatCount(s.active)}
            caption={`${pct(s.active / Math.max(1, s.registered))} procured this year`}
          />
          <KpiTile
            tone="violet"
            label="APP Submitted"
            value={formatCount(s.appSubmitted)}
            caption={`${pct(s.appSubmitted / Math.max(1, s.registered))} of registered agencies`}
          />
          <KpiTile
            tone="amber"
            label="Linked Reports Filed"
            value={formatCount(s.linkedReports)}
            caption="APP-CSE and PMRs linked to an APP"
          />
          <KpiTile tone="plain" label="Total APP Budget" value={pesoCompact(s.totalBudget)} caption="All submitted APPs" />
        </KpiGrid>
      </Card>

      {/* Orders, buyer type, idle agencies */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Planned vs. Actual Orders" description="Common-use supply orders placed against the APP-CSE">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tabular-nums">{pct(execution)}</p>
              <p className="text-xs text-muted-foreground">of planned orders placed</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>
                Planned <span className="font-semibold text-foreground">{pesoCompact(s.orders.planned)}</span>
              </p>
              <p>
                Actual <span className="font-semibold text-foreground">{pesoCompact(s.orders.actual)}</span>
              </p>
            </div>
          </div>
          <ColumnChart
            data={s.orders.quarterly}
            xKey="quarter"
            format="peso"
            height={200}
            series={[
              { key: "planned", label: "Planned", color: SERIES.muted },
              { key: "actual", label: "Actual", color: "#0f766e" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Centralized vs. Decentralized" description="Centralized agencies buy common-use supplies through PS-DBM">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Agencies</p>
          <SplitBar
            parts={[
              { label: "Centralized (via PS-DBM)", value: s.buyers.centralized.agencies, color: "#0f766e" },
              { label: "Decentralized", value: s.buyers.decentralized.agencies, color: "#5eead4" },
            ]}
          />
          <p className="mt-5 mb-2 text-xs font-medium text-muted-foreground">APP budget</p>
          <SplitBar
            valueFormatter={pesoCompact}
            parts={[
              { label: "Centralized (via PS-DBM)", value: s.buyers.centralized.budget, color: "#0f766e" },
              { label: "Decentralized", value: s.buyers.decentralized.budget, color: "#5eead4" },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="APP but No Procurement"
          description={`${formatCount(s.idle.count)} agencies submitted an APP but have not procured`}
          action={
            <Link href={`${link({ view: "idle" })}#agencies`} scroll={false} className="text-xs font-medium text-[#2a78d6] hover:underline">
              View all
            </Link>
          }
        >
          {s.idle.top.length ? (
            <ol className="divide-y text-sm">
              {s.idle.top.map((a, i) => (
                <li key={a.id} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 py-2.5">
                  <span className="font-semibold text-teal-700 tabular-nums">{i + 1}</span>
                  <span className="truncate" title={a.name}>
                    {a.name}
                  </span>
                  <span className="font-medium tabular-nums">{pesoCompact(a.budget)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Every agency with an APP has procured this year.</p>
          )}
        </SectionCard>
      </div>

      {/* Combined APP and APP-CSE view */}
      <SectionCard title="APP and APP-CSE Submissions" description={`FY ${fy}`}>
        <div className="grid gap-6 md:grid-cols-2">
          {(
            [
              ["app", s.submissions.app, null],
              ["appCse", s.submissions.appCse, s.submissions.appCse.notRequired],
            ] as const
          ).map(([key, counts, notRequired]) => {
            const rule = SUBMISSION_RULES[key]
            return (
              <div key={key} className="space-y-4">
                <div>
                  <p className="font-semibold">{rule.name}</p>
                  <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarClock className="size-3.5" aria-hidden />
                      Deadline: <span className="font-medium text-foreground">{formatAwardDate(rule.deadline(fy))}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Send className="size-3.5" aria-hidden />
                      {rule.manner}
                    </p>
                  </div>
                </div>
                <SplitBar
                  parts={[
                    { label: "Submitted on time", value: counts.onTime, color: "#0f766e" },
                    { label: "Submitted late", value: counts.late, color: "#eda100" },
                    { label: "Not submitted", value: counts.missing, color: "#e34948" },
                    ...(notRequired !== null
                      ? [{ label: "Not required (decentralized)", value: notRequired, color: "#d1d5db" }]
                      : []),
                  ]}
                />
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Landing listing: agencies with APP and total budget */}
      <div id="agencies" className="scroll-mt-4">
        <SectionCard title="Agencies, APPs and Budgets" description="Search an agency or pick a view" flush>
          <AgencyTable
            key={`${fy}-${filter.region}-${filter.type}`}
            data={agencyPage}
            view={view}
            q={q}
            viewCounts={s.viewCounts}
            regionNames={regionNames}
          />
        </SectionCard>
      </div>

      {/* 03-B registration trends + 03-C organization type */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Agency Registrations by Year" description="New agencies registered each year">
          <ColumnChart
            data={s.registrationsByYear}
            xKey="year"
            height={260}
            series={[{ key: "agencies", label: "Agencies", color: "#0f766e" }]}
          />
        </SectionCard>
        <SectionCard className="lg:col-span-2" title="Agencies by Type">
          <BarList items={s.byType.map((t) => ({ label: t.label, value: t.value }))} color="bg-[#0f766e]" />
        </SectionCard>
      </div>

      {/* 03-D geographic spread + 03-E report compliance */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Agencies by Region" description="Click a region to filter">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {s.byRegion.map((r) => {
              const active = r.code === filter.region
              const step = Math.min(TILE_RAMP.length - 1, Math.floor((r.agencies / maxRegion) * TILE_RAMP.length))
              return (
                <li key={r.code}>
                  <Link
                    href={link({ region: active ? null : r.code })}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    title={`${regionNames[r.code]}: ${formatCount(r.agencies)} agencies`}
                    className={cn(
                      "block rounded-lg px-3 py-2 transition hover:ring-2 hover:ring-[#313D85]/40",
                      TILE_RAMP[step],
                      active && "ring-2 ring-[#313D85]",
                      filter.region && !active && "opacity-50"
                    )}
                  >
                    <p className="truncate text-xs font-semibold">{regionNames[r.code]}</p>
                    <p className="text-lg font-bold tabular-nums">{formatCount(r.agencies)}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Report Compliance" description="Share of agencies that filed on time">
          <ul className="space-y-3">
            {s.compliance.map((c) => (
              <li key={c.report} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{c.report}</span>
                  <span className="font-semibold tabular-nums">
                    {c.rate === null ? <span className="text-xs font-normal text-muted-foreground">Not yet due</span> : pct(c.rate)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", (c.rate ?? 0) >= 0.7 ? "bg-[#0f766e]" : "bg-amber-500")}
                    style={{ width: `${(c.rate ?? 0) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SampleDataNote />
    </div>
  )
}
