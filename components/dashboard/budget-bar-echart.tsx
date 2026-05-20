"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAxisValue } from "@/lib/regional-budget-data";

export const CHART_HEIGHT = 500;

export type BarChartOrientation = "vertical" | "horizontal";

type BudgetBarEchartProps = {
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

const BudgetBarEchart = ({
  data,
  xDataKey,
  chartKey,
  categoryAxisWidth = 140,
  categoryAxisAngle = 0,
  defaultOrientation = "horizontal",
  legendLabel = "Budget allocation (₱M)",
}: BudgetBarEchartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] =
    useState<BarChartOrientation>(defaultOrientation);

  const isHorizontal = orientation === "horizontal";
  const chartHeight = useMemo(
    () =>
      isHorizontal
        ? Math.max(CHART_HEIGHT, data.length * 36 + 80)
        : CHART_HEIGHT,
    [data.length, isHorizontal],
  );

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    const chart = echarts.init(container);
    const categoryValues = data.map((item) => String(item[xDataKey]));
    const maxValue = Math.max(...data.map((item) => Number(item.value || 0)), 0);

    chart.setOption({
      // animationDuration: 600,
      // animationEasing: "cubicOut",
      tooltip: {},
      // tooltip: {
      //   trigger: "item",
      //   axisPointer: {
      //     type: "shadow",
      //     shadowStyle: {
      //       color: "rgba(0, 0, 0, 0.1)",
      //     },
      //   },
      //   formatter: (params: { data: { min?: number; max?: number; label?: string } }) => {
      //     const min = params.data?.min;
      //     const max = params.data?.max;
      //     if (typeof min === "number" && typeof max === "number") {
      //       return `${formatAxisValue(min)} - ${formatAxisValue(max)}`;
      //     }
      //     return params.data?.label ?? "";
      //   },
      // },
      legend: {
        data: [legendLabel],
        bottom: 0,
        left: 0,
      },
      grid: isHorizontal
        ? {
          left: Math.max(80, categoryAxisWidth),
          right: 24,
          top: 24,
          bottom: 56,
        }
        : {
          left: 56,
          right: 16,
          top: 24,
          bottom: categoryAxisAngle ? 88 : 56,
        },
      xAxis: isHorizontal
        ? {
          type: "value",
          max: maxValue,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          splitLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: {
            color: "#6b7280",
            fontSize: 11,
            formatter: (value: number) => formatAxisValue(value),
          },
        }
        : {
          type: "category",
          data: categoryValues,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisTick: { show: false },
          axisLabel: {
            interval: 0,
            rotate: 30,
            color: "#6b7280",
            fontSize: 9,
          },
        },
      yAxis: isHorizontal
        ? {
          type: "category",
          data: categoryValues,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            width: categoryAxisWidth,
            overflow: "truncate",
            color: "#6b7280",
            fontSize: 9,
          },
        }
        : {
          type: "value",
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "#e5e7eb" } },
          axisLabel: {
            color: "#6b7280",
            fontSize: 11,
            formatter: (value: number) => formatAxisValue(value),
          },
        },
      series: [
        {
          name: legendLabel,
          type: "bar",
          data,
          barCategoryGap: "18%",
          encode: isHorizontal
            ? { x: "value", y: xDataKey, tooltip: ["min", "max", "label"] }
            : { x: xDataKey, y: "value", tooltip: ["min", "max", "label"] },
          label: {
            show: true,
            position: isHorizontal ? "right" : "top",
            formatter: (params: { data: { label?: string } }) =>
              params.data?.label ?? "",
          },
          itemStyle: {
            borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
            color: (params: { data: { color?: string } }) =>
              params.data?.color ?? "#5470c6",
          },
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    data,
    xDataKey,
    categoryAxisWidth,
    categoryAxisAngle,
    chartHeight,
    isHorizontal,
    legendLabel,
  ]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:mr-auto sm:max-w-[220px]">
        <Label htmlFor={`${chartKey}-bar-orientation`}>Bar orientation</Label>
        <Select
          value={orientation}
          onValueChange={(value) => setOrientation(value as BarChartOrientation)}
        >
          <SelectTrigger id={`${chartKey}-bar-orientation`} className="w-full">
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
        <div ref={chartRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default BudgetBarEchart;