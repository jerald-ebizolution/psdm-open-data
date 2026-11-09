import Link from "next/link"

import { formatCount } from "@/components/ocds/format"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getR003, getR059, getR060, getR061, getR062 } from "@/lib/ocds-red-flags/data"
import { type FlagQuery } from "@/lib/ocds-red-flags/types"
import { cn } from "@/lib/utils"

type FlagSummary = {
  code: string
  label: string
  unit: string
  href: string
  getTotal: (q: FlagQuery) => Promise<{ total: number } | undefined>
}

// Each count is the `total` of that flag's own list endpoint (pageSize=1),
// so the card always matches the "of N flagged …" text on the flag's page.
export const RED_FLAGS: FlagSummary[] = [
  { code: "R003", label: "Short period", unit: "tenders flagged", href: "/ocds/red-flags/r003", getTotal: getR003 },
  { code: "R059", label: "Above budget", unit: "contracts flagged", href: "/ocds/red-flags/r059", getTotal: getR059 },
  { code: "R060", label: "Late signing", unit: "contracts flagged", href: "/ocds/red-flags/r060", getTotal: getR060 },
  { code: "R061", label: "Too short", unit: "tenders flagged", href: "/ocds/red-flags/r061", getTotal: getR061 },
  { code: "R062", label: "Too long", unit: "tenders flagged", href: "/ocds/red-flags/r062", getTotal: getR062 },
]

/** Summary row of all red flags; the current page's card is highlighted. */
export async function RedFlagCards({
  fiscalYear,
  activeCode,
}: {
  fiscalYear: number
  activeCode: string
}) {
  const totals = await Promise.all(
    RED_FLAGS.map((f) =>
      f.getTotal({ fiscalYear, q: "", page: 1, pageSize: 1 }).then((r) => r?.total)
    )
  )

  return (
    <RedFlagGrid>
      {RED_FLAGS.map((flag, i) => {
        const active = flag.code === activeCode
        return (
          <Link
            key={flag.code}
            href={`${flag.href}?fy=${fiscalYear}`}
            aria-current={active ? "page" : undefined}
            className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card
              className={cn(
                "h-full py-4 transition-colors hover:bg-muted/40",
                active && "border-[#1e3a5f] ring-1 ring-[#1e3a5f] dark:border-sky-400 dark:ring-sky-400"
              )}
            >
              <CardContent className="space-y-1 px-4">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  {flag.code} · {flag.label}
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {totals[i] === undefined ? "—" : formatCount(totals[i])}
                </p>
                <p className="text-sm text-muted-foreground">{flag.unit}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </RedFlagGrid>
  )
}

export function RedFlagCardsSkeleton() {
  return (
    <RedFlagGrid>
      {RED_FLAGS.map((f) => (
        <Card key={f.code} className="py-4">
          <CardContent className="space-y-2 px-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </RedFlagGrid>
  )
}

function RedFlagGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">{children}</div>
}
