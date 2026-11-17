/**
 * Chart colours — the categorical palette used by BetterGov.ph (Recharts),
 * kept in a plain module so server pages and client charts can both import it.
 * Assign in this fixed order; never cycle past it for more series.
 */
export const PALETTE = [
  "#0088FE", // blue
  "#00C49F", // teal
  "#FFBB28", // yellow
  "#FF8042", // orange
  "#8884D8", // purple
  "#82CA9D", // green
  "#8DD1E1", // sky
  "#A4DE6C", // lime
  "#D0ED57", // chartreuse
  "#FAAAA3", // pink
] as const

export const SERIES = {
  blue: PALETTE[0],
  aqua: PALETTE[1],
  yellow: PALETTE[2],
  orange: PALETTE[3],
  purple: PALETTE[4],
  green: PALETTE[5],
  /** Prior-period comparison lines */
  muted: "#9CA3AF",
} as const

export type ValueFormat = "count" | "peso" | "percent"
