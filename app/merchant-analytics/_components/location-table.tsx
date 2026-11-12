"use client"

import { useMemo, useState } from "react"
import { Download, Search } from "lucide-react"

import { downloadCsv } from "@/components/ocds/csv"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type SupplierLocation } from "@/lib/merchant-analytics-data"

export function LocationTable({
  locations,
  regionNames,
}: {
  locations: SupplierLocation[]
  regionNames: Record<string, string>
}) {
  const [q, setQ] = useState("")
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return locations
    return locations.filter((l) =>
      [l.barangay, l.city, l.province, regionNames[l.region]].some((v) => v?.toLowerCase().includes(needle))
    )
  }, [locations, q, regionNames])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search barangay, city or province"
            aria-label="Search locations"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "suppliers-by-barangay.csv",
              ["Region", "Province", "City / Municipality", "Barangay", "Suppliers"],
              rows.map((l) => [regionNames[l.region] ?? l.region, l.province, l.city, l.barangay, l.suppliers])
            )
          }
        >
          <Download /> Export CSV
        </Button>
      </div>
      <div className="max-h-105 overflow-y-auto border-t">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="pl-4">Barangay</TableHead>
              <TableHead>City / Municipality</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="pr-4 text-right">Suppliers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={`${l.city}-${l.barangay}`}>
                <TableCell className="pl-4 font-medium">{l.barangay}</TableCell>
                <TableCell>{l.city}</TableCell>
                <TableCell className="text-muted-foreground">{l.province}</TableCell>
                <TableCell className="text-muted-foreground">{regionNames[l.region] ?? l.region}</TableCell>
                <TableCell className="pr-4 text-right font-medium tabular-nums">{formatCount(l.suppliers)}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No barangays match “{q}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
