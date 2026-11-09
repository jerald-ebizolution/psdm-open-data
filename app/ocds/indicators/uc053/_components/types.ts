import { type PagedResult } from "@/lib/ocds-paging"

/**
 * UC053 — Tenders with Short Titles
 *
 * Backend contract:
 *   GET /api/ocds/indicators/uc053?fy=2026&mode=small-value&page=1&pageSize=8
 *     fy        required  fiscal year (by Published Date)
 *     mode      optional  procurement mode code; omit for all modes
 *     page      optional  1-based, default 1
 *     pageSize  optional  default 8, max 100
 *
 * Response: Uc053Response — bid notices whose Notice Title is shorter than
 * `thresholdChars` characters, newest Published Date first.
 *
 * Derived on the frontend:
 *   Characters  = noticeTitle length (Unicode code points, as typed — trimmed)
 *   Share       = total / GET /api/ocds/bid-notices-published?fy=&mode= → `count`
 */
export type Uc053Response = PagedResult<Uc053Notice> & {
  /** Titles shorter than this many characters are flagged (currently 10). */
  thresholdChars: number
}

export type Uc053Notice = {
  bidReferenceNo: string
  /** Notice Title exactly as published. */
  noticeTitle: string
  procuringEntity: string
  procurementMode: string
  /** Published Date, ISO "YYYY-MM-DD". */
  publishedDate: string
}
