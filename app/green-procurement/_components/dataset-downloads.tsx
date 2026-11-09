"use client"

import { Download, ShieldCheck } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { Button } from "@/components/ui/button"
import { type GppSummary } from "@/lib/green-procurement-data"

/**
 * Open datasets. Supplier names and IDs are never included, so the files can be
 * published without exposing individual suppliers.
 */
export function DatasetDownloads({ data, fiscalYear }: { data: Pick<GppSummary, "categories" | "energy" | "denrProducts">; fiscalYear: number }) {
  const datasets = [
    {
      label: "Green spend by category",
      file: `gpp-category-${fiscalYear}.csv`,
      header: ["Category", "Item", "Green spend (PHP)", "Category spend (PHP)", "Compliance %"],
      rows: () =>
        data.categories.flatMap((c) =>
          c.items.map((i) => [c.name, i.name, Math.round(i.greenSpend), Math.round(c.spend), Math.round(c.compliance * 1000) / 10])
        ),
    },
    {
      label: "Avoided emissions by item",
      file: `gpp-emissions-${fiscalYear}.csv`,
      header: ["Item", "Units", "Energy saved (MWh/yr)", "Avoided tCO2e", "Factor basis", "SDGs"],
      rows: () =>
        data.energy.map((e) => [e.name, e.units, e.mwhSaved === null ? "" : Math.round(e.mwhSaved), Math.round(e.tco2e), e.factorBasis, e.sdgs.join(" ")]),
    },
    {
      label: "DENR-certified products",
      file: `gpp-denr-products-${fiscalYear}.csv`,
      header: ["Product", "Category", "Valid until"],
      rows: () => data.denrProducts.map((p) => [p.product, p.category, p.validUntil]),
    },
  ]

  return (
    <div className="space-y-2">
      {datasets.map((d) => (
        <Button key={d.file} variant="outline" className="w-full justify-start" onClick={() => downloadCsv(d.file, d.header, d.rows())}>
          <Download /> {d.label}
        </Button>
      ))}
      <p className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-700" aria-hidden />
        Datasets leave out supplier names and IDs to protect supplier privacy.
      </p>
    </div>
  )
}
