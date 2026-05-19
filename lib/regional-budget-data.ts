export type RegionalBudgetEntry = {
  region: string;
  min: number;
  max: number;
  label: string;
};

export type YearlyBudgetEntry = {
  year: string;
  min: number;
  max: number;
  label: string;
};

type RawBudgetRecord = {
  year: string;
  region: string;
  min: number;
  max: number;
  color: string;
};

export const YEAR_WINDOW = 10;

const REGIONS = [
  "Region I – Ilocos Region",
  "Region II – Cagayan Valley",
  "Region III – Central Luzon",
  "Region IV‑A – CALABARZON",
  "MIMAROPA Region",
  "Region V – Bicol Region",
  "Region VI – Western Visayas",
  "Region VII – Central Visayas",
  "Region VIII – Eastern Visayas",
  "Region IX – Zamboanga Peninsula",
  "Region X – Northern Mindanao",
  "Region XI – Davao Region",
  "Region XII – SOCCSKSARGEN",
  "Region XIII – Caraga",
  "NCR – National Capital Region",
  "CAR – Cordillera Administrative Region",
  "BARMM – Bangsamoro Autonomous Region in Muslim Mindanao",
  "NIR – Negros Island Region",
] as const;

function formatRangeLabel(min: number, max: number): string {
  const format = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}b` : `${n}m`;
  return `₱${format(min)}–₱${format(max)}`;
}

// function hashSeed(region: string, year: string): number {
//   const key = `${region}:${year}`;
//   let hash = 0;
//   for (let i = 0; i < key.length; i++) {
//     hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
//   }
//   return hash;
// }

/**
 * Generate a random pattern for budget values based on region and year.
 * This uses a seeded PRNG for determinism (region+year).
 */
function generateRange(
  region: string,
  year: string
): { min: number; max: number } {
  // Create a simple deterministic hash based on region & year
  const key = `${region}:${year}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  function seededRand(range: number, offset = 0): number {
    // Mulberry32 like PRNG with hash as seed
    let t = hash + offset;
    t = (t ^ (t >>> 15)) * (1 | t);
    t = (t + (t << 13)) ^ t;
    t = (t ^ (t >>> 7)) ^ t;
    return Math.abs(t % range);
  }

  // Set reasonable minimum and maximum range values
  const min = 220 + seededRand(600, 17); // from 220 up to 819
  // Allow max to be a bit above min, with spacing at least 80 up to 180
  const max = Math.max(min + 80, Math.min(1000, min + seededRand(100, 31) + 80));

  return { min, max };
}

function buildRecords(): RawBudgetRecord[] {
  const latestYear = new Date().getFullYear();
  const startYear = latestYear - YEAR_WINDOW + 1;
  const records: RawBudgetRecord[] = [];

  // // Helper to generate a random hex color in the form "#RRGGBB"
  function randomColor() {
    // Generates bright, visually distinct colors
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue},62%,48%)`;
  }

  for (let year = startYear; year <= latestYear; year++) {
    for (const region of REGIONS) {
      const { min, max } = generateRange(region, String(year));
      // Use a deterministic color based on region, for consistency per region
      let colorSeed = 0;
      const seedKey = `${region}`;
      for (let i = 0; i < seedKey.length; i++) {
        colorSeed = (colorSeed * 31 + seedKey.charCodeAt(i)) >>> 0;
      }
      // Seeded HSL color
      // const hue = colorSeed % 360;
      const color = randomColor();

      records.push({ year: String(year), region, min, max, color });
    }
  }

  return records;
}

const budgetRecords: RawBudgetRecord[] = buildRecords();

export function getLatestYear(): string {
  return budgetRecords.reduce(
    (latest, r) => (r.year > latest ? r.year : latest),
    budgetRecords[0]?.year ?? "2025"
  );
}

export function getAvailableYears(): string[] {
  return [...new Set(budgetRecords.map((r) => r.year))].sort();
}

export function getLastNYears(count = YEAR_WINDOW): string[] {
  const years = getAvailableYears();
  return years.slice(-count);
}

export function getAvailableRegions(): string[] {
  return [...new Set(budgetRecords.map((r) => r.region))];
}

export function getRegionsForYear(year: string): string[] {
  return budgetRecords
    .filter((r) => r.year === year)
    .map((r) => r.region);
}

export function getBudgetForYear(year: string): RegionalBudgetEntry[] {
  return budgetRecords
    .filter((r) => r.year === year)
    .map(({ region, min, max, color }) => ({
      region,
      min,
      max,
      label: formatRangeLabel(min, max),
      color,
    }));
}

export function getBudgetForRegion(
  region: string,
  years = getLastNYears()
): YearlyBudgetEntry[] {
  const yearSet = new Set(years);
  return budgetRecords
    .filter((r) => r.region === region && yearSet.has(r.year))
    .sort((a, b) => a.year.localeCompare(b.year))
    .map(({ year, min, max, color }) => ({
      year,
      min,
      max,
      label: formatRangeLabel(min, max),
      color,
    }));
}

export function getChartDataByYear(year: string) {
  return getBudgetForYear(year).map((item) => ({
    ...item,
    value: item.max,
  }));
}

export function getChartDataByRegion(region: string) {
  return getBudgetForRegion(region).map((item) => ({
    ...item,
    value: item.max,
  }));
}

export function getYAxisMax(
  entries: { max: number }[],
  paddingRatio = 0.1
): number {
  const peak = entries.reduce((max, item) => Math.max(max, item.max), 0);
  return Math.ceil((peak * (1 + paddingRatio)) / 100) * 100;
}

export function getYAxisTicks(max: number): number[] {
  const step = max <= 600 ? 100 : 200;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) {
    ticks.push(v);
  }
  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max);
  }
  return ticks;
}

export function formatAxisValue(value: number): string {
  if (value >= 1000) {
    const billions = value / 1000;
    return billions % 1 === 0 ? `₱${billions}B` : `₱${billions.toFixed(1)}B`;
  }
  return `₱${value}M`;
}

// Back-compat for existing imports
export type YearKey = string;
export const AVAILABLE_YEARS = getAvailableYears();
export function getChartData(year: YearKey) {
  return getChartDataByYear(year);
}
