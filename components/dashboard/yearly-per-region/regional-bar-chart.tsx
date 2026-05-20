"use client";

import { useMemo } from "react";

import { BudgetBarRechart } from "@/components/dashboard/budget-bar-rechart";
import { getChartDataByYear } from "@/lib/regional-budget-data";

type RegionalBarChartProps = {
  year: string;
};

export function RegionalBarChart({ year }: RegionalBarChartProps) {
  const data = useMemo(() => getChartDataByYear(year), [year]);
  console.log(data, "data")
  return (
    <BudgetBarRechart
      defaultOrientation="vertical"
      data={data}
      xDataKey="region"
      chartKey={year}
      categoryAxisWidth={160}
      categoryAxisAngle={-32}
    />
  );
}
