/**
 * Merchant Analytics (module 01, BRD 15.3.1) — data for the Merchant Analytics page.
 *
 * Every getter is async and returns the shape the backend is expected to send,
 * so each body can later be replaced by a fetch, e.g.
 *   const res = await fetch(`${API_URL}/merchants/overview?from=2022&to=2026&region=NCR&orgType=local`)
 *   return (await res.json()) as SupplierOverview
 *
 * SAMPLE DATA: values are generated from a fixed seed for layout purposes and
 * are not official PhilGEPS or PS-DBM figures.
 */

import {
  asOfDate,
  between,
  isPartialYear,
  monthsCovered,
  pickRandom as pick,
  REGION_WEIGHTS,
  rng,
} from "@/lib/analytics-mock"

export { asOfDate } from "@/lib/analytics-mock"

// ---------------------------------------------------------------------------
// Filters (slicers): year range, region, organization type
// ---------------------------------------------------------------------------

export type OrgType = "local" | "foreign"

export type MerchantFilter = {
  fromYear: number
  toYear: number
  region: string | null
  orgType: OrgType | null
}

export const FIRST_YEAR = 2016
export const LATEST_YEAR = 2026
export const REGISTRATION_YEARS = Array.from({ length: LATEST_YEAR - FIRST_YEAR + 1 }, (_, i) => LATEST_YEAR - i)
export const ORG_TYPES: { code: OrgType; name: string }[] = [
  { code: "local", name: "Local" },
  { code: "foreign", name: "Foreign" },
]

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Reads ?from=&to=&region=&orgType= into a valid filter (default: last 5 years, all). */
export function parseMerchantFilter(params: Params, regionCodes: string[]): MerchantFilter {
  const year = (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return REGISTRATION_YEARS.includes(n) ? n : fallback
  }
  let fromYear = year(first(params.from), LATEST_YEAR - 4)
  let toYear = year(first(params.to), LATEST_YEAR)
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear]
  const region = first(params.region)
  const orgType = first(params.orgType)
  return {
    fromYear,
    toYear,
    region: region && regionCodes.includes(region) ? region : null,
    orgType: ORG_TYPES.some((o) => o.code === orgType) ? (orgType as OrgType) : null,
  }
}

const filterKey = (f: MerchantFilter) => `${f.fromYear}-${f.toYear}-${f.region}-${f.orgType}`

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/** Share of the registered supplier base located in each region. */
const REGION_SHARE = REGION_WEIGHTS

/** PSGC region codes — keys of the boundary files in /public/geo. */
export const REGION_PSGC: Record<string, number> = {
  I: 100000000, II: 200000000, III: 300000000, "IV-A": 400000000, V: 500000000,
  VI: 600000000, VII: 700000000, VIII: 800000000, IX: 900000000, X: 1000000000,
  XI: 1100000000, XII: 1200000000, NCR: 1300000000, CAR: 1400000000, XIII: 1600000000,
  "IV-B": 1700000000, NIR: 1800000000, BARMM: 1900000000,
}

const FOREIGN_SHARE = 0.014

/** Registered suppliers at year end (current year: as of the data date). */
const REGISTERED_TOTAL: Record<number, number> = {
  2015: 7600, 2016: 8240, 2017: 8910, 2018: 9650, 2019: 10480, 2020: 11920,
  2021: 12880, 2022: 14105, 2023: 15340, 2024: 16310, 2025: 17216, 2026: 18452,
}

/** New registrations per year (current year: year-to-date). */
const NEW_REGISTRATIONS: Record<number, number> = {
  2016: 1180, 2017: 1240, 2018: 1330, 2019: 1450, 2020: 1990, 2021: 1980,
  2022: 2240, 2023: 2310, 2024: 2150, 2025: 2290, 2026: 2010,
}

const regionShare = (region: string | null) => (region ? REGION_SHARE[region] ?? 0 : 1)
const orgShare = (orgType: OrgType | null) =>
  orgType === "foreign" ? FOREIGN_SHARE : orgType === "local" ? 1 - FOREIGN_SHARE : 1
const scaleOf = (f: MerchantFilter) => regionShare(f.region) * orgShare(f.orgType)

