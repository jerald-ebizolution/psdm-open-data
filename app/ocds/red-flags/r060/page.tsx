import { Suspense } from "react"

import { ListCardSkeleton } from "@/components/ocds/list-card-skeleton"
import { RedFlagCards, RedFlagCardsSkeleton } from "@/components/ocds/red-flag-cards"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { parsePaging, searchParam, type PageSearchParams } from "@/lib/ocds-paging"
import { getR060 } from "@/lib/ocds-red-flags/data"
import { R060Card } from "./_components/r060-card"

const PREVIEW_ROWS = 5
const DEFAULT_LIMIT_DAYS = 10

type SectionProps = {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  paging: ReturnType<typeof parsePaging>
}

async function R060Section({ fiscalYear, fiscalYears, q, paging }: SectionProps) {
  const data = await getR060({ fiscalYear, q, page: paging.page, pageSize: paging.pageSize })
  return (
    <R060Card
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      q={q}
      viewAll={paging.viewAll}
      data={
        data ?? { total: 0, page: 1, pageSize: paging.pageSize, items: [], limitDays: DEFAULT_LIMIT_DAYS }
      }
    />
  )
}

const OcdsRedFlagR060 = async ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => {
  const [query, fiscalYears] = await Promise.all([searchParams, getFiscalYears()])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<RedFlagCardsSkeleton />}>
        <RedFlagCards fiscalYear={fiscalYear} activeCode="R060" />
      </Suspense>
      <Suspense fallback={<ListCardSkeleton rows={PREVIEW_ROWS} />}>
        <R060Section
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          q={searchParam(query)}
          paging={parsePaging(query, PREVIEW_ROWS)}
        />
      </Suspense>
    </div>
  )
}

export default OcdsRedFlagR060
