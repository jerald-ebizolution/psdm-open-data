/**
 * Green Procurement (module 09, BRD 15.3.9) — GPP overview and compliance,
 * carbon footprint and SDG alignment.
 *
 * Total procurement per channel reuses existing modules (eMarketplace
 * transaction value; e-Bidding awarded value from OCDS statistics), so the GPP
 * share is measured against the same totals shown elsewhere. Green shares,
 * certifications, OCR results and emission figures are a seeded mock.
 * Backend contracts to replace it:
 *   GET /api/gpp/summary?fy=&region=&channel=&category=   → GppSummary
 *   GET /api/gpp/denr-products?fy=&category=               → DenrProduct[]
 *
 * Emission factors below are placeholders: confirm the DOE grid factor and the
 * IPCC Tier 1 defaults before go-live. SAMPLE DATA.
 */

import { between, REGION_WEIGHTS, rng } from "@/lib/analytics-mock"
import { getEmarketplaceSummary } from "@/lib/emarketplace-data"
import { getAgencyRegister } from "@/lib/government-agency-data"
import { getTotalContract } from "@/lib/ocds-statistics"

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type Channel = "emarketplace" | "ebidding"
export const CHANNELS: { code: Channel; name: string }[] = [
  { code: "emarketplace", name: "eMarketplace" },
  { code: "ebidding", name: "e-Bidding" },
]

export type GppCategory = {
  code: string
  name: string
  /** Share of each channel's spend in this category */
  share: Record<Channel, number>
  /** Share of category spend meeting green criteria */
  green: number
  greenItems: string[]
}

export const GPP_CATEGORIES: GppCategory[] = [
  { code: "paper", name: "Paper and office supplies", share: { emarketplace: 0.3, ebidding: 0.03 }, green: 0.22, greenItems: ["Recycled bond paper", "Recycled-content folders", "Refillable pens"] },
  { code: "it", name: "IT equipment", share: { emarketplace: 0.18, ebidding: 0.08 }, green: 0.14, greenItems: ["Energy-efficient laptops", "Energy-efficient monitors", "Duplex printers with low-power mode"] },
  { code: "lighting", name: "Lighting and electrical", share: { emarketplace: 0.05, ebidding: 0.05 }, green: 0.41, greenItems: ["LED lamps", "LED streetlights", "Solar-powered lights"] },
  { code: "cooling", name: "Air-conditioning", share: { emarketplace: 0.06, ebidding: 0.04 }, green: 0.33, greenItems: ["Inverter air conditioners"] },
  { code: "vehicles", name: "Vehicles and fuel", share: { emarketplace: 0.04, ebidding: 0.1 }, green: 0.06, greenItems: ["Electric vehicles", "Hybrid vehicles"] },
  { code: "cleaning", name: "Cleaning products", share: { emarketplace: 0.1, ebidding: 0.01 }, green: 0.18, greenItems: ["Biodegradable detergents", "Refill-pack cleaners"] },
  { code: "furniture", name: "Furniture", share: { emarketplace: 0.07, ebidding: 0.04 }, green: 0.09, greenItems: ["Certified-wood furniture", "Recycled-plastic chairs"] },
  { code: "construction", name: "Construction materials", share: { emarketplace: 0.02, ebidding: 0.55 }, green: 0.04, greenItems: ["Recycled-content aggregates", "Low-VOC paints"] },
  { code: "food", name: "Food and catering", share: { emarketplace: 0.18, ebidding: 0.1 }, green: 0.05, greenItems: ["Plastic-free catering", "Locally sourced produce"] },
]

export type GppFilter = { fiscalYear: number; region: string | null; channel: Channel | null; category: string | null }

type Params = { [key: string]: string | string[] | undefined }
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseGppFilter(params: Params, fiscalYear: number, regionCodes: string[]): GppFilter {
  const region = first(params.region)
  const channel = first(params.channel)
  const category = first(params.category)
  return {
    fiscalYear,
    region: region && regionCodes.includes(region) ? region : null,
    channel: CHANNELS.some((c) => c.code === channel) ? (channel as Channel) : null,
    category: GPP_CATEGORIES.some((c) => c.code === category) ? category! : null,
  }
}

const key = (f: GppFilter) => `${f.fiscalYear}-${f.region}-${f.channel}-${f.category}`

// ---------------------------------------------------------------------------
// Carbon factors (placeholders — confirm with DOE / IPCC)
// ---------------------------------------------------------------------------

/** DOE grid emission factor, tCO2e per MWh (placeholder). */
export const GRID_FACTOR = 0.7
/** IPCC Tier 1 default for gasoline / diesel vehicles, tCO2e per vehicle-year avoided (placeholder). */
export const VEHICLE_FACTOR = 2.4

export type SdgCode = 7 | 11 | 12 | 13
export const SDGS: { code: SdgCode; name: string; color: string; basis: string }[] = [
  { code: 7, name: "Affordable and Clean Energy", color: "#b7791f", basis: "Energy-efficient and renewable-energy items" },
  { code: 11, name: "Sustainable Cities and Communities", color: "#c2410c", basis: "Clean vehicles, street lighting and green building materials" },
  { code: 12, name: "Responsible Consumption and Production", color: "#8a5a19", basis: "Recycled, refillable, biodegradable and certified products" },
  { code: 13, name: "Climate Action", color: "#166534", basis: "All purchases with measured emission savings" },
]

