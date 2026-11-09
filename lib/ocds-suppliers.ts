/**
 * Supplier picker options — suppliers with at least one award in a fiscal year.
 *
 * Backend contract: GET /api/ocds/suppliers?fy=2026
 * Response: OcdsSupplierOption[] — sorted by total awarded amount desc, so the
 * first item is the default selection.
 */
export type OcdsSupplierOption = {
  supplierId: string
  supplierName: string
}

// Dummy data shaped exactly like the backend response.
// Replace the body of `getSupplierOptions` with:
//   const res = await fetch(`${API_URL}/ocds/suppliers?fy=${fiscalYear}`)
//   if (!res.ok) return []
//   return (await res.json()) as OcdsSupplierOption[]
const MOCK: Record<number, OcdsSupplierOption[]> = {
  2026: [
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions" },
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc." },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp." },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc." },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc." },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading" },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp." },
    { supplierId: "ORG-002954", supplierName: "Luzon Educational Supply Co." },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp." },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc." },
  ],
  2025: [
    { supplierId: "ORG-002371", supplierName: "Luzon Builders Consortium Inc." },
    { supplierId: "ORG-000184", supplierName: "Northwind IT Solutions" },
    { supplierId: "ORG-001046", supplierName: "Rizal Builders Inc." },
    { supplierId: "ORG-005210", supplierName: "Mindanao Road Works Corp." },
    { supplierId: "ORG-004519", supplierName: "Mabini Woodcraft Corp." },
    { supplierId: "ORG-000032", supplierName: "Acme Supplies Inc." },
    { supplierId: "ORG-004102", supplierName: "Bayanihan Construction & Dev. Corp." },
    { supplierId: "ORG-003877", supplierName: "Visayas MedTech Trading" },
    { supplierId: "ORG-006633", supplierName: "Cordillera Agri-Supply Corp." },
    { supplierId: "ORG-000597", supplierName: "Pacific Office Systems Inc." },
  ],
}

export async function getSupplierOptions(fiscalYear: number): Promise<OcdsSupplierOption[]> {
  return MOCK[fiscalYear] ?? []
}

/** Returns `?supplier=` if it's in the list, otherwise the first (top) supplier. */
export function resolveSupplier(
  value: string | string[] | undefined,
  options: OcdsSupplierOption[]
): OcdsSupplierOption | null {
  const id = Array.isArray(value) ? value[0] : value
  return options.find((o) => o.supplierId === id) ?? options[0] ?? null
}
