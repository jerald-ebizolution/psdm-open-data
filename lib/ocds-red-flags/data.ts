import { addDays, dateBefore, MOCK_AWARDEES, MOCK_ENTITIES, MOCK_PROJECTS, pick } from "@/lib/ocds-mock"
import { matchesQuery, mockPage } from "@/lib/ocds-paging"
import {
  type DecisionPeriodResponse,
  type DecisionPeriodTender,
  type FlagQuery,
  type R003Response,
  type R003Tender,
  type R059Contract,
  type R059Response,
  type R060Contract,
  type R060Response,
} from "./types"

// Dummy data shaped exactly like the backend responses. Replace each getter's
// body with a fetch, e.g. for R003:
//   const params = new URLSearchParams({ fy: String(fiscalYear), page: String(page), pageSize: String(pageSize) })
//   if (q) params.set("q", q)
//   if (modeCode) params.set("mode", modeCode)
//   const res = await fetch(`${API_URL}/ocds/red-flags/r003?${params}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as R003Response

/** Flagged rows per fiscal year in the mock. */
const TOTALS = {
  r003: { 2026: 23, 2025: 31 },
  r059: { 2026: 9, 2025: 12 },
  r060: { 2026: 31, 2025: 27 },
  r061: { 2026: 6, 2025: 8 },
  r062: { 2026: 18, 2025: 22 },
} as const satisfies Record<string, Record<number, number>>

const total = (flag: keyof typeof TOTALS, fy: number) =>
  (TOTALS[flag] as Record<number, number>)[fy]

const MINIMUM_DAYS: Record<string, number> = {
  "Public Bidding": 7,
  "Small Value Procurement": 3,
  Shopping: 3,
}
const R003_MODES = ["Public Bidding", "Small Value Procurement", "Shopping"]
const DECISION_MODES = ["Public Bidding", "Small Value Procurement", "Negotiated Procurement"]

/** Named rows (from the designs) first, then generated rows up to the year's total. */
function fill<T>(named: T[], count: number, make: (i: number) => T): T[] {
  return [...named, ...Array.from({ length: Math.max(0, count - named.length) }, (_, i) => make(i))]
}

// --- R003 ------------------------------------------------------------------

const R003_2026: R003Tender[] = [
  { bidReferenceNo: "11860092", noticeTitle: "Rehabilitation of Municipal Hall", procuringEntity: "Municipality of San Rafael de Montaña", procurementMode: "Public Bidding", publishedDate: "2026-09-03", closingDate: "2026-09-06", minimumDays: 7 },
  { bidReferenceNo: "11902214", noticeTitle: "Supply of Medical Equipment for District Hospital", procuringEntity: "District Hospital of Pinagpala", procurementMode: "Public Bidding", publishedDate: "2026-09-15", closingDate: "2026-09-19", minimumDays: 7 },
  { bidReferenceNo: "11887430", noticeTitle: "Concreting of Barangay Road, Phase 3", procuringEntity: "Municipality of Sta. Barbara del Sur", procurementMode: "Public Bidding", publishedDate: "2026-09-10", closingDate: "2026-09-15", minimumDays: 7 },
  { bidReferenceNo: "11871155", noticeTitle: "Procurement of Office Supplies", procuringEntity: "City Government of Bagong Lungsod", procurementMode: "Small Value Procurement", publishedDate: "2026-09-08", closingDate: "2026-09-09", minimumDays: 3 },
  { bidReferenceNo: "11845517", noticeTitle: "Supply of Laboratory Consumables", procuringEntity: "Northern Valley State College", procurementMode: "Shopping", publishedDate: "2026-09-01", closingDate: "2026-09-02", minimumDays: 3 },
]

function buildR003(fy: number): R003Tender[] {
  const count = total("r003", fy)
  if (!count) return []
  const named = fy === 2026 ? R003_2026 : []
  return fill(named, count, (i) => {
    const mode = pick(R003_MODES, i)
    const minimumDays = MINIMUM_DAYS[mode]
    const shortBy = i < count / 2 ? 2 : 1
    const publishedDate = dateBefore(`${fy}-08-28`, i, 4)
    return {
      bidReferenceNo: String(11_830_000 - i * 1_373),
      noticeTitle: pick(MOCK_PROJECTS, i),
      procuringEntity: pick(MOCK_ENTITIES, i + 3).name,
      procurementMode: mode,
      publishedDate,
      closingDate: addDays(publishedDate, minimumDays - shortBy),
      minimumDays,
    }
  })
}

export async function getR003({ fiscalYear, q, modeName, page, pageSize }: FlagQuery): Promise<R003Response | undefined> {
  const rows = buildR003(fiscalYear)
  if (!rows.length) return undefined
  return mockPage(
    rows.filter(
      (r) =>
        (!modeName || r.procurementMode === modeName) &&
        matchesQuery(q, r.noticeTitle, r.procuringEntity, r.bidReferenceNo)
    ),
    page,
    pageSize
  )
}

// --- R059 ------------------------------------------------------------------

type R059Mock = R059Contract & { region: string }

