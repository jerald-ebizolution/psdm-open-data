/**
 * PSGC drill-down for the supplier map: region → province → city/municipality → barangay.
 *
 * Boundaries: faeldon/philippines-json-maps (MIT), low resolution, keyed by PSGC.
 *   - Regions, provinces and cities/municipalities are served from /public/geo.
 *   - Barangays (23 MB, 1,642 files) are loaded on demand from BARANGAY_GEO_BASE.
 *     Set NEXT_PUBLIC_GEO_BARANGAY_BASE_URL to self-host them.
 *
 * Supplier counts below a region come from `getAreaStats`, a seeded mock.
 * Backend contract to replace it:
 *   GET /api/merchants/geo?parent=<psgc>&from=&to=&orgType=
 *   → { psgc, suppliers, activeRate, topCategory }[] for every child area
 */

import { between, rng } from "@/lib/analytics-mock"
import { type AreaStats, topCategoryFor } from "@/lib/merchant-analytics-data"

/** Depth 0 = whole country (children are regions) … depth 3 = city (children are barangays). */
export type GeoDepth = 0 | 1 | 2 | 3

export const CHILD_LABEL: Record<GeoDepth, { one: string; many: string }> = {
  0: { one: "Region", many: "Regions" },
  1: { one: "Province", many: "Provinces" },
  2: { one: "City / Municipality", many: "Cities / Municipalities" },
  3: { one: "Barangay", many: "Barangays" },
}

/** GeoJSON property prefix of the child features at each depth. */
export const CHILD_PROP: Record<GeoDepth, "adm1" | "adm2" | "adm3" | "adm4"> = {
  0: "adm1",
  1: "adm2",
  2: "adm3",
  3: "adm4",
}

const BARANGAY_GEO_BASE =
  process.env.NEXT_PUBLIC_GEO_BARANGAY_BASE_URL ??
  "https://raw.githubusercontent.com/faeldon/philippines-json-maps/680e32e62baeccbcd8845d3b1387bc67c1baf78a/latest/geojson/municities/lowres"

/** URL of the GeoJSON holding the children of `psgc` at `depth`. */
export function geoUrl(depth: GeoDepth, psgc: number | null) {
  switch (depth) {
    case 0:
      return "/geo/country.json"
    case 1:
      return `/geo/regions/provdists-region-${psgc}.json`
    case 2:
      return `/geo/provdists/municities-provdist-${psgc}.json`
    case 3:
      return `${BARANGAY_GEO_BASE}/bgysubmuns-municity-${psgc}.0.001.json`
  }
}

/** "NCR, City of Manila, First District (Not a Province)" → "City of Manila, First District" */
export function cleanAreaName(name: string) {
  return name.replace(/^NCR,\s*/, "").replace(/\s*\(Not a Province\)$/, "")
}

export type AreaNode = AreaStats & { psgc: number; name: string }

/**
 * Splits a parent area's supplier count across its child areas. Larger shares
 * go to a few areas (cities and town centres), as in the real registry.
 */
export async function getAreaStats(
  parent: { psgc: number; suppliers: number; activeRate: number },
  children: { psgc: number; name: string }[],
  seed: string
): Promise<AreaNode[]> {
  const weights = children.map((c) => {
    const r = rng(`w-${c.psgc}`)
    return r() ** 3 + 0.02
  })
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  return children.map((c, i) => {
    const r = rng(`a-${c.psgc}-${seed}`)
    return {
      ...c,
      suppliers: Math.round((parent.suppliers * weights[i]) / sum),
      activeRate: Math.min(0.95, Math.max(0.4, parent.activeRate + between(r, -0.12, 0.1))),
      topCategory: topCategoryFor(String(c.psgc)),
    }
  })
}

export const SECTORS = [
  "Goods and supplies",
  "Construction and infrastructure",
  "IT and telecommunications",
  "Medical and health",
  "Consulting services",
  "General support services",
]

/** Industry sector split of the suppliers in one area (seeded mock). */
export function getSectorBreakdown(psgc: number | "ph", suppliers: number) {
  const r = rng(`sector-${psgc}`)
  const base = [0.34, 0.24, 0.12, 0.1, 0.08, 0.12]
  const w = base.map((b) => b * between(r, 0.7, 1.3))
  const sum = w.reduce((a, b) => a + b, 0)
  return SECTORS.map((label, i) => ({ label, value: Math.round((suppliers * w[i]) / sum) })).sort(
    (a, b) => b.value - a.value
  )
}
