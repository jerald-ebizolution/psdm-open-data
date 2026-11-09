import { type OcdsRegion } from "@/lib/ocds-regions"
import { type Uc040Page, type Uc040Supplier } from "./types"

// Dummy data shaped exactly like the backend response.
// Replace the body of `getSupplierAwards` with:
//   const params = new URLSearchParams({ fy: String(fiscalYear), page: String(page), pageSize: String(pageSize) })
//   if (region) params.set("region", region.code)
//   if (q) params.set("q", q)
//   const res = await fetch(`${API_URL}/ocds/indicators/uc040?${params}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as Uc040Page

const TOP_10: Record<number, Omit<Uc040Supplier, "rank">[]> = {
  2026: [
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions", region: "NCR", totalAwardedAmount: 412_600_000, contractCount: 48, procuringEntityCount: 31, latestAwardDate: "2026-09-12" },
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc.", region: "Region IV-A", totalAwardedAmount: 368_200_000, contractCount: 21, procuringEntityCount: 9, latestAwardDate: "2026-09-05" },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp.", region: "Region VII", totalAwardedAmount: 291_400_000, contractCount: 63, procuringEntityCount: 22, latestAwardDate: "2026-09-09" },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc.", region: "Region III", totalAwardedAmount: 265_900_000, contractCount: 17, procuringEntityCount: 7, latestAwardDate: "2026-08-26" },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc.", region: "NCR", totalAwardedAmount: 214_300_000, contractCount: 112, procuringEntityCount: 64, latestAwardDate: "2026-09-18" },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading", region: "Region VII", totalAwardedAmount: 198_700_000, contractCount: 39, procuringEntityCount: 18, latestAwardDate: "2026-09-03" },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp.", region: "Region XI", totalAwardedAmount: 187_200_000, contractCount: 14, procuringEntityCount: 6, latestAwardDate: "2026-08-21" },
    { supplierId: "ORG-002954", supplierName: "Luzon Educational Supply Co.", region: "Region III", totalAwardedAmount: 166_800_000, contractCount: 57, procuringEntityCount: 35, latestAwardDate: "2026-08-30" },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp.", region: "Region VI", totalAwardedAmount: 151_500_000, contractCount: 19, procuringEntityCount: 8, latestAwardDate: "2026-08-14" },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc.", region: "NCR", totalAwardedAmount: 139_100_000, contractCount: 71, procuringEntityCount: 41, latestAwardDate: "2026-09-16" },
  ],
  2025: [
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc.", region: "Region IV-A", totalAwardedAmount: 389_500_000, contractCount: 18, procuringEntityCount: 8, latestAwardDate: "2025-12-15" },
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions", region: "NCR", totalAwardedAmount: 344_100_000, contractCount: 41, procuringEntityCount: 27, latestAwardDate: "2025-12-19" },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc.", region: "Region III", totalAwardedAmount: 276_800_000, contractCount: 15, procuringEntityCount: 6, latestAwardDate: "2025-11-28" },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp.", region: "Region XI", totalAwardedAmount: 231_400_000, contractCount: 12, procuringEntityCount: 5, latestAwardDate: "2025-12-02" },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp.", region: "Region VII", totalAwardedAmount: 219_900_000, contractCount: 55, procuringEntityCount: 20, latestAwardDate: "2025-12-10" },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc.", region: "NCR", totalAwardedAmount: 187_600_000, contractCount: 98, procuringEntityCount: 58, latestAwardDate: "2025-12-22" },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp.", region: "Region VI", totalAwardedAmount: 172_300_000, contractCount: 16, procuringEntityCount: 7, latestAwardDate: "2025-11-17" },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading", region: "Region VII", totalAwardedAmount: 158_000_000, contractCount: 33, procuringEntityCount: 15, latestAwardDate: "2025-12-05" },
    { supplierId: "ORG-006633", supplierName: "Cordillera Agri-Supply Corp.", region: "CAR", totalAwardedAmount: 134_700_000, contractCount: 27, procuringEntityCount: 12, latestAwardDate: "2025-11-24" },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc.", region: "NCR", totalAwardedAmount: 121_200_000, contractCount: 64, procuringEntityCount: 37, latestAwardDate: "2025-12-18" },
  ],
}

/** Total suppliers per year in the mock, so "of 1,284 suppliers" matches the design. */
const SUPPLIER_COUNT: Record<number, number> = { 2026: 1_284, 2025: 1_197 }

const FILLER_REGIONS = ["NCR", "Region IV-A", "Region III", "Region VII", "Region VI", "Region XI", "Region X", "Region V", "CAR", "Region I", "Region XII", "BARMM"]

/** Builds the full ranked list for a year: the named top 10 plus generated filler rows. */
type UnrankedSupplier = Omit<Uc040Supplier, "rank">

function buildYear(fiscalYear: number): UnrankedSupplier[] {
  const top = TOP_10[fiscalYear]
  if (!top) return []
  const filler = Array.from({ length: SUPPLIER_COUNT[fiscalYear] - top.length }, (_, i) => {
    const n = i + 11
    const amount = Math.max(50_000, Math.round(130_000_000 * Math.exp(-i / 60) / 100) * 100)
    return {
      supplierId: `ORG-9${String(n).padStart(5, "0")}`,
      supplierName: `Sample Supplier ${String(n).padStart(4, "0")}`,
      region: FILLER_REGIONS[n % FILLER_REGIONS.length],
      totalAwardedAmount: amount,
      contractCount: 1 + ((n * 7) % 40),
      procuringEntityCount: 1 + ((n * 3) % 15),
      latestAwardDate: `${fiscalYear}-${String(1 + (n % 9)).padStart(2, "0")}-${String(1 + (n % 28)).padStart(2, "0")}`,
    }
  })
  return [...top, ...filler]
}

const cacheByYear = new Map<number, UnrankedSupplier[]>()

export async function getSupplierAwards({
  fiscalYear,
  region,
  q,
  page,
  pageSize,
}: {
  fiscalYear: number
  region: OcdsRegion | null
  q: string
  page: number
  pageSize: number
}): Promise<Uc040Page | undefined> {
  if (!cacheByYear.has(fiscalYear)) cacheByYear.set(fiscalYear, buildYear(fiscalYear))
  const all = cacheByYear.get(fiscalYear)!
  if (!all.length) return undefined

  // Rank within the region (if any), before applying the search.
  const ranked = all
    .filter((s) => !region || s.region === region.name)
    .map((s, i) => ({ ...s, rank: i + 1 }))
  const needle = q.trim().toLowerCase()
  const matches = needle
    ? ranked.filter((s) => s.supplierName.toLowerCase().includes(needle))
    : ranked

  const start = (page - 1) * pageSize
  return {
    total: matches.length,
    page,
    pageSize,
    items: matches.slice(start, start + pageSize),
  }
}
