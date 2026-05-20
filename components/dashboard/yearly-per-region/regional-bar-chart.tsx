"use client";

import { useMemo } from "react";

import { getChartDataByYear } from "@/lib/regional-budget-data";
import { BudgetBarRechart } from "@/components/dashboard/budget-bar-rechart";
// import BudgetBarEchart from "../budget-bar-echart";

type RegionalBarChartProps = {
  year: string;
};

export function RegionalBarChart({ year }: RegionalBarChartProps) {
  const data = useMemo(() => getChartDataByYear(year), [year]);
  return (
    <BudgetBarRechart
      defaultOrientation="vertical"
      data={data}
      xDataKey="region"
      chartKey={year}
      categoryAxisWidth={160}
      categoryAxisAngle={-32}
    />
    // <BudgetBarEchart
    //   data={data}
    //   defaultOrientation="vertical"
    //   xDataKey="region"
    //   chartKey={year}
    //   categoryAxisWidth={160}
    //   categoryAxisAngle={-32}
    // />
  );
}
