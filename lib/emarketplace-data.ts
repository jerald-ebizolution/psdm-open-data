/**
 * eMarketplace Analytics (module 05, BRD 15.3.5) — catalogue, orders,
 * fulfillment, savings, budget utilization, supplier performance and buyer adoption.
 *
 * Orders and buyers come from the Government Agency register (centralized
 * agencies' actual orders against their APP-CSE), so transaction value and
 * budget utilization agree with the Government Agency page. Everything else is
 * a seeded mock. Backend contracts to replace it:
 *   GET /api/emarketplace/summary?fy=&region=&agency=&item=   → EmarketplaceSummary
 *   GET /api/emarketplace/items?fy=&region=&agency=           → CatalogueItemStats[]
 *   GET /api/emarketplace/uploads?since=                      → DocumentUpload[]
 *
 * SAMPLE DATA. The savings formula is a placeholder until it is aligned with the
 * shared KPI dictionary (Open Data BRD BR-OD-019).
 */

import { asOfDate, between, MONTHS, monthsCovered, rng } from "@/lib/analytics-mock"
import { AGENCY_TYPES, getAgencyRegister, type AgencyRecord, type AgencyType } from "@/lib/government-agency-data"
import { MOCK_AWARDEES } from "@/lib/ocds-mock"

// ---------------------------------------------------------------------------
// Catalogue (PS-DBM common-use supplies)
// ---------------------------------------------------------------------------

export type CatalogueItem = {
  /** UNSPSC commodity code */
  code: string
  name: string
  unit: string
  /** PS-DBM catalogue (bulk-procured) price */
  catalogue: number
  /** Open-market reference price; null when no reference price is available */
  reference: number | null
  /** Relative order frequency */
  weight: number
}

export const CATALOGUE: CatalogueItem[] = [
  { code: "14111507", name: "Bond paper, A4, 80 gsm", unit: "ream", catalogue: 205, reference: 245, weight: 1 },
  { code: "44121704", name: "Ballpoint pen, black", unit: "piece", catalogue: 6.5, reference: 9, weight: 0.9 },
  { code: "44103103", name: "Toner cartridge, laser, black", unit: "piece", catalogue: 2950, reference: 3450, weight: 0.55 },
  { code: "47131800", name: "Ethyl alcohol, 70%, 500 mL", unit: "bottle", catalogue: 68, reference: null, weight: 0.5 },
  { code: "44103105", name: "Ink cartridge, black", unit: "piece", catalogue: 420, reference: 495, weight: 0.45 },
  { code: "14111704", name: "Toilet tissue, 2-ply", unit: "roll", catalogue: 9.8, reference: 12.5, weight: 0.4 },
  { code: "44122011", name: "Folder, legal size", unit: "pack of 100", catalogue: 410, reference: 470, weight: 0.38 },
  { code: "43211503", name: "Notebook computer (laptop)", unit: "unit", catalogue: 38500, reference: 44000, weight: 0.35 },
  { code: "14111514", name: "Notebook, spiral", unit: "piece", catalogue: 28, reference: 35, weight: 0.3 },
  { code: "44121706", name: "Pencil, No. 2", unit: "piece", catalogue: 4.5, reference: 6, weight: 0.28 },
  { code: "31201503", name: "Masking tape, 1 inch", unit: "roll", catalogue: 32, reference: 40, weight: 0.25 },
  { code: "44122104", name: "Paper clips", unit: "box", catalogue: 18, reference: 25, weight: 0.22 },
  { code: "43211507", name: "Desktop computer", unit: "unit", catalogue: 35000, reference: 41500, weight: 0.2 },
  { code: "47121701", name: "Trash bags, large", unit: "pack", catalogue: 95, reference: null, weight: 0.2 },
  { code: "56101504", name: "Monobloc chair", unit: "piece", catalogue: 360, reference: 420, weight: 0.18 },
  { code: "44121618", name: "Scissors", unit: "piece", catalogue: 42, reference: 55, weight: 0.12 },
  { code: "44101503", name: "Multifunction printer", unit: "unit", catalogue: 14500, reference: null, weight: 0.1 },
  { code: "40101701", name: "Air conditioner, split type, 1.5 HP", unit: "unit", catalogue: 34000, reference: 39900, weight: 0.08 },
]

const TOTAL_WEIGHT = CATALOGUE.reduce((s, i) => s + i.weight, 0)
const ACTIVE_CATALOGUE_ITEMS: Record<number, number> = { 2026: 9640, 2025: 9120, 2024: 8710 }

/** Placeholder savings formula — align with KPI dictionary BR-OD-019. */
export function savingsOf(item: CatalogueItem, quantity: number) {
  if (item.reference === null) return null
  const atMarket = item.reference * quantity
  return { amount: atMarket - item.catalogue * quantity, rate: 1 - item.catalogue / item.reference }
}

