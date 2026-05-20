"use client";

import { useMemo } from "react";

import { BudgetBarRechart } from "@/components/dashboard/budget-bar-rechart";
import { getChartDataByRegion } from "@/lib/regional-budget-data";

type RegionPerYearChartProps = {
  region: string;
};

export function RegionPerYearChart({ region }: RegionPerYearChartProps) {
  const data = useMemo(() => getChartDataByRegion(region), [region]);

  return (
    <BudgetBarRechart
      defaultOrientation="vertical"
      data={data}
      xDataKey="year"
      chartKey={region}
    />
  );
}
