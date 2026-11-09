import { Clock, Link2, PlugZap } from "lucide-react"

import { FilterBar } from "@/components/analytics/filter-bar"
import { KpiGrid, KpiTile, pct, SampleDataNote, SectionCard } from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { BO_FLAGS, BO_SOURCES, getBoEntities, getBoSummary, parseBoFilter } from "@/lib/beneficial-ownership-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { CoiTable } from "./_components/coi-table"
import { EntityMap } from "./_components/entity-map"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const INDIGO = "#4338ca"

export default async function BeneficialOwnership({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions] = await Promise.all([searchParams, getFiscalYears(), getRegions()])
  const filter = parseBoFilter(params, resolveFiscalYear(params.fy, fiscalYears), regions.map((r) => r.code))
  const [s, entities] = await Promise.all([getBoSummary(filter), getBoEntities(filter)])
  const fy = filter.fiscalYear
  const shellEntities = entities.filter((e) => e.shell.length > 0).sort((a, b) => b.shell.length - a.shell.length)
  const key = `${fy}-${filter.region}-${filter.source}-${filter.flag}`

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters, key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Beneficial Ownership</h1>
            <p className="text-sm text-muted-foreground">
              Who owns and controls suppliers, their linked companies, and conflicts of interest with public officials.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              {
                param: "source",
                label: "Source",
                allLabel: "All sources",
                value: filter.source,
                options: BO_SOURCES.map((x) => ({ code: x.code, name: x.name })),
                className: "w-36 bg-white",
              },
              { param: "flag", label: "Flag", allLabel: "All suppliers", value: filter.flag, options: BO_FLAGS, className: "w-52 bg-white" },
            ]}
          />
        </div>

        <KpiGrid>
          <KpiTile tone="blue" label="Suppliers Profiled" value={formatCount(s.profiled)} caption="With an ownership profile" />
          <KpiTile
            tone="green"
            label="Verified BO Disclosures"
            value={formatCount(s.verified)}
            caption={`${pct(s.verified / Math.max(1, s.profiled))} of profiles cross-checked`}
          />
          <KpiTile tone="violet" label="Linked Entities" value={formatCount(s.linkedEntities)} caption="Companies sharing an owner or director" />
          <KpiTile
            tone="red"
            label="Conflict-of-Interest Flags"
            value={formatCount(s.coiFlags)}
            caption={`${formatCount(s.coiForReview)} for review`}
          />
        </KpiGrid>
      </Card>

      {/* Entity relationship map + sources + SALN */}
      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Entity Relationship Map"
          description="Owners, directors, linked companies and public officials · drag or zoom the map"
          flush
        >
          <EntityMap key={key} entities={entities} />
        </SectionCard>

        <div className="flex flex-col gap-5">
          <SectionCard title="Data Sources" description="Share of profiled suppliers found in each source">
            <ul className="space-y-3">
              {BO_SOURCES.map((src) => {
                const share = s.sourceCoverage.find((c) => c.code === src.code)?.share ?? 0
                return (
                  <li key={src.code} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{src.name}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          src.status === "connected" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                        )}
                      >
                        {src.status === "connected" ? <PlugZap className="size-3" /> : <Clock className="size-3" />}
                        {src.status === "connected" ? "Connected" : "Under coordination"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{src.covers}</p>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: INDIGO }} />
                      </span>
                      <span className="w-10 text-right text-xs tabular-nums">{pct(share, 0)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </SectionCard>

          <SectionCard title="SALN Linkage" description="Statements of Assets, Liabilities and Net Worth">
            <div className="flex items-start gap-3">
              <Link2 className="mt-1 size-5 text-indigo-600" aria-hidden />
              <div className="text-sm">
                <p>
                  <span className="text-xl font-bold tabular-nums">{formatCount(s.saln.recorded)}</span>{" "}
                  <span className="text-muted-foreground">of {formatCount(s.saln.recorded + s.saln.pending)} flagged officials have a SALN link recorded</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Links are recorded now and will be used once CSC centralized SALN data is available.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 08-D COI screening */}
      <SectionCard title="Conflict-of-Interest Screening" description="Supplier owners matched to officials and their relatives (CSC PDS)" flush>
        <CoiTable key={key} entities={entities} />
      </SectionCard>

      {/* 08-C shell companies + 08-B linked entity mapping */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Possible Shell Companies"
          description={`About ${formatCount(s.shellSuspects)} profiled suppliers show two or more indicators`}
          flush
        >
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pl-5 font-medium">Supplier</th>
                  <th className="py-2 pr-5 font-medium">Indicators</th>
                </tr>
              </thead>
              <tbody>
                {shellEntities.slice(0, 8).map((e) => (
                  <tr key={e.id} className="border-t align-top">
                    <td className="py-2 pl-5">
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.form} · {e.shell.length} indicator{e.shell.length > 1 ? "s" : ""}
                      </p>
                    </td>
                    <td className="py-2 pr-5">
                      <div className="flex flex-wrap gap-1">
                        {e.shell.map((i) => (
                          <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900">
                            {i}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!shellEntities.length && (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-muted-foreground">
                      No shell company indicators for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Most-Connected Owners" description="People who own or direct several suppliers">
          {s.topOwners.length ? (
            <ol className="divide-y text-sm">
              {s.topOwners.map((o, i) => (
                <li key={`${o.initials}-${i}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-indigo-700 tabular-nums">{i + 1}</span>
                    <span className="font-mono">{o.initials}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">{o.companies}</span> companies
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No owner holds more than one supplier in this selection.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Names are masked to initials on this page.</p>
        </SectionCard>
      </div>

      <SampleDataNote />
    </div>
  )
}
