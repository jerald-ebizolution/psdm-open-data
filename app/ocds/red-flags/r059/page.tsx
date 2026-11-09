import { Suspense } from "react"

import { ListCardSkeleton } from "@/components/ocds/list-card-skeleton"
import { RedFlagCards, RedFlagCardsSkeleton } from "@/components/ocds/red-flag-cards"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { parsePaging, searchParam, type PageSearchParams } from "@/lib/ocds-paging"
import { getR059 } from "@/lib/ocds-red-flags/data"
import { getRegions, resolveRegion, type OcdsRegion } from "@/lib/ocds-regions"
import { R059Card } from "./_components/r059-card"

const PREVIEW_ROWS = 5

type SectionProps = {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  region: string | null
  regions: OcdsRegion[]
  paging: ReturnType<typeof parsePaging>
}

async function R059Section({ fiscalYear, fiscalYears, q, region, regions, paging }: SectionProps) {
  const data = await getR059({
    fiscalYear,
    q,
    regionName: regions.find((r) => r.code === region)?.name ?? null,
    page: paging.page,
    pageSize: paging.pageSize,
  })
  return (
    <R059Card
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      q={q}
      region={region}
      regions={regions}
      viewAll={paging.viewAll}
      data={data ?? { total: 0, page: 1, pageSize: paging.pageSize, items: [] }}
    />
  )
}

const OcdsRedFlagR059 = async ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => {
  const [query, fiscalYears, regions] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getRegions(),
  ])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<RedFlagCardsSkeleton />}>
        <RedFlagCards fiscalYear={fiscalYear} activeCode="R059" />
      </Suspense>
      <Suspense fallback={<ListCardSkeleton rows={PREVIEW_ROWS} />}>
        <R059Section
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          q={searchParam(query)}
          region={resolveRegion(query.region, regions)}
          regions={regions}
          paging={parsePaging(query, PREVIEW_ROWS)}
        />
      </Suspense>
    </div>
  )
}

export default OcdsRedFlagR059
