/**
 * UC040 — Total Value Awarded per Supplier
 *
 * Backend contract:
 *   GET /api/ocds/indicators/uc040?fy=2026&region=NCR&q=acme&page=1&pageSize=10
 *     fy        required  fiscal year (by Award Date)
 *     region    optional  region code from GET /api/ocds/regions; omit for all regions
 *     q         optional  case-insensitive match on supplier name
 *     page      optional  1-based, default 1
 *     pageSize  optional  default 10, max 100
 *
 * Response: Uc040Page — one page of suppliers, sorted by totalAwardedAmount desc,
 * plus `total` (number of suppliers matching fy/region/q) for the "of 1,284" text.
 *
 * Derived on the frontend:
 *   Share of total = item.totalAwardedAmount / GET /api/ocds/total-contract?fy= → `amount`
 */
export type Uc040Page = {
  /** Suppliers matching fy/region/q across all pages. */
  total: number
  page: number
  pageSize: number
  items: Uc040Supplier[]
}

export type Uc040Supplier = {
  /**
   * 1-based rank by totalAwardedAmount among all suppliers for the fiscal year
   * (and region, if given). Not affected by `q` or paging — a search for
   * "Acme" still shows rank 5.
   */
  rank: number
  /** Stable awardee organization identifier (not the display name). */
  supplierId: string
  /** Awardee Organization Name. */
  supplierName: string
  /** Region of the awardee's registered address, e.g. "NCR", "Region IV-A". */
  region: string
  /** SUM(Contract Amount) for this supplier in the fiscal year. */
  totalAwardedAmount: number
  /** COUNT(DISTINCT Award Reference No.) for this supplier. */
  contractCount: number
  /** COUNT(DISTINCT Procuring Entity) that awarded this supplier. */
  procuringEntityCount: number
  /** MAX(Award Date) for this supplier, ISO date "YYYY-MM-DD". */
  latestAwardDate: string
}

/** Row shape rendered by the table — API row plus derived share. */
export type SupplierRow = Uc040Supplier & {
  /** Share of all contracted value for the fiscal year, 0–1. */
  share: number
}
