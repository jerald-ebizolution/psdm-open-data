"use client";

import { useMemo, useState } from "react";

import { RegionalBarChart } from "@/components/dashboard/regional-bar-chart";
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
  getAvailableYears,
  getLatestYear,
  getRegionsForYear,
} from "@/lib/regional-budget-data";

export function YearlyPerRegionCard() {
  const years = getAvailableYears();
  const [year, setYear] = useState(getLatestYear());
  const regions = useMemo(() => getRegionsForYear(year), [year]);

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
            Yearly Per Region
          </CardTitle>
          <CardDescription>
            Budget allocation ranges across regions for {year}. Showing{" "}
            {regions.length} region{regions.length === 1 ? "" : "s"}. Values in
            Philippine Pesos (millions).
          </CardDescription>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="flex w-full flex-col gap-2 sm:max-w-[220px]">
            <Label htmlFor="year-filter">Filter by Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year-filter" className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        <div className="w-full min-w-0">
          <RegionalBarChart year={year} />
        </div>
      </CardContent>
    </Card>
  );
}
