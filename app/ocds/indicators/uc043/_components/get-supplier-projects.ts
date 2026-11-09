import { type OcdsSupplierOption } from "@/lib/ocds-suppliers"
import { type Uc043Page, type Uc043Project } from "./types"

// Dummy data shaped exactly like the backend response.
// Replace the body of `getSupplierProjects` with:
//   const params = new URLSearchParams({
//     fy: String(fiscalYear), supplierId: supplier.supplierId,
//     page: String(page), pageSize: String(pageSize),
//   })
//   const res = await fetch(`${API_URL}/ocds/indicators/uc043?${params}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as Uc043Page

/** Per-supplier counts — kept in line with UC040 (contracts / procuring entities). */
const COUNTS: Record<number, Record<string, { projects: number; entities: number }>> = {
  2026: {
    "ORG-000184": { projects: 48, entities: 31 },
    "ORG-002371": { projects: 21, entities: 9 },
    "ORG-004519": { projects: 63, entities: 22 },
    "ORG-001046": { projects: 17, entities: 7 },
    "ORG-000032": { projects: 112, entities: 64 },
    "ORG-003877": { projects: 39, entities: 18 },
    "ORG-005210": { projects: 14, entities: 6 },
    "ORG-002954": { projects: 57, entities: 35 },
    "ORG-004102": { projects: 19, entities: 8 },
    "ORG-000597": { projects: 71, entities: 41 },
  },
  2025: {
    "ORG-002371": { projects: 18, entities: 8 },
    "ORG-000184": { projects: 41, entities: 27 },
    "ORG-001046": { projects: 15, entities: 6 },
    "ORG-005210": { projects: 12, entities: 5 },
    "ORG-004519": { projects: 55, entities: 20 },
    "ORG-000032": { projects: 98, entities: 58 },
    "ORG-004102": { projects: 16, entities: 7 },
    "ORG-003877": { projects: 33, entities: 15 },
    "ORG-006633": { projects: 27, entities: 12 },
    "ORG-000597": { projects: 64, entities: 37 },
  },
}

/** The six rows from the design, for Northwind IT Solutions in FY 2026. */
const NORTHWIND_2026: Omit<Uc043Project, "winningBidder">[] = [
  { awardReferenceNo: "AWD-2026-09-0412", projectName: "Supply and Delivery of ICT Equipment for SDO Quezon City", procuringEntity: "Department of Education – SDO Quezon City", contractAmount: 38_450_000, awardDate: "2026-09-12" },
  { awardReferenceNo: "AWD-2026-08-0377", projectName: "Network Infrastructure Upgrade, Phase 2", procuringEntity: "Department of Information and Communications Technology", contractAmount: 29_800_000, awardDate: "2026-08-28" },
  { awardReferenceNo: "AWD-2026-08-0102", projectName: "Supply of Laptops for Field Offices", procuringEntity: "Department of Social Welfare and Development – Central Office", contractAmount: 21_600_000, awardDate: "2026-08-04" },
  { awardReferenceNo: "AWD-2026-07-0290", projectName: "Data Center Server Refresh", procuringEntity: "Philippine Statistics Authority", contractAmount: 18_900_000, awardDate: "2026-07-15" },
  { awardReferenceNo: "AWD-2026-06-0233", projectName: "Supply and Delivery of Desktop Computers", procuringEntity: "Department of Health – Central Office", contractAmount: 15_250_000, awardDate: "2026-06-30" },
  { awardReferenceNo: "AWD-2026-06-0118", projectName: "Printers and Scanners for Records Section", procuringEntity: "Land Registration Authority", contractAmount: 6_780_000, awardDate: "2026-06-11" },
]

const ENTITY_POOL = [
  "Department of Education – SDO Quezon City",
  "Department of Information and Communications Technology",
  "Department of Social Welfare and Development – Central Office",
  "Philippine Statistics Authority",
  "Department of Health – Central Office",
  "Land Registration Authority",
  "Department of Public Works and Highways – Central Office",
  "Department of Budget and Management",
  "Bureau of Internal Revenue",
  "Department of Agriculture – Central Office",
  "Commission on Elections",
  "Department of Transportation",
  "Philippine National Police",
  "Bureau of Customs",
  "Department of the Interior and Local Government",
  "Department of Trade and Industry",
  "Department of Labor and Employment",
  "Department of Environment and Natural Resources",
  "Commission on Audit",
  "Civil Service Commission",
]

const PROJECT_POOL = [
  "Supply and Delivery of Office Equipment",
  "Procurement of Consulting Services",
  "Supply of IT Peripherals",
  "Repair and Rehabilitation Works",
  "Supply of Office Furniture",
  "Supply and Installation of Network Equipment",
  "Procurement of Software Licenses",
  "Supply of Medical Supplies",
  "Supply of School Learning Materials",
  "Janitorial and Maintenance Services",
]

const entityName = (i: number) =>
  i < ENTITY_POOL.length
    ? ENTITY_POOL[i]
    : `Local Government Unit of Sample Municipality ${String(i - ENTITY_POOL.length + 1).padStart(2, "0")}`

/** Builds every project for a supplier/year, newest first. */
function buildProjects(fiscalYear: number, supplier: OcdsSupplierOption): Uc043Project[] {
  const counts = COUNTS[fiscalYear]?.[supplier.supplierId]
  if (!counts) return []

  const named =
    fiscalYear === 2026 && supplier.supplierId === "ORG-000184" ? NORTHWIND_2026 : []

  const generated = Array.from({ length: counts.projects - named.length }, (_, i) => {
    const n = i + named.length
    // Spread dates backwards from mid-June (or late December for 2025).
    const startMonth = named.length ? 6 : fiscalYear === 2025 ? 12 : 9
    const month = Math.max(1, startMonth - Math.floor((n * 9) / counts.projects))
    const day = 28 - (n % 27)
    return {
      awardReferenceNo: `AWD-${fiscalYear}-${String(month).padStart(2, "0")}-${String(900 - n).padStart(4, "0")}`,
      projectName: `${PROJECT_POOL[n % PROJECT_POOL.length]} (Lot ${n + 1})`,
      // Every entity appears at least once, so the distinct count matches.
      procuringEntity: entityName(n % counts.entities),
      contractAmount: Math.round((6_500_000 * Math.exp(-n / 40) + 250_000) / 1000) * 1000,
      awardDate: `${fiscalYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    }
  })

  return [...named, ...generated]
    .map((p) => ({ ...p, winningBidder: supplier.supplierName }))
    .sort((a, b) => b.awardDate.localeCompare(a.awardDate))
}

export async function getSupplierProjects({
  fiscalYear,
  supplier,
  page,
  pageSize,
}: {
  fiscalYear: number
  supplier: OcdsSupplierOption
  page: number
  pageSize: number
}): Promise<Uc043Page | undefined> {
  const counts = COUNTS[fiscalYear]?.[supplier.supplierId]
  if (!counts) return undefined

  const all = buildProjects(fiscalYear, supplier)
  const start = (page - 1) * pageSize
  return {
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName,
    procuringEntityCount: counts.entities,
    total: all.length,
    page,
    pageSize,
    items: all.slice(start, start + pageSize),
  }
}
