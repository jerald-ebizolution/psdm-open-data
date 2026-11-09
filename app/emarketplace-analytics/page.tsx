import { Bell, FileText } from "lucide-react"
import Link from "next/link"

import { TrendChart } from "@/components/analytics/charts"
import { FilterBar } from "@/components/analytics/filter-bar"
import { BarList, change, KpiGrid, KpiTile, pct, pesoCompact, SampleDataNote, SectionCard } from "@/components/analytics/ui"
import { formatAwardDate, formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { CATALOGUE, getBuyerOptions, getEmarketplaceSummary, parseEmpFilter } from "@/lib/emarketplace-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { ItemsTable } from "./_components/items-table"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const VIOLET = "#6250d6"

export default async function EmarketplaceAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions] = await Promise.all([searchParams, getFiscalYears(), getRegions()])
  const fiscalYear = resolveFiscalYear(params.fy, fiscalYears)
  const agencies = await getBuyerOptions(fiscalYear)
  const filter = parseEmpFilter(
    params,
    fiscalYear,
    regions.map((r) => r.code),
    agencies.map((a) => a.code)
  )
  const s = await getEmarketplaceSummary(filter)
  const fy = filter.fiscalYear
  const newUploads = s.uploads.filter((u) => u.isNew).length
  const f = s.fulfillment

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters and key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">eMarketplace Analytics</h1>
              <Link
                href="#uploads"
                className="relative inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                aria-label={`${newUploads} new document uploads`}
              >
                <Bell className="size-3.5" aria-hidden />
                {newUploads} new uploads
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Catalogue, orders, fulfillment, savings and APP budget use by agency.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              { param: "agency", label: "Agency", allLabel: "All agencies", value: filter.agency, options: agencies, className: "w-60 bg-white" },
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

        <KpiGrid>
          <KpiTile tone="violet" label="Active Catalogue Items" value={formatCount(s.activeItems)} caption="Currently listed" />
          <KpiTile tone="blue" label="Orders Placed" value={formatCount(s.orders)} caption="Checkouts this year" />
          <KpiTile
            tone="green"
            label="Total Transaction Value"
            value={pesoCompact(s.transactionValue)}
            delta={
              s.transactionValuePriorYear
                ? { value: change(s.transactionValue, s.transactionValuePriorYear), label: "vs last year" }
                : undefined
            }
            caption="Gross, all orders"
          />
          <KpiTile
            tone="plain"
            label="Active Buyer Agencies"
            value={formatCount(s.activeBuyers)}
            caption={`${pct(s.activeBuyers / Math.max(1, s.centralizedAgencies))} of agencies buying via PS-DBM`}
          />
        </KpiGrid>
      </Card>

      {/* Fulfillment, delays, savings */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Order Fulfillment" description="Checkouts → delivered → paid">
          <div className="space-y-2">
            {[
              { label: "Checkouts", value: f.checkouts, cls: "bg-[#4c3fb0]" },
              { label: "Delivered", value: f.delivered, cls: "bg-[#6250d6]" },
              { label: "Paid", value: f.paid, cls: "bg-[#9a8ff0]" },
            ].map((step) => (
              <div key={step.label} className="flex justify-center">
                <div
                  className={cn("rounded-md py-2 text-center text-sm font-semibold text-white", step.cls)}
                  style={{ width: `${Math.max(35, (step.value / Math.max(1, f.checkouts)) * 100)}%` }}
                >
                  {step.label} · {formatCount(step.value)}
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-muted/60 px-2 py-2">
              <dt className="text-xs text-muted-foreground">Delivered</dt>
              <dd className="text-lg font-bold tabular-nums">{pct(f.delivered / Math.max(1, f.checkouts))}</dd>
              <dd className="text-xs text-muted-foreground">avg {f.daysToDeliver.toFixed(0)} days</dd>
            </div>
            <div className="rounded-lg bg-muted/60 px-2 py-2">
              <dt className="text-xs text-muted-foreground">Paid</dt>
              <dd className="text-lg font-bold tabular-nums">{pct(f.paid / Math.max(1, f.checkouts))}</dd>
              <dd className="text-xs text-muted-foreground">avg {f.daysToPay.toFixed(0)} days after delivery</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Delay Reasons" description={`${formatCount(f.checkouts - f.paid)} orders not yet delivered or paid`}>
          <BarList items={f.delays} color="bg-amber-500" />
        </SectionCard>

        <SectionCard title="Procurement Savings" description="Catalogue (bulk) price vs. open-market price">
          {s.savings.covered ? (
            <>
              <p className="text-3xl font-bold text-emerald-700 tabular-nums">{pct(s.savings.rate)}</p>
              <p className="text-sm text-muted-foreground">
                {pesoCompact(s.savings.amount)} saved against open-market prices
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Open-market price</span>
                    <span>100%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-400" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Catalogue price</span>
                    <span>{pct(1 - s.savings.rate, 0)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(1 - s.savings.rate) * 100}%`, background: VIOLET }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Savings are not shown: no open-market reference price for this selection.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Based on {s.savings.covered} of {s.savings.itemCount} items with a reference price. Items without one are left out.
          </p>
        </SectionCard>
      </div>

      {/* Orders trend + recent uploads */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Order Volume" description={`Orders placed per month, FY ${fy}`}>
          <TrendChart
            data={s.monthly}
            xKey="month"
            height={280}
            series={[{ key: "orders", label: "Orders", color: VIOLET, variant: "area" }]}
          />
        </SectionCard>

        <div id="uploads" className="scroll-mt-4 lg:col-span-2">
          <SectionCard
            className="h-full"
            title="Recent Document Uploads"
            action={
              newUploads > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">
                  <Bell className="size-3" aria-hidden /> {newUploads} new
                </span>
              )
            }
          >
            <ul className="divide-y text-sm">
              {s.uploads.map((u) => (
                <li key={u.id} className="flex items-start gap-3 py-2.5">
                  <FileText className={cn("mt-0.5 size-4 shrink-0", u.isNew ? "text-violet-600" : "text-muted-foreground")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn("leading-snug", u.isNew && "font-semibold")}>{u.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.kind} · {formatAwardDate(u.uploadedOn)}
                    </p>
                  </div>
                  {u.isNew && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-violet-600" aria-label="New" />}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Most ordered items */}
      <SectionCard title="Most Ordered Items" description="Specific catalogue items by UNSPSC code" flush>
        <ItemsTable key={`${fy}-${filter.region}-${filter.agency}-${filter.item}`} items={s.items} />
      </SectionCard>

      {/* Budget utilization */}
      <SectionCard title="APP Budget Utilization" description="Actual orders against the APP-CSE plan">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold">By agency classification</p>
            <UtilizationList rows={s.utilization.byType.map((t) => ({ key: t.code, label: t.label, planned: t.planned, actual: t.actual }))} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Largest buyer agencies</p>
            <UtilizationList rows={s.utilization.agencies.map((a) => ({ key: a.id, label: a.name, planned: a.planned, actual: a.actual }))} />
          </div>
        </div>
      </SectionCard>

      {/* Supplier performance + buyer adoption */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Supplier Performance" description="Delivery record of the most-used suppliers" flush>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pl-5 font-medium">Supplier</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 font-medium">On-time delivery</th>
                  <th className="py-2 pr-5 text-right font-medium">Avg. days</th>
                </tr>
              </thead>
              <tbody>
                {s.suppliers.map((sp) => (
                  <tr key={sp.name} className="border-t">
                    <td className="py-2 pl-5 font-medium">{sp.name}</td>
                    <td className="py-2 text-right tabular-nums">{formatCount(sp.orders)}</td>
                    <td className="w-[35%] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span
                            className={cn("block h-full rounded-full", sp.onTime < 0.8 ? "bg-amber-500" : "bg-emerald-600")}
                            style={{ width: `${sp.onTime * 100}%` }}
                          />
                        </span>
                        <span className="w-10 text-right tabular-nums">{pct(sp.onTime, 0)}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-5 text-right tabular-nums">{sp.avgDays.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Buyer Adoption">
          <p className="text-3xl font-bold tabular-nums">{pct(s.activeBuyers / Math.max(1, s.centralizedAgencies))}</p>
          <p className="text-sm text-muted-foreground">
            of {formatCount(s.centralizedAgencies)} agencies with an APP-CSE placed at least one order
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.activeBuyers / Math.max(1, s.centralizedAgencies)) * 100}%`, background: VIOLET }}
            />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Ordering agencies</dt>
              <dd className="text-lg font-bold tabular-nums">{formatCount(s.activeBuyers)}</dd>
            </div>
            <div className="rounded-lg bg-violet-50 px-3 py-2">
              <dt className="text-xs text-muted-foreground">First-time buyers</dt>
              <dd className="text-lg font-bold tabular-nums">{formatCount(s.firstTimeBuyers)}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SampleDataNote />
    </div>
  )
}

function UtilizationList({ rows }: { rows: { key: string; label: string; planned: number; actual: number }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No APP-CSE for the selected filters.</p>
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const rate = r.planned ? r.actual / r.planned : 0
        return (
          <li key={r.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={r.label}>
                {r.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{pct(rate, 0)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" title={`${pesoCompact(r.actual)} of ${pesoCompact(r.planned)}`}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(1, rate) * 100}%`, background: VIOLET }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {pesoCompact(r.actual)} of {pesoCompact(r.planned)} planned
            </p>
          </li>
        )
      })}
    </ul>
  )
}
