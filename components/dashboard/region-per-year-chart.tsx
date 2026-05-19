"use client";

import { useMemo } from "react";

import { BudgetBarChart } from "@/components/dashboard/budget-bar-chart";
import { getChartDataByRegion } from "@/lib/regional-budget-data";

type RegionPerYearChartProps = {
  region: string;
};

export function RegionPerYearChart({ region }: RegionPerYearChartProps) {
  const data = useMemo(() => getChartDataByRegion(region), [region]);

  return (
    <BudgetBarChart
      data={data}
      xDataKey="year"
      chartKey={region}
    />
  );
}
