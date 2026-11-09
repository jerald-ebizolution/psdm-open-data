/**
 * Modes of procurement — shared by every "All modes" filter.
 *
 * Backend contract: GET /api/ocds/procurement-modes
 * Response: OcdsProcurementMode[] — in dropdown order.
 */
export type OcdsProcurementMode = {
  /** Value sent as `?mode=` to mode-filtered endpoints. */
  code: string
  /** Label shown in the UI and returned as `procurementMode` on rows. */
  name: string
}

// Dummy data shaped exactly like the backend response.
// Replace the body of `getProcurementModes` with:
//   const res = await fetch(`${API_URL}/ocds/procurement-modes`)
//   if (!res.ok) return []
//   return (await res.json()) as OcdsProcurementMode[]
const MOCK_MODES: OcdsProcurementMode[] = [
  { code: "public-bidding", name: "Public Bidding" },
  { code: "small-value", name: "Small Value Procurement" },
  { code: "shopping", name: "Shopping" },
  { code: "negotiated", name: "Negotiated Procurement" },
  { code: "direct-contracting", name: "Direct Contracting" },
  { code: "limited-source", name: "Limited Source Bidding" },
]

export async function getProcurementModes(): Promise<OcdsProcurementMode[]> {
  return MOCK_MODES
}

/** Returns the `?mode=` code if it's a known mode, otherwise null (= all modes). */
export function resolveMode(
  value: string | string[] | undefined,
  modes: OcdsProcurementMode[]
): string | null {
  const code = Array.isArray(value) ? value[0] : value
  return modes.some((m) => m.code === code) ? code! : null
}

export const modeName = (code: string | null, modes: OcdsProcurementMode[]) =>
  modes.find((m) => m.code === code)?.name ?? null
