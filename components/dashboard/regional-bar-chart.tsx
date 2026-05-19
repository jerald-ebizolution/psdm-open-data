"use client";

import { useMemo } from "react";

import { BudgetBarChart } from "@/components/dashboard/budget-bar-chart";
import { getChartDataByYear } from "@/lib/regional-budget-data";

type RegionalBarChartProps = {
  year: string;
};

export function RegionalBarChart({ year }: RegionalBarChartProps) {
  const data = useMemo(() => getChartDataByYear(year), [year]);

  return (
    <BudgetBarChart
      data={data}
      xDataKey="region"
      chartKey={year}
      xAxisAngle={-32}
      xAxisHeight={72}
    />
  );
}
