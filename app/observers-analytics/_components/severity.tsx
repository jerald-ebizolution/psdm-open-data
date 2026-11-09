import { type Severity } from "@/lib/observers-data"
import { cn } from "@/lib/utils"

/** Severity colours (status palette: reserved for risk, always shown with a label). */
export const SEVERITY: Record<Severity, { label: string; color: string; badge: string }> = {
  critical: { label: "Critical", color: "#7f1d1d", badge: "bg-red-900 text-white" },
  high: { label: "High", color: "#dc2626", badge: "bg-red-600 text-white" },
  medium: { label: "Medium", color: "#f59e0b", badge: "bg-amber-500 text-white" },
  low: { label: "Low", color: "#9ca3af", badge: "bg-gray-500 text-white" },
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"]

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const s = SEVERITY[severity]
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase", s.badge, className)}>
      {s.label}
    </span>
  )
}
