/**
 * Fiscal years that have data — shared by every page's FY filter.
 *
 * Backend contract: GET /api/ocds/fiscal-years
 * Response: number[] — newest first, e.g. [2026, 2025]
 */

// Dummy data shaped exactly like the backend response.
// Replace the body of `getFiscalYears` with:
//   const res = await fetch(`${API_URL}/ocds/fiscal-years`)
//   if (!res.ok) return []
//   return (await res.json()) as number[]
const MOCK_FISCAL_YEARS = [2026, 2025]

export async function getFiscalYears(): Promise<number[]> {
  return MOCK_FISCAL_YEARS
}

/** Picks `?fy=` if it's an available year, otherwise the latest year. */
export function resolveFiscalYear(
  value: string | string[] | undefined,
  available: number[]
): number {
  const year = Number(Array.isArray(value) ? value[0] : value)
  if (available.includes(year)) return year
  return available[0] ?? new Date().getFullYear()
}
