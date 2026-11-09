// Shared helpers for analytics mock data. Delete once every endpoint is live.

/** Seeded random generator — same seed → same sequence on every render. */
export function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const between = (r: () => number, min: number, max: number) => min + r() * (max - min)
export const pickRandom = <T,>(r: () => number, items: readonly T[]) => items[Math.floor(r() * items.length)]

/** Share of suppliers / procurement activity located in each region (by region code). */
export const REGION_WEIGHTS: Record<string, number> = {
  NCR: 0.235, CAR: 0.022, I: 0.045, II: 0.03, III: 0.112, "IV-A": 0.145, "IV-B": 0.02,
  V: 0.035, VI: 0.04, VII: 0.07, VIII: 0.028, IX: 0.025, X: 0.042, XI: 0.052,
  XII: 0.03, XIII: 0.018, NIR: 0.026, BARMM: 0.015,
}

export const MONTHS =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Latest date the mock data covers; the current year is year-to-date. */
export const DATA_AS_OF = "2026-10-31"
const AS_OF_YEAR = 2026
const AS_OF_MONTH = 10

export const asOfDate = (fy: number) => (fy >= AS_OF_YEAR ? DATA_AS_OF : `${fy}-12-31`)
export const monthsCovered = (fy: number) => (fy >= AS_OF_YEAR ? AS_OF_MONTH : 12)
export const isPartialYear = (fy: number) => fy >= AS_OF_YEAR
