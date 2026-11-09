import { ArrowLeft, BadgeCheck, ScanText, Tag } from "lucide-react"
import Link from "next/link"

import { FilterBar } from "@/components/analytics/filter-bar"
import { BarList, KpiGrid, KpiTile, pct, pesoCompact, SampleDataNote, SectionCard } from "@/components/analytics/ui"
import { formatAwardDate, formatCount } from "@/components/ocds/format"
import { Card } from "@/components/ui/card"
import { CHANNELS, GPP_CATEGORIES, getGppSummary, GRID_FACTOR, parseGppFilter, VEHICLE_FACTOR } from "@/lib/green-procurement-data"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions } from "@/lib/ocds-regions"
import { cn } from "@/lib/utils"
import { DatasetDownloads } from "./_components/dataset-downloads"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const GREEN = "#15803d"
const tonnes = (n: number) => `${formatCount(Math.round(n))} tCO₂e`

export default async function GreenProcurement({ searchParams }: { searchParams: SearchParams }) {
  const [params, fiscalYears, regions] = await Promise.all([searchParams, getFiscalYears(), getRegions()])
  const filter = parseGppFilter(params, resolveFiscalYear(params.fy, fiscalYears), regions.map((r) => r.code))
  const s = await getGppSummary(filter)
  const fy = filter.fiscalYear
  const category = GPP_CATEGORIES.find((c) => c.code === filter.category)
  const drilled = category ? s.categories.find((c) => c.code === category.code) : null

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | null> = { fy: String(fy), region: filter.region, channel: filter.channel, category: filter.category, ...changes }
    for (const [k, v] of Object.entries(base)) if (v) next.set(k, v)
    return `?${next}`
  }
  const maxCompliance = Math.max(0.01, ...s.categories.map((c) => c.compliance))

  return (
    <div className="flex flex-col gap-5">
      {/* Header, filters, key figures */}
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#313D85] sm:text-3xl">Green Procurement</h1>
            <p className="text-sm text-muted-foreground">
              Green spend and compliance, certified suppliers and products, and the carbon savings of what agencies buy.
            </p>
          </div>
          <FilterBar
            fiscalYear={fy}
            fiscalYears={fiscalYears}
            selects={[
              { param: "region", label: "Region", allLabel: "All regions", value: filter.region, options: regions },
              { param: "channel", label: "Channel", allLabel: "All channels", value: filter.channel, options: CHANNELS, className: "w-40 bg-white" },
              {
                param: "category",
                label: "Category",
                allLabel: "All categories",
                value: filter.category,
                options: GPP_CATEGORIES.map((c) => ({ code: c.code, name: c.name })),
                className: "w-56 bg-white",
              },
            ]}
          />
        </div>

        <KpiGrid columns={5}>
          <KpiTile tone="green" label="Green Spend" value={pesoCompact(s.greenSpend)} caption="eMarketplace and e-Bidding" />
          <KpiTile tone="green" label="GPP Share of Total" value={pct(s.greenSpend / Math.max(1, s.totalSpend))} caption={`of ${pesoCompact(s.totalSpend)} procured`} />
          <KpiTile tone="plain" label="Green-Certified Suppliers" value={formatCount(s.certifiedSuppliers)} caption="DENR-certified" />
          <KpiTile
            tone="blue"
            label="Compliant Agencies"
            value={formatCount(s.compliantAgencies)}
            caption={`${pct(s.compliantAgencies / Math.max(1, s.agencies))} of agencies meet GPP targets`}
          />
          <KpiTile tone="amber" label="Avoided Emissions" value={formatCount(Math.round(s.tco2e))} caption="tCO₂e per year" />
        </KpiGrid>
      </Card>

      {/* Compliance by category (drill-down) + channel coverage */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title={drilled ? `${drilled.name}: green items` : "GPP Compliance by Item Category"}
          description={drilled ? `${pct(drilled.compliance)} of ${pesoCompact(drilled.spend)} spend meets green criteria` : "Share of spend meeting green criteria · click a category to drill down"}
          action={
            drilled && (
              <Link href={link({ category: null })} scroll={false} className="inline-flex items-center gap-1 text-sm text-[#2a78d6] hover:underline">
                <ArrowLeft className="size-3.5" /> All categories
              </Link>
            )
          }
        >
          {drilled ? (
            <BarList items={drilled.items.map((i) => ({ label: i.name, value: i.greenSpend }))} valueFormatter={pesoCompact} color="bg-green-700" />
          ) : (
            <ul className="space-y-1">
              {s.categories.map((c) => (
                <li key={c.code}>
                  <Link
                    href={link({ category: c.code })}
                    scroll={false}
                    className="grid grid-cols-[minmax(9rem,36%)_1fr_3.5rem_4.5rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: `${(c.compliance / maxCompliance) * 100}%`, background: GREEN }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{pct(c.compliance, 0)}</span>
                    <span className="text-right text-muted-foreground tabular-nums">{pesoCompact(c.greenSpend)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Coverage by Channel" description="Green spend and share of transactions checked for green criteria">
          <div className="space-y-5">
            {s.channels.map((c) => (
              <div key={c.code}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm tabular-nums">{pesoCompact(c.greenSpend)} green</p>
                </div>
                <p className="text-xs text-muted-foreground">{pct(c.greenSpend / Math.max(1, c.spend))} of {pesoCompact(c.spend)} spend</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${c.coverage * 100}%`, background: GREEN }} />
                  </span>
                  <span className="w-24 text-right text-xs tabular-nums">{pct(c.coverage, 0)} covered</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Tagging, OCR, datasets */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Green Tagging" description="Where green data is captured">
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Tag className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-medium">Green criteria tag on purchase requests</p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{pct(s.prTaggedShare)}</span> of PRs tagged
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-medium">Supplier tagging at registration</p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{formatCount(s.taggedAtRegistration)}</span> suppliers tagged green
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-medium">DENR-certified products</p>
                <p className="text-muted-foreground">Listed separately below</p>
              </div>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="OCR Green Data Extraction" description="Green specifications read from procurement documents">
          <ol className="space-y-3">
            {s.ocr.map((step, i) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1">{step.label}</span>
                <span className="font-semibold tabular-nums">{formatCount(step.value)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ScanText className="size-3.5" aria-hidden /> Bid documents, technical specifications and delivery receipts
          </p>
        </SectionCard>

        <SectionCard title="Download Datasets" description={`FY ${fy}, current filters`}>
          <DatasetDownloads data={{ categories: s.categories, energy: s.energy, denrProducts: s.denrProducts }} fiscalYear={fy} />
        </SectionCard>
      </div>

      {/* DENR-certified products (posted separately) */}
      <SectionCard title="DENR-Certified Products" description="Products with a valid DENR green certification" flush>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pl-5 font-medium">Product</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium">Supplier</th>
                <th className="py-2 font-medium">Certificate</th>
                <th className="py-2 pr-5 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody>
              {s.denrProducts.map((p) => (
                <tr key={p.certificate} className="border-t">
                  <td className="py-2 pl-5 font-medium">{p.product}</td>
                  <td className="py-2 text-muted-foreground">{p.category}</td>
                  <td className="py-2">{p.supplier}</td>
                  <td className="py-2 font-mono text-xs">{p.certificate}</td>
                  <td className="py-2 pr-5 tabular-nums">{formatAwardDate(p.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 09-B Carbon footprint and SDG alignment */}
      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Energy-Efficient Items and Avoided Emissions" description={`${tonnes(s.tco2e)} avoided per year`} flush>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pl-5 font-medium">Item</th>
                  <th className="py-2 text-right font-medium">Units</th>
                  <th className="py-2 text-right font-medium">Energy saved</th>
                  <th className="py-2 text-right font-medium">Avoided</th>
                  <th className="py-2 pr-5 font-medium">SDGs</th>
                </tr>
              </thead>
              <tbody>
                {s.energy.map((e) => (
                  <tr key={e.name} className="border-t">
                    <td className="py-2 pl-5">
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.factorBasis}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatCount(e.units)}</td>
                    <td className="py-2 text-right tabular-nums">{e.mwhSaved === null ? "—" : `${formatCount(Math.round(e.mwhSaved))} MWh`}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{tonnes(e.tco2e)}</td>
                    <td className="py-2 pr-5">
                      <div className="flex gap-1">
                        {e.sdgs.map((g) => (
                          <span key={g} className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: s.sdgs.find((x) => x.code === g)?.color }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!s.energy.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No energy-efficient items in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="How Emissions Are Counted">
          <ul className="space-y-3 text-sm">
            <li>
              <p className="font-medium">DENR registry</p>
              <p className="text-xs text-muted-foreground">Identifies which purchased items are certified green or energy-efficient.</p>
            </li>
            <li>
              <p className="font-medium">DOE grid emission factor</p>
              <p className="text-xs text-muted-foreground">
                Energy saved (MWh) × {GRID_FACTOR} tCO₂e per MWh <span className="italic">(placeholder value, to confirm)</span>
              </p>
            </li>
            <li>
              <p className="font-medium">IPCC Tier 1 factors</p>
              <p className="text-xs text-muted-foreground">
                Fuel avoided by clean vehicles: {VEHICLE_FACTOR} tCO₂e per vehicle per year <span className="italic">(placeholder value, to confirm)</span>
              </p>
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Alignment with the UN Sustainable Development Goals">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {s.sdgs.map((g) => (
            <div key={g.code} className="rounded-xl p-4 text-white" style={{ background: g.color }}>
              <p className="text-2xl font-bold">SDG {g.code}</p>
              <p className="text-sm font-medium">{g.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="opacity-80">Green spend</dt>
                  <dd className="text-base font-bold tabular-nums">{pesoCompact(g.spend)}</dd>
                </div>
                <div>
                  <dt className="opacity-80">Avoided</dt>
                  <dd className="text-base font-bold tabular-nums">{g.tco2e ? formatCount(Math.round(g.tco2e)) : "—"}</dd>
                </div>
              </dl>
              <p className={cn("mt-2 text-xs opacity-85")}>{g.basis}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SampleDataNote />
    </div>
  )
}