type EnergyItem = {
  name: string
  category: string
  unitPrice: number
  /** Energy saved per unit per year, kWh (null when measured per vehicle) */
  kwhSaved: number | null
  sdgs: SdgCode[]
  factorBasis: string
}

const ENERGY_ITEMS: EnergyItem[] = [
  { name: "LED lamps", category: "lighting", unitPrice: 180, kwhSaved: 42, sdgs: [7, 13], factorBasis: "DOE grid factor" },
  { name: "LED streetlights", category: "lighting", unitPrice: 14500, kwhSaved: 520, sdgs: [7, 11, 13], factorBasis: "DOE grid factor" },
  { name: "Solar-powered lights", category: "lighting", unitPrice: 9800, kwhSaved: 310, sdgs: [7, 11, 13], factorBasis: "DOE grid factor" },
  { name: "Inverter air conditioners", category: "cooling", unitPrice: 36000, kwhSaved: 640, sdgs: [7, 13], factorBasis: "DOE grid factor" },
  { name: "Energy-efficient monitors", category: "it", unitPrice: 7200, kwhSaved: 58, sdgs: [7, 12, 13], factorBasis: "DOE grid factor" },
  { name: "Energy-efficient laptops", category: "it", unitPrice: 41000, kwhSaved: 46, sdgs: [7, 12, 13], factorBasis: "DOE grid factor" },
  { name: "Electric vehicles", category: "vehicles", unitPrice: 1.9e6, kwhSaved: null, sdgs: [11, 13], factorBasis: "IPCC Tier 1 (fuel)" },
  { name: "Hybrid vehicles", category: "vehicles", unitPrice: 1.6e6, kwhSaved: null, sdgs: [11, 13], factorBasis: "IPCC Tier 1 (fuel)" },
]

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export type CategoryRow = {
  code: string
  name: string
  spend: number
  greenSpend: number
  /** Share of category spend meeting green criteria */
  compliance: number
  items: { name: string; greenSpend: number }[]
}

export type EnergyRow = { name: string; category: string; units: number; mwhSaved: number | null; tco2e: number; sdgs: SdgCode[]; factorBasis: string }

export type DenrProduct = { product: string; category: string; supplier: string; certificate: string; validUntil: string }

export type GppSummary = {
  totalSpend: number
  greenSpend: number
  certifiedSuppliers: number
  taggedAtRegistration: number
  compliantAgencies: number
  agencies: number
  prTaggedShare: number
  channels: { code: Channel; name: string; spend: number; greenSpend: number; coverage: number }[]
  categories: CategoryRow[]
  ocr: { label: string; value: number }[]
  energy: EnergyRow[]
  tco2e: number
  sdgs: { code: SdgCode; name: string; color: string; basis: string; items: number; spend: number; tco2e: number }[]
  denrProducts: DenrProduct[]
}

const SUPPLIER_NAMES = ["Luntian Trading", "Kalikasan Supply", "Berde Enterprises", "Sinag Solar Solutions", "Lunas Office Systems", "Hiraya Eco-Builders", "Malinis Cleaning Supply", "Tala Lighting Corp.", "Dalisay Furniture", "Alon EV Mobility"]

