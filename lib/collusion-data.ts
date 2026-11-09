/**
 * Collusion Monitoring (module 07, BRD 15.3.7) — bidder network analysis,
 * bid rotation and price fixing monitor.
 *
 * Seeded mock: a supplier network with a few tightly linked groups (each pair
 * carrying collusion signals) inside a wider web of ordinary co-bidding. The
 * same groups drive the bid-rotation monitor, so both views agree.
 * Backend contracts to replace it:
 *   GET /api/collusion/network?from=&to=&region=&agencyType=    → BidderNetwork
 *   GET /api/collusion/rotation?from=&to=&region=&agencyType=   → RotationMonitor
 *
 * SAMPLE DATA. Supplier names are fictional. Narrative findings stay internal;
 * graphs may be shown publicly only where approved.
 */

import { between, pickRandom, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { AGENCY_TYPES, type AgencyType, getAgencyRegister } from "@/lib/government-agency-data"

// ---------------------------------------------------------------------------
// Filters: date range, region, agency type
// ---------------------------------------------------------------------------

export const COLLUSION_YEARS = [2026, 2025, 2024, 2023, 2022]

export type CollusionFilter = {
  fromYear: number
  toYear: number
  region: string | null
  agencyType: AgencyType | null
}

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseCollusionFilter(params: Params, regionCodes: string[]): CollusionFilter {
  const year = (v: string | undefined, fallback: number) => (COLLUSION_YEARS.includes(Number(v)) ? Number(v) : fallback)
  let fromYear = year(first(params.from), 2024)
  let toYear = year(first(params.to), 2026)
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear]
  const region = first(params.region)
  const type = first(params.agencyType)
  return {
    fromYear,
    toYear,
    region: region && regionCodes.includes(region) ? region : null,
    agencyType: AGENCY_TYPES.some((t) => t.code === type) ? (type as AgencyType) : null,
  }
}

const key = (f: CollusionFilter) => `${f.fromYear}-${f.toYear}-${f.region}-${f.agencyType}`

// ---------------------------------------------------------------------------
// Signals and risk
// ---------------------------------------------------------------------------

export type SignalKey = "address" | "contact" | "rotation" | "metadata" | "price" | "subcontract"

export const SIGNALS: { key: SignalKey; label: string; description: string }[] = [
  { key: "address", label: "Shared address", description: "Both suppliers registered the same business address" },
  { key: "contact", label: "Shared contact details", description: "Same phone number, e-mail or authorized representative" },
  { key: "rotation", label: "Alternating win-loss", description: "The pair take turns winning tenders they both bid on" },
  { key: "metadata", label: "Identical document metadata", description: "Bid files share author, creation time or template metadata" },
  { key: "price", label: "Bids within 0.5%", description: "Their bid prices are repeatedly within 0.5% of each other" },
  { key: "subcontract", label: "Regular mutual subcontracting", description: "The winner regularly subcontracts work to the loser" },
]

export type RiskBand = "high" | "medium" | "low"
export const bandOf = (score: number): RiskBand => (score >= 60 ? "high" : score >= 35 ? "medium" : "low")

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export type NetworkSupplier = {
  id: string
  name: string
  region: string
  tenders: number
  wins: number
  risk: number
  band: RiskBand
}

export type NetworkEdge = {
  source: string
  target: string
  /** Tenders both suppliers bid on in the range */
  sharedTenders: number
  signals: SignalKey[]
  risk: number
}

export type BidderNetwork = {
  suppliers: NetworkSupplier[]
  edges: NetworkEdge[]
  signalCounts: { key: SignalKey; label: string; pairs: number }[]
  flaggedPairs: number
}

const PREFIXES = ["Bayanihan", "Mabuhay", "Silangan", "Kalayaan", "Tanglaw", "Sampaguita", "Malaya", "Dakila", "Masagana", "Liwayway", "Habagat", "Amihan", "Bituin", "Hiraya", "Kaagapay", "Tala", "Alon", "Banaag", "Lakan", "Diwa", "Sinag", "Ligaya"]
const SUFFIXES = ["Trading", "Enterprises", "Construction", "Builders", "Supply", "Medical Supply", "IT Solutions", "General Merchandise", "Engineering Services", "Agri Ventures"]

type BaseSupplier = { id: string; name: string; region: string; activity: number; group: number | null }
type BaseEdge = { a: number; b: number; shared: number; signals: SignalKey[] }

/** Groups (index lists into SUPPLIERS) that behave like cartels. */
const GROUP_SIZES = [4, 3, 5, 3, 4]

