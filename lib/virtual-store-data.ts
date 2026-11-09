/**
 * Virtual Store Analytics (module 06, BRD 15.3.6) — listings, delivery orders,
 * utilization, unmet demand, price search and benchmarking, IAR/FACT updates.
 *
 * Purchases come from the Government Agency register: the common-use supplies
 * share of each centralized agency's actual orders, measured against its
 * APP-CSE. Prices and external benchmarks reuse the eMarketplace catalogue.
 * Backend contracts to replace the mock:
 *   GET /api/virtual-store/summary?fy=&region=&item=   → VirtualStoreSummary
 *   GET /api/virtual-store/search?q=                   → PriceSearchResult
 *   GET /api/virtual-store/updates?since=              → StoreUpdate[]  (IAR / FACT feed)
 *
 * SAMPLE DATA — not official PS-DBM figures.
 */

import { asOfDate, between, MONTHS, monthsCovered, pickRandom, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { CATALOGUE, type CatalogueItem } from "@/lib/emarketplace-data"
import { getAgencyRegister } from "@/lib/government-agency-data"

export type StoreFilter = { fiscalYear: number; region: string | null; item: string | null }

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseStoreFilter(params: Params, fiscalYear: number, regionCodes: string[]): StoreFilter {
  const region = first(params.region)
  const item = first(params.item)
  return {
    fiscalYear,
    region: region && regionCodes.includes(region) ? region : null,
    item: CATALOGUE.some((i) => i.code === item) ? item! : null,
  }
}

const key = (f: StoreFilter) => `${f.fiscalYear}-${f.region}-${f.item}`

/** Share of an agency's actual orders that go through the Virtual Store. */
const STORE_SHARE = 0.62
const LISTINGS: Record<number, number> = { 2026: 4215, 2025: 3980, 2024: 3710 }
const TOTAL_WEIGHT = CATALOGUE.reduce((s, i) => s + i.weight, 0)
const AVG_ADO_VALUE = 1.8e5

/** Store price of an item in a given year (prices drift up ~3–6% a year). */
export function priceIn(item: CatalogueItem, year: number) {
  const r = rng(`06-price-${item.code}`)
  const yearly = between(r, 0.03, 0.06)
  return Math.round(item.catalogue * (1 + yearly) ** (year - 2026) * 100) / 100
}

export const PRICE_YEARS = [2024, 2025, 2026]

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export type VirtualStoreSummary = {
  listings: number
  orders: number
  purchases: number
  purchasesPriorYear: number
  agenciesUsing: number
  agenciesWithPlan: number
  /** Purchases ÷ APP-CSE plan */
  utilization: number
  /** utilization by region × month (monthly purchases ÷ monthly share of plan) */
  heatmap: { region: string; months: (number | null)[] }[]
  months: string[]
  agencies: { id: string; name: string; planned: number; purchased: number }[]
  deliveryOrders: { month: string; ordered: number | null; fulfilled: number | null; outOfStock: number | null }[]
  fulfilledRate: number
  outOfStockOrders: number
  unmet: { code: string; name: string; unit: string; quantity: number; value: number }[]
  availability: { label: string; value: number; color: string }[]
}

export async function getStoreSummary(f: StoreFilter): Promise<VirtualStoreSummary> {
  const r = rng(`06-${key(f)}`)
  const item = CATALOGUE.find((i) => i.code === f.item)
  const itemShare = item ? item.weight / TOTAL_WEIGHT : 1
  const [register, prior] = await Promise.all([getAgencyRegister(f.fiscalYear), getAgencyRegister(f.fiscalYear - 1)])
  const inScope = (a: { centralized: boolean; region: string }) => a.centralized && (!f.region || a.region === f.region)
  const buyers = register.filter(inScope)

  const purchasesOf = (a: { actualOrders: number }) => a.actualOrders * STORE_SHARE * itemShare
  const purchases = buyers.reduce((s, a) => s + purchasesOf(a), 0)
  const planned = buyers.reduce((s, a) => s + a.plannedOrders * itemShare, 0)
  const orders = Math.round(purchases / (item ? Math.max(item.catalogue * 30, 2e4) : AVG_ADO_VALUE))
  const months = monthsCovered(f.fiscalYear)
  const seasonal = [0.06, 0.07, 0.1, 0.09, 0.08, 0.09, 0.1, 0.09, 0.08, 0.09, 0.08, 0.07]

  // Utilization heatmap — every region, so the selected one stands out.
  const allRegions = Object.keys(REGION_WEIGHTS)
  const heatmap = allRegions
    .map((code) => {
      const inRegion = register.filter((a) => a.centralized && a.region === code)
      const p = inRegion.reduce((s, a) => s + a.plannedOrders, 0)
      const u = inRegion.reduce((s, a) => s + a.actualOrders * STORE_SHARE, 0)
      const hr = rng(`06-heat-${code}-${f.fiscalYear}-${f.item}`)
      const base = p ? u / p : 0
      return {
        region: code,
        weight: p,
        months: MONTHS.map((_, i) => (i < months ? Math.min(1.4, (base * seasonal[i] * 12) * between(hr, 0.7, 1.3)) : null)),
      }
    })
    .sort((a, b) => b.weight - a.weight)
    .map(({ region, months: m }) => ({ region, months: m }))

  const outRate = between(r, 0.05, 0.08)
  const deliveryOrders = MONTHS.map((month, i) => {
    if (i >= months) return { month, ordered: null, fulfilled: null, outOfStock: null }
    const ordered = Math.round(orders * seasonal[i] / seasonal.slice(0, months).reduce((a, b) => a + b, 0) * between(r, 0.92, 1.08))
    const outOfStock = Math.round(ordered * outRate * between(r, 0.6, 1.5))
    // Recent months still have deliveries in progress.
    const pending = i >= months - 2 ? between(r, 0.05, 0.12) : between(r, 0, 0.02)
    return { month, ordered, fulfilled: Math.max(0, Math.round(ordered * (1 - pending)) - outOfStock), outOfStock }
  })
  const ordered = deliveryOrders.reduce((s, d) => s + (d.ordered ?? 0), 0)
  const fulfilled = deliveryOrders.reduce((s, d) => s + (d.fulfilled ?? 0), 0)
  const outOfStockOrders = deliveryOrders.reduce((s, d) => s + (d.outOfStock ?? 0), 0)

  const unmet = CATALOGUE.filter((i) => !f.item || i.code === f.item)
    .map((i) => {
      const ur = rng(`06-unmet-${i.code}-${key(f)}`)
      const value = purchases * (f.item ? 1 : i.weight / TOTAL_WEIGHT) * outRate * between(ur, 0.2, 2.2)
      return { code: i.code, name: i.name, unit: i.unit, quantity: Math.round(value / i.catalogue), value }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const listings = item ? 1 : (LISTINGS[f.fiscalYear] ?? 3800)
  const inStock = between(r, 0.82, 0.9)
  const low = between(r, 0.05, 0.1)

  return {
    listings,
    orders,
    purchases,
    purchasesPriorYear: prior.filter(inScope).reduce((s, a) => s + purchasesOf(a), 0),
    agenciesUsing: buyers.filter((a) => a.actualOrders > 0).length,
    agenciesWithPlan: buyers.filter((a) => a.plannedOrders > 0).length,
    utilization: planned ? purchases / planned : 0,
    heatmap,
    months: MONTHS.slice(0, months),
    agencies: buyers
      .filter((a) => a.plannedOrders > 0)
      .sort((a, b) => b.plannedOrders - a.plannedOrders)
      .slice(0, 8)
      .map((a) => ({ id: a.id, name: a.name, planned: a.plannedOrders * itemShare, purchased: purchasesOf(a) })),
    deliveryOrders,
    fulfilledRate: ordered ? fulfilled / ordered : 0,
    outOfStockOrders,
    unmet,
    availability: item
      ? [{ label: "In stock", value: 1, color: "#1baf7a" }]
      : [
          { label: "In stock", value: Math.round(listings * inStock), color: "#1baf7a" },
          { label: "Low stock", value: Math.round(listings * low), color: "#eda100" },
          { label: "Out of stock", value: listings - Math.round(listings * inStock) - Math.round(listings * low), color: "#e34948" },
        ],
  }
}

// ---------------------------------------------------------------------------
// Price search (PO or item) and IAR / FACT updates
// ---------------------------------------------------------------------------

export type PurchaseOrderStatus = "ordered" | "delivered" | "iar" | "fact"

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  ordered: "Ordered",
  delivered: "Delivered",
  iar: "IAR received",
  fact: "Posted in FACT",
}

export type PurchaseOrder = {
  number: string
  agency: string
  date: string
  status: PurchaseOrderStatus
  lines: { code: string; name: string; quantity: number; unitPrice: number }[]
  total: number
}

export type SearchItem = {
  code: string
  name: string
  unit: string
  prices: { year: number; price: number }[]
  /** External (open-market) benchmark; null when none is available. */
  external: number | null
}

export type StoreUpdate = { id: string; at: string; source: "IAR" | "FACT"; text: string }

export type PriceSearchData = { items: SearchItem[]; orders: PurchaseOrder[]; updates: StoreUpdate[] }

/** Everything the price search needs (items, recent POs, IAR/FACT feed) for the client to search. */
export async function getPriceSearchData(f: StoreFilter): Promise<PriceSearchData> {
  const register = (await getAgencyRegister(f.fiscalYear)).filter(
    (a) => a.centralized && a.actualOrders > 0 && (!f.region || a.region === f.region)
  )
  const r = rng(`06-po-${f.fiscalYear}-${f.region}`)
  const months = monthsCovered(f.fiscalYear)
  const statuses: PurchaseOrderStatus[] = ["ordered", "delivered", "iar", "fact"]

  const orders: PurchaseOrder[] = Array.from({ length: 60 }, (_, i) => {
    const lineCount = 1 + Math.floor(r() * 3)
    const lines = Array.from({ length: lineCount }, () => {
      const it = pickRandom(r, CATALOGUE)
      return {
        code: it.code,
        name: it.name,
        quantity: Math.max(1, Math.round((between(r, 2, 200) * 200) / Math.max(20, it.catalogue))),
        unitPrice: priceIn(it, f.fiscalYear),
      }
    })
    const month = months - 1 - Math.floor((i / 60) * months)
    const recent = i < 15
    return {
      number: `PO-${f.fiscalYear}-${String(9800 - i * 37).padStart(6, "0")}`,
      agency: pickRandom(r, register)?.name ?? "—",
      date: `${f.fiscalYear}-${String(month + 1).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
      status: recent ? pickRandom(r, statuses) : r() < 0.85 ? "fact" : "iar",
      lines,
      total: lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    }
  }).filter((po) => !f.item || po.lines.some((l) => l.code === f.item))

  const asOf = new Date(`${asOfDate(f.fiscalYear)}T17:00:00+08:00`).getTime()
  const updates: StoreUpdate[] = orders
    .filter((po) => po.status === "iar" || po.status === "fact")
    .slice(0, 6)
    .map((po, i) => ({
      id: `${po.number}-${po.status}`,
      at: new Date(asOf - i * between(r, 1.5, 7) * 3_600_000).toISOString(),
      source: po.status === "fact" ? ("FACT" as const) : ("IAR" as const),
      text:
        po.status === "fact"
          ? `Payment posted for ${po.number} · ${po.agency}`
          : `Inspection and acceptance report received for ${po.number} · ${po.agency}`,
    }))

  return {
    items: CATALOGUE.map((i) => ({
      code: i.code,
      name: i.name,
      unit: i.unit,
      prices: PRICE_YEARS.filter((y) => y <= f.fiscalYear).map((year) => ({ year, price: priceIn(i, year) })),
      external: i.reference,
    })),
    orders,
    updates,
  }
}