export async function getGppSummary(f: GppFilter): Promise<GppSummary> {
  const r = rng(`09-${key(f)}`)
  const regionShare = f.region ? (REGION_WEIGHTS[f.region] ?? 0) : 1
  const [emp, contract, register] = await Promise.all([
    getEmarketplaceSummary({ fiscalYear: f.fiscalYear, region: f.region, agency: null, item: null }),
    getTotalContract(f.fiscalYear),
    getAgencyRegister(f.fiscalYear),
  ])
  const channelTotal: Record<Channel, number> = {
    emarketplace: emp.transactionValue,
    ebidding: (contract?.amount ?? 0) * regionShare,
  }
  const yearBoost = f.fiscalYear >= 2026 ? 1 : 0.86 // green share grows year on year
  const activeChannels = CHANNELS.filter((c) => !f.channel || c.code === f.channel)
  const activeCategories = GPP_CATEGORIES.filter((c) => !f.category || c.code === f.category)

  const categories: CategoryRow[] = activeCategories
    .map((cat) => {
      const cr = rng(`09-cat-${cat.code}-${key(f)}`)
      const spend = activeChannels.reduce((s, ch) => s + channelTotal[ch.code] * cat.share[ch.code], 0)
      const compliance = Math.min(0.9, cat.green * yearBoost * between(cr, 0.85, 1.15))
      const greenSpend = spend * compliance
      const w = cat.greenItems.map(() => between(cr, 0.4, 1))
      const wsum = w.reduce((a, b) => a + b, 0)
      return {
        code: cat.code,
        name: cat.name,
        spend,
        greenSpend,
        compliance,
        items: cat.greenItems.map((name, i) => ({ name, greenSpend: (greenSpend * w[i]) / wsum })),
      }
    })
    .sort((a, b) => b.greenSpend - a.greenSpend)

  const totalSpend = categories.reduce((s, c) => s + c.spend, 0)
  const greenSpend = categories.reduce((s, c) => s + c.greenSpend, 0)

  const channels = CHANNELS.map((ch) => {
    const spend = activeCategories.reduce((s, cat) => s + channelTotal[ch.code] * cat.share[ch.code], 0)
    const green = categories.reduce((s, c) => {
      const cat = GPP_CATEGORIES.find((x) => x.code === c.code)!
      return s + channelTotal[ch.code] * cat.share[ch.code] * c.compliance
    }, 0)
    return {
      code: ch.code,
      name: ch.name,
      spend,
      greenSpend: green,
      // Share of transactions where green criteria were checked (tag present).
      coverage: ch.code === "emarketplace" ? between(r, 0.78, 0.9) : between(r, 0.41, 0.58),
    }
  }).filter((c) => !f.channel || c.code === f.channel)

  // Energy-efficient items and avoided emissions.
  const energy: EnergyRow[] = ENERGY_ITEMS.filter((i) => !f.category || i.category === f.category)
    .map((item) => {
      const cat = categories.find((c) => c.code === item.category)
      const itemSpend = cat?.items.find((x) => x.name === item.name)?.greenSpend ?? 0
      const units = Math.round(itemSpend / item.unitPrice)
      const mwhSaved = item.kwhSaved === null ? null : (units * item.kwhSaved) / 1000
      const tco2e = mwhSaved === null ? units * VEHICLE_FACTOR : mwhSaved * GRID_FACTOR
      return { name: item.name, category: item.category, units, mwhSaved, tco2e, sdgs: item.sdgs, factorBasis: item.factorBasis }
    })
    .filter((e) => e.units > 0)
    .sort((a, b) => b.tco2e - a.tco2e)
  const tco2e = energy.reduce((s, e) => s + e.tco2e, 0)

  const sdgCategories: Record<SdgCode, string[]> = {
    7: ["lighting", "cooling", "it"],
    11: ["vehicles", "construction", "lighting"],
    12: ["paper", "cleaning", "furniture", "food", "it"],
    13: GPP_CATEGORIES.map((c) => c.code),
  }

  const scopedAgencies = register.filter((a) => a.procurements > 0 && (!f.region || a.region === f.region))
  const compliantAgencies = Math.round(scopedAgencies.length * between(r, 0.34, 0.42) * yearBoost)

  const docs = Math.round(between(r, 0.9, 1.1) * 48000 * regionShare * (f.fiscalYear >= 2026 ? 1 : 0.7))
  const detected = Math.round(docs * between(r, 0.27, 0.33))
  const matched = Math.round(detected * between(r, 0.62, 0.72))

  const pr = rng(`09-denr-${f.fiscalYear}`)
  const denrProducts: DenrProduct[] = GPP_CATEGORIES.flatMap((cat) => cat.greenItems.map((item) => ({ item, cat })))
    .filter(({ cat }) => !f.category || cat.code === f.category)
    .slice(0, 12)
    .map(({ item, cat }, i) => ({
      product: item,
      category: cat.name,
      supplier: SUPPLIER_NAMES[Math.floor(pr() * SUPPLIER_NAMES.length)],
      certificate: `SAMPLE-${f.fiscalYear}-${String(101 + i * 7).padStart(4, "0")}`,
      validUntil: `${f.fiscalYear + 1 + Math.floor(pr() * 2)}-${String(1 + Math.floor(pr() * 12)).padStart(2, "0")}-28`,
    }))

  return {
    totalSpend,
    greenSpend,
    certifiedSuppliers: Math.round(1126 * regionShare * (f.fiscalYear >= 2026 ? 1 : 0.83)),
    taggedAtRegistration: Math.round(3480 * regionShare * (f.fiscalYear >= 2026 ? 1 : 0.8)),
    compliantAgencies,
    agencies: scopedAgencies.length,
    prTaggedShare: between(r, 0.46, 0.58) * yearBoost,
    channels,
    categories,
    ocr: [
      { label: "Documents read", value: docs },
      { label: "Green specifications detected", value: detected },
      { label: "Matched to a DENR certification", value: matched },
      { label: "Sent for manual review", value: detected - matched },
    ],
    energy,
    tco2e,
    sdgs: SDGS.map((sdg) => {
      const cats = categories.filter((c) => sdgCategories[sdg.code].includes(c.code))
      const items = energy.filter((e) => e.sdgs.includes(sdg.code))
      return {
        ...sdg,
        // Green item types in the categories mapped to this SDG.
        items: cats.reduce((s, c) => s + c.items.length, 0),
        spend: cats.reduce((s, c) => s + c.greenSpend, 0),
        tco2e: items.reduce((s, e) => s + e.tco2e, 0),
      }
    }),
    denrProducts,
  }
}