const BASE = (() => {
  const r = rng("07-network")
  const names = new Set<string>()
  while (names.size < 46) names.add(`${pickRandom(r, PREFIXES)} ${pickRandom(r, SUFFIXES)}`)
  const regions = Object.keys(REGION_WEIGHTS)
  const suppliers: BaseSupplier[] = [...names].map((name, i) => ({
    id: `SUP-${String(20400 + i * 53)}`,
    name,
    region: regions[Math.floor(r() ** 1.6 * regions.length)],
    activity: between(r, 0.3, 1),
    group: null,
  }))

  const edges: BaseEdge[] = []
  const seen = new Set<string>()
  const add = (a: number, b: number, shared: number, signals: SignalKey[]) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`
    if (a === b || seen.has(k)) return
    seen.add(k)
    edges.push({ a, b, shared, signals })
  }

  // Cartel-like groups: same region, dense links, several signals each.
  let next = 0
  GROUP_SIZES.forEach((size, g) => {
    const members = Array.from({ length: size }, (_, k) => next + k)
    next += size
    const region = suppliers[members[0]].region
    for (const m of members) {
      suppliers[m].group = g
      suppliers[m].region = region
      suppliers[m].activity = between(r, 0.7, 1)
    }
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        const pool = [...SIGNALS.map((s) => s.key)]
        const signals: SignalKey[] = ["rotation", "price"].filter(() => r() < 0.8) as SignalKey[]
        const extra = 1 + Math.floor(r() * 2)
        for (let e = 0; e < extra; e++) {
          const s = pickRandom(r, pool)
          if (!signals.includes(s)) signals.push(s)
        }
        add(members[i], members[j], Math.round(between(r, 9, 30)), signals)
      }
    }
  })

  // Ordinary co-bidding: sparse, mostly signal-free.
  for (let k = 0; k < 70; k++) {
    const a = Math.floor(r() * suppliers.length)
    const b = Math.floor(r() * suppliers.length)
    const signals: SignalKey[] = r() < 0.18 ? [pickRandom(r, SIGNALS).key] : []
    add(a, b, Math.round(between(r, 1, 8)), signals)
  }
  return { suppliers, edges }
})()

const edgeRisk = (e: { shared: number; signals: SignalKey[] }) =>
  Math.min(100, Math.round(e.signals.length * 21 + Math.min(e.shared, 30) * 0.9))

export async function getBidderNetwork(f: CollusionFilter): Promise<BidderNetwork> {
  const years = f.toYear - f.fromYear + 1
  const r = rng(`07-net-${key(f)}`)
  const typeFactor = f.agencyType ? between(rng(`07-type-${f.agencyType}`), 0.35, 0.7) : 1

  const inScope = new Set(
    BASE.suppliers.map((s, i) => (!f.region || s.region === f.region ? i : -1)).filter((i) => i >= 0)
  )
  const edges = BASE.edges
    .filter((e) => inScope.has(e.a) && inScope.has(e.b))
    .map((e) => ({ ...e, shared: Math.round(e.shared * (years / 3) * typeFactor * between(r, 0.8, 1.2)) }))
    .filter((e) => e.shared > 0)

  const connected = new Set(edges.flatMap((e) => [e.a, e.b]))
  const suppliers = [...connected].map((i) => {
    const s = BASE.suppliers[i]
    const mine = edges.filter((e) => e.a === i || e.b === i)
    const risks = mine.map(edgeRisk)
    const risk = Math.round(Math.max(...risks) * 0.7 + (risks.reduce((a, b) => a + b, 0) / risks.length) * 0.3)
    const tenders = Math.round(s.activity * 40 * years * typeFactor * between(r, 0.8, 1.2)) + mine.reduce((a, e) => a + e.shared, 0)
    return {
      id: s.id,
      name: s.name,
      region: s.region,
      tenders,
      wins: Math.round(tenders * between(r, 0.12, 0.35)),
      risk,
      band: bandOf(risk),
    }
  })

  const out: NetworkEdge[] = edges.map((e) => ({
    source: BASE.suppliers[e.a].id,
    target: BASE.suppliers[e.b].id,
    sharedTenders: e.shared,
    signals: e.signals,
    risk: edgeRisk(e),
  }))

  return {
    suppliers: suppliers.sort((a, b) => b.risk - a.risk),
    edges: out,
    signalCounts: SIGNALS.map((s) => ({ key: s.key, label: s.label, pairs: out.filter((e) => e.signals.includes(s.key)).length })),
    flaggedPairs: out.filter((e) => e.signals.length > 0).length,
  }
}

// ---------------------------------------------------------------------------
// 07-B Bid rotation and price fixing monitor (per agency)
// ---------------------------------------------------------------------------

export type RotationCase = {
  id: string
  agency: string
  agencyType: AgencyType
  region: string
  suppliers: string[]
  /** Winner of each tender in date order — index into `suppliers` */
  sequence: number[]
  tenders: number
  /** Complete rotation cycles observed */
  cycles: number
  coverBids: number
  complementaryBids: number
  /** Tenders where the losing bids sat within ±0.5% of the winning bid */
  clustered: number
  /** Herfindahl–Hirschman Index of the agency's market, 0–10,000 */
  hhi: number
  risk: number
}

export type RotationMonitor = {
  cases: RotationCase[]
  overallRisk: number
  patterns: { label: string; value: number }[]
}

export async function getRotationMonitor(f: CollusionFilter): Promise<RotationMonitor> {
  const years = f.toYear - f.fromYear + 1
  const register = (await getAgencyRegister(f.toYear)).filter(
    (a) => a.procurements > 20 && (!f.agencyType || a.type === f.agencyType)
  )
  const r = rng(`07-rot-${key(f)}`)

  // One case per supplier group (strong), plus a few weaker patterns.
  const groups = GROUP_SIZES.map((_, g) => BASE.suppliers.filter((s) => s.group === g))
  const weak = Array.from({ length: 6 }, (_, k) => {
    const wr = rng(`07-weak-${k}`)
    const size = 2 + Math.floor(wr() * 2)
    const start = 20 + Math.floor(wr() * (BASE.suppliers.length - 24))
    return BASE.suppliers.slice(start, start + size).map((s) => ({ ...s, region: BASE.suppliers[start].region }))
  })

  const cases = [...groups.map((g) => ({ members: g, strong: true })), ...weak.map((g) => ({ members: g, strong: false }))]
    .filter(({ members }) => !f.region || members[0].region === f.region)
    .map(({ members, strong }, i) => {
      const local = register.filter((a) => a.region === members[0].region)
      const agency = pickRandom(r, local.length ? local : register)
      const n = members.length
      const tenders = Math.round((strong ? between(r, 8, 14) : between(r, 4, 9)) * years)
      // Rotation: winners cycle through the group; weak cases are noisier.
      const sequence = Array.from({ length: tenders }, (_, t) =>
        r() < (strong ? 0.88 : 0.5) ? t % n : Math.floor(r() * n)
      )
      let cycles = 0
      for (let t = 0; t + n <= sequence.length; t += n) {
        if (new Set(sequence.slice(t, t + n)).size === n) cycles++
      }
      // Share of the agency's awards won by the group.
      const groupShare = strong ? between(r, 0.8, 0.97) : between(r, 0.25, 0.5)
      const wins = members.map((_, k) => sequence.filter((x) => x === k).length / Math.max(1, tenders))
      const hhi = Math.round(
        wins.reduce((s, w) => s + (w * groupShare * 100) ** 2, 0) + (1 - groupShare) * 100 * 6
      )
      const coverBids = Math.round(tenders * (n - 1) * (strong ? between(r, 0.45, 0.7) : between(r, 0.1, 0.3)))
      const complementaryBids = Math.round(tenders * (strong ? between(r, 0.3, 0.6) : between(r, 0.05, 0.2)))
      const clustered = Math.round(tenders * (strong ? between(r, 0.35, 0.7) : between(r, 0.05, 0.25)))
      const risk = Math.min(
        100,
        Math.round(
          (cycles / Math.max(1, Math.floor(tenders / n))) * 45 +
            (clustered / Math.max(1, tenders)) * 30 +
            (complementaryBids / Math.max(1, tenders)) * 15 +
            Math.min(1, hhi / 2500) * 20
        )
      )
      return {
        id: `ROT-${String(i + 1).padStart(3, "0")}`,
        agency: agency?.name ?? "—",
        agencyType: agency?.type ?? "lgu",
        region: members[0].region,
        suppliers: members.map((m) => m.name),
        sequence,
        tenders,
        cycles,
        coverBids,
        complementaryBids,
        clustered,
        hhi,
        risk,
      }
    })
    .sort((a, b) => b.risk - a.risk)

  const weightSum = cases.reduce((s, c) => s + c.tenders, 0)
  return {
    cases,
    overallRisk: weightSum ? cases.reduce((s, c) => s + c.risk * c.tenders, 0) / weightSum / 100 : 0,
    patterns: [
      { label: "Cover bidding", value: cases.reduce((s, c) => s + c.coverBids, 0) },
      { label: "Complementary bidding", value: cases.reduce((s, c) => s + c.complementaryBids, 0) },
      { label: "Prices within ±0.5%", value: cases.reduce((s, c) => s + c.clustered, 0) },
      { label: "Rotation cycles", value: cases.reduce((s, c) => s + c.cycles, 0) },
    ],
  }
}
