import { type PagedResult } from "@/lib/ocds-paging"

/**
 * Red-flag list endpoints — all GET, all paged, all share these query params:
 *
 *   fy        required  fiscal year
 *   q         optional  case-insensitive search (fields listed per endpoint)
 *   mode      optional  procurement mode code   (R003, R061, R062)
 *   region    optional  region code             (R059)
 *   page      optional  1-based, default 1
 *   pageSize  optional  default 5, max 100
 *
 * Rows hold raw dates / amounts only. Periods, "short by", "over by" etc. are
 * derived on the frontend. The backend still uses them to filter and sort.
 */

/**
 * R003 — Submission Period Is Too Short
 * GET /api/ocds/red-flags/r003?fy=&q=&mode=&page=&pageSize=
 * q matches noticeTitle, procuringEntity, bidReferenceNo.
 * Flag: (closingDate − publishedDate) < minimumDays for the mode.
 * Sorted by (minimumDays − period) desc, i.e. "short by", largest first.
 */
export type R003Tender = {
  bidReferenceNo: string
  noticeTitle: string
  procuringEntity: string
  procurementMode: string
  /** ISO date "YYYY-MM-DD". */
  publishedDate: string
  /** ISO date "YYYY-MM-DD". */
  closingDate: string
  /** Minimum posting period (calendar days) for this row's procurement mode. */
  minimumDays: number
}
export type R003Response = PagedResult<R003Tender>

/**
 * R059 — Contract Amount Above the Approved Budget
 * GET /api/ocds/red-flags/r059?fy=&q=&region=&page=&pageSize=
 * q matches projectName, procuringEntity, awardReferenceNo.
 * Flag: contractAmount > abc. Sorted by (contractAmount − abc) / abc desc.
 */
export type R059Contract = {
  awardReferenceNo: string
  projectName: string
  procuringEntity: string
  /** Approved Budget for the Contract, PHP. */
  abc: number
  /** Contract Amount, PHP. */
  contractAmount: number
}
export type R059Response = PagedResult<R059Contract>

/**
 * R060 — Contract Signed Late After the Award
 * GET /api/ocds/red-flags/r060?fy=&q=&page=&pageSize=
 * q matches projectName, procuringEntity, awardeeName.
 * Flag: (contractSignedDate − awardDate) > limitDays. Sorted by days over limit desc.
 */
export type R060Contract = {
  awardReferenceNo: string
  projectName: string
  procuringEntity: string
  awardeeName: string
  /** ISO date "YYYY-MM-DD". */
  awardDate: string
  /** ISO date "YYYY-MM-DD". */
  contractSignedDate: string
}
export type R060Response = PagedResult<R060Contract> & {
  /** Allowed calendar days between award and signing (currently 10). */
  limitDays: number
}

/**
 * R061 — Decision Period Is Extremely Short  (threshold 3, sorted asc)
 * R062 — Decision Period Is Extremely Long   (threshold 180, sorted desc)
 * GET /api/ocds/red-flags/r061?fy=&q=&mode=&page=&pageSize=
 * GET /api/ocds/red-flags/r062?fy=&q=&mode=&page=&pageSize=
 * q matches noticeTitle, procuringEntity, bidReferenceNo.
 * Decision period = awardDate − closingDate.
 */
export type DecisionPeriodTender = {
  bidReferenceNo: string
  noticeTitle: string
  procuringEntity: string
  procurementMode: string
  /** Bid closing date, ISO "YYYY-MM-DD". */
  closingDate: string
  /** ISO date "YYYY-MM-DD". */
  awardDate: string
}
export type DecisionPeriodResponse = PagedResult<DecisionPeriodTender> & {
  /** R061: flag when period < thresholdDays. R062: flag when period > thresholdDays. */
  thresholdDays: number
}

/** Common arguments for the mock getters. */
export type FlagQuery = {
  fiscalYear: number
  q: string
  /** Procurement mode name (mock filters by name; the API takes the code). */
  modeName?: string | null
  /** Region name (mock filters by name; the API takes the code). */
  regionName?: string | null
  page: number
  pageSize: number
}
