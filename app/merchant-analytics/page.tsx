import { ColumnChart } from "@/components/analytics/charts"
import { SERIES } from "@/components/analytics/palette"
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
  LATEST_YEAR,
  type MerchantFilter,
} from "@/lib/merchant-analytics-data"
import { getRegions } from "@/lib/ocds-regions"
import { BlacklistTable } from "./_components/blacklist-table"
import { GeoExplorer } from "./_components/geo-explorer"

// No filters: the page always shows the latest year (2026), nationwide, local and foreign combined.
const FILTER: MerchantFilter = { fromYear: LATEST_YEAR, toYear: LATEST_YEAR, region: null, orgType: null }

export default async function MerchantAnalytics() {
  const regions = await getRegions()
  const filter = FILTER
  console.log(filter)
  const [overview, trends, geo, membership, blacklist, categories] = await Promise.all([
    getSupplierOverview(filter),
    getRegistrationTrends(filter),
    getGeographicDistribution(filter),
    getMembershipStatus(filter),
    getBlacklistReport(filter),
    getCategoryAnalysis(filter),
  ])

  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))
  console.log(regionNames, "regionNamesregionNames")
  const range = filter.fromYear === filter.toYear ? String(filter.toYear) : `${filter.fromYear}–${filter.toYear}`
  const fewSuppliers = categories.categories.filter((c) => c.suppliers < categories.thinThreshold)
  const seed = `${filter.fromYear}-${filter.toYear}-${filter.orgType}`
  const showLocal = filter.orgType !== "foreign"
  const showForeign = filter.orgType !== "local"

  return (
    <div className="flex flex-col gap-5">
      {/* Header, slicers and key figures (01-A) */}
      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#313D85]">Merchant Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Registered suppliers, where they are, their membership and categories, and who is blacklisted.
            </p>
          </div>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
            FY {filter.toYear}
          </span>
        </div>

        <KpiGrid columns={5}>
          <KpiTile
            tone="blue"
            label="Registered Suppliers"
            value={formatCount(overview.registered)}
            delta={{ value: change(overview.registered, overview.registeredAtStart), label: "vs last year" }}
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
          description={`Suppliers registered in ${range} (year-to-date) and the ${filter.toYear + 1} forecast`}
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
                {trends.yoy ? `Growth in ${trends.yoy.year} vs ${trends.yoy.year - 1}` : "Year-on-year growth"}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {trends.yoy ? <Delta value={trends.yoy.rate} /> : "—"}
              </p>
              {trends.yoy && <p className="text-xs text-muted-foreground">{trends.yoy.year} annualized from year-to-date</p>}
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {trends.forecast ? `${trends.forecast.year} forecast` : "Forecast"}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {trends.forecast ? formatCount(trends.forecast.value) : "—"}
              </p>
              {trends.forecast ? (
                <p className="text-xs">
                  <Delta value={trends.forecast.rate} label="vs this year" />
                </p>
              ) : null}
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
              <p className="text-lg font-semibold tabular-nums">{formatCount(membership.expiringNext90)}</p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">Expired in the last 90 days</p>
              <p className="text-lg font-semibold tabular-nums">{formatCount(membership.expiredLast90)}</p>
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