// ---------------------------------------------------------------------------
// Filters: year, region, agency, item
// ---------------------------------------------------------------------------

export type EmpFilter = { fiscalYear: number; region: string | null; agency: string | null; item: string | null }

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Agency filter options: the 40 largest eMarketplace buyers (centralized agencies). */
export async function getBuyerOptions(fiscalYear: number) {
  return (await getAgencyRegister(fiscalYear))
    .filter((a) => a.centralized && a.plannedOrders > 0)
    .sort((a, b) => b.plannedOrders - a.plannedOrders)
    .slice(0, 40)
    .map((a) => ({ code: a.id, name: a.name }))
}

export function parseEmpFilter(
  params: Params,
  fiscalYear: number,
  regionCodes: string[],
  agencyIds: string[]
): EmpFilter {
  const pickValid = (key: string, valid: string[]) => {
    const v = first(params[key])
    return v && valid.includes(v) ? v : null
  }
  return {
    fiscalYear,
    region: pickValid("region", regionCodes),
    agency: pickValid("agency", agencyIds),
    item: pickValid("item", CATALOGUE.map((i) => i.code)),
  }
}

const key = (f: EmpFilter) => `${f.fiscalYear}-${f.region}-${f.agency}-${f.item}`

async function buyers(f: EmpFilter): Promise<AgencyRecord[]> {
  return (await getAgencyRegister(f.fiscalYear)).filter(
    (a) => a.centralized && (!f.region || a.region === f.region) && (!f.agency || a.id === f.agency)
  )
}

const itemShare = (f: EmpFilter) => {
  const item = CATALOGUE.find((i) => i.code === f.item)
  return item ? item.weight / TOTAL_WEIGHT : 1
}

// ---------------------------------------------------------------------------
// Summary (05-A, plus 05-B–E highlights)
// ---------------------------------------------------------------------------

export type CatalogueItemStats = CatalogueItem & {
  orders: number
  quantity: number
  value: number
  savings: { amount: number; rate: number } | null
}

export type DocumentUpload = {
  id: string
  title: string
  kind: string
  uploadedOn: string
  isNew: boolean
}

export type EmarketplaceSummary = {
  activeItems: number
  orders: number
  transactionValue: number
  transactionValuePriorYear: number
  activeBuyers: number
  centralizedAgencies: number
  firstTimeBuyers: number
  fulfillment: {
    checkouts: number
    delivered: number
    paid: number
    daysToDeliver: number
    daysToPay: number
    delays: { label: string; value: number }[]
  }
  savings: {
    amount: number
    rate: number
    /** Items with a reference price / items ordered. */
    covered: number
    itemCount: number
  }
  monthly: { month: string; orders: number | null; value: number | null }[]
  items: CatalogueItemStats[]
  utilization: {
    byType: { code: AgencyType; label: string; planned: number; actual: number }[]
    agencies: { id: string; name: string; planned: number; actual: number }[]
  }
  suppliers: { name: string; orders: number; onTime: number; avgDays: number }[]
  uploads: DocumentUpload[]
}

const DELAY_REASONS = [
  "Supplier stock-out",
  "Delivery logistics",
  "Awaiting inspection and acceptance",
  "Incomplete delivery documents",
  "Payment processing",
  "Order amended by agency",
]

const UPLOADS: [string, string][] = [
  ["Price adjustment notice — bond paper and paper products", "Price notice"],
  ["Updated catalogue: IT equipment and peripherals", "Catalogue update"],
  ["Delivery schedule for Mindanao regional depots", "Advisory"],
  ["Supplier accreditation results, 3rd quarter", "Supplier notice"],
  ["Product recall — ethyl alcohol batch", "Recall"],
  ["Guidelines on APP-CSE amendments", "Memorandum"],
  ["New items: cleaning and janitorial supplies", "Catalogue update"],
  ["Holiday delivery cut-off dates", "Advisory"],
]

