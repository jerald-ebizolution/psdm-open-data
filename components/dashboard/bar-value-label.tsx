"use client";

type BarChartOrientation = "vertical" | "horizontal";

type BarLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  payload?: { label?: string };
  orientation?: BarChartOrientation;
};

export function BarValueLabel(props: BarLabelProps) {
  const { x, y, width, height, value, payload, orientation = "horizontal" } =
    props;
  const label =
    typeof value === "string"
      ? value
      : payload?.label != null
        ? String(payload.label)
        : null;

  if (x == null || y == null || width == null || !label) {
    return null;
  }

  const isHorizontal = orientation === "horizontal";

  if (isHorizontal) {
    if (height == null) return null;
    return (
      <text
        x={Number(x) + Number(width) + 6}
        y={Number(y) + Number(height) / 2}
        fill="#6b7280"
        textAnchor="start"
        dominantBaseline="middle"
        className="text-[11px] font-semibold sm:text-[9px]"
      >
        {label}
      </text>
    );
  }

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 10}
      fill="#6b7280"
      textAnchor="middle"
      className="text-[11px] font-semibold sm:text-[9px]"
    >
      {label}
    </text>
  );
}
