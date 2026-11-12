import { RefreshCw } from "lucide-react"
import Link from "next/link"

import { ColumnChart } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import { change, Delta, KpiGrid, KpiTile, pct, pesoCompact, SampleDataNote, SectionCard, SplitBar } from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { CATALOGUE } from "@/lib/emarketplace-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { getPriceSearchData, getStoreSummary, parseStoreFilter } from "@/lib/virtual-store-data"
import { PriceSearch } from "./_components/price-search"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const ORANGE = "#c2410c"
const time = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })

export default async function VirtualStoreAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions] = await Promise.all([searchParams, getFiscalYears(), getRegions()])
  const filter = parseStoreFilter(
    params,
    resolveFiscalYear(params.fy, fiscalYears),
    regions.map((r) => r.code)
  )
  const [s, search] = await Promise.all([getStoreSummary(filter), getPriceSearchData(filter)])
  const fy = filter.fiscalYear
  const regionNames = Object.fromEntries(regions.map((r) => [r.code, r.name]))

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | null> = { fy: String(fy), region: filter.region, item: filter.item, ...changes }
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v)
    return `?${next}`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters, headline figure and KPIs */}
      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#313D85]">Virtual Store Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Store purchases, delivery orders, utilization, unmet demand and price benchmarking.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              {
                param: "item",
                label: "Item",
                allLabel: "All items",
                value: filter.item,
                options: CATALOGUE.map((i) => ({ code: i.code, name: i.name })),
                className: "w-56 bg-white",
              },
            ]}
          />
        </div>

        {/* Headline figure */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-lg bg-orange-50 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-orange-900">Total purchases, FY {fy}</p>
            <p className="text-2xl font-semibold tracking-tight text-orange-800 sm:text-3xl tabular-nums">{pesoCompact(s.purchases)}</p>
          </div>
          <div className="pb-1 text-sm">
            {s.purchasesPriorYear > 0 && <Delta value={change(s.purchases, s.purchasesPriorYear)} label="vs last year" />}
            <p className="text-muted-foreground">
              {pct(s.utilization)} of the APP-CSE plan used through the store
            </p>
          </div>
        </div>

        <KpiGrid>
          <KpiTile tone="amber" label="Product Listings" value={formatCount(s.listings)} caption="Items in the store" />
          <KpiTile tone="plain" label="Purchase / Delivery Orders" value={formatCount(s.orders)} caption="Agency delivery orders this year" />
          <KpiTile tone="blue" label="Total Purchases" value={pesoCompact(s.purchases)} caption="All agencies" />
          <KpiTile
            tone="green"
            label="Agencies Using the Store"
            value={formatCount(s.agenciesUsing)}
            caption={`${pct(s.agenciesUsing / Math.max(1, s.agenciesWithPlan))} of agencies with an APP-CSE`}
          />
        </KpiGrid>
      </Card>

      {/* Utilization heatmap + price search */}
      <div className="grid gap-5 xl:grid-cols-5">
        <SectionCard className="xl:col-span-3" title="Utilization by Region and Month" description="Store purchases as a share of the monthly APP-CSE plan · click a region to filter">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0.5 text-[11px]">
              <thead>
                <tr>
                  <th className="w-24" />
                  {s.months.map((m) => (
                    <th key={m} className="pb-1 font-medium text-muted-foreground">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.heatmap.map((row) => {
                  const active = row.region === filter.region
                  return (
                    <tr key={row.region} className={cn(filter.region && !active && "opacity-40")}>
                      <th className="pr-2 text-left font-medium whitespace-nowrap">
                        <Link href={link({ region: active ? null : row.region })} scroll={false} className={cn("hover:underline", active && "font-semibold text-orange-800")}>
                          {regionNames[row.region] ?? row.region}
                        </Link>
                      </th>
                      {row.months.slice(0, s.months.length).map((v, i) => (
                        <td
                          key={i}
                          title={`${regionNames[row.region]} · ${s.months[i]}: ${v === null ? "—" : pct(v, 0)}`}
                          className="h-6 min-w-9 rounded-sm text-center font-medium tabular-nums"
                          style={{
                            background: `rgba(194, 65, 12, ${0.08 + Math.min(1, v ?? 0) * 0.85})`,
                            color: (v ?? 0) > 0.55 ? "#fff" : "#431407",
                          }}
                        >
                          {v === null ? "" : Math.round(v * 100)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Values are % of plan; darker = higher utilization.</p>
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="Price Search" description="Find an item or a purchase order · store vs. external price">
          <PriceSearch key={`${fy}-${filter.region}-${filter.item}`} data={search} />
        </SectionCard>
      </div>

      {/* Delivery orders + unmet demand + IAR/FACT */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Actual vs. Fulfilled Delivery Orders"
          description={`${pct(s.fulfilledRate)} of agency delivery orders fulfilled · ${formatCount(s.outOfStockOrders)} out of stock`}
        >
          <ColumnChart
            data={s.deliveryOrders}
            xKey="month"
            height={280}
            series={[
              { key: "ordered", label: "Ordered", color: "#0088FE" },
              { key: "fulfilled", label: "Fulfilled", color: "#00C49F" },
              { key: "outOfStock", label: "Out of stock", color: "#FF8042" },
            ]}
          />
        </SectionCard>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <SectionCard title="Unmet Demand" description="Ordered but out of stock">
            <ol className="divide-y text-sm">
              {s.unmet.map((u, i) => (
                <li key={u.code} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 py-2">
                  <span className="font-semibold text-orange-700 tabular-nums">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCount(u.quantity)} {u.unit}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{pesoCompact(u.value)}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard
            title="IAR and FACT Updates"
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white">
                <RefreshCw className="size-3" aria-hidden /> Integrated feed
              </span>
            }
          >
            {search.updates.length ? (
              <ul className="space-y-2.5 text-sm">
                {search.updates.map((u) => (
                  <li key={u.id} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 h-fit rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                        u.source === "IAR" ? "bg-orange-100 text-orange-800" : "bg-slate-200 text-slate-800"
                      )}
                    >
                      {u.source}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug">{u.text}</span>
                      <span className="text-xs text-muted-foreground">{time.format(new Date(u.at))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent IAR or FACT updates for this selection.</p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Utilization per agency + availability */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Utilization per Agency" description="Largest APP-CSE plans · store purchases vs. plan">
          {s.agencies.length ? (
            <ul className="space-y-3">
              {s.agencies.map((a) => {
                const rate = a.planned ? a.purchased / a.planned : 0
                return (
                  <li key={a.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate" title={a.name}>
                        {a.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{pct(rate, 0)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(1, rate) * 100}%`, background: ORANGE }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pesoCompact(a.purchased)} of {pesoCompact(a.planned)} planned
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No agencies with an APP-CSE for this selection.</p>
          )}
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Stock Availability" description="Product listings by stock level">
          <SplitBar parts={s.availability} />
        </SectionCard>
      </div>

      <SampleDataNote />
    </div>
  )
}
