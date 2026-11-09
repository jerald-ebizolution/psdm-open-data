/** Shape every paged OCDS list endpoint returns. */
export type PagedResult<T> = {
  /** Rows matching the filters across all pages. */
  total: number
  /** 1-based. */
  page: number
  pageSize: number
  items: T[]
}

export type PageSearchParams = { [key: string]: string | string[] | undefined }

export const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Reads `?view=all&page=N` and returns what to request from the API.
 * Preview mode always requests page 1 with the preview size.
 */
export function parsePaging(query: PageSearchParams, previewSize: number, viewAllSize = 25) {
  const viewAll = firstParam(query.view) === "all"
  const page = Math.max(1, Math.floor(Number(firstParam(query.page))) || 1)
  return {
    viewAll,
    page: viewAll ? page : 1,
    pageSize: viewAll ? viewAllSize : previewSize,
  }
}

export const searchParam = (query: PageSearchParams) => firstParam(query.q)?.trim() ?? ""

// --- Mock helpers ----------------------------------------------------------

export function mockPage<T>(rows: T[], page: number, pageSize: number): PagedResult<T> {
  const start = (page - 1) * pageSize
  return { total: rows.length, page, pageSize, items: rows.slice(start, start + pageSize) }
}

/** Case-insensitive "contains" across the given fields; empty query matches all. */
export function matchesQuery(q: string, ...fields: string[]) {
  const needle = q.trim().toLowerCase()
  return !needle || fields.some((f) => f.toLowerCase().includes(needle))
}
