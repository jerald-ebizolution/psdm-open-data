// Shared building blocks for dummy data. Delete once every endpoint is live.

export const MOCK_ENTITIES = [
  { name: "Municipality of San Rafael de Montaña", region: "Region III" },
  { name: "District Hospital of Pinagpala", region: "Region VI" },
  { name: "Municipality of Sta. Barbara del Sur", region: "Region VII" },
  { name: "City Government of Bagong Lungsod", region: "NCR" },
  { name: "Northern Valley State College", region: "Region II" },
  { name: "Provincial Government of Isla Verde", region: "Region IV-B" },
  { name: "City Government of Maharlika Heights", region: "Region XI" },
  { name: "Department of Agriculture – Region V", region: "Region V" },
  { name: "Department of Health – CHD Region IX", region: "Region IX" },
  { name: "DPWH – Region II", region: "Region II" },
  { name: "Bureau of Fire Protection – Region XII", region: "Region XII" },
  { name: "Commission on Elections – Region I", region: "Region I" },
  { name: "Bureau of Jail Management and Penology – NCR", region: "NCR" },
  { name: "Department of Labor and Employment – Region VI", region: "Region VI" },
  { name: "DENR – Region XI", region: "Region XI" },
]

export const MOCK_PROJECTS = [
  "Supply and Delivery of Office Supplies",
  "Repair of Barangay Health Station",
  "Supply of Drugs and Medicines",
  "Concreting of Farm-to-Market Road",
  "Procurement of IT Equipment",
  "Janitorial Services",
  "Security Services",
  "Supply of School Furniture",
  "Rehabilitation of Drainage System",
  "Catering Services for Trainings",
]

export const MOCK_AWARDEES = [
  "Agri-Supply Hub Trading",
  "Mindanao Road Works Corp.",
  "Guardian Shield Security Agency",
  "Mabini Woodcraft Corp.",
  "CleanPro Services",
  "Rizal Builders Inc.",
  "Acme Supplies Inc.",
]

export const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length]

/** "2026-09-03" + 4 → "2026-09-07" (UTC, no timezone drift). */
export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Spreads n dates backwards from `latest`, newest first, `step` days apart. */
export const dateBefore = (latest: string, i: number, step = 3) => addDays(latest, -i * step)