export const UNSPSC_SEGMENTS: [string, string, number][] = [
  ["44", "Office Equipment, Accessories and Supplies", 1],
  ["43", "IT, Broadcasting and Telecommunications", 0.82],
  ["72", "Building, Facility Construction and Maintenance Services", 0.78],
  ["42", "Medical Equipment, Accessories and Supplies", 0.6],
  ["56", "Furniture and Furnishings", 0.46],
  ["47", "Cleaning Equipment and Supplies", 0.42],
  ["50", "Food, Beverage and Tobacco Products", 0.4],
  ["39", "Electrical Systems, Lighting and Components", 0.36],
  ["51", "Drugs and Pharmaceutical Products", 0.32],
  ["31", "Manufacturing Components and Supplies", 0.28],
  ["80", "Management and Business Professional Services", 0.27],
  ["25", "Commercial, Military and Private Vehicles", 0.24],
  ["27", "Tools and General Machinery", 0.22],
  ["46", "Defense, Law Enforcement, Security and Safety Equipment", 0.2],
  ["40", "Distribution and Conditioning Systems", 0.17],
  ["81", "Engineering, Research and Technology Services", 0.15],
  ["82", "Editorial, Design, Graphic and Fine Art Services", 0.13],
  ["90", "Travel, Food, Lodging and Entertainment Services", 0.12],
  ["41", "Laboratory, Measuring and Testing Equipment", 0.1],
  ["86", "Education and Training Services", 0.09],
  ["26", "Power Generation and Distribution Machinery", 0.065],
  ["70", "Farming, Fishing, Forestry and Wildlife Services", 0.05],
  ["76", "Industrial Cleaning Services", 0.04],
  ["12", "Chemicals including Bio Chemicals", 0.03],
  ["85", "Healthcare Services", 0.025],
  ["23", "Industrial Manufacturing and Processing Machinery", 0.015],
  ["20", "Mining and Well Drilling Machinery", 0.006],
  ["60", "Musical Instruments, Games, Toys, Arts and Crafts", 0.004],
]

const SAMPLE_PREFIXES = ["Bayanihan", "Mabuhay", "Silangan", "Kalayaan", "Bagong Araw", "Tanglaw", "Sampaguita", "Malaya", "Luzviminda", "Dakila", "Masagana", "Liwayway", "Habagat", "Amihan", "Bituin", "Hiraya", "Kaagapay", "Tala", "Alon", "Banaag"]
const SAMPLE_SUFFIXES = ["Trading", "Enterprises", "Construction", "General Merchandise", "Supply", "Builders", "Medical Supply", "IT Solutions", "Office Systems", "Agri Ventures"]

function sampleNames(seed: string, n: number, exclude = new Set<string>()) {
  const r = rng(seed)
  const names = new Set<string>()
  while (names.size < n) {
    const name = `${pick(r, SAMPLE_PREFIXES)} ${pick(r, SAMPLE_SUFFIXES)}`
    if (!exclude.has(name)) names.add(name)
  }
  return [...names]
}

function regionFor(r: () => number) {
  let x = r()
  for (const [code, share] of Object.entries(REGION_SHARE)) {
    if ((x -= share) <= 0) return code
  }
  return "NCR"
}

// ---------------------------------------------------------------------------
// 01-A Registered Supplier Overview
// ---------------------------------------------------------------------------

export type SupplierOverview = {
  /** Registered suppliers at the end of the range. */
  registered: number
  /** Registered suppliers at the start of the range (end of fromYear − 1). */
  registeredAtStart: number
  /** Registration valid (not expired) at the end of the range. */
  active: number
  /** Registered but expired, suspended or not renewed. */
  inactive: number
  platinum: number
  red: number
}

export async function getSupplierOverview(f: MerchantFilter): Promise<SupplierOverview> {
  const r = rng(`01a-${filterKey(f)}`)
  const scale = scaleOf(f)
  const registered = Math.round(REGISTERED_TOTAL[f.toYear] * scale)
  const active = Math.round(registered * between(r, 0.72, 0.77))
  const platinum = Math.round(active * between(r, 0.28, 0.32))
  return {
    registered,
    registeredAtStart: Math.round(REGISTERED_TOTAL[f.fromYear - 1] * scale),
    active,
    inactive: registered - active,
    platinum,
    red: active - platinum,
  }
}

// ---------------------------------------------------------------------------
// 01-B Supplier Registration Trends
// ---------------------------------------------------------------------------

export type RegistrationYear = {
  year: string
  local: number
  foreign: number
  /** True for the projected next year. */
  forecast?: boolean
}

export type RegistrationTrends = {
  years: RegistrationYear[]
  local: number
  foreign: number
  /** Growth of the last year in the range over the year before it (a partial year is annualised). */
  yoy: { year: number; rate: number } | null
  /** Projection for the year after the latest data year (shown when the range ends there). */
  forecast: { year: number; value: number; rate: number } | null
}

function newRegistrations(year: number, f: MerchantFilter) {
  const r = rng(`01b-${year}-${f.region}`)
  const total = NEW_REGISTRATIONS[year] * regionShare(f.region) * between(r, 0.94, 1.06)
  const foreignRate = between(r, 0.012, 0.019)
  return {
    local: f.orgType === "foreign" ? 0 : Math.round(total * (1 - foreignRate)),
    foreign: f.orgType === "local" ? 0 : Math.round(total * foreignRate),
  }
}

export async function getRegistrationTrends(f: MerchantFilter): Promise<RegistrationTrends> {
  const years: RegistrationYear[] = []
  for (let y = f.fromYear; y <= f.toYear; y++) {
    years.push({ year: isPartialYear(y) ? `${y} YTD` : String(y), ...newRegistrations(y, f) })
  }
  const total = (y: number) => {
    const n = newRegistrations(y, f)
    // Annualise a partial year so it compares with full years.
    return (n.local + n.foreign) * (12 / monthsCovered(y))
  }

  const yoy =
    f.toYear - 1 >= FIRST_YEAR ? { year: f.toYear, rate: total(f.toYear) / total(f.toYear - 1) - 1 } : null

  // Linear trend over the last five years (current year annualised).
  let forecast: RegistrationTrends["forecast"] = null
  if (f.toYear === LATEST_YEAR) {
    const xs = [0, 1, 2, 3, 4].map((i) => LATEST_YEAR - 4 + i)
    const ys = xs.map(total)
    const mx = xs.reduce((a, b) => a + b) / 5
    const my = ys.reduce((a, b) => a + b) / 5
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    const value = Math.round(my + slope * (LATEST_YEAR + 1 - mx))
    const projectedLocal = Math.round(value * (f.orgType === "foreign" ? 0 : f.orgType === "local" ? 1 : 1 - 0.015))
    years.push({ year: `${LATEST_YEAR + 1} forecast`, local: projectedLocal, foreign: value - projectedLocal, forecast: true })
    forecast = { year: LATEST_YEAR + 1, value, rate: value / total(LATEST_YEAR) - 1 }
  }

  const actual = years.filter((y) => !y.forecast)
  return {
    years,
    local: actual.reduce((a, y) => a + y.local, 0),
    foreign: actual.reduce((a, y) => a + y.foreign, 0),
    yoy,
    forecast,
  }
}

// ---------------------------------------------------------------------------
// 01-C Geographic Distribution of Suppliers
// ---------------------------------------------------------------------------

export type AreaStats = {
  suppliers: number
  /** Share of suppliers in the area with a valid registration. */
  activeRate: number
  topCategory: string
}

export type RegionStats = AreaStats & { code: string; psgc: number }

/** One barangay row (used by the barangay table). */
export type SupplierLocation = {
  region: string
  province: string
  city: string
  barangay: string
  suppliers: number
}

export type ForeignCountry = { country: string; suppliers: number; embassies: number }

export type GeographicDistribution = {
  regions: RegionStats[]
  foreign: ForeignCountry[]
}

/** Seeded top category for an area (weighted toward the big UNSPSC segments). */
export function topCategoryFor(seed: string) {
  const r = rng(`cat-${seed}`)
  const top = UNSPSC_SEGMENTS.slice(0, 6)
  return top[Math.floor(r() ** 1.6 * top.length)][1]
}

const FOREIGN_COUNTRIES = ["China", "Japan", "South Korea", "United States", "Singapore", "Malaysia", "Germany", "Australia", "India", "Taiwan", "Thailand", "United Kingdom"]

export async function getGeographicDistribution(f: MerchantFilter): Promise<GeographicDistribution> {
  const r = rng(`01c-${filterKey(f)}`)
  const total = REGISTERED_TOTAL[f.toYear] * orgShare(f.orgType)
  // All regions are returned (the map needs them); the Region slicer only sets
  // where the map starts.
  const regions = Object.entries(REGION_SHARE)
    .map(([code, share]) => ({
      code,
      psgc: REGION_PSGC[code],
      suppliers: Math.round(total * share),
      activeRate: between(r, 0.66, 0.82),
      topCategory: topCategoryFor(code),
    }))
    .sort((a, b) => b.suppliers - a.suppliers)

  const foreignTotal = f.orgType === "local" ? 0 : Math.round(REGISTERED_TOTAL[f.toYear] * FOREIGN_SHARE * regionShare(f.region))
  const fw = FOREIGN_COUNTRIES.map((_, i) => 1 / (i + 1.6))
  const fsum = fw.reduce((a, b) => a + b, 0)
  const foreign = FOREIGN_COUNTRIES.map((country, i) => {
    const suppliers = Math.round((foreignTotal * fw[i]) / fsum)
    return { country, suppliers, embassies: Math.min(suppliers, Math.round(between(r, 0, 2.4))) }
  }).filter((c) => c.suppliers > 0)

  return { regions, foreign }
}

// ---------------------------------------------------------------------------
// 01-D Blacklisted Merchants Report (supplier-centric)
// ---------------------------------------------------------------------------

export type BlacklistStatus = "active" | "perpetual" | "delisted"

export type BlacklistOrder = {
  agency: string
  reason: string
  startDate: string
  /** null = perpetual */
  endDate: string | null
}

export type LinkedCompany = {
  name: string
  registeredOn: string
  /** Masked public BO field, e.g. "M. R. S." */
  sharedOwner: string
  /** Registered after the owner's company was first blacklisted. */
  registeredAfterBlacklisting: boolean
}

export type BlacklistedSupplier = {
  id: string
  name: string
  orgType: OrgType
  businessType: string
  region: string
  orders: BlacklistOrder[]
  status: BlacklistStatus
  linked: LinkedCompany[]
}

export type BlacklistReport = {
  suppliers: BlacklistedSupplier[]
  current: number
  perpetual: number
  delisted: number
  /** Linked companies registered after their owner's company was blacklisted. */
  newLinkedCompanies: number
}

const BLACKLISTING_ENTITIES = [
  "DPWH – District Engineering Office",
  "DepEd – Schools Division Office",
  "DOH – Center for Health Development",
  "Provincial Government",
  "City Government",
  "State University",
  "Local Water District",
  "DA – Regional Field Office",
]

const BLACKLIST_REASONS = [
  "Failure to deliver within the contract period",
  "Submission of false or fraudulent documents",
  "Refusal to accept award or sign the contract",
  "Failure to post performance security",
  "Contract terminated for default",
  "Unsatisfactory performance rating",
]

const BUSINESS_TYPES = ["Sole proprietorship", "Corporation", "Partnership", "Cooperative", "Joint venture"]
const INITIALS = "ABCDEFGHJLMNPRSTV"

