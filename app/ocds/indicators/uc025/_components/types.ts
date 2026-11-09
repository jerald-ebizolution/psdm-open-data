/**
 * UC025 — Top 10 Suppliers by Contract Value
 *
 * Backend contract: GET /api/ocds/indicators/uc025?fy=2026
 * Response: Uc025Supplier[] — the top 10 suppliers for the fiscal year
 * (by Award Date), sorted by totalContractAmount desc.
 *
 * Everything else on the card is derived on the frontend:
 *   top 10 amount  = SUM(suppliers[].totalContractAmount)
 *   total value    = GET /api/ocds/total-contract?fy=  → `amount`
 *   top 10 share   = top 10 amount / total value
 *   row share      = row.totalContractAmount / total value
 */
export type Uc025Supplier = {
  /** 1-based rank by totalContractAmount (ties share a rank). */
  rank: number
  /** Stable awardee organization identifier (not the display name). */
  supplierId: string
  /** Awardee Organization Name. */
  supplierName: string
  /** Region of the awardee's registered address, e.g. "NCR", "Region IV-A". */
  region: string
  /** COUNT(DISTINCT Award Reference No.) for this supplier in the fiscal year. */
  contractCount: number
  /** SUM(Contract Amount) for this supplier in the fiscal year. */
  totalContractAmount: number
}

/** Row shape rendered by the table — API row plus derived share values. */
export type SupplierRow = Uc025Supplier & {
  /** Share of all contracted value, 0–1. */
  share: number
  /** Share relative to the largest supplier, 0–1 (drives the bar width). */
  relativeShare: number
}
