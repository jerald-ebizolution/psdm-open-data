import { ColumnChart, SERIES } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import {
  BarList,
  change,
  Delta,
  KpiGrid,
  KpiTile,
  pct,
  SampleDataNote,
  SectionCard,
  SplitBar,
} from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import {
  getBlacklistReport,
  getCategoryAnalysis,
  getGeographicDistribution,
  getMembershipStatus,
  getRegistrationTrends,
  getSupplierOverview,
  ORG_TYPES,
  parseMerchantFilter,
  REGISTRATION_YEARS,
} from "@/lib/merchant-analytics-data"
import { getRegions } from "@/lib/ocds-regions"
import { BlacklistTable } from "./_components/blacklist-table"
import { GeoExplorer } from "./_components/geo-explorer"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function MerchantAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, regions] = await Promise.all([searchParams, getRegions()])
  const filter = parseMerchantFilter(
    params,
    regions.map((r) => r.code)
  )

  const [overview, trends, geo, membership, blacklist, categories] = await Promise.all([
    getSupplierOverview(filter),
    getRegistrationTrends(filter),
    getGeographicDistribution(filter),
    getMembershipStatus(filter),
    getBlacklistReport(filter),
    getCategoryAnalysis(filter),
  ])

  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))
  const range = filter.fromYear === filter.toYear ? String(filter.toYear) : `${filter.fromYear}–${filter.toYear}`
  const fewSuppliers = categories.categories.filter((c) => c.suppliers < categories.thinThreshold)
  const seed = `${filter.fromYear}-${filter.toYear}-${filter.orgType}`
  const showLocal = filter.orgType !== "foreign"
  const showForeign = filter.orgType !== "local"

  return (
    <div className="flex flex-col gap-5">
      {/* Header, slicers and key figures (01-A) */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Merchant Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Registered suppliers, where they are, their membership and categories, and who is blacklisted.
            </p>
          </div>
          <FilterBar
            yearRange={{ from: filter.fromYear, to: filter.toYear, years: REGISTRATION_YEARS }}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              {
                param: "orgType",
                label: "Organization type",
                allLabel: "Local and foreign",
                value: filter.orgType,
                options: ORG_TYPES,
                className: "w-44 bg-white",
              },
            ]}
          />
        </div>

        <KpiGrid columns={5}>
          <KpiTile
            tone="blue"
            label="Registered Suppliers"
            value={formatCount(overview.registered)}
            delta={{ value: change(overview.registered, overview.registeredAtStart), label: `since ${filter.fromYear}` }}
          />
          <KpiTile
            tone="green"
            label="Active Suppliers"
            value={formatCount(overview.active)}
            caption={`${pct(overview.active / overview.registered)} active rate`}
          />
          <KpiTile
            tone="plain"
            label="Inactive Suppliers"
            value={formatCount(overview.inactive)}
            caption="Registration expired or not renewed"
          />
          <KpiTile
            tone="violet"
            label="Platinum Members"
            value={formatCount(overview.platinum)}
            caption={`${pct(overview.platinum / overview.active)} of active suppliers`}
          />
          <KpiTile tone="red" label="Blacklisted" value={formatCount(blacklist.current)} caption="Currently disqualified" />
        </KpiGrid>
      </Card>

      {/* 01-B Supplier registration trends */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="New Registrations by Year"
          description={`Suppliers registered each year, ${range}`}
        >
          <ColumnChart
            data={trends.years}
            xKey="year"
            stacked
            height={300}
            series={[
              ...(showLocal ? [{ key: "local", label: "Local", color: SERIES.blue }] : []),
              ...(showForeign ? [{ key: "foreign", label: "Foreign", color: SERIES.orange }] : []),
            ]}
          />
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Registration Growth">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {trends.yoy ? `Growth in ${trends.yoy.year}` : "Year-on-year growth"}
              </p>
              <p className="text-xl font-bold tabular-nums">
                {trends.yoy ? <Delta value={trends.yoy.rate} /> : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {trends.forecast ? `${trends.forecast.year} forecast` : "Forecast"}
              </p>
              <p className="text-xl font-bold tabular-nums">
                {trends.forecast ? formatCount(trends.forecast.value) : "—"}
              </p>
              {trends.forecast ? (
                <p className="text-xs">
                  <Delta value={trends.forecast.rate} label="vs this year" />
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Set “to” year to {REGISTRATION_YEARS[0]}</p>
              )}
            </div>
          </div>

          <p className="mt-5 mb-2 text-sm font-semibold">Local vs. Foreign</p>
          <SplitBar
            parts={[
              ...(showLocal ? [{ label: "Local", value: trends.local, color: SERIES.blue }] : []),
              ...(showForeign ? [{ label: "Foreign", value: trends.foreign, color: SERIES.orange }] : []),
            ]}
          />
        </SectionCard>
      </div>

      {/* 01-C Geographic distribution */}
      <SectionCard
        title="Where Suppliers Are Located"
        description="Click an area on the map to drill down from region to province, city or municipality, and barangay"
        flush
      >
        <GeoExplorer
          key={`${filter.region}-${seed}`}
          regions={geo.regions}
          regionNames={regionNames}
          seed={seed}
          initialRegion={geo.regions.find((r) => r.code === filter.region)}
        />
      </SectionCard>

      {/* Foreign suppliers + 01-E membership */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Foreign Suppliers by Country" description="Including embassies and international organizations">
          {geo.foreign.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Country</th>
                  <th className="pb-2 text-right font-medium">Suppliers</th>
                  <th className="pb-2 text-right font-medium">Embassies / Int’l orgs</th>
                </tr>
              </thead>
              <tbody>
                {geo.foreign.slice(0, 8).map((c) => (
                  <tr key={c.country} className="border-t">
                    <td className="py-1.5">{c.country}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{formatCount(c.suppliers)}</td>
                    <td className="py-1.5 text-right text-muted-foreground tabular-nums">{c.embassies || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No foreign suppliers for the selected filters.</p>
          )}
        </SectionCard>

        <SectionCard title="Membership Status">
          <SplitBar
            parts={[
              { label: "Platinum", value: membership.platinum, color: "#6250d6" },
              { label: "Red", value: membership.red, color: "#e34948" },
              { label: "Inactive", value: membership.inactive, color: "#d1d5db" },
            ]}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-900">Expiring in the next 90 days</p>
              <p className="text-xl font-bold tabular-nums">{formatCount(membership.expiringNext90)}</p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">Expired in the last 90 days</p>
              <p className="text-xl font-bold tabular-nums">{formatCount(membership.expiredLast90)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 01-F Category (UNSPSC) distribution */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Suppliers by Category" description="Top UNSPSC segments">
          <BarList items={categories.categories.slice(0, 8).map((c) => ({ label: c.title, value: c.suppliers }))} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Categories with Few Suppliers"
          description={`Fewer than ${categories.thinThreshold} suppliers`}
        >
          {fewSuppliers.length ? (
            <ul className="divide-y text-sm">
              {fewSuppliers.map((c) => (
                <li key={c.code} className="flex items-center justify-between gap-3 py-2">
                  <span>{c.title}</span>
                  <span className="font-semibold text-amber-800 tabular-nums">{formatCount(c.suppliers)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">All categories have enough suppliers.</p>
          )}
        </SectionCard>
      </div>

      {/* 01-D Blacklisted merchants */}
      <SectionCard
        title="Blacklisted Merchants"
        description={`Suppliers blacklisted at any time in ${range}`}
        flush
      >
        <BlacklistTable report={blacklist} regionNames={regionNames} />
      </SectionCard>

      <SampleDataNote />
    </div>
  )
}
