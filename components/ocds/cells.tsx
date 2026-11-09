import { type ReactNode } from "react"

import { formatAwardDate } from "@/components/ocds/format"
import { cn } from "@/lib/utils"

// Small presentational cells shared by the OCDS list tables.

/** Reference number in the accent colour, e.g. "11860092" or "AWD-2026-07-0412". */
export function RefCell({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums text-[#1e3a5f] dark:text-sky-300",
        wrap && "inline-block max-w-32 whitespace-normal break-words leading-snug"
      )}
    >
      {children}
    </span>
  )
}

/** Bold title that wraps onto two lines when long. */
export function TitleCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-64 min-w-40 font-semibold whitespace-normal leading-snug", className)}>
      {children}
    </div>
  )
}

/** Plain text that wraps, for entity names and modes. */
export function WrapCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-60 min-w-32 whitespace-normal leading-snug", className)}>{children}</div>
}

export function DateCell({ value }: { value: string }) {
  return <span className="tabular-nums">{formatAwardDate(value)}</span>
}

/** Right-aligned red emphasis, e.g. "4 days", "+₱ 265,000.00". */
export function AlertCell({ children }: { children: ReactNode }) {
  return (
    <div className="text-right font-semibold tabular-nums text-red-700 dark:text-red-400">
      {children}
    </div>
  )
}

export function RightCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-right tabular-nums", className)}>{children}</div>
}
