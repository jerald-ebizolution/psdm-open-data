"use client";

import { useMemo, useState } from "react";

import { RegionPerYearChart } from "@/components/dashboard/region-per-year-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAvailableRegions,
  getLastNYears,
  YEAR_WINDOW,
} from "@/lib/regional-budget-data";

export function RegionPerYearCard() {
  const regions = getAvailableRegions();
  const [region, setRegion] = useState(regions[0] ?? "");
  const years = useMemo(() => getLastNYears(), []);

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
            Region per Year
          </CardTitle>
          <CardDescription>
            Budget allocation ranges for {region} over the last {YEAR_WINDOW}{" "}
            years ({years[0]}–{years[years.length - 1]}). Values in Philippine
            Pesos (millions).
          </CardDescription>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="flex w-full flex-col gap-2 sm:max-w-[280px]">
            <Label htmlFor="region-filter">Filter by Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region-filter" className="w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <div className="w-full min-w-0">
          <RegionPerYearChart region={region} />
        </div>
      </CardContent>
    </Card>
  );
}
