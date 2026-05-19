"use client";

type BarLabelProps = {
  x?: number;
  y?: number;
  width?: number;
  value?: unknown;
  payload?: { label?: string };
};

export function BarValueLabel(props: BarLabelProps) {
  const { x, y, width, value, payload } = props;
  const label =
    typeof value === "string"
      ? value
      : payload?.label != null
        ? String(payload.label)
        : null;

  if (x == null || y == null || width == null || !label) {
    return null;
  }

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 10}
      fill="#111827"
      textAnchor="middle"
      className="text-[11px] font-semibold sm:text-xs"
    >
      {label}
    </text>
  );
}
