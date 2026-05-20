"use client";

import { useMemo } from "react";

import { BudgetBarRechart } from "@/components/dashboard/budget-bar-rechart";
import { getChartDataByRegion } from "@/lib/regional-budget-data";
// import BudgetBarEchart from "../budget-bar-echart";

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
    // <BudgetBarEchart
    //   data={data}
    //   defaultOrientation="vertical"
    //   xDataKey="year"
    //   chartKey={region}
    //   categoryAxisWidth={160}
    //   categoryAxisAngle={-32}
    // />
  );
}
