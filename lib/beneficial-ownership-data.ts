/**
 * Beneficial Ownership (module 08, BRD 15.3.8) — BO registry, linked entities,
 * shell company indicators and conflict-of-interest screening.
 *
 * Seeded mock. Natural persons (owners, officials, relatives) appear only as
 * masked initials; full identities stay in the internal registry.
 * Backend contracts to replace it:
 *   GET /api/bo/summary?fy=&region=&source=                  → BoSummary
 *   GET /api/bo/entities?fy=&region=&source=&flag=           → BoEntity[]  (map, shell, COI views)
 *
 * Sources: SEC GIS, DTI, BIR and PCAB are under coordination; conflict-of-interest
 * checks use the CSC Personal Data Sheet (not PSA). SALN linkage is recorded now
 * and used once CSC centralized SALN data exists.
 * SAMPLE DATA — supplier names are fictional.
 */

import { between, pickRandom, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { getAgencyRegister } from "@/lib/government-agency-data"

// ---------------------------------------------------------------------------
// Sources and filters
// ---------------------------------------------------------------------------

export type SourceCode = "sec" | "dti" | "bir" | "pcab" | "csc"

export const BO_SOURCES: { code: SourceCode; name: string; covers: string; status: "connected" | "coordination" }[] = [
  { code: "sec", name: "SEC GIS", covers: "Corporations and partnerships: stockholders and directors", status: "coordination" },
  { code: "dti", name: "DTI", covers: "Sole proprietorships: registered owner", status: "coordination" },
  { code: "bir", name: "BIR", covers: "Taxpayer registration and filings", status: "coordination" },
  { code: "pcab", name: "PCAB", covers: "Contractor licences and authorized officers", status: "coordination" },
  { code: "csc", name: "CSC PDS", covers: "Officials' family background for conflict-of-interest checks", status: "connected" },
]

export type BoFlag = "coi" | "shell" | "linked"
export const BO_FLAGS: { code: BoFlag; name: string }[] = [
  { code: "coi", name: "Conflict of interest" },
  { code: "shell", name: "Possible shell company" },
  { code: "linked", name: "Has linked entities" },
]

export type BoFilter = { fiscalYear: number; region: string | null; source: SourceCode | null; flag: BoFlag | null }

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseBoFilter(params: Params, fiscalYear: number, regionCodes: string[]): BoFilter {
  const region = first(params.region)
  const source = first(params.source)
  const flag = first(params.flag)
  return {
    fiscalYear,
    region: region && regionCodes.includes(region) ? region : null,
    source: BO_SOURCES.some((s) => s.code === source) ? (source as SourceCode) : null,
    flag: BO_FLAGS.some((x) => x.code === flag) ? (flag as BoFlag) : null,
  }
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export type Relationship = "Self" | "Spouse" | "Parent" | "Child" | "Sibling" | "In-law"
export type CoiStatus = "review" | "cleared" | "referred"

export const COI_STATUS: Record<CoiStatus, string> = {
  review: "For review",
  cleared: "Cleared",
  referred: "Referred",
}

export type Person = { id: string; initials: string }

export type BoOwner = Person & {
  role: "Owner" | "Director" | "Owner and director"
  share: number | null
  /** Other companies this person owns or directs. */
  otherCompanies: { name: string; share: number | null }[]
}

export type CoiMatch = {
  owner: Person
  official: Person & { position: string; agency: string }
  relationship: Relationship
  /** Awards the supplier won from the official's agency. */
  awards: number
  awardValue: number
  status: CoiStatus
  saln: "recorded" | "pending"
}

export type ShellIndicator =
  | "Shared address with many companies"
  | "No PCAB licence for works contracts"
  | "No BIR filings in the last 2 years"
  | "Incorporated shortly before first bid"
  | "Nominee or common directors"

export type BoEntity = {
  id: string
  name: string
  region: string
  form: "Corporation" | "Partnership" | "Sole proprietorship"
  sources: SourceCode[]
  verified: boolean
  owners: BoOwner[]
  coi: CoiMatch[]
  shell: ShellIndicator[]
}

const PREFIXES = ["Bayanihan", "Mabuhay", "Silangan", "Kalayaan", "Tanglaw", "Sampaguita", "Malaya", "Dakila", "Masagana", "Liwayway", "Habagat", "Amihan", "Bituin", "Hiraya", "Kaagapay", "Tala", "Alon", "Banaag", "Lakan", "Diwa", "Sinag", "Ligaya", "Marikit", "Dalisay"]
const SUFFIXES = ["Trading", "Enterprises", "Construction", "Builders", "Supply", "Medical Supply", "IT Solutions", "Holdings", "Engineering Services", "Agri Ventures", "Realty", "Logistics"]
const LETTERS = "ABCDEFGHJLMNPRSTV"
const POSITIONS = ["Mayor", "Vice Mayor", "Municipal Councilor", "Provincial Board Member", "Barangay Captain", "Regional Director", "Division Chief", "BAC Member", "Head of Procuring Entity", "Budget Officer"]
const RELATIONS: Relationship[] = ["Spouse", "Parent", "Child", "Sibling", "In-law", "Self"]
const SHELL: ShellIndicator[] = [
  "Shared address with many companies",
  "No PCAB licence for works contracts",
  "No BIR filings in the last 2 years",
  "Incorporated shortly before first bid",
  "Nominee or common directors",
]

const initials = (r: () => number) =>
  `${pickRandom(r, [...LETTERS])}. ${pickRandom(r, [...LETTERS])}. ${pickRandom(r, [...LETTERS])}.`

const entityCache = new Map<number, BoEntity[]>()

async function allEntities(fy: number): Promise<BoEntity[]> {
  const cached = entityCache.get(fy)
  if (cached) return cached
  const agencies = (await getAgencyRegister(fy)).filter((a) => a.procurements > 0)
  const r = rng("08-entities")
  const names = new Set<string>()
  while (names.size < 70) names.add(`${pickRandom(r, PREFIXES)} ${pickRandom(r, SUFFIXES)}`)
  const companyNames = [...names]
  const regions = Object.keys(REGION_WEIGHTS)

  // A pool of people, some of whom own several companies (linked entities).
  const people: Person[] = Array.from({ length: 90 }, (_, i) => ({ id: `P-${String(i + 1).padStart(4, "0")}`, initials: initials(r) }))
  const holdings = new Map<string, string[]>()

  const entities: BoEntity[] = companyNames.slice(0, 48).map((name, i) => {
    const form = r() < 0.55 ? "Corporation" : r() < 0.7 ? "Partnership" : "Sole proprietorship"
    const ownerCount = form === "Sole proprietorship" ? 1 : 2 + Math.floor(r() * 3)
    let remaining = 100
    const owners: BoOwner[] = Array.from({ length: ownerCount }, (_, k) => {
      // Re-use a small set of people so some own several companies.
      const person = r() < 0.35 ? people[Math.floor(r() * 12)] : pickRandom(r, people)
      const share = form === "Sole proprietorship" ? 100 : k === ownerCount - 1 ? remaining : Math.round(between(r, 10, remaining * 0.7))
      remaining -= share
      holdings.set(person.id, [...(holdings.get(person.id) ?? []), name])
      const role: BoOwner["role"] = form === "Sole proprietorship" ? "Owner" : r() < 0.3 ? "Director" : r() < 0.5 ? "Owner and director" : "Owner"
      return { ...person, role, share: role === "Director" ? null : share, otherCompanies: [] }
    })
    const sources: SourceCode[] = (form === "Sole proprietorship" ? ["dti", "bir"] : ["sec", "bir"]) as SourceCode[]
    if (r() < 0.3) sources.push("pcab")

    const coi: CoiMatch[] =
      r() < 0.24
        ? [
            (() => {
              const owner = pickRandom(r, owners)
              const agency = pickRandom(r, agencies)
              const relationship = pickRandom(r, RELATIONS)
              const x = r()
              return {
                owner: { id: owner.id, initials: owner.initials },
                official: {
                  id: `O-${String(i + 1).padStart(4, "0")}`,
                  initials: relationship === "Self" ? owner.initials : initials(r),
                  position: pickRandom(r, POSITIONS),
                  agency: agency.name,
                },
                relationship,
                awards: 1 + Math.floor(r() * 9),
                awardValue: Math.round(between(r, 0.4, 1) ** 2 * 4.8e7 + 3e5),
                status: (x < 0.55 ? "review" : x < 0.85 ? "cleared" : "referred") as CoiStatus,
                saln: (r() < 0.4 ? "recorded" : "pending") as "recorded" | "pending",
              }
            })(),
          ]
        : []

    const shell = r() < 0.2 ? SHELL.filter(() => r() < 0.45) : []
    return {
      id: `SUP-${String(30100 + i * 41)}`,
      name,
      region: regions[Math.floor(r() ** 1.5 * regions.length)],
      form,
      sources: [...sources, ...(coi.length ? (["csc"] as SourceCode[]) : [])],
      verified: r() < 0.72,
      owners,
      coi,
      shell: shell.length ? shell : [],
    }
  })

  // Fill in each owner's other companies (internal set + a few outside the sample).
  for (const e of entities) {
    for (const o of e.owners) {
      const others = (holdings.get(o.id) ?? []).filter((n) => n !== e.name)
      const outside = r() < 0.15 ? [companyNames[48 + Math.floor(r() * 22)]] : []
      o.otherCompanies = [...new Set([...others, ...outside])].map((name) => ({ name, share: r() < 0.7 ? Math.round(between(r, 10, 80)) : null }))
    }
  }
  entityCache.set(fy, entities)
  return entities
}

const hasFlag = (e: BoEntity, flag: BoFlag) =>
  flag === "coi" ? e.coi.length > 0 : flag === "shell" ? e.shell.length > 0 : e.owners.some((o) => o.otherCompanies.length > 0)

/** Entities for the map and tables, filtered by region, source and flag. */
export async function getBoEntities(f: BoFilter): Promise<BoEntity[]> {
  return (await allEntities(f.fiscalYear)).filter(
    (e) =>
      (!f.region || e.region === f.region) &&
      (!f.source || e.sources.includes(f.source)) &&
      (!f.flag || hasFlag(e, f.flag))
  )
}

// ---------------------------------------------------------------------------
// Summary (national figures, scaled by filters)
// ---------------------------------------------------------------------------

const NATIONAL: Record<number, { profiled: number; verified: number; linked: number; coi: number }> = {
  2026: { profiled: 15730, verified: 11284, linked: 6942, coi: 143 },
  2025: { profiled: 14210, verified: 9530, linked: 6105, coi: 118 },
}

export type BoSummary = {
  profiled: number
  verified: number
  linkedEntities: number
  coiFlags: number
  coiForReview: number
  shellSuspects: number
  sourceCoverage: { code: SourceCode; share: number }[]
  saln: { recorded: number; pending: number }
  topOwners: { initials: string; companies: number }[]
}

export async function getBoSummary(f: BoFilter): Promise<BoSummary> {
  const all = await allEntities(f.fiscalYear)
  const scoped = all.filter((e) => (!f.region || e.region === f.region) && (!f.source || e.sources.includes(f.source)))
  const n = NATIONAL[f.fiscalYear] ?? NATIONAL[2026]
  const regionShare = f.region ? (REGION_WEIGHTS[f.region] ?? 0) : 1
  const sourceShare = f.source ? scoped.length / Math.max(1, all.filter((e) => !f.region || e.region === f.region).length) : 1
  const scale = regionShare * sourceShare
  const sampleShare = (pred: (e: BoEntity) => boolean) => scoped.filter(pred).length / Math.max(1, scoped.length)
  const coiMatches = scoped.flatMap((e) => e.coi)

  // People who own or direct the most companies (linked entity mapping).
  const counts = new Map<string, { initials: string; companies: Set<string> }>()
  for (const e of scoped) {
    for (const o of e.owners) {
      const c = counts.get(o.id) ?? { initials: o.initials, companies: new Set<string>() }
      c.companies.add(e.name)
      o.otherCompanies.forEach((x) => c.companies.add(x.name))
      counts.set(o.id, c)
    }
  }

  return {
    profiled: Math.round(n.profiled * scale),
    verified: Math.round(n.verified * scale),
    linkedEntities: Math.round(n.linked * scale),
    coiFlags: Math.round(n.coi * scale),
    coiForReview: Math.round(n.coi * scale * (coiMatches.filter((c) => c.status === "review").length / Math.max(1, coiMatches.length))),
    shellSuspects: Math.round(n.profiled * scale * sampleShare((e) => e.shell.length >= 2) * 0.15),
    sourceCoverage: BO_SOURCES.map((s) => ({ code: s.code, share: sampleShare((e) => e.sources.includes(s.code)) })),
    saln: {
      recorded: coiMatches.filter((c) => c.saln === "recorded").length,
      pending: coiMatches.filter((c) => c.saln === "pending").length,
    },
    topOwners: [...counts.values()]
      .map((c) => ({ initials: c.initials, companies: c.companies.size }))
      .filter((c) => c.companies > 1)
      .sort((a, b) => b.companies - a.companies)
      .slice(0, 6),
  }
}
