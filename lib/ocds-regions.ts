/**
 * Philippine regions — shared by every region filter.
 *
 * Backend contract: GET /api/ocds/regions
 * Response: OcdsRegion[] — in the order they should appear in the dropdown.
 */
export type OcdsRegion = {
  /** Value sent as `?region=` to region-filtered endpoints. */
  code: string
  /** Label shown in the UI and returned as `region` on awardee rows. */
  name: string
}

// Dummy data shaped exactly like the backend response.
// Replace the body of `getRegions` with:
//   const res = await fetch(`${API_URL}/ocds/regions`)
//   if (!res.ok) return []
//   return (await res.json()) as OcdsRegion[]
const MOCK_REGIONS: OcdsRegion[] = [
  { code: "NCR", name: "NCR" },
  { code: "CAR", name: "CAR" },
  { code: "I", name: "Region I" },
  { code: "II", name: "Region II" },
  { code: "III", name: "Region III" },
  { code: "IV-A", name: "Region IV-A" },
  { code: "IV-B", name: "Region IV-B" },
  { code: "V", name: "Region V" },
  { code: "VI", name: "Region VI" },
  { code: "VII", name: "Region VII" },
  { code: "VIII", name: "Region VIII" },
  { code: "IX", name: "Region IX" },
  { code: "X", name: "Region X" },
  { code: "XI", name: "Region XI" },
  { code: "XII", name: "Region XII" },
  { code: "XIII", name: "Region XIII" },
  { code: "NIR", name: "NIR" },
  { code: "BARMM", name: "BARMM" },
]

export async function getRegions(): Promise<OcdsRegion[]> {
  return MOCK_REGIONS
}

/** Returns the `?region=` code if it's a known region, otherwise null (= all regions). */
export function resolveRegion(
  value: string | string[] | undefined,
  regions: OcdsRegion[]
): string | null {
  const code = Array.isArray(value) ? value[0] : value
  return regions.some((r) => r.code === code) ? code! : null
}
