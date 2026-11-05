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
import { formatAxisValue, getChartDataByRegion } from "@/lib/regional-budget-data";

export const CHART_HEIGHT = 500;

export type BarChartOrientation = "vertical" | "horizontal";

type BudgetBarEchartDrilldownProps = {
  xDataKey: string;
  chartKey: string;
  /** Width reserved for category labels when bars are horizontal. */
  categoryAxisWidth?: number;
  /** Tilt category labels when bars are vertical (columns). */
  categoryAxisAngle?: number;
  defaultOrientation?: BarChartOrientation;
  legendLabel?: string;
  budgetData?: {
    yearlyPerRegionData: { name: string; data: Array<{ region: string; value: number; max: number } & Record<string, string | number>> },
    regionPerYearData: { name: string; data: Array<{ year: string; value: number; max: number } & Record<string, string | number>> }
  };
};

const BudgetBarEchartDrilldown = ({
  xDataKey,
  chartKey,
  categoryAxisWidth = 140,
  categoryAxisAngle = 0,
  defaultOrientation = "horizontal",
  legendLabel = "Budget allocation (₱M)",
  budgetData = { yearlyPerRegionData: { name: "", data: [] }, regionPerYearData: { name: "", data: [] } }
}: BudgetBarEchartDrilldownProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] =
    useState<BarChartOrientation>(defaultOrientation);

  const isHorizontal = orientation === "horizontal";
  const chartHeight = useMemo(
    () =>
      isHorizontal
        ? Math.max(CHART_HEIGHT, budgetData.yearlyPerRegionData.data.length * 36 + 80)
        : CHART_HEIGHT,
    [budgetData.yearlyPerRegionData.data.length, isHorizontal],
  );
  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    const chart = echarts.init(container);
    const categoryValues = budgetData.yearlyPerRegionData.data.map((item) => String(item[xDataKey]));
    const maxValue = Math.max(...budgetData.yearlyPerRegionData.data.map((item) => Number(item.value || 0)), 0);

    const option = {
      darkMode: true,
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
          // top: 24,
          bottom: 56,
        }
        : {
          left: 56,
          right: 16,
          // top: 24,
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
          data: budgetData.yearlyPerRegionData.data.map((item: { region: string }) => item.region),
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
      series: {
        name: legendLabel,
        type: 'bar',
        id: 'sales',
        data: budgetData.yearlyPerRegionData.data,
        encode: isHorizontal
          ? { x: "value", y: xDataKey, tooltip: ["min", "max", "label"] }
          : { x: xDataKey, y: "value", tooltip: ["min", "max", "label"] },
        label: {
          show: true,
          position: isHorizontal ? "right" : "top",
          // className: "text-[6px] font-semibold sm:text-[12px]",
          fontStyle: "normal",
          fontWeight: "bold",
          fontSize: 9,
          color: "#6b7280",
          formatter: (params: { data: { label?: string } }) =>
            params.data?.label ?? "",
        },
        itemStyle: {
          borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          color: (params: { data: { color?: string } }) =>
            params.data?.color ?? "#5470c6",
        },
      }
    }

    const restoreMainView = () => {
      chart.setOption(option, { notMerge: true });
    };

    chart.setOption(option);

    const handleBarClick = (event: { data?: unknown }) => {
      
      if (event.data && typeof event.data === "object" && "region" in event.data) {
        const data = getChartDataByRegion(event.data?.region as string);
        if (!data) {
          return;
        }
        const yearLabels = data.map((item) => item.year);
        const childOption = {
          ...(isHorizontal
            ? { yAxis: { data: yearLabels } }
            : { xAxis: { data: yearLabels } }),
          series: {
            type: "bar",
            id: "sales",
            dataGroupId: budgetData.regionPerYearData.name,
            data,
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
          graphic: [
            {
              type: "text",
              left: 50,
              top: 0,
              style: {
                text: "Back",
                fontSize: 18,
                fill: "#6b7280",
              },
              onclick: restoreMainView,
            },
          ],
        };
        chart.setOption(childOption, { replaceMerge: ["graphic"] });
      }
    };

    chart.on("click", handleBarClick);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(container);

    return () => {
      // chart.off("click", handleBarClick);
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [
    budgetData,
    xDataKey,
    categoryAxisWidth,
    categoryAxisAngle,
    chartHeight,
    isHorizontal,
    legendLabel,
  ]);

  return (
    <div className="flex w-full flex-col gap-3">

      <div
        key={`${chartKey}-${orientation}`}
        // className="w-full animate-in fade-in duration-500"
        style={{ height: chartHeight }}
      >
      <div className="flex flex-col gap-2 sm:ml-auto sm:max-w-[220px]">
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
        <div ref={chartRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default BudgetBarEchartDrilldown;