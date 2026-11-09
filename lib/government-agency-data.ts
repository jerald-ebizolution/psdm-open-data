/**
 * Government Agency Analytics (module 03, BRD 15.3.3) — data for the agency page.
 *
 * The mock builds one register of procuring entities and derives every figure
 * from it, so KPIs, charts and the agency listing always agree. Backend
 * contracts to replace it:
 *   GET /api/agencies/summary?fy=&region=&type=          → AgencySummary
 *   GET /api/agencies?fy=&region=&type=&view=&q=&page=   → AgencyPage
 *
 * SAMPLE DATA — not official PhilGEPS or PS-DBM figures. Deadlines and
 * submission manners in SUBMISSION_RULES are placeholders to confirm with
 * PS-DBM / GPPB before go-live.
 */

import { between, monthsCovered, pickRandom, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type AgencyType = "nga" | "lgu" | "gocc" | "suc" | "lwd"

export const AGENCY_TYPES: { code: AgencyType; name: string }[] = [
  { code: "nga", name: "National Government Agency" },
  { code: "lgu", name: "Local Government Unit" },
  { code: "gocc", name: "Government-Owned or -Controlled Corporation" },
  { code: "suc", name: "State University or College" },
  { code: "lwd", name: "Local Water District" },
]
export const AGENCY_TYPE_SHORT: Record<AgencyType, string> = {
  nga: "NGA",
  lgu: "LGU",
  gocc: "GOCC",
  suc: "SUC",
  lwd: "Water District",
}

export type AgencyFilter = { fiscalYear: number; region: string | null; type: AgencyType | null }

export type AgencyView = "all" | "centralized" | "decentralized" | "idle" | "no-app"

export const AGENCY_VIEWS: { code: AgencyView; name: string }[] = [
  { code: "all", name: "All agencies" },
  { code: "centralized", name: "Centralized (via PS-DBM)" },
  { code: "decentralized", name: "Decentralized" },
  { code: "idle", name: "APP but no procurement" },
  { code: "no-app", name: "No APP submitted" },
]

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseAgencyFilter(params: Params, fiscalYear: number, regionCodes: string[]): AgencyFilter {
  const region = first(params.region)
  const type = first(params.type)
  return {
    fiscalYear,
    region: region && regionCodes.includes(region) ? region : null,
    type: AGENCY_TYPES.some((t) => t.code === type) ? (type as AgencyType) : null,
  }
}

// ---------------------------------------------------------------------------
// APP / APP-CSE submission rules (placeholders — confirm with PS-DBM / GPPB)
// ---------------------------------------------------------------------------

export const SUBMISSION_RULES = {
  app: {
    name: "Annual Procurement Plan (APP)",
    deadline: (fy: number) => `${fy}-01-31`,
    manner: "Posted on PhilGEPS and the agency website",
  },
  appCse: {
    name: "APP for Common-Use Supplies (APP-CSE)",
    deadline: (fy: number) => `${fy - 1}-10-31`,
    manner: "Submitted online to PS-DBM through the Virtual Store",
  },
}

// ---------------------------------------------------------------------------
// Agency register (seeded)
// ---------------------------------------------------------------------------

type BaseAgency = {
  id: string
  name: string
  type: AgencyType
  region: string
  registeredYear: number
  /** Buys common-use supplies through PS-DBM (submits an APP-CSE). */
  centralized: boolean
  budgetScale: number
}

const TYPE_COUNT: Record<AgencyType, number> = { nga: 380, lgu: 1450, gocc: 120, suc: 115, lwd: 335 }
const TYPE_BUDGET: Record<AgencyType, [number, number]> = {
  nga: [1.5e9, 7e9],
  lgu: [1.2e8, 2.4e9],
  gocc: [8e8, 9e9],
  suc: [3e8, 1.8e9],
  lwd: [5e7, 4e8],
}

const PLACE_A = ["San", "Sta.", "Sto.", "Bagong", "Mataas na", "Ilaya", "Malaki", "Bago", "Dakila", "Bayani"]
const PLACE_B = ["Rafael", "Barbara", "Lungsod", "Kahoy", "Pinagpala", "Malinaw", "Masagana", "Liwanag", "Kalinaw", "Bituin", "Dalisay", "Maharlika", "Isla Verde", "Alon", "Tala", "Hiraya", "Banaag", "Ligaya", "Tanglaw", "Silangan", "Habagat", "Amihan", "Marikit", "Sinag", "Lakandula"]
const PLACE_C = ["", "", "", " del Norte", " del Sur", " Oriental", " Occidental", " Nuevo", " Viejo"]
const DEPARTMENTS =["DepEd – Schools Division of", "DPWH – District Engineering Office of", "DOH – Hospital of", "DA – Field Office of", "DENR – Community Office of", "DILG – Field Office of", "DSWD – Field Office of", "BFP – Fire District of", "PNP – Police Office of", "DOLE – Field Office of"]

const REGION_CODES = Object.keys(REGION_WEIGHTS)

function regionFor(r: () => number) {
  let x = r() * Object.values(REGION_WEIGHTS).reduce((a, b) => a + b, 0)
  for (const code of REGION_CODES) if ((x -= REGION_WEIGHTS[code]) <= 0) return code
  return "NCR"
}

const REGISTER: BaseAgency[] = (() => {
  const r = rng("03-register")
  const uniquePlace = () => `${pickRandom(r, PLACE_A)} ${pickRandom(r, PLACE_B)}${pickRandom(r, PLACE_C)}`
  const names: Record<AgencyType, () => string> = {
    nga: () => `${pickRandom(r, DEPARTMENTS)} ${uniquePlace()}`,
    lgu: () => {
      const roll = r()
      const place = uniquePlace()
      return roll < 0.05 ? `Provincial Government of ${place}` : roll < 0.15 ? `City Government of ${place}` : `Municipality of ${place}`
    },
    gocc: () => `${uniquePlace()} ${pickRandom(r, ["Development Authority", "Port Authority", "Economic Zone Authority", "Power Corporation", "Housing Corporation"])}`,
    suc: () => `${uniquePlace()} ${pickRandom(r, ["State University", "State College", "Polytechnic State College"])}`,
    lwd: () => `${uniquePlace()} Water District`,
  }

  const out: BaseAgency[] = []
  const seen = new Set<string>()
  for (const type of Object.keys(TYPE_COUNT) as AgencyType[]) {
    for (let i = 0; i < TYPE_COUNT[type]; i++) {
      let name = names[type]()
      for (let tries = 0; seen.has(name) && tries < 30; tries++) name = names[type]()
      for (let k = 2; seen.has(name); k++) name = `${name.replace(/ \d+$/, "")} ${k}`
      seen.add(name)
      // ~55% registered before 2016; later registrations grow slowly over time.
      const registeredYear = r() < 0.55 ? 2004 + Math.floor(r() * 12) : 2016 + Math.floor(r() ** 0.8 * 11)
      out.push({
        id: `PE-${String(out.length + 1).padStart(5, "0")}`,
        name,
        type,
        region: regionFor(r),
        registeredYear,
        centralized: r() < (type === "lwd" || type === "gocc" ? 0.45 : 0.72),
        budgetScale: between(r, 0, 1) ** 2.2,
      })
    }
  }
  return out
})()

// ---------------------------------------------------------------------------
// Per fiscal year records
// ---------------------------------------------------------------------------

export type SubmissionStatus = "on-time" | "late" | "missing" | "n/a" | "not-due"

export type AgencyRecord = BaseAgency & {
  app: SubmissionStatus
  appCse: SubmissionStatus
  pmr1: SubmissionStatus
  pmr2: SubmissionStatus
  /** Total APP budget (0 when no APP). */
  budget: number
  /** Planned common-use supply orders (APP-CSE value). */
  plannedOrders: number
  /** Actual orders placed with PS-DBM so far. */
  actualOrders: number
  /** Procurement activities (notices + orders) in the fiscal year. */
  procurements: number
}

const submission = (r: () => number, onTime: number, late: number): SubmissionStatus => {
  const x = r()
  return x < onTime ? "on-time" : x < onTime + late ? "late" : "missing"
}

const recordsCache = new Map<number, AgencyRecord[]>()

function recordsFor(fy: number): AgencyRecord[] {
  const cached = recordsCache.get(fy)
  if (cached) return cached
  const partial = monthsCovered(fy) < 12
  const records = REGISTER.filter((a) => a.registeredYear <= fy).map((a) => {
    const r = rng(`03-${a.id}-${fy}`)
    const app = submission(r, fy >= 2026 ? 0.74 : 0.7, 0.14)
    const appCse = a.centralized ? submission(r, 0.68, 0.18) : "n/a"
    const [lo, hi] = TYPE_BUDGET[a.type]
    const budget = app === "missing" ? 0 : lo + (hi - lo) * a.budgetScale * between(r, 0.85, 1.15)
    const idle = app !== "missing" && r() < 0.065
    const plannedOrders = appCse === "on-time" || appCse === "late" ? budget * between(r, 0.04, 0.09) : 0
    return {
      ...a,
      app,
      appCse,
      pmr1: submission(r, 0.62, 0.17),
      pmr2: partial ? ("not-due" as const) : submission(r, 0.58, 0.18),
      budget,
      plannedOrders,
      actualOrders: idle ? 0 : plannedOrders * between(r, 0.45, 0.95) * (partial ? 0.85 : 1),
      procurements: idle ? 0 : app === "missing" ? Math.floor(r() * 6) : 3 + Math.floor(r() ** 2 * 140),
    }
  })
  recordsCache.set(fy, records)
  return records
}

/** Every registered agency with its records for one fiscal year (shared with Observers Analytics). */
export async function getAgencyRegister(fiscalYear: number): Promise<AgencyRecord[]> {
  return recordsFor(fiscalYear)
}

function filtered(f: AgencyFilter) {
  return recordsFor(f.fiscalYear).filter((a) => (!f.region || a.region === f.region) && (!f.type || a.type === f.type))
}

const inView = (a: AgencyRecord, view: AgencyView) =>
  view === "all" ||
  (view === "centralized" && a.centralized) ||
  (view === "decentralized" && !a.centralized) ||
  (view === "idle" && a.app !== "missing" && a.procurements === 0) ||
  (view === "no-app" && a.app === "missing")

// ---------------------------------------------------------------------------
// 03-A summary
// ---------------------------------------------------------------------------

type Counts = Record<"onTime" | "late" | "missing", number>

export type AgencySummary = {
  registered: number
  registeredPriorYear: number
  active: number
  appSubmitted: number
  linkedReports: number
  totalBudget: number
  submissions: { app: Counts; appCse: Counts & { notRequired: number } }
  buyers: {
    centralized: { agencies: number; budget: number }
    decentralized: { agencies: number; budget: number }
  }
  idle: { count: number; top: { id: string; name: string; budget: number }[] }
  orders: {
    planned: number
    actual: number
    quarterly: { quarter: string; planned: number; actual: number | null }[]
  }
  registrationsByYear: { year: string; agencies: number }[]
  byType: { code: AgencyType; label: string; value: number }[]
  byRegion: { code: string; agencies: number }[]
  compliance: { report: string; rate: number | null }[]
  viewCounts: Record<AgencyView, number>
}

const countStatus = (list: AgencyRecord[], key: "app" | "appCse"): Counts => ({
  onTime: list.filter((a) => a[key] === "on-time").length,
  late: list.filter((a) => a[key] === "late").length,
  missing: list.filter((a) => a[key] === "missing").length,
})

const FIRST_TREND_YEAR = 2016

export async function getAgencySummary(f: AgencyFilter): Promise<AgencySummary> {
  const list = filtered(f)
  const prior = recordsFor(f.fiscalYear - 1).filter(
    (a) => (!f.region || a.region === f.region) && (!f.type || a.type === f.type)
  )
  const withApp = list.filter((a) => a.app !== "missing")
  const centralized = list.filter((a) => a.centralized)
  const decentralized = list.filter((a) => !a.centralized)
  const idle = withApp.filter((a) => a.procurements === 0)

  const filed = (s: SubmissionStatus) => s === "on-time" || s === "late"
  const linkedReports = withApp.reduce(
    (n, a) => n + Number(filed(a.appCse)) + Number(filed(a.pmr1)) + Number(filed(a.pmr2)),
    0
  )

  const planned = list.reduce((s, a) => s + a.plannedOrders, 0)
  const actual = list.reduce((s, a) => s + a.actualOrders, 0)
  const months = monthsCovered(f.fiscalYear)
  const qPlan = [0.3, 0.27, 0.25, 0.18]
  const r = rng(`03-q-${f.fiscalYear}-${f.region}-${f.type}`)
  const qActualRaw = qPlan.map((w, i) => (i * 3 < months ? w * between(r, 0.85, 1.1) * Math.min(1, (months - i * 3) / 3) : 0))
  const qSum = qActualRaw.reduce((a, b) => a + b, 0) || 1

  const rate = (key: "app" | "appCse" | "pmr1" | "pmr2") => {
    const due = list.filter((a) => a[key] !== "n/a" && a[key] !== "not-due")
    return due.length ? due.filter((a) => a[key] === "on-time").length / due.length : null
  }

  const allTime = REGISTER.filter((a) => (!f.region || a.region === f.region) && (!f.type || a.type === f.type))
  const registrationsByYear = []
  for (let y = FIRST_TREND_YEAR; y <= f.fiscalYear; y++) {
    registrationsByYear.push({
      year: y === f.fiscalYear && months < 12 ? `${y} YTD` : String(y),
      agencies: allTime.filter((a) => a.registeredYear === y).length,
    })
  }

  return {
    registered: list.length,
    registeredPriorYear: prior.length,
    active: list.filter((a) => a.procurements > 0).length,
    appSubmitted: withApp.length,
    linkedReports,
    totalBudget: withApp.reduce((s, a) => s + a.budget, 0),
    submissions: {
      app: countStatus(list, "app"),
      appCse: { ...countStatus(list, "appCse"), notRequired: decentralized.length },
    },
    buyers: {
      centralized: { agencies: centralized.length, budget: centralized.reduce((s, a) => s + a.budget, 0) },
      decentralized: { agencies: decentralized.length, budget: decentralized.reduce((s, a) => s + a.budget, 0) },
    },
    idle: {
      count: idle.length,
      top: [...idle].sort((a, b) => b.budget - a.budget).slice(0, 5).map((a) => ({ id: a.id, name: a.name, budget: a.budget })),
    },
    orders: {
      planned,
      actual,
      quarterly: qPlan.map((w, i) => ({
        quarter: `Q${i + 1}`,
        planned: Math.round(planned * w),
        actual: i * 3 < months ? Math.round((actual * qActualRaw[i]) / qSum) : null,
      })),
    },
    registrationsByYear,
    byType: AGENCY_TYPES.map((t) => ({
      code: t.code,
      label: t.name,
      value: list.filter((a) => a.type === t.code).length,
    })).sort((a, b) => b.value - a.value),
    byRegion: REGION_CODES.map((code) => ({
      code,
      agencies: recordsFor(f.fiscalYear).filter((a) => a.region === code && (!f.type || a.type === f.type)).length,
    })).sort((a, b) => b.agencies - a.agencies),
    compliance: [
      { report: "APP", rate: rate("app") },
      { report: "APP-CSE", rate: rate("appCse") },
      { report: "PMR – 1st semester", rate: rate("pmr1") },
      { report: "PMR – 2nd semester", rate: rate("pmr2") },
    ],
    viewCounts: Object.fromEntries(
      AGENCY_VIEWS.map((v) => [v.code, list.filter((a) => inView(a, v.code)).length])
    ) as Record<AgencyView, number>,
  }
}

// ---------------------------------------------------------------------------
// Agency listing (landing table)
// ---------------------------------------------------------------------------

export type AgencyRow = Pick<
  AgencyRecord,
  "id" | "name" | "type" | "region" | "centralized" | "app" | "appCse" | "budget" | "plannedOrders" | "actualOrders" | "procurements"
>

export type AgencyPage = { rows: AgencyRow[]; total: number; page: number; pageSize: number }

export async function getAgencyPage(
  f: AgencyFilter,
  { view, q, page, pageSize }: { view: AgencyView; q: string; page: number; pageSize: number }
): Promise<AgencyPage> {
  const needle = q.trim().toLowerCase()
  const rows = filtered(f)
    .filter((a) => inView(a, view) && (!needle || a.name.toLowerCase().includes(needle)))
    .sort((a, b) => b.budget - a.budget || a.name.localeCompare(b.name))
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return {
    rows: rows.slice((current - 1) * pageSize, current * pageSize).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      region: a.region,
      centralized: a.centralized,
      app: a.app,
      appCse: a.appCse,
      budget: a.budget,
      plannedOrders: a.plannedOrders,
      actualOrders: a.actualOrders,
      procurements: a.procurements,
    })),
    total: rows.length,
    page: current,
    pageSize,
  }
}
