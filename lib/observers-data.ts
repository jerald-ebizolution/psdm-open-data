/**
 * Observers Analytics (module 04, BRD 15.3.4) — red flags, agency compliance,
 * award concentration and geographic risk.
 *
 * OCDS red flags (R003, R059–R062) take their counts and thresholds from the
 * OCDS Data Store getters in lib/ocds-red-flags, so they match the red-flag
 * pages. Agencies come from the Government Agency register. Everything else is
 * a seeded mock. Backend contracts to replace it:
 *   GET /api/observers/flags?fy=&region=&mode=&status=        → FlagCase[] + definitions
 *   GET /api/observers/price-disparity?fy=&region=            → PriceItem[]
 *   GET /api/observers/compliance?fy=&region=&mode=           → ComplianceSummary
 *
 * SAMPLE DATA. Thresholds, bases and compliance weights marked "to confirm"
 * are placeholders until the FSD defines them.
 */

import { between, MONTHS, monthsCovered, pickRandom, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { getAgencyRegister, type AgencyRecord } from "@/lib/government-agency-data"
import { MOCK_AWARDEES, MOCK_PROJECTS } from "@/lib/ocds-mock"
import { getProcurementModes, type OcdsProcurementMode } from "@/lib/ocds-procurement-modes"
import { getR003, getR059, getR060, getR061, getR062, MINIMUM_DAYS } from "@/lib/ocds-red-flags/data"
import { getBidNoticesPublished } from "@/lib/ocds-statistics"

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type FlagStatus = "unverified" | "verifying" | "verified" | "investigating" | "dismissed"

export const FLAG_STATUSES: { code: FlagStatus; name: string }[] = [
  { code: "unverified", name: "Not yet verified" },
  { code: "verifying", name: "Under verification" },
  { code: "verified", name: "Verified" },
  { code: "investigating", name: "Under investigation" },
  { code: "dismissed", name: "Dismissed" },
]

export type ObserversFilter = {
  fiscalYear: number
  region: string | null
  mode: string | null
  status: FlagStatus | null
}

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseObserversFilter(
  params: Params,
  fiscalYear: number,
  regionCodes: string[],
  modes: OcdsProcurementMode[]
): ObserversFilter {
  const region = first(params.region)
  const mode = first(params.mode)
  const status = first(params.status)
  return {
    fiscalYear,
    region: region && regionCodes.includes(region) ? region : null,
    mode: modes.some((m) => m.code === mode) ? mode! : null,
    status: FLAG_STATUSES.some((s) => s.code === status) ? (status as FlagStatus) : null,
  }
}

const filterKey = (f: ObserversFilter) => `${f.fiscalYear}-${f.region}-${f.mode}`

// ---------------------------------------------------------------------------
// Severity matrix
// ---------------------------------------------------------------------------

export type Severity = "critical" | "high" | "medium" | "low"

export const LIKELIHOOD = ["Rare", "Possible", "Likely", "Certain"] as const
/** Highest first, as the matrix is drawn top-down. */
export const IMPACT = ["Critical", "High", "Medium", "Low"] as const

/** likelihood 0–3 (Rare→Certain), impact 0–3 (Low→Critical). */
export function severityOf(likelihood: number, impact: number): Severity {
  const score = (likelihood + 1) * (impact + 1)
  return score >= 12 ? "critical" : score >= 8 ? "high" : score >= 4 ? "medium" : "low"
}

// ---------------------------------------------------------------------------
// Flag definitions — each shows its threshold and the basis for it
// ---------------------------------------------------------------------------

export type FlagDef = {
  code: string
  name: string
  group: "operational" | "ocds"
  threshold: string
  basis: string
  /** Typical likelihood / impact (0–3); individual cases vary by ±1. */
  likelihood: number
  impact: number
  /** Modes the flag applies to (codes); empty = all. */
  modes: string[]
  /** OCDS Data Store page for the flag. */
  href?: (fy: number) => string
}

const minDays = Object.entries(MINIMUM_DAYS)
  .map(([mode, d]) => `${mode} ${d}`)
  .join(", ")

export function flagDefinitions(limits: { r060: number; r061: number; r062: number }): FlagDef[] {
  return [
    {
      code: "SB",
      name: "Single bidder",
      group: "operational",
      threshold: "Only one bid received in a competitive procurement",
      basis: "Competition needs at least two bidders; a lone bid can signal restricted access or collusion.",
      likelihood: 2,
      impact: 2,
      modes: ["public-bidding", "small-value", "shopping"],
    },
    {
      code: "FB",
      name: "Repeated failed biddings",
      group: "operational",
      threshold: "Two or more failed biddings for the same project",
      basis: "Repeated failures can be used to justify a shift to negotiated procurement.",
      likelihood: 1,
      impact: 2,
      modes: ["public-bidding"],
    },
    {
      code: "NC",
      name: "No contract posted",
      group: "operational",
      threshold: "No contract posted 30 days after the award (to confirm)",
      basis: "Every award should be followed by a published contract so the public can follow delivery.",
      likelihood: 2,
      impact: 1,
      modes: [],
    },
    {
      code: "NA",
      name: "Award near the ABC",
      group: "operational",
      threshold: "Award amount at 95% or more of the ABC",
      basis: "Bids very close to the budget ceiling suggest weak price competition or a leaked budget.",
      likelihood: 2,
      impact: 1,
      modes: ["public-bidding", "small-value", "shopping"],
    },
    {
      code: "BS",
      name: "Bid splitting",
      group: "operational",
      threshold:
        "Two or more awards for similar items by one agency to one supplier within 30 days, each under the public bidding threshold but together above it (to confirm)",
      basis: "Splitting a requirement into smaller contracts avoids competitive public bidding.",
      likelihood: 1,
      impact: 3,
      modes: ["small-value", "shopping", "negotiated"],
    },
    {
      code: "TM",
      name: "Threshold manipulation",
      group: "operational",
      threshold: "ABC set within 5% below a procurement-mode threshold (to confirm)",
      basis: "A budget just under a threshold may be set to qualify for a less competitive mode.",
      likelihood: 1,
      impact: 2,
      modes: ["small-value", "shopping"],
    },
    {
      code: "PD",
      name: "Cross-agency price disparity",
      group: "operational",
      threshold: "Unit price more than 50% above the median paid by other agencies for an identical item",
      basis: "Large gaps in price for the same item can signal overpricing.",
      likelihood: 2,
      impact: 2,
      modes: [],
    },
    {
      code: "R003",
      name: "Submission period too short",
      group: "ocds",
      threshold: `Posting period below the minimum for the mode (days): ${minDays}`,
      basis: "Short windows limit the number of suppliers able to prepare a bid. Computed in the OCDS Data Store.",
      likelihood: 2,
      impact: 2,
      modes: ["public-bidding", "small-value", "shopping"],
      href: (fy) => `/ocds/red-flags/r003?fy=${fy}`,
    },
    {
      code: "R059",
      name: "Large difference between award value and final contract amount",
      group: "ocds",
      threshold: "Final contract amount above the approved budget (ABC)",
      basis: "Contract amounts that drift from the award point to variation orders or overpricing. Computed in the OCDS Data Store.",
      likelihood: 1,
      impact: 3,
      modes: [],
      href: (fy) => `/ocds/red-flags/r059?fy=${fy}`,
    },
    {
      code: "R060",
      name: "Long time between award and contract signing",
      group: "ocds",
      threshold: `More than ${limits.r060} calendar days from award to contract signing`,
      basis: "Long delays can hide renegotiation after the award. Computed in the OCDS Data Store.",
      likelihood: 2,
      impact: 1,
      modes: [],
      href: (fy) => `/ocds/red-flags/r060?fy=${fy}`,
    },
    {
      code: "R061",
      name: "Decision period extremely short",
      group: "ocds",
      threshold: `Fewer than ${limits.r061} days from bid closing to award`,
      basis: "Very fast decisions may skip proper bid evaluation. Computed in the OCDS Data Store.",
      likelihood: 1,
      impact: 2,
      modes: ["public-bidding", "small-value", "negotiated"],
      href: (fy) => `/ocds/red-flags/r061?fy=${fy}`,
    },
    {
      code: "R062",
      name: "Decision period extremely long",
      group: "ocds",
      threshold: `More than ${limits.r062} days from bid closing to award`,
      basis: "Very long decisions can signal disputes or attempts to steer the award. Computed in the OCDS Data Store.",
      likelihood: 1,
      impact: 1,
      modes: ["public-bidding", "small-value", "negotiated"],
      href: (fy) => `/ocds/red-flags/r062?fy=${fy}`,
    },
  ]
}

/** Source document for a flagged case. URL pattern to confirm with PhilGEPS. */
const noticeUrl = (ref: string) =>
  `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?menuIndex=3&refID=${ref}`

// ---------------------------------------------------------------------------
// Flagged cases
// ---------------------------------------------------------------------------

export type FlagCase = {
  id: string
  flag: string
  title: string
  agency: string
  region: string
  mode: string
  amount: number
  detectedOn: string
  likelihood: number
  impact: number
  severity: Severity
  status: FlagStatus
  source: { label: string; url: string; external: boolean }
}

/** Share of operational cases per flag code. */
const OPERATIONAL_COUNT: Record<string, number> = { SB: 190, FB: 70, NC: 95, NA: 120, BS: 45, TM: 38, PD: 60 }

async function flagSetup(fy: number) {
  const q = { fiscalYear: fy, q: "", page: 1, pageSize: 1 }
  const [r003, r059, r060, r061, r062] = await Promise.all([getR003(q), getR059(q), getR060(q), getR061(q), getR062(q)])
  const defs = flagDefinitions({
    r060: r060?.limitDays ?? 10,
    r061: r061?.thresholdDays ?? 3,
    r062: r062?.thresholdDays ?? 180,
  })
  const counts: Record<string, number> = {
    ...OPERATIONAL_COUNT,
    R003: r003?.total ?? 0,
    R059: r059?.total ?? 0,
    R060: r060?.total ?? 0,
    R061: r061?.total ?? 0,
    R062: r062?.total ?? 0,
  }
  return { defs, counts }
}

const casesCache = new Map<number, FlagCase[]>()

async function allCases(fy: number, modes: OcdsProcurementMode[]): Promise<FlagCase[]> {
  const cached = casesCache.get(fy)
  if (cached) return cached
  const [{ defs, counts }, register] = await Promise.all([flagSetup(fy), getAgencyRegister(fy)])
  const agencies = register.filter((a) => a.procurements > 0)
  const months = monthsCovered(fy)
  const r = rng(`04-cases-${fy}`)
  const partial = months < 12
  const cases: FlagCase[] = []

  for (const def of defs) {
    const modeCodes = def.modes.length ? def.modes : modes.map((m) => m.code)
    for (let i = 0; i < (counts[def.code] ?? 0); i++) {
      const agency = pickRandom(r, agencies)
      const likelihood = Math.max(0, Math.min(3, def.likelihood + Math.round(between(r, -1.4, 0.9))))
      const impact = Math.max(0, Math.min(3, def.impact + Math.round(between(r, -1.4, 0.9))))
      const month = Math.floor(r() * months)
      const ref = String(11_500_000 + Math.floor(r() * 450_000))
      // Older cases are further along the verification pipeline.
      const age = (months - month) / 12
      const x = r()
      const status: FlagStatus =
        x < 0.5 - age * 0.35 ? "unverified" : x < 0.72 - age * 0.2 ? "verifying" : x < 0.86 ? "verified" : x < 0.94 ? "investigating" : "dismissed"
      cases.push({
        id: `${def.code}-${fy}-${String(i + 1).padStart(4, "0")}`,
        flag: def.code,
        title: pickRandom(r, MOCK_PROJECTS),
        agency: agency.name,
        region: agency.region,
        mode: pickRandom(r, modeCodes),
        amount: Math.round(between(r, 0.3, 1) ** 3 * 4.5e7 + 2e5),
        detectedOn: `${fy}-${String(month + 1).padStart(2, "0")}-${String(1 + Math.floor(r() * 28)).padStart(2, "0")}`,
        likelihood,
        impact,
        severity: severityOf(likelihood, impact),
        status: partial ? status : status === "unverified" ? "verified" : status,
        source: def.href
          ? { label: `${def.code} list`, url: `${def.href(fy)}&q=${ref}`, external: false }
          : { label: `Bid notice ${ref}`, url: noticeUrl(ref), external: true },
      })
    }
  }
  casesCache.set(fy, cases)
  return cases
}

// ---------------------------------------------------------------------------
// 04-A Red flag tracker
// ---------------------------------------------------------------------------

export type FlagSummary = {
  defs: (FlagDef & { count: number; bySeverity: Record<Severity, number> })[]
  cases: FlagCase[]
  total: number
  highRisk: number
  investigating: number
  agencies: number
  value: number
  /** matrix[impactIndex][likelihoodIndex] — impact rows highest first. */
  matrix: number[][]
  statusCounts: Record<FlagStatus, number>
  trend: { month: string; critical: number | null; high: number | null; medium: number | null; low: number | null }[]
  byRegion: { code: string; cases: number; per100: number }[]
}

export async function getFlagSummary(f: ObserversFilter): Promise<FlagSummary> {
  const modes = await getProcurementModes()
  const [{ defs }, all, notices] = await Promise.all([
    flagSetup(f.fiscalYear),
    allCases(f.fiscalYear, modes),
    getBidNoticesPublished(f.fiscalYear, f.mode),
  ])
  const scoped = all.filter((c) => (!f.region || c.region === f.region) && (!f.mode || c.mode === f.mode))
  const cases = scoped.filter((c) => !f.status || c.status === f.status)

  const matrix = IMPACT.map((_, row) =>
    LIKELIHOOD.map((__, col) => cases.filter((c) => 3 - c.impact === row && c.likelihood === col).length)
  )
  const months = monthsCovered(f.fiscalYear)
  const sev = (list: FlagCase[]) =>
    ({
      critical: list.filter((c) => c.severity === "critical").length,
      high: list.filter((c) => c.severity === "high").length,
      medium: list.filter((c) => c.severity === "medium").length,
      low: list.filter((c) => c.severity === "low").length,
    }) as Record<Severity, number>

  const regionCases = all.filter((c) => (!f.mode || c.mode === f.mode) && (!f.status || c.status === f.status))
  const nationalNotices = notices?.count ?? 1

  return {
    defs: defs
      .filter((d) => !f.mode || !d.modes.length || d.modes.includes(f.mode))
      .map((d) => {
        const mine = cases.filter((c) => c.flag === d.code)
        return { ...d, count: mine.length, bySeverity: sev(mine) }
      }),
    cases: cases.sort((a, b) => b.detectedOn.localeCompare(a.detectedOn)),
    total: cases.length,
    highRisk: cases.filter((c) => c.severity === "critical" || c.severity === "high").length,
    investigating: cases.filter((c) => c.status === "investigating").length,
    agencies: new Set(cases.map((c) => c.agency)).size,
    value: cases.reduce((s, c) => s + c.amount, 0),
    matrix,
    statusCounts: Object.fromEntries(
      FLAG_STATUSES.map((s) => [s.code, scoped.filter((c) => c.status === s.code).length])
    ) as Record<FlagStatus, number>,
    trend: MONTHS.map((month, i) => {
      if (i >= months) return { month, critical: null, high: null, medium: null, low: null }
      return { month, ...sev(cases.filter((c) => Number(c.detectedOn.slice(5, 7)) === i + 1)) }
    }),
    byRegion: Object.entries(REGION_WEIGHTS)
      .map(([code, w]) => {
        const n = regionCases.filter((c) => c.region === code).length
        return { code, cases: n, per100: (n / Math.max(1, nationalNotices * w)) * 100 }
      })
      .sort((a, b) => b.per100 - a.per100),
  }
}

// ---------------------------------------------------------------------------
// Cross-agency price disparity for identical items
// ---------------------------------------------------------------------------

export type PriceItem = {
  item: string
  unit: string
  median: number
  min: number
  max: number
  agencies: number
  /** max / median − 1 */
  disparity: number
  highest: { agency: string; price: number }[]
}

const ITEMS: [string, string, number][] = [
  ["Bond paper, A4, 80 gsm", "ream", 245],
  ["Ethyl alcohol, 70%, 500 mL", "bottle", 88],
  ["Ballpoint pen, black, 0.5 mm", "piece", 9],
  ["Toner cartridge, laser, black", "piece", 3_450],
  ["Laptop, 14-inch, 8 GB RAM, 512 GB SSD", "unit", 42_000],
  ["Surgical face mask", "box of 50", 145],
  ["Paracetamol 500 mg", "tablet", 1.8],
  ["Monobloc chair", "piece", 420],
]

export async function getPriceDisparity(f: ObserversFilter): Promise<PriceItem[]> {
  const register = (await getAgencyRegister(f.fiscalYear)).filter(
    (a) => a.procurements > 0 && (!f.region || a.region === f.region)
  )
  return ITEMS.map(([item, unit, base]) => {
    const r = rng(`04-price-${item}-${filterKey(f)}`)
    const buyers = Array.from({ length: Math.min(register.length, 20 + Math.floor(r() * 40)) }, () => {
      const a = pickRandom(r, register)
      const outlier = r() < 0.08
      return { agency: a.name, price: base * (outlier ? between(r, 1.5, 2.6) : between(r, 0.82, 1.25)) }
    })
    const prices = buyers.map((b) => b.price).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)] ?? base
    const max = prices.at(-1) ?? base
    return {
      item,
      unit,
      median,
      min: prices[0] ?? base,
      max,
      agencies: new Set(buyers.map((b) => b.agency)).size,
      disparity: max / median - 1,
      highest: [...buyers].sort((a, b) => b.price - a.price).slice(0, 3),
    }
  }).sort((a, b) => b.disparity - a.disparity)
}

