"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

import { BarValueLabel } from "@/components/dashboard/bar-value-label";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAxisValue,
  getYAxisMax,
  getYAxisTicks,
} from "@/lib/regional-budget-data";

export const CHART_HEIGHT = 400;

/** Column bars (grow upward) vs horizontal bars (grow rightward). */
export type BarChartOrientation = "vertical" | "horizontal";

const BAR_RADIUS: Record<BarChartOrientation, [number, number, number, number]> =
{
  vertical: [4, 4, 0, 0],
  horizontal: [0, 4, 4, 0],
};

function toRechartsLayout(
  orientation: BarChartOrientation,
): "horizontal" | "vertical" {
  return orientation === "horizontal" ? "vertical" : "horizontal";
}

function barFillColor(seed: string, index: number): string {
  let hash = index;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 62% 48%)`;
}

function coloredBarShape(
  props: BarShapeProps,
  xDataKey: string,
  orientation: BarChartOrientation,
): ReactElement {
  const fill = barFillColor(
    String(props.payload?.[xDataKey] ?? props.index),
    props.index,
  );
  return (
    <Rectangle {...props} fill={fill} radius={BAR_RADIUS[orientation]} />
  );
}

type BudgetBarRechartProps = {
  data: Array<
    { label: string; value: number; max: number } & Record<string, string | number>
  >;
  xDataKey: string;
  chartKey: string;
  /** Width reserved for category labels when bars are horizontal. */
  categoryAxisWidth?: number;
  /** Tilt category labels when bars are vertical (columns). */
  categoryAxisAngle?: number;
  defaultOrientation?: BarChartOrientation;
  legendLabel?: string;
};

export function BudgetBarRechart({
  data,
  xDataKey,
  chartKey,
  categoryAxisWidth = 140,
  categoryAxisAngle = 0,
  defaultOrientation = "horizontal",
  legendLabel = "Budget allocation (₱M)",
}: BudgetBarRechartProps) {
  const [orientation, setOrientation] =
    useState<BarChartOrientation>(defaultOrientation);

  const isHorizontal = orientation === "horizontal";
  const valueMax = useMemo(() => getYAxisMax(data), [data]);
  const valueTicks = useMemo(() => getYAxisTicks(valueMax), [valueMax]);
  const chartHeight = useMemo(
    () =>
      isHorizontal
        ? Math.max(CHART_HEIGHT, data.length * 36 + 80)
        : CHART_HEIGHT,
    [data.length, isHorizontal],
  );
  const barShape = useMemo(
    () => (props: BarShapeProps) =>
      coloredBarShape(props, xDataKey, orientation),
    [xDataKey, orientation],
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:mr-auto sm:max-w-[220px]">
        <Label htmlFor={`${chartKey}-bar-orientation`}>Bar orientation</Label>
        <Select
          value={orientation}
          onValueChange={(value) =>
            setOrientation(value as BarChartOrientation)
          }
        >
          <SelectTrigger
            id={`${chartKey}-bar-orientation`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal</SelectItem>
            <SelectItem value="vertical">Vertical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        key={`${chartKey}-${orientation}`}
        className="w-full animate-in fade-in duration-500"
        style={{ height: chartHeight }}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout={toRechartsLayout(orientation)}
            data={data}
            // margin={
            //   isHorizontal
            //     ? { top: 16, right: 24, left: 8, bottom: 24 }
            //     : {
            //         top: 32,
            //         right: 12,
            //         left: 8,
            //         bottom: categoryAxisAngle ? 48 : 24,
            //       }
            // }
            barCategoryGap="18%"
          >
            <Tooltip
              cursor={<Rectangle fill="rgba(0, 0, 0, 0.1)" />}
              formatter={(value, payload, item) => {
                return (
                  <span>{formatAxisValue(item?.payload?.min as number)} - {formatAxisValue(item?.payload.max as number)}</span>
                )
              }}
            />
            <CartesianGrid
              strokeDasharray="0"
              stroke="#e5e7eb"
              horizontal={!isHorizontal}
              vertical={isHorizontal}
            />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  ticks={valueTicks}
                  domain={[0, valueMax]}
                  tickFormatter={formatAxisValue}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  height={32}
                />
                <YAxis
                  type="category"
                  dataKey={xDataKey}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  width={categoryAxisWidth}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xDataKey}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  interval={0}
                  angle={categoryAxisAngle}
                  textAnchor={categoryAxisAngle ? "end" : "middle"}
                  height={categoryAxisAngle ? 72 : 32}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  ticks={valueTicks}
                  domain={[0, valueMax]}
                  tickFormatter={formatAxisValue}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  width={56}
                />
              </>
            )}
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
              shape={barShape}
              animationDuration={600}
              animationEasing="ease-out"
              maxBarSize={isHorizontal ? 28 : 40}
            >
              <LabelList
                dataKey="label"
                content={(props) => (
                  <BarValueLabel {...props} orientation={orientation} />
                )}
                position={isHorizontal ? "right" : "top"}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