export async function getEmarketplaceSummary(f: EmpFilter): Promise<EmarketplaceSummary> {
  const r = rng(`05-${key(f)}`)
  const share = itemShare(f)
  const [list, prior, all] = await Promise.all([
    buyers(f),
    buyers({ ...f, fiscalYear: f.fiscalYear - 1 }),
    getAgencyRegister(f.fiscalYear),
  ])
  const months = monthsCovered(f.fiscalYear)
  const partial = months < 12

  const transactionValue = list.reduce((s, a) => s + a.actualOrders, 0) * share
  const avgOrder = f.item ? CATALOGUE.find((i) => i.code === f.item)!.catalogue * between(r, 40, 120) : between(r, 3.6e5, 4.2e5)
  const orders = Math.round(transactionValue / avgOrder)
  const buyersWithOrders = list.filter((a) => a.actualOrders > 0)
  const activeBuyers = f.item ? Math.round(buyersWithOrders.length * Math.min(1, share * 6)) : buyersWithOrders.length

  // Fulfillment: checkouts → delivered → paid
  const delivered = Math.round(orders * between(r, 0.84, 0.9) * (partial ? 0.97 : 1))
  const paid = Math.round(delivered * between(r, 0.83, 0.9) * (partial ? 0.95 : 1))
  const delayed = orders - paid
  const dw = DELAY_REASONS.map(() => r() ** 1.3)
  const dsum = dw.reduce((a, b) => a + b, 0)

  // Items — order counts follow item weight; quantities from order size.
  const items: CatalogueItemStats[] = CATALOGUE.filter((i) => !f.item || i.code === f.item)
    .map((item) => {
      const ir = rng(`05-item-${item.code}-${key(f)}`)
      const value = transactionValue * (f.item ? 1 : (item.weight / TOTAL_WEIGHT) * between(ir, 0.8, 1.2))
      const quantity = Math.round(value / item.catalogue)
      return {
        ...item,
        orders: Math.round(orders * (f.item ? 1 : item.weight / TOTAL_WEIGHT) * between(ir, 0.85, 1.15)),
        quantity,
        value,
        savings: savingsOf(item, quantity),
      }
    })
    .sort((a, b) => b.orders - a.orders)
  const withRef = items.filter((i) => i.savings)
  const savedAmount = withRef.reduce((s, i) => s + i.savings!.amount, 0)
  const atMarket = withRef.reduce((s, i) => s + i.reference! * i.quantity, 0)

  // Budget utilization (APP-CSE planned vs actual orders)
  const scopeAll = all.filter((a) => a.centralized && (!f.region || a.region === f.region))
  const byType = AGENCY_TYPES.map((t) => {
    const ofType = scopeAll.filter((a) => a.type === t.code)
    return {
      code: t.code,
      label: t.name,
      planned: ofType.reduce((s, a) => s + a.plannedOrders, 0),
      actual: ofType.reduce((s, a) => s + a.actualOrders, 0),
    }
  }).filter((t) => t.planned > 0)

  const weights = [0.06, 0.07, 0.1, 0.09, 0.08, 0.09, 0.1, 0.09, 0.08, 0.09, 0.08, 0.07].slice(0, months)
  const wsum = weights.reduce((a, b) => a + b, 0)

  const asOf = new Date(`${asOfDate(f.fiscalYear)}T00:00:00Z`).getTime()
  const ur = rng(`05-uploads-${f.fiscalYear}`)
  let daysAgo = 0

  return {
    activeItems: f.item ? 1 : (ACTIVE_CATALOGUE_ITEMS[f.fiscalYear] ?? 9000),
    orders,
    transactionValue,
    transactionValuePriorYear: prior.reduce((s, a) => s + a.actualOrders, 0) * share,
    activeBuyers,
    centralizedAgencies: list.length,
    firstTimeBuyers: Math.round(activeBuyers * between(r, 0.04, 0.08)),
    fulfillment: {
      checkouts: orders,
      delivered,
      paid,
      daysToDeliver: between(r, 9, 15),
      daysToPay: between(r, 18, 27),
      delays: DELAY_REASONS.map((label, i) => ({ label, value: Math.round((delayed * dw[i]) / dsum) })).sort(
        (a, b) => b.value - a.value
      ),
    },
    savings: {
      amount: savedAmount,
      rate: atMarket ? savedAmount / atMarket : 0,
      covered: withRef.length,
      itemCount: items.length,
    },
    monthly: MONTHS.map((month, i) =>
      i >= months
        ? { month, orders: null, value: null }
        : {
            month,
            orders: Math.round((orders * weights[i]) / wsum * between(r, 0.92, 1.08)),
            value: Math.round((transactionValue * weights[i]) / wsum),
          }
    ),
    items,
    utilization: {
      byType,
      agencies: list
        .filter((a) => a.plannedOrders > 0)
        .sort((a, b) => b.plannedOrders - a.plannedOrders)
        .slice(0, 8)
        .map((a) => ({ id: a.id, name: a.name, planned: a.plannedOrders, actual: a.actualOrders })),
    },
    suppliers: MOCK_AWARDEES.slice(0, 6)
      .map((name) => {
        const sr = rng(`05-sup-${name}-${key(f)}`)
        return {
          name,
          orders: Math.round(orders * between(sr, 0.02, 0.09)),
          onTime: between(sr, 0.71, 0.97),
          avgDays: between(sr, 6, 19),
        }
      })
      .sort((a, b) => b.orders - a.orders),
    uploads: UPLOADS.map(([title, kind], i) => {
      daysAgo += Math.floor(between(ur, 0, 5))
      return {
        id: `DOC-${f.fiscalYear}-${String(i + 1).padStart(3, "0")}`,
        title,
        kind,
        uploadedOn: new Date(asOf - daysAgo * 86_400_000).toISOString().slice(0, 10),
        isNew: daysAgo <= 7,
      }
    }),
  }
}
