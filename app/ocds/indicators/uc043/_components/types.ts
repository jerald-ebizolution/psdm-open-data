/**
 * UC043 — Procuring Entities Supplied by a Supplier
 *
 * Backend contract:
 *   GET /api/ocds/indicators/uc043?fy=2026&supplierId=ORG-000184&page=1&pageSize=6
 *     fy          required  fiscal year (by Award Date)
 *     supplierId  required  from GET /api/ocds/suppliers?fy=
 *     page        optional  1-based, default 1
 *     pageSize    optional  default 6, max 100
 *
 * Response: Uc043Page — the supplier's awards (projects) in the fiscal year,
 * newest Award Date first, one page at a time.
 */
export type Uc043Page = {
  supplierId: string
  supplierName: string
  /** COUNT(DISTINCT Procuring Entity) this supplier supplied in the fiscal year. */
  procuringEntityCount: number
  /** Number of awards (projects) for this supplier across all pages. */
  total: number
  page: number
  pageSize: number
  items: Uc043Project[]
}

export type Uc043Project = {
  /** Award Reference No., e.g. "AWD-2026-09-0412". Unique per row. */
  awardReferenceNo: string
  /** Notice Title of the project. */
  projectName: string
  /** Procuring Entity name. */
  procuringEntity: string
  /** Awardee Organization Name on the award (may differ from the supplier for JVs). */
  winningBidder: string
  /** Contract Amount in PHP. */
  contractAmount: number
  /** Award Date, ISO date "YYYY-MM-DD". */
  awardDate: string
}
