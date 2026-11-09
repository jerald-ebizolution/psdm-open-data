import { cache } from "react"

/**
 * OCDS dashboard statistics — one endpoint per summary card.
 *
 *   GET /api/ocds/total-contract?fy=2026
 *   GET /api/ocds/suppliers-awarded?fy=2026
 *   GET /api/ocds/bid-notices-published?fy=2026
 *   GET /api/ocds/tenders-with-red-flags?fy=2026
 *
 * All four must be computed from the same data snapshot (same `dataAsOf`) as
 * the indicator endpoints, so `TotalContract.amount` matches the denominator
 * the indicators use for shares.
 */

type StatisticBase = {
  fiscalYear: number
  /** When the underlying dataset was last refreshed (ISO 8601). */
  dataAsOf: string
}

/** GET /api/ocds/total-contract?fy= */
export type TotalContract = StatisticBase & {
  /** SUM(Contract Amount) of every award in the fiscal year. */
  amount: number
  currency: "PHP"
  /** COUNT(DISTINCT Award Reference No.) included in `amount`. */
  // awardCount: number
}

/** GET /api/ocds/suppliers-awarded?fy= */
export type SuppliersAwarded = StatisticBase & {
  /** COUNT(DISTINCT Awardee Organization) with ≥1 award in the fiscal year. */
  count: number
}

/**
 * GET /api/ocds/bid-notices-published?fy=&mode=
 *   mode  optional  procurement mode code from GET /api/ocds/procurement-modes;
 *                   omit for all modes. Used as UC053's denominator.
 */
export type BidNoticesPublished = StatisticBase & {
  /** Bid notices published in the fiscal year (for `mode`, if given). */
  count: number
}

/** GET /api/ocds/tenders-with-red-flags?fy= */
export type TendersWithRedFlags = StatisticBase & {
  /** Tenders that tripped at least one red-flag check. */
  count: number
  /** Number of red-flag checks that were run. */
  checkCount: number
}

// ---------------------------------------------------------------------------
// Dummy data shaped exactly like each backend response.
// Replace each function body with a fetch, e.g.:
//   const res = await fetch(`${API_URL}/ocds/total-contract?fy=${fiscalYear}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as TotalContract
// ---------------------------------------------------------------------------

const DATA_AS_OF: Record<number, string> = {
  2026: "2026-11-08T16:00:00Z",
  2025: "2026-01-15T16:00:00Z",
}

const MOCK_TOTAL_CONTRACT: Record<number, TotalContract> = {
  2026: { fiscalYear: 2026, dataAsOf: DATA_AS_OF[2026], amount: 10_850_000_000, currency: "PHP" },
  2025: { fiscalYear: 2025, dataAsOf: DATA_AS_OF[2025], amount: 9_420_000_000, currency: "PHP" },
}

const MOCK_SUPPLIERS_AWARDED: Record<number, SuppliersAwarded> = {
  2026: { fiscalYear: 2026, dataAsOf: DATA_AS_OF[2026], count: 950 },
  2025: { fiscalYear: 2025, dataAsOf: DATA_AS_OF[2025], count: 891 },
}

const MOCK_BID_NOTICES_PUBLISHED: Record<number, BidNoticesPublished> = {
  2026: { fiscalYear: 2026, dataAsOf: DATA_AS_OF[2026], count: 9_416 },
  2025: { fiscalYear: 2025, dataAsOf: DATA_AS_OF[2025], count: 8_902 },
}

const MOCK_TENDERS_WITH_RED_FLAGS: Record<number, TendersWithRedFlags> = {
  2026: { fiscalYear: 2026, dataAsOf: DATA_AS_OF[2026], count: 85, checkCount: 5 },
  2025: { fiscalYear: 2025, dataAsOf: DATA_AS_OF[2025], count: 112, checkCount: 5 },
}

// Wrapped in `cache` because both the stat card and the UC025 table use it;
// within one request they share a single call.
export const getTotalContract = cache(
  async (fiscalYear: number): Promise<TotalContract | undefined> => {
    return MOCK_TOTAL_CONTRACT[fiscalYear]
  }
)

export async function getSuppliersAwarded(fiscalYear: number): Promise<SuppliersAwarded | undefined> {
  return MOCK_SUPPLIERS_AWARDED[fiscalYear]
}

/** Mock split of bid notices by procurement mode code (sums to the yearly count). */
const MOCK_BID_NOTICES_BY_MODE: Record<number, Record<string, number>> = {
  2026: { "public-bidding": 3_120, "small-value": 4_210, shopping: 980, negotiated: 712, "direct-contracting": 214, "limited-source": 180 },
  2025: { "public-bidding": 2_950, "small-value": 3_980, shopping: 925, negotiated: 674, "direct-contracting": 203, "limited-source": 170 },
}

export async function getBidNoticesPublished(
  fiscalYear: number,
  modeCode: string | null = null
): Promise<BidNoticesPublished | undefined> {
  const all = MOCK_BID_NOTICES_PUBLISHED[fiscalYear]
  if (!all || !modeCode) return all
  const count = MOCK_BID_NOTICES_BY_MODE[fiscalYear]?.[modeCode]
  return count === undefined ? undefined : { ...all, count }
}

export async function getTendersWithRedFlags(fiscalYear: number): Promise<TendersWithRedFlags | undefined> {
  return MOCK_TENDERS_WITH_RED_FLAGS[fiscalYear]
}
