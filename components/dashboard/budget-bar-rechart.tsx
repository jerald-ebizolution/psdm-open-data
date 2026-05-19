"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { BarValueLabel } from "@/components/dashboard/bar-value-label";
import {
  formatAxisValue,
  getYAxisMax,
  getYAxisTicks,
} from "@/lib/regional-budget-data";

const BAR_COLOR = "#2563eb";
export const CHART_HEIGHT = 400;

type BudgetBarRechartProps = {
  data: Array<
    { label: string; value: number; max: number } & Record<string, string | number>
  >;
  xDataKey: string;
  chartKey: string;
  xAxisAngle?: number;
  xAxisHeight?: number;
  legendLabel?: string;
};

export function BudgetBarRechart({
  data,
  xDataKey,
  chartKey,
  xAxisAngle = 0,
  xAxisHeight = 32,
  legendLabel = "Budget allocation (₱M)",
}: BudgetBarRechartProps) {
  const yMax = useMemo(() => getYAxisMax(data), [data]);
  const yTicks = useMemo(() => getYAxisTicks(yMax), [yMax]);
    // console.log(yTicks, "yTicks")
    // console.log(yMax, "yMax")
  return (
    <div
      key={chartKey}
      className="w-full animate-in fade-in duration-500"
      style={{ height: CHART_HEIGHT }}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart
          data={data}
          margin={{
            top: 32,
            right: 12,
            left: 8,
            bottom: xAxisAngle ? 48 : 24,
          }}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey={xDataKey}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tick={{ fill: "#6b7280", fontSize: 9 }}
            interval={0}
            angle={xAxisAngle}
            textAnchor={xAxisAngle ? "end" : "middle"}
            height={xAxisHeight}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            ticks={yTicks}
            domain={[0, yMax]}
            tickFormatter={formatAxisValue}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={56}
          />
          <Legend
            verticalAlign="bottom"
            align="left"
            iconType="square"
            iconSize={10}
            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
          />
          <Bar
            name={legendLabel}
            dataKey="value"
            fill={BAR_COLOR}
            radius={[4, 4, 0, 0]}
            animationDuration={600}
            animationEasing="ease-out"
            maxBarSize={40}
          >
            <LabelList
              dataKey="label"
              content={<BarValueLabel />}
              position="top"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
