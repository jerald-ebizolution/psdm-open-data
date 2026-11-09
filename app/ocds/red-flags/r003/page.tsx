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
import { getR003 } from "@/lib/ocds-red-flags/data"
import { R003Card } from "./_components/r003-card"

const PREVIEW_ROWS = 5

type SectionProps = {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  mode: string | null
  modes: OcdsProcurementMode[]
  paging: ReturnType<typeof parsePaging>
}

async function R003Section({ fiscalYear, fiscalYears, q, mode, modes, paging }: SectionProps) {
  const data = await getR003({
    fiscalYear,
    q,
    modeName: modeName(mode, modes),
    page: paging.page,
    pageSize: paging.pageSize,
  })
  return (
    <R003Card
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      q={q}
      mode={mode}
      modes={modes}
      viewAll={paging.viewAll}
      data={data ?? { total: 0, page: 1, pageSize: paging.pageSize, items: [] }}
    />
  )
}

const OcdsRedFlagR003 = async ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => {
  const [query, fiscalYears, modes] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getProcurementModes(),
  ])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<RedFlagCardsSkeleton />}>
        <RedFlagCards fiscalYear={fiscalYear} activeCode="R003" />
      </Suspense>
      <Suspense fallback={<ListCardSkeleton rows={PREVIEW_ROWS} />}>
        <R003Section
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

export default OcdsRedFlagR003
