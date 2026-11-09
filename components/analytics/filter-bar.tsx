"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL = "all"

export type FilterSelect = {
  /** Query parameter, e.g. "region" or "mode". */
  param: string
  label: string
  allLabel: string
  value: string | null
  options: { code: string; name: string }[]
  className?: string
}

/**
 * Fiscal year (or a From–To year range) plus any "All …" dropdowns.
 * Values live in the URL (?fy= or ?from=&to=, plus ?region= etc.).
 */
export function FilterBar({
  fiscalYear,
  fiscalYears = [],
  yearRange,
  selects = [],
}: {
  fiscalYear?: number
  fiscalYears?: number[]
  /** Shows "From" and "To" year pickers instead of a single fiscal year. */
  yearRange?: { from: number; to: number; years: number[] }
  selects?: FilterSelect[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const set = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const yearSelect = (label: string, value: number, years: number[], onChange: (y: number) => void) => (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))} disabled={isPending}>
      <SelectTrigger className="w-28 bg-white" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
      {yearRange ? (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {yearSelect("From year", yearRange.from, yearRange.years, (y) =>
            set({ from: String(y), ...(y > yearRange.to && { to: String(y) }) })
          )}
          <span>to</span>
          {yearSelect("To year", yearRange.to, yearRange.years, (y) =>
            set({ to: String(y), ...(y < yearRange.from && { from: String(y) }) })
          )}
        </div>
      ) : (
        fiscalYear !== undefined && (
          <Select value={String(fiscalYear)} onValueChange={(v) => set({ fy: v })} disabled={isPending}>
            <SelectTrigger className="w-32 bg-white" aria-label="Fiscal year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map((fy) => (
                <SelectItem key={fy} value={String(fy)}>
                  FY {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      )}
      {selects.map((s) => (
        <Select
          key={s.param}
          value={s.value ?? ALL}
          onValueChange={(v) => set({ [s.param]: v === ALL ? null : v })}
          disabled={isPending}
        >
          <SelectTrigger className={s.className ?? "w-40 bg-white"} aria-label={s.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allLabel}</SelectItem>
            {s.options.map((o) => (
              <SelectItem key={o.code} value={o.code}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