// ---------------------------------------------------------------------------
// 04-B Agency compliance monitor
// ---------------------------------------------------------------------------

/** Composite score weights — compliance criteria to be defined in the FSD. */
export const COMPLIANCE_WEIGHTS = { timeliness: 0.4, completeness: 0.4, accuracy: 0.2 }
export const COMPLETENESS_FLOOR = 0.6

export type AgencyCompliance = {
  id: string
  name: string
  region: string
  timeliness: number
  completeness: number
  accuracy: number
  composite: number
  /** Context */
  procurements: number
  mainMode: string
  abc: number
  staff: number
}

export type ComplianceSummary = {
  averages: { timeliness: number; completeness: number; accuracy: number; composite: number }
  agencies: number
  nonCompliant: AgencyCompliance[]
  pmr: { semester: string; onTime: number; late: number; missing: number; notDue: boolean }[]
  awards: { month: string; within: number | null; over: number | null }[]
  awardsWithin60: number
}

const statusScore = (s: AgencyRecord["pmr1"]) => (s === "on-time" ? 1 : s === "late" ? 0.5 : s === "missing" ? 0 : null)

export async function getCompliance(f: ObserversFilter): Promise<ComplianceSummary> {
  const modes = await getProcurementModes()
  const register = (await getAgencyRegister(f.fiscalYear)).filter(
    (a) => a.procurements > 0 && (!f.region || a.region === f.region)
  )

  const scored = register
    .map((a) => {
      const r = rng(`04-comp-${a.id}-${f.fiscalYear}`)
      const parts = [statusScore(a.app), statusScore(a.pmr1), statusScore(a.pmr2), statusScore(a.appCse)].filter(
        (x): x is number => x !== null
      )
      const timeliness = parts.reduce((s, x) => s + x, 0) / Math.max(1, parts.length)
      const completeness = Math.min(1, Math.max(0.2, between(r, 0.45, 1.05) ** 0.6))
      const accuracy = Math.min(1, Math.max(0.3, between(r, 0.6, 1.02)))
      const mainMode = pickRandom(r, ["public-bidding", "small-value", "small-value", "shopping", "negotiated"])
      return {
        id: a.id,
        name: a.name,
        region: a.region,
        timeliness,
        completeness,
        accuracy,
        composite:
          timeliness * COMPLIANCE_WEIGHTS.timeliness +
          completeness * COMPLIANCE_WEIGHTS.completeness +
          accuracy * COMPLIANCE_WEIGHTS.accuracy,
        procurements: a.procurements,
        mainMode: modes.find((m) => m.code === mainMode)?.name ?? mainMode,
        mainModeCode: mainMode,
        abc: a.budget,
        staff: Math.max(1, Math.round(Math.log10(Math.max(1e7, a.budget)) * between(r, 0.6, 1.6) - 4)),
        pmr1: a.pmr1,
        pmr2: a.pmr2,
      }
    })
    .filter((a) => !f.mode || a.mainModeCode === f.mode)

  const avg = (k: "timeliness" | "completeness" | "accuracy" | "composite") =>
    scored.reduce((s, a) => s + a[k], 0) / Math.max(1, scored.length)

  const pmrCounts = (key: "pmr1" | "pmr2", semester: string) => ({
    semester,
    onTime: scored.filter((a) => a[key] === "on-time").length,
    late: scored.filter((a) => a[key] === "late").length,
    missing: scored.filter((a) => a[key] === "missing").length,
    notDue: scored.every((a) => a[key] === "not-due"),
  })

  const r = rng(`04-awards-${filterKey(f)}`)
  const months = monthsCovered(f.fiscalYear)
  const notices = (await getBidNoticesPublished(f.fiscalYear, f.mode))?.count ?? 0
  const perMonth = (notices * (f.region ? (REGION_WEIGHTS[f.region] ?? 0) : 1) * 1.1) / 12
  const awards = MONTHS.map((month, i) => {
    if (i >= months) return { month, within: null, over: null }
    const total = Math.round(perMonth * between(r, 0.8, 1.2))
    const within = Math.round(total * between(r, 0.74, 0.9))
    return { month, within, over: total - within }
  })
  const within = awards.reduce((s, a) => s + (a.within ?? 0), 0)
  const totalAwards = awards.reduce((s, a) => s + (a.within ?? 0) + (a.over ?? 0), 0)

  return {
    averages: { timeliness: avg("timeliness"), completeness: avg("completeness"), accuracy: avg("accuracy"), composite: avg("composite") },
    agencies: scored.length,
    nonCompliant: scored
      .filter((a) => a.completeness < COMPLETENESS_FLOOR || a.composite < COMPLETENESS_FLOOR)
      .sort((a, b) => a.composite - b.composite)
      .map(({ id, name, region, timeliness, completeness, accuracy, composite, procurements, mainMode, abc, staff }) => ({
        id, name, region, timeliness, completeness, accuracy, composite, procurements, mainMode, abc, staff,
      })),
    pmr: [pmrCounts("pmr1", "1st semester"), pmrCounts("pmr2", "2nd semester")],
    awards,
    awardsWithin60: totalAwards ? within / totalAwards : 0,
  }
}

// ---------------------------------------------------------------------------
// 04-C Award concentration
// ---------------------------------------------------------------------------

export type Concentration = {
  /** Share of agencies where one supplier won more than half of the contract value. */
  concentratedShare: number
  top: { agency: string; supplier: string; share: number; contracts: number }[]
}

export async function getAwardConcentration(f: ObserversFilter): Promise<Concentration> {
  const register = (await getAgencyRegister(f.fiscalYear)).filter(
    (a) => a.procurements > 0 && (!f.region || a.region === f.region)
  )
  const r = rng(`04-conc-${filterKey(f)}`)
  const rows = register.map((a) => ({
    agency: a.name,
    supplier: pickRandom(r, MOCK_AWARDEES),
    share: Math.min(0.97, between(r, 0.08, 1) ** 1.8 + 0.05),
    contracts: 2 + Math.floor(r() * Math.min(40, a.procurements)),
  }))
  return {
    concentratedShare: rows.filter((x) => x.share > 0.5).length / Math.max(1, rows.length),
    top: rows.sort((a, b) => b.share - a.share).slice(0, 6),
  }
}