const R059_2026: R059Mock[] = [
  { awardReferenceNo: "AWD-2026-07-0412", projectName: "Drainage Improvement, Poblacion", procuringEntity: "Municipality of Sta. Barbara del Sur", abc: 7_800_000, contractAmount: 9_360_000, region: "Region VII" },
  { awardReferenceNo: "AWD-2026-06-0129", projectName: "Hospital Beds and Mattresses", procuringEntity: "District Hospital of Pinagpala", abc: 2_650_000, contractAmount: 2_915_000, region: "Region VI" },
  { awardReferenceNo: "AWD-2026-08-0231", projectName: "Construction of Two-Storey School Building", procuringEntity: "Provincial Government of Isla Verde", abc: 24_500_000, contractAmount: 26_180_000, region: "Region IV-B" },
  { awardReferenceNo: "AWD-2026-08-0198", projectName: "Supply of Patrol Vehicles", procuringEntity: "City Government of Maharlika Heights", abc: 18_000_000, contractAmount: 18_950_000, region: "Region XI" },
  { awardReferenceNo: "AWD-2026-07-0377", projectName: "ICT Equipment for Campus Library", procuringEntity: "Northern Valley State College", abc: 4_200_000, contractAmount: 4_390_000, region: "Region II" },
]

function buildR059(fy: number): R059Mock[] {
  const count = total("r059", fy)
  if (!count) return []
  const named = fy === 2026 ? R059_2026 : []
  const startPct = named.length ? 4 : 18
  return fill(named, count, (i) => {
    const entity = pick(MOCK_ENTITIES, i + 1)
    const overPct = Math.max(0.5, startPct - i * (named.length ? 0.8 : 1.4))
    const abc = 1_500_000 + ((i * 1_300_000) % 9_000_000)
    return {
      awardReferenceNo: `AWD-${fy}-0${5 + (i % 4)}-0${String(500 + i * 17).padStart(3, "0")}`,
      projectName: pick(MOCK_PROJECTS, i + 2),
      procuringEntity: entity.name,
      region: entity.region,
      abc,
      contractAmount: Math.round((abc * (1 + overPct / 100)) / 1000) * 1000,
    }
  })
}

export async function getR059({ fiscalYear, q, regionName, page, pageSize }: FlagQuery): Promise<R059Response | undefined> {
  const rows = buildR059(fiscalYear)
  if (!rows.length) return undefined
  const result = mockPage(
    rows.filter(
      (r) =>
        (!regionName || r.region === regionName) &&
        matchesQuery(q, r.projectName, r.procuringEntity, r.awardReferenceNo)
    ),
    page,
    pageSize
  )
  // `region` is mock-internal — the API row doesn't carry it.
  return {
    ...result,
    items: result.items.map((r) => ({
      awardReferenceNo: r.awardReferenceNo,
      projectName: r.projectName,
      procuringEntity: r.procuringEntity,
      abc: r.abc,
      contractAmount: r.contractAmount,
    })),
  }
}

// --- R060 ------------------------------------------------------------------

const R060_2026: R060Contract[] = [
  { awardReferenceNo: "AWD-2026-07-0355", projectName: "Supply of Fertilizer and Seedlings", procuringEntity: "Municipality of San Rafael de Montaña", awardeeName: "Agri-Supply Hub Trading", awardDate: "2026-07-02", contractSignedDate: "2026-08-14" },
  { awardReferenceNo: "AWD-2026-07-0290", projectName: "Road Widening, Km 12–14", procuringEntity: "Provincial Government of Isla Verde", awardeeName: "Mindanao Road Works Corp.", awardDate: "2026-07-10", contractSignedDate: "2026-08-18" },
  { awardReferenceNo: "AWD-2026-08-0102", projectName: "Security Services, FY 2027", procuringEntity: "City Government of Bagong Lungsod", awardeeName: "Guardian Shield Security Agency", awardDate: "2026-08-05", contractSignedDate: "2026-09-02" },
  { awardReferenceNo: "AWD-2026-08-0177", projectName: "Supply of School Furniture", procuringEntity: "Northern Valley State College", awardeeName: "Mabini Woodcraft Corp.", awardDate: "2026-08-12", contractSignedDate: "2026-09-01" },
  { awardReferenceNo: "AWD-2026-08-0254", projectName: "Janitorial Services, Main Building", procuringEntity: "District Hospital of Pinagpala", awardeeName: "CleanPro Services", awardDate: "2026-08-20", contractSignedDate: "2026-09-03" },
]

const R060_LIMIT_DAYS = 10

