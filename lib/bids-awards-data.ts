/**
 * Bids and Awards Analytics (module 02, BRD 15.3.2) — data for the Bids and Awards page.
 *
 * Every getter is async and returns the shape the backend is expected to send,
 * so each body can later be replaced by a fetch, e.g.
 *   const res = await fetch(`${API_URL}/bids-awards/overview?fy=2026&region=NCR&agency=&supplier=&mode=`)
 *   return (await res.json()) as TenderOverview
 *
 * National totals reuse the OCDS statistics mocks (bid notices published,
 * total contract amount) and the OCDS indicator getters, so this page agrees
 * with the OCDS indicator pages. SAMPLE DATA — not official figures.
 */

import { getTopSuppliers } from "@/app/ocds/indicators/uc025/_components/get-top-suppliers"
import { getAwardeesByRegion } from "@/app/ocds/indicators/uc036/_components/get-awardees-by-region"
import { getSupplierAwards } from "@/app/ocds/indicators/uc040/_components/get-supplier-awards"
import { getSupplierProjects } from "@/app/ocds/indicators/uc043/_components/get-supplier-projects"
import { getShortTitles } from "@/app/ocds/indicators/uc053/_components/get-short-titles"
import { between, MONTHS, monthsCovered, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { MOCK_ENTITIES } from "@/lib/ocds-mock"
import { getProcurementModes, type OcdsProcurementMode } from "@/lib/ocds-procurement-modes"
import { type OcdsRegion } from "@/lib/ocds-regions"
import { getBidNoticesPublished, getTotalContract } from "@/lib/ocds-statistics"
import { getSupplierOptions, type OcdsSupplierOption } from "@/lib/ocds-suppliers"

// ---------------------------------------------------------------------------
// Filters: year, region, agency, supplier (+ procurement mode click-through)
// ---------------------------------------------------------------------------

export type BidsFilter = {
  fiscalYear: number
  region: string | null
  /** Procuring entity id — agency-specific view. */
  agency: string | null
  /** Supplier id — supplier drill-down. */
  supplier: string | null
  mode: string | null
}

export type Agency = { id: string; name: string; region: string }

/** Procuring entities for the Agency filter. Backend: GET /api/ocds/procuring-entities */
export async function getAgencies(regions: OcdsRegion[]): Promise<Agency[]> {
  return MOCK_ENTITIES.map((e, i) => ({
    id: `PE-${String(i + 1).padStart(4, "0")}`,
    name: e.name,
    region: regions.find((r) => r.name === e.region)?.code ?? "NCR",
  }))
}

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseBidsFilter(
  params: Params,
  o: {
    fiscalYear: number
    regions: OcdsRegion[]
    agencies: Agency[]
    suppliers: OcdsSupplierOption[]
    modes: OcdsProcurementMode[]
  }
): BidsFilter {
  const pickValid = (key: string, valid: string[]) => {
    const v = first(params[key])
    return v && valid.includes(v) ? v : null
  }
  const agency = pickValid("agency", o.agencies.map((a) => a.id))
  return {
    fiscalYear: o.fiscalYear,
    // An agency implies its region.
    region: agency ? o.agencies.find((a) => a.id === agency)!.region : pickValid("region", o.regions.map((r) => r.code)),
    agency,
    supplier: pickValid("supplier", o.suppliers.map((s) => s.supplierId)),
    mode: pickValid("mode", o.modes.map((m) => m.code)),
  }
}

const key = (f: BidsFilter) => `${f.fiscalYear}-${f.region}-${f.agency}-${f.supplier}-${f.mode}`

/** Per-mode profile: share of awarded value, average bidders, failure rate. */
const MODE_PROFILE: Record<string, { valueShare: number; avgBidders: number; failRate: number }> = {
  "public-bidding": { valueShare: 0.71, avgBidders: 3.4, failRate: 0.11 },
  "small-value": { valueShare: 0.08, avgBidders: 2.6, failRate: 0.07 },
  shopping: { valueShare: 0.02, avgBidders: 2.2, failRate: 0.05 },
  negotiated: { valueShare: 0.12, avgBidders: 1.3, failRate: 0.04 },
  "direct-contracting": { valueShare: 0.04, avgBidders: 1, failRate: 0.02 },
  "limited-source": { valueShare: 0.03, avgBidders: 1.8, failRate: 0.06 },
}

const SEASONALITY = [0.05, 0.07, 0.1, 0.09, 0.08, 0.09, 0.1, 0.09, 0.08, 0.09, 0.08, 0.08]

/** Share of national activity covered by the region / agency / supplier filters. */
async function scopeShare(f: BidsFilter) {
  let share = f.region ? (REGION_WEIGHTS[f.region] ?? 0) : 1
  if (f.agency) share = between(rng(`agency-${f.agency}`), 0.012, 0.035)
  if (f.supplier) {
    const [top, total] = await Promise.all([getTopSuppliers(f.fiscalYear), getTotalContract(f.fiscalYear)])
    const s = top?.find((t) => t.supplierId === f.supplier)
    share *= s && total ? s.totalContractAmount / total.amount : 0.01
  }
  return share
}

/** National bid notices and awarded value for one mode (or all modes). */
async function nationalTotals(fiscalYear: number, mode: string | null) {
  const [notices, contract] = await Promise.all([
    getBidNoticesPublished(fiscalYear, mode),
    getTotalContract(fiscalYear),
  ])
  const awardedAll = contract?.amount ?? 0
  return {
    notices: notices?.count ?? 0,
    awarded: mode ? awardedAll * (MODE_PROFILE[mode]?.valueShare ?? 0) : awardedAll,
  }
}

// ---------------------------------------------------------------------------
// 02-A Tender overview
// ---------------------------------------------------------------------------

export type TenderOverview = {
  notices: number
  noticesPriorYear: number
  /** ABC of all published notices. */
  totalAbc: number
  /** ABC of the lots that were awarded. */
  awardedAbc: number
  awardedAmount: number
  lotsPublished: number
  lotsAwarded: number
  cancelled: { count: number; value: number }
  failed: { count: number; value: number }
  /** Why biddings failed (counts of lots). */
  failureReasons: { noBidder: number; ineligible: number; disqualified: number; other: number }
  monthly: {
    month: string
    lotsPublished: number | null
    lotsAwarded: number | null
    abc: number | null
    awardedAmount: number | null
  }[]
}

export async function getTenderOverview(f: BidsFilter): Promise<TenderOverview> {
  const r = rng(`02a-${key(f)}`)
  const [national, prior, share] = await Promise.all([
    nationalTotals(f.fiscalYear, f.mode),
    nationalTotals(f.fiscalYear - 1, f.mode),
    scopeShare(f),
  ])
  const notices = Math.round(national.notices * share)
  const awardedAmount = national.awarded * share
  const awardedAbc = awardedAmount / (1 - between(r, 0.065, 0.085))
  const totalAbc = awardedAbc / between(r, 0.78, 0.84)

  const lotsPublished = Math.round(notices * between(r, 1.25, 1.4))
  const failRate = f.mode ? MODE_PROFILE[f.mode].failRate : 0.08
  const failedCount = Math.round(lotsPublished * failRate)
  const cancelledCount = Math.round(lotsPublished * between(r, 0.03, 0.045))
  const lotsAwarded = Math.round(lotsPublished * between(r, 0.76, 0.82))
  const avgLotAbc = totalAbc / Math.max(1, lotsPublished)

  const noBidder = Math.round(failedCount * between(r, 0.4, 0.5))
  const ineligible = Math.round(failedCount * between(r, 0.17, 0.23))
  const disqualified = Math.round(failedCount * between(r, 0.2, 0.27))

  const months = monthsCovered(f.fiscalYear)
  const weights = SEASONALITY.slice(0, months)
  const wsum = weights.reduce((a, b) => a + b, 0)

  return {
    notices,
    noticesPriorYear: Math.round(prior.notices * share),
    totalAbc,
    awardedAbc,
    awardedAmount,
    lotsPublished,
    lotsAwarded,
    cancelled: { count: cancelledCount, value: cancelledCount * avgLotAbc * between(r, 0.8, 1.2) },
    failed: { count: failedCount, value: failedCount * avgLotAbc * between(r, 1, 1.4) },
    failureReasons: {
      noBidder,
      ineligible,
      disqualified,
      other: Math.max(0, failedCount - noBidder - ineligible - disqualified),
    },
    monthly: MONTHS.map((month, i) => {
      if (i >= months) return { month, lotsPublished: null, lotsAwarded: null, abc: null, awardedAmount: null }
      const w = weights[i] / wsum
      const amount = awardedAmount * w * between(r, 0.9, 1.1)
      return {
        month,
        lotsPublished: Math.round(lotsPublished * w * between(r, 0.92, 1.08)),
        // Awards trail publication, so early months award fewer lots.
        lotsAwarded: Math.round(lotsAwarded * w * between(r, 0.85, 1.05)),
        abc: Math.round(amount / (1 - between(r, 0.04, 0.11))),
        awardedAmount: Math.round(amount),
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// 02-B Procurement mode and classification
// ---------------------------------------------------------------------------

export type ModeRow = {
  code: string
  name: string
  notices: number
  abc: number
  lotsAwarded: number
  awardedAmount: number
}

/** Board-level summary per mode (ignores the mode filter so all modes show). */
export async function getModeBoard(f: BidsFilter): Promise<ModeRow[]> {
  const modes = await getProcurementModes()
  const share = await scopeShare(f)
  const rows = await Promise.all(
    modes.map(async (m) => {
      const r = rng(`02b-${m.code}-${key({ ...f, mode: null })}`)
      const t = await nationalTotals(f.fiscalYear, m.code)
      const notices = Math.round(t.notices * share)
      const awardedAmount = t.awarded * share
      return {
        code: m.code,
        name: m.name,
        notices,
        abc: (awardedAmount / (1 - between(r, 0.06, 0.09))) / between(r, 0.78, 0.84),
        lotsAwarded: Math.round(notices * between(r, 1.0, 1.1)),
        awardedAmount,
      }
    })
  )
  return rows.sort((a, b) => b.notices - a.notices)
}

export type BreakdownRow = { id: string; label: string; notices: number; awardedAmount: number }

/**
 * Click-through breakdown of the selected mode (or all modes): by region
 * nationally, or by procuring entity once a region or agency is chosen.
 */
export async function getBreakdown(
  f: BidsFilter,
  regions: OcdsRegion[],
  agencies: Agency[]
): Promise<{ by: "region" | "agency"; rows: BreakdownRow[] }> {
  const national = await nationalTotals(f.fiscalYear, f.mode)
  const supplierShare = f.supplier ? (await scopeShare({ ...f, region: null, agency: null })) : 1

  if (!f.region) {
    return {
      by: "region",
      rows: regions
        .map((reg) => {
          const s = (REGION_WEIGHTS[reg.code] ?? 0) * supplierShare
          return { id: reg.code, label: reg.name, notices: Math.round(national.notices * s), awardedAmount: national.awarded * s }
        })
        .sort((a, b) => b.notices - a.notices),
    }
  }

  const inRegion = agencies.filter((a) => a.region === f.region)
  return {
    by: "agency",
    rows: inRegion
      .map((a) => {
        const s = between(rng(`agency-${a.id}`), 0.012, 0.035) * supplierShare
        return { id: a.id, label: a.name, notices: Math.round(national.notices * s), awardedAmount: national.awarded * s }
      })
      .sort((a, b) => b.notices - a.notices),
  }
}

// ---------------------------------------------------------------------------
// 02-C Bid activity
// ---------------------------------------------------------------------------

export type BidActivity = {
  bidsSubmitted: number
  avgBidders: number
  singleBidderShare: number
  monthly: { month: string; current: number | null; prior: number | null }[]
  biddersPerTender: { label: string; value: number }[]
}

export async function getBidActivity(f: BidsFilter): Promise<BidActivity> {
  const r = rng(`02c-${key(f)}`)
  const [overview, priorOverview] = await Promise.all([
    getTenderOverview(f),
    getTenderOverview({ ...f, fiscalYear: f.fiscalYear - 1 }).catch(() => null),
  ])
  const avg = f.mode ? MODE_PROFILE[f.mode].avgBidders : 2.7
  const bidsFor = (o: TenderOverview | null, i: number) => {
    if (!o?.notices) return null // no data for that year
    const lots = o.monthly[i]?.lotsPublished
    return lots === null || lots === undefined ? null : Math.round(lots * avg * between(r, 0.92, 1.08))
  }

  const single = Math.min(0.95, Math.max(0.12, 0.62 - (avg - 1) * 0.2 + between(r, -0.02, 0.02)))
  const rest = 1 - single
  const shape = avg >= 2.5 ? [0.28, 0.3, 0.22, 0.2] : [0.5, 0.3, 0.12, 0.08]
  const shares = [single, ...shape.map((s) => s * rest)]
  const labels = ["1 bidder", "2 bidders", "3 bidders", "4 bidders", "5 or more"]

  return {
    bidsSubmitted: Math.round(overview.lotsPublished * avg),
    avgBidders: avg,
    singleBidderShare: single,
    monthly: MONTHS.map((month, i) => ({ month, current: bidsFor(overview, i), prior: bidsFor(priorOverview, i) })),
    biddersPerTender: labels.map((label, i) => ({ label, value: Math.round(overview.lotsPublished * shares[i]) })),
  }
}

// ---------------------------------------------------------------------------
// 02-D / 02-E Top agencies and suppliers
// ---------------------------------------------------------------------------

export type RankedParty = { id: string; name: string; contracts: number; awarded: number }

export async function getRankings(
  f: BidsFilter,
  agencies: Agency[],
  suppliers: OcdsSupplierOption[]
): Promise<{ agencies: RankedParty[]; suppliers: RankedParty[] }> {
  const overview = await getTenderOverview(f)
  const top = (await getTopSuppliers(f.fiscalYear)) ?? []

  const rank = (items: { id: string; name: string; weight: number }[], seed: string) => {
    const r = rng(seed)
    const w = items.map((i) => i.weight * between(r, 0.85, 1.15))
    const wsum = w.reduce((a, b) => a + b, 0) || 1
    const topShare = items.length > 1 ? between(r, 0.35, 0.45) : 1
    return items
      .map((it, i) => ({
        id: it.id,
        name: it.name,
        awarded: (overview.awardedAmount * topShare * w[i]) / wsum,
        contracts: Math.max(1, Math.round((overview.lotsAwarded * topShare * w[i]) / wsum)),
      }))
      .sort((a, b) => b.awarded - a.awarded)
      .slice(0, 10)
  }

  const agencyItems = agencies
    .filter((a) => (f.agency ? a.id === f.agency : !f.region || a.region === f.region))
    .map((a) => ({ id: a.id, name: a.name, weight: between(rng(`agency-${a.id}`), 0.012, 0.035) }))
  const supplierItems = suppliers
    .filter((s) => !f.supplier || s.supplierId === f.supplier)
    .map((s) => ({
      id: s.supplierId,
      name: s.supplierName,
      weight: top.find((t) => t.supplierId === s.supplierId)?.totalContractAmount ?? 1e8,
    }))

  return {
    agencies: rank(agencyItems, `02d-${key(f)}`),
    suppliers: rank(supplierItems, `02e-${key(f)}`),
  }
}

// ---------------------------------------------------------------------------
// Supplier drill-down
// ---------------------------------------------------------------------------

export type SupplierProfile = {
  name: string
  region: string | null
  contracts: number
  awardedAmount: number
  procuringEntityCount: number
  entities: { name: string; contracts: number; amount: number }[]
}

export async function getSupplierProfile(f: BidsFilter): Promise<SupplierProfile | null> {
  if (!f.supplier) return null
  const supplier = (await getSupplierOptions(f.fiscalYear)).find((s) => s.supplierId === f.supplier)
  if (!supplier) return null
  const [projects, top] = await Promise.all([
    getSupplierProjects({ fiscalYear: f.fiscalYear, supplier, page: 1, pageSize: 1000 }),
    getTopSuppliers(f.fiscalYear),
  ])
  const byEntity = new Map<string, { name: string; contracts: number; amount: number }>()
  for (const p of projects?.items ?? []) {
    const e = byEntity.get(p.procuringEntity) ?? { name: p.procuringEntity, contracts: 0, amount: 0 }
    e.contracts++
    e.amount += p.contractAmount
    byEntity.set(p.procuringEntity, e)
  }
  const t = top?.find((x) => x.supplierId === f.supplier)
  return {
    name: supplier.supplierName,
    region: t?.region ?? null,
    contracts: t?.contractCount ?? projects?.total ?? 0,
    awardedAmount: t?.totalContractAmount ?? [...byEntity.values()].reduce((a, e) => a + e.amount, 0),
    procuringEntityCount: projects?.procuringEntityCount ?? byEntity.size,
    entities: [...byEntity.values()].sort((a, b) => b.amount - a.amount),
  }
}

// ---------------------------------------------------------------------------
// OCDS priority indicators (Open Data BRD A.14.1) — fiscal-year headlines
// ---------------------------------------------------------------------------

export type OcdsIndicatorSummary = {
  uc025: { top10Share: number; top10Amount: number } | null
  uc036: { regions: { region: string; amount: number }[] } | null
  uc040: { suppliers: number; topSupplier: string; topAmount: number } | null
  uc043: { supplier: string; procuringEntities: number } | null
  uc053: { count: number; share: number; thresholdChars: number } | null
}

export async function getOcdsIndicators(f: BidsFilter): Promise<OcdsIndicatorSummary> {
  const fy = f.fiscalYear
  const suppliers = await getSupplierOptions(fy)
  const uc043Supplier = suppliers.find((s) => s.supplierId === f.supplier) ?? suppliers[0]
  const [top, total, awardees, awards, projects, short, notices] = await Promise.all([
    getTopSuppliers(fy),
    getTotalContract(fy),
    getAwardeesByRegion(fy, null),
    getSupplierAwards({ fiscalYear: fy, region: null, q: "", page: 1, pageSize: 1 }),
    uc043Supplier ? getSupplierProjects({ fiscalYear: fy, supplier: uc043Supplier, page: 1, pageSize: 1 }) : undefined,
    getShortTitles({ fiscalYear: fy, modeName: null, page: 1, pageSize: 1 }),
    getBidNoticesPublished(fy),
  ])

  const top10Amount = top?.reduce((a, s) => a + s.totalContractAmount, 0) ?? 0
  const byRegion = new Map<string, number>()
  for (const a of awardees ?? []) byRegion.set(a.region, (byRegion.get(a.region) ?? 0) + a.totalContractAmount)

  return {
    uc025: top && total ? { top10Share: top10Amount / total.amount, top10Amount } : null,
    uc036: awardees
      ? { regions: [...byRegion].map(([region, amount]) => ({ region, amount })).sort((a, b) => b.amount - a.amount) }
      : null,
    uc040: awards?.items[0]
      ? { suppliers: awards.total, topSupplier: awards.items[0].supplierName, topAmount: awards.items[0].totalAwardedAmount }
      : null,
    uc043: projects ? { supplier: projects.supplierName, procuringEntities: projects.procuringEntityCount } : null,
    uc053: short
      ? { count: short.total, share: notices ? short.total / notices.count : 0, thresholdChars: short.thresholdChars }
      : null,
  }
}
