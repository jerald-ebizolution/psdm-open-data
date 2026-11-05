"use client";

import { useMemo } from "react";

import { getChartDataByYear } from "@/lib/regional-budget-data";
// import { BudgetBarRechart } from "@/components/dashboard/budget-bar-rechart";
import BudgetBarEchart from "../budget-bar-echart";
// import BudgetBarEchartDrilldown from "../budget-bar-echart-drilldown";

type RegionalBarChartProps = {
  year: string;
  years: string[];
  onYearChange: (value: string) => void;
};

export function RegionalBarChart({ year, years, onYearChange }: RegionalBarChartProps) {
  const data = useMemo(() => getChartDataByYear(year), [year]);
  // const data2 = useMemo(() => getChartDataByRegion(data[0].region ?? ""), [data[0].region]);
  return (
    // // BAR CHART WITH RECHART
    // <BudgetBarRechart
    //   defaultOrientation="vertical"
    //   data={data}
    //   xDataKey="region"
    //   chartKey={year}
    //   categoryAxisWidth={160}
    //   categoryAxisAngle={-32}
    // />

    // BAR CHART WITH APACHE ECHART
    <BudgetBarEchart
      data={data}
      defaultOrientation="vertical"
      xDataKey="region"
      chartKey={year}
      years={years}
      categoryAxisWidth={160}
      categoryAxisAngle={-32}
      filter={{
        id: "year-filter",
        label: "Filter by Year",
        value: year,
        options: years,
        onValueChange: onYearChange,
      }}
    />

    // // BAR CHART WITH APACHE ECHART
    // <BudgetBarEchartDrilldown
    //   budgetData={{
    //     yearlyPerRegionData: {
    //       name: year,
    //       data
    //     },
    //     regionPerYearData: {
    //       name: data[0].region,
    //       data: data2
    //     }
    //   }}
    //   defaultOrientation="vertical"
    //   xDataKey="region"
    //   chartKey={year}
    //   categoryAxisWidth={160}
    //   categoryAxisAngle={-32}
    // />
  );
}
