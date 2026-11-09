import { Suspense } from "react"

import { ListCardSkeleton } from "@/components/ocds/list-card-skeleton"
import { RedFlagCards, RedFlagCardsSkeleton } from "@/components/ocds/red-flag-cards"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { parsePaging, searchParam, type PageSearchParams } from "@/lib/ocds-paging"
import {
  getProcurementModes,
  modeName,
  resolveMode,
  type OcdsProcurementMode,
} from "@/lib/ocds-procurement-modes"
import { getR061, getR062 } from "@/lib/ocds-red-flags/data"
import { DecisionPeriodCard, type DecisionFlag } from "./decision-period-card"

const PREVIEW_ROWS = 4
const GETTERS = { R061: getR061, R062: getR062 }
const DEFAULT_THRESHOLD = { R061: 3, R062: 180 }

type SectionProps = {
  flag: DecisionFlag
  fiscalYear: number
  fiscalYears: number[]
  q: string
  mode: string | null
  modes: OcdsProcurementMode[]
  paging: ReturnType<typeof parsePaging>
}

async function DecisionPeriodSection({ flag, fiscalYear, fiscalYears, q, mode, modes, paging }: SectionProps) {
  const data = await GETTERS[flag]({
    fiscalYear,
    q,
    modeName: modeName(mode, modes),
    page: paging.page,
    pageSize: paging.pageSize,
  })
  return (
    <DecisionPeriodCard
      flag={flag}
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      q={q}
      mode={mode}
      modes={modes}
      viewAll={paging.viewAll}
      data={
        data ?? {
          total: 0,
          page: 1,
          pageSize: paging.pageSize,
          items: [],
          thresholdDays: DEFAULT_THRESHOLD[flag],
        }
      }
    />
  )
}

/** Shared page body for R061 (too short) and R062 (too long). */
export async function DecisionPeriodPage({
  flag,
  searchParams,
}: {
  flag: DecisionFlag
  searchParams: Promise<PageSearchParams>
}) {
  const [query, fiscalYears, modes] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getProcurementModes(),
  ])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<RedFlagCardsSkeleton />}>
        <RedFlagCards fiscalYear={fiscalYear} activeCode={flag} />
      </Suspense>
      <Suspense fallback={<ListCardSkeleton rows={PREVIEW_ROWS} />}>
        <DecisionPeriodSection
          flag={flag}
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          q={searchParam(query)}
          mode={resolveMode(query.mode, modes)}
          modes={modes}
          paging={parsePaging(query, PREVIEW_ROWS)}
        />
      </Suspense>
    </div>
  )
}