function buildR060(fy: number): R060Contract[] {
  const count = total("r060", fy)
  if (!count) return []
  const named = fy === 2026 ? R060_2026 : []
  const generated = count - named.length
  return fill(named, count, (i) => {
    // Named rows go down to +4; generated ones continue at +3 … +1.
    const daysTaken = named.length
      ? 13 - Math.floor((i * 3) / generated)
      : 40 - Math.floor((i * 29) / generated)
    const awardDate = dateBefore(`${fy}-08-25`, i, 5)
    return {
      awardReferenceNo: `AWD-${fy}-0${4 + (i % 5)}-0${String(300 + i * 23).padStart(3, "0")}`,
      projectName: pick(MOCK_PROJECTS, i + 5),
      procuringEntity: pick(MOCK_ENTITIES, i).name,
      awardeeName: pick(MOCK_AWARDEES, i),
      awardDate,
      contractSignedDate: addDays(awardDate, daysTaken),
    }
  })
}

export async function getR060({ fiscalYear, q, page, pageSize }: FlagQuery): Promise<R060Response | undefined> {
  const rows = buildR060(fiscalYear)
  if (!rows.length) return undefined
  return {
    ...mockPage(
      rows.filter((r) => matchesQuery(q, r.projectName, r.procuringEntity, r.awardeeName)),
      page,
      pageSize
    ),
    limitDays: R060_LIMIT_DAYS,
  }
}

// --- R061 / R062 -----------------------------------------------------------

const R061_2026: DecisionPeriodTender[] = [
  { bidReferenceNo: "11768201", noticeTitle: "Catering Services for Provincial Events", procuringEntity: "Provincial Government of Isla Verde", procurementMode: "Negotiated Procurement", closingDate: "2026-08-11", awardDate: "2026-08-11" },
  { bidReferenceNo: "11790344", noticeTitle: "Supply of Construction Materials", procuringEntity: "Municipality of Sta. Barbara del Sur", procurementMode: "Public Bidding", closingDate: "2026-08-18", awardDate: "2026-08-19" },
  { bidReferenceNo: "11752980", noticeTitle: "Supply of Drugs and Medicines", procuringEntity: "District Hospital of Pinagpala", procurementMode: "Public Bidding", closingDate: "2026-08-04", awardDate: "2026-08-06" },
  { bidReferenceNo: "11731456", noticeTitle: "Repainting of City Hall", procuringEntity: "City Government of Maharlika Heights", procurementMode: "Small Value Procurement", closingDate: "2026-07-28", awardDate: "2026-07-30" },
]

const R062_2026: DecisionPeriodTender[] = [
  { bidReferenceNo: "10988215", noticeTitle: "Construction of Multi-Purpose Building", procuringEntity: "Municipality of San Rafael de Montaña", procurementMode: "Public Bidding", closingDate: "2026-01-12", awardDate: "2026-09-24" },
  { bidReferenceNo: "10954730", noticeTitle: "Supply of Ambulance Units", procuringEntity: "City Government of Bagong Lungsod", procurementMode: "Public Bidding", closingDate: "2026-02-03", awardDate: "2026-09-10" },
  { bidReferenceNo: "10931177", noticeTitle: "Water System Improvement, Phase 1", procuringEntity: "Provincial Government of Isla Verde", procurementMode: "Public Bidding", closingDate: "2026-02-20", awardDate: "2026-08-27" },
  { bidReferenceNo: "10917402", noticeTitle: "Learning Management System Subscription", procuringEntity: "Northern Valley State College", procurementMode: "Negotiated Procurement", closingDate: "2026-02-25", awardDate: "2026-09-01" },
]

function buildDecisionPeriod(flag: "r061" | "r062", fy: number): DecisionPeriodTender[] {
  const count = total(flag, fy)
  if (!count) return []
  const named = fy === 2026 ? (flag === "r061" ? R061_2026 : R062_2026) : []
  return fill(named, count, (i) => {
    const period =
      flag === "r061"
        ? named.length ? 2 : Math.min(2, Math.floor(i / 3))
        : named.length ? 187 - Math.floor(i / 2) : 240 - i * 2
    const awardDate = dateBefore(`${fy}-${flag === "r061" ? "07-24" : "08-20"}`, i, 6)
    return {
      bidReferenceNo: String((flag === "r061" ? 11_720_000 : 10_900_000) - i * 911),
      noticeTitle: pick(MOCK_PROJECTS, i + (flag === "r061" ? 1 : 4)),
      procuringEntity: pick(MOCK_ENTITIES, i + 2).name,
      procurementMode: pick(DECISION_MODES, i),
      closingDate: addDays(awardDate, -period),
      awardDate,
    }
  })
}

async function getDecisionPeriod(
  flag: "r061" | "r062",
  { fiscalYear, q, modeName, page, pageSize }: FlagQuery
): Promise<DecisionPeriodResponse | undefined> {
  const rows = buildDecisionPeriod(flag, fiscalYear)
  if (!rows.length) return undefined
  return {
    ...mockPage(
      rows.filter(
        (r) =>
          (!modeName || r.procurementMode === modeName) &&
          matchesQuery(q, r.noticeTitle, r.procuringEntity, r.bidReferenceNo)
      ),
      page,
      pageSize
    ),
    thresholdDays: flag === "r061" ? 3 : 180,
  }
}

export const getR061 = (query: FlagQuery) => getDecisionPeriod("r061", query)
export const getR062 = (query: FlagQuery) => getDecisionPeriod("r062", query)
