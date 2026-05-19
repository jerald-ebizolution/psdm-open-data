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
      data={data}
      xDataKey="region"
      chartKey={year}
      xAxisAngle={-32}
      xAxisHeight={72}
    />
  );
}
