/**
 * UC036 — Awardees by Region
 *
 * Backend contract: GET /api/ocds/indicators/uc036?fy=2026&region=IV-A
 *   fy      required  fiscal year (by Award Date)
 *   region  optional  region code from GET /api/ocds/regions; omit for all regions
 *
 * Response: Uc036Awardee[] — every awardee with ≥1 award in that fiscal year
 * (and region, if given), one row per awardee, sorted by totalContractAmount desc.
 *
 * Derived on the frontend:
 *   Awardees               = rows.length
 *   Contracts              = SUM(rows[].contractCount)
 *   Total contract amount  = SUM(rows[].totalContractAmount)
 */
export type Uc036Awardee = {
  /** Stable awardee organization identifier (not the display name). */
  supplierId: string
  /** Awardee Organization Name. */
  supplierName: string
  /** Region of Awardee — display name, matches OcdsRegion.name. */
  region: string
  /** Fiscal year of the awards (echo of `fy`). */
  fiscalYear: number
  /** COUNT(DISTINCT Award Reference No.) for this awardee in the fiscal year. */
  contractCount: number
  /** SUM(Contract Amount) for this awardee in the fiscal year. */
  totalContractAmount: number
}
