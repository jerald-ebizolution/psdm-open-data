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
import { formatAxisValue, getChartDataByYear } from "@/lib/regional-budget-data";

export const CHART_HEIGHT = 500;

export type BarChartOrientation = "vertical" | "horizontal";

export type BudgetBarEchartFilter = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
};

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
  filter?: BudgetBarEchartFilter;
  years?: string[];
};

const BudgetBarEchart = ({
  data,
  xDataKey,
  chartKey,
  categoryAxisWidth = 140,
  categoryAxisAngle = 0,
  defaultOrientation = "horizontal",
  legendLabel = "Budget allocation (₱M)",
  filter,
  years = [],
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

    const buildUnitOption = (seriesData: BudgetBarEchartProps["data"]) => {
      const categoryValues = seriesData.map((item) => String(item[xDataKey]));
      const maxValue = Math.max(
        ...seriesData.map((item) => Number(item.value || 0)),
        0,
      );

      return {
        notMerge: false,
        darkMode: true,
        colorBy: 'data',
        tooltip: {
          renderMode: "html",
          trigger: "item",
          axisPointer: {
            type: "shadow",
            shadowStyle: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          formatter: (params: { data: { min?: number; max?: number; label?: string; title?: string } }) => {
            const title = params.data?.title;
            const min = params.data?.min;
            const max = params.data?.max;
            return `
            <strong style="color: ;">
            ${title}</strong> <br />
            <strong style="color: ;">
            Minimum: ${formatAxisValue(min ?? 0)}
            </strong> <br />
            <strong style="color: ;">
            Maximum: ${formatAxisValue(max ?? 0)}
            </strong>
            `;
          },
        },
        legend: {
          data: [legendLabel],
          bottom: 0,
          left: 0,
        },
        grid: isHorizontal
          ? {
            left: Math.max(80, categoryAxisWidth),
            // right: 24,
            top: 24,
            // bottom: 56,
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
              fontStyle: "normal",
              fontWeight: "bold",
              formatter: (value: number) => formatAxisValue(value),
            },
          },
        series: [
          {
            name: "legendLabel",
            type: "bar",
            data: seriesData,
            itemStyle: {
              // borderRadius: 100
              borderRadius: isHorizontal ? [0, 10, 10, 0] : [5, 5, 0, 0],
              // borderWidth: 2
            },
            encode: isHorizontal
              ? { x: "value", y: xDataKey, tooltip: ["min", "max", "label"] }
              : { x: xDataKey, y: "value", tooltip: ["min", "max", "label"] },
            label: {
              show: true,
              position: isHorizontal ? "right" : "top",
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 9,
              color: "#6b7280",
              formatter: (params: { data: { label?: string } }) =>
                params.data?.label ?? "",
            },
          },
        ],
      };
    };

    const selectedYear = filter?.value;
    const currentIndex = Math.max(
      0,
      selectedYear ? years.indexOf(selectedYear) : 0,
    );
    console.log(currentIndex, "currentIndex")
    const useTimeline = years.length > 0;
    const option = useTimeline
      ? {
        baseOption: buildUnitOption(data),
        timeline: {
          // autoPlay: true,
          // loop: true,
          // playInterval: 5000,
          axisType: "category" as const,
          data: years,
          // top: -50,
          // left: "100%",
          // right: "100%",
          z: 5,
          currentIndex: currentIndex >= 0 ? currentIndex : 0,
          realtime: true,
          controlStyle: {
            show: false,
          },
          // orient: "vertical",
          // height: "100%",
          // left: 0,
          // controlPosition: "right"
        },
        options: years.map((year) => {
          console.log(getChartDataByYear(year), "year")
          return ({
            series: [{ data: getChartDataByYear(year) }],
          })
        }),
      }
      : buildUnitOption(data);

    chart.setOption(option as echarts.EChartsOption, {
      notMerge: true,   // ← KEY: merge, don't replace
      lazyUpdate: true,
    });

    const handleTimelineChanged = (...args: unknown[]) => {
      const payload = args[0] as { currentIndex?: number };
      const year = years[payload.currentIndex ?? 0];
      if (year && filter?.onValueChange) {
        filter?.onValueChange(year);
      }
    };

    if (useTimeline) {
      chart.on("timelineChanged", handleTimelineChanged);
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(container);

    return () => {
      if (useTimeline) {
        chart.off("timelineChanged", handleTimelineChanged);
      };
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
    years,
    filter?.value,
    filter?.onValueChange,
    filter
  ]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:max-w-55">
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
      </div>

      <div
        key={`${chartKey}-${orientation}`}
        // className="w-full animate-in fade-in duration-500"
        style={{ height: chartHeight }}
      >
        <div ref={chartRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default BudgetBarEchart;