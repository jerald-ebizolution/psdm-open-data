const pesoFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatPeso = (value: number) => `₱ ${pesoFormatter.format(value)}`

export const formatPercent = (ratio: number, digits = 2) =>
  `${(ratio * 100).toFixed(digits)}%`

export const formatCount = (value: number) => value.toLocaleString("en-PH")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Whole calendar days from `from` to `to` (ISO dates "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string) {
  const utc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

/** 1 → "1 day", 3 → "3 days". */
export const formatDays = (n: number) => `${formatCount(n)} ${Math.abs(n) === 1 ? "day" : "days"}`

/** "2026-09-12" → "12 Sep 2026" (parsed as a plain date, no timezone shift). */
export function formatAwardDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-")
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`
}