const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`

const ALL_BLACKLISTED: Omit<BlacklistedSupplier, "status">[] = (() => {
  const r = rng("01d-suppliers")
  const names = sampleNames("01d-names", 56)
  const linkedNames = sampleNames("01d-linked", 30, new Set(names))
  let li = 0
  return names.map((name, i) => {
    const orderCount = r() < 0.7 ? 1 : r() < 0.75 ? 2 : 3
    let year = 2017 + Math.floor(r() * 7)
    const orders: BlacklistOrder[] = []
    for (let k = 0; k < orderCount; k++) {
      const start = isoDate(year, 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28))
      const roll = r()
      // Repeat offenders get longer periods; a third order is perpetual.
      const years = k === 2 || roll < 0.06 ? null : k === 1 || roll < 0.35 ? 2 : 1
      orders.push({
        agency: pick(r, BLACKLISTING_ENTITIES),
        reason: pick(r, BLACKLIST_REASONS),
        startDate: start,
        endDate: years === null ? null : `${year + years}${start.slice(4)}`,
      })
      year += (years ?? 1) + Math.floor(r() * 2)
    }
    const firstStart = orders[0].startDate
    const linked: LinkedCompany[] =
      r() < 0.28
        ? Array.from({ length: r() < 0.7 ? 1 : 2 }, () => {
            const after = r() < 0.65
            const y = Number(firstStart.slice(0, 4)) + (after ? 1 + Math.floor(r() * 3) : -1 - Math.floor(r() * 3))
            return {
              name: linkedNames[li++ % linkedNames.length],
              registeredOn: isoDate(y, 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28)),
              sharedOwner: `${pick(r, [...INITIALS])}. ${pick(r, [...INITIALS])}. ${pick(r, [...INITIALS])}.`,
              registeredAfterBlacklisting: after,
            }
          })
        : []
    return {
      id: `SUP-${String(10240 + i * 37)}`,
      name,
      orgType: r() < 0.05 ? "foreign" : "local",
      businessType: pick(r, BUSINESS_TYPES),
      region: regionFor(r),
      orders,
      linked,
    }
  })
})()

export async function getBlacklistReport(f: MerchantFilter): Promise<BlacklistReport> {
  const asOf = asOfDate(f.toYear)
  const rangeStart = `${f.fromYear}-01-01`
  const suppliers: BlacklistedSupplier[] = ALL_BLACKLISTED.filter(
    (s) =>
      (!f.region || s.region === f.region) &&
      (!f.orgType || s.orgType === f.orgType) &&
      // Blacklisted at some point during the selected range.
      s.orders.some((o) => o.startDate <= asOf && (o.endDate === null || o.endDate >= rangeStart))
  )
    .map((s) => {
      const orders = s.orders.filter((o) => o.startDate <= asOf)
      const status: BlacklistStatus = orders.some((o) => o.endDate === null)
        ? "perpetual"
        : orders.some((o) => o.endDate! > asOf)
          ? "active"
          : "delisted"
      return {
        ...s,
        orders,
        status,
        linked: s.linked.filter((l) => l.registeredOn <= asOf),
      }
    })
    .sort((a, b) => b.orders.at(-1)!.startDate.localeCompare(a.orders.at(-1)!.startDate))

  return {
    suppliers,
    current: suppliers.filter((s) => s.status !== "delisted").length,
    perpetual: suppliers.filter((s) => s.status === "perpetual").length,
    delisted: suppliers.filter((s) => s.status === "delisted").length,
    newLinkedCompanies: suppliers.reduce(
      (a, s) => a + s.linked.filter((l) => l.registeredAfterBlacklisting).length,
      0
    ),
  }
}

// ---------------------------------------------------------------------------
// 01-E Membership status
// ---------------------------------------------------------------------------

export type MembershipStatus = {
  platinum: number
  red: number
  inactive: number
  expiringNext90: number
  expiredLast90: number
}

export async function getMembershipStatus(f: MerchantFilter): Promise<MembershipStatus> {
  const r = rng(`01e-${filterKey(f)}`)
  const o = await getSupplierOverview(f)
  const in90 = Math.round(o.active * between(r, 0.09, 0.12))
  return {
    platinum: o.platinum,
    red: o.red,
    inactive: o.inactive,
    expiringNext90: in90,
    expiredLast90: Math.round(in90 * between(r, 0.55, 0.75)),
  }
}

// ---------------------------------------------------------------------------
// 01-F Supplier category (UNSPSC) distribution
// ---------------------------------------------------------------------------

export type CategoryRow = { code: string; title: string; suppliers: number }

export type CategoryAnalysis = {
  categories: CategoryRow[]
  /** Categories with fewer suppliers than this are flagged. */
  thinThreshold: number
}

export async function getCategoryAnalysis(f: MerchantFilter): Promise<CategoryAnalysis> {
  const r = rng(`01f-${filterKey(f)}`)
  const top = REGISTERED_TOTAL[f.toYear] * 0.31 * scaleOf(f)
  return {
    categories: UNSPSC_SEGMENTS.map(([code, title, w]) => ({
      code,
      title,
      suppliers: Math.round(top * w * between(r, 0.9, 1.1)),
    })).sort((a, b) => b.suppliers - a.suppliers),
    thinThreshold: f.region || f.orgType === "foreign" ? 5 : 25,
  }
}
