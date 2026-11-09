import { type OcdsRegion } from "@/lib/ocds-regions"
import { type Uc036Awardee } from "./types"

// Dummy data shaped exactly like the backend response (array only).
// Replace the body of `getAwardeesByRegion` with:
//   const params = new URLSearchParams({ fy: String(fiscalYear) })
//   if (region) params.set("region", region.code)
//   const res = await fetch(`${API_URL}/ocds/indicators/uc036?${params}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as Uc036Awardee[]

type MockRow = Omit<Uc036Awardee, "fiscalYear">

const MOCK: Record<number, MockRow[]> = {
  2026: [
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions", region: "NCR", contractCount: 48, totalContractAmount: 412_600_000 },
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc.", region: "Region IV-A", contractCount: 21, totalContractAmount: 368_200_000 },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp.", region: "Region VII", contractCount: 63, totalContractAmount: 291_400_000 },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc.", region: "Region III", contractCount: 17, totalContractAmount: 265_900_000 },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc.", region: "NCR", contractCount: 112, totalContractAmount: 214_300_000 },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading", region: "Region VII", contractCount: 39, totalContractAmount: 198_700_000 },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp.", region: "Region XI", contractCount: 14, totalContractAmount: 187_200_000 },
    { supplierId: "ORG-002954", supplierName: "Luzon Educational Supply Co.", region: "Region III", contractCount: 57, totalContractAmount: 166_800_000 },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp.", region: "Region VI", contractCount: 19, totalContractAmount: 151_500_000 },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc.", region: "NCR", contractCount: 71, totalContractAmount: 139_100_000 },
    { supplierId: "ORG-007015", supplierName: "CleanPro Services", region: "Region IV-A", contractCount: 88, totalContractAmount: 96_400_000 },
    { supplierId: "ORG-006248", supplierName: "Kalayaan Engineering Services", region: "Region X", contractCount: 9, totalContractAmount: 88_200_000 },
  ],
  2025: [
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc.", region: "Region IV-A", contractCount: 18, totalContractAmount: 389_500_000 },
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions", region: "NCR", contractCount: 41, totalContractAmount: 344_100_000 },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc.", region: "Region III", contractCount: 15, totalContractAmount: 276_800_000 },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp.", region: "Region XI", contractCount: 12, totalContractAmount: 231_400_000 },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp.", region: "Region VII", contractCount: 55, totalContractAmount: 219_900_000 },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc.", region: "NCR", contractCount: 98, totalContractAmount: 187_600_000 },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp.", region: "Region VI", contractCount: 16, totalContractAmount: 172_300_000 },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading", region: "Region VII", contractCount: 33, totalContractAmount: 158_000_000 },
    { supplierId: "ORG-006633", supplierName: "Cordillera Agri-Supply Corp.", region: "CAR", contractCount: 27, totalContractAmount: 134_700_000 },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc.", region: "NCR", contractCount: 64, totalContractAmount: 121_200_000 },
    { supplierId: "ORG-007015", supplierName: "CleanPro Services", region: "Region IV-A", contractCount: 74, totalContractAmount: 82_900_000 },
  ],
}

export async function getAwardeesByRegion(
  fiscalYear: number,
  region: OcdsRegion | null
): Promise<Uc036Awardee[] | undefined> {
  const rows = MOCK[fiscalYear]
  if (!rows) return undefined
  return rows
    .filter((r) => !region || r.region === region.name)
    .map((r) => ({ ...r, fiscalYear }))
}
