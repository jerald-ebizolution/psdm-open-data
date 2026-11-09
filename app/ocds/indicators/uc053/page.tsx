import { Suspense } from "react"

import { ListCardSkeleton } from "@/components/ocds/list-card-skeleton"
import { OcdsStatCards } from "@/components/ocds/stat-cards"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { parsePaging, type PageSearchParams } from "@/lib/ocds-paging"
import {
  getProcurementModes,
  modeName,
  resolveMode,
  type OcdsProcurementMode,
} from "@/lib/ocds-procurement-modes"
import { getBidNoticesPublished } from "@/lib/ocds-statistics"
import { getShortTitles } from "./_components/get-short-titles"
import { ShortTitlesCard } from "./_components/short-titles-card"

const PREVIEW_ROWS = 8

type SectionProps = {
  fiscalYear: number
  fiscalYears: number[]
  mode: string | null
  modes: OcdsProcurementMode[]
  paging: ReturnType<typeof parsePaging>
}

async function ShortTitlesSection({ fiscalYear, fiscalYears, mode, modes, paging }: SectionProps) {
  // Flagged notices + the matching denominator, fetched in parallel.
  const [data, bidNotices] = await Promise.all([
    getShortTitles({
      fiscalYear,
      modeName: modeName(mode, modes),
      page: paging.page,
      pageSize: paging.pageSize,
    }),
    getBidNoticesPublished(fiscalYear, mode),
  ])

  return (
    <ShortTitlesCard
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      mode={mode}
      modes={modes}
      viewAll={paging.viewAll}
      data={data ?? { total: 0, page: 1, pageSize: paging.pageSize, items: [], thresholdChars: 10 }}
      bidNoticeCount={bidNotices?.count ?? null}
    />
  )
}

const OcsdsIndicatorsUc053 = async ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => {
  const [query, fiscalYears, modes] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getProcurementModes(),
  ])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <OcdsStatCards fiscalYear={fiscalYear} />
      <Suspense fallback={<ListCardSkeleton rows={PREVIEW_ROWS} />}>
        <ShortTitlesSection
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          mode={resolveMode(query.mode, modes)}
          modes={modes}
          paging={parsePaging(query, PREVIEW_ROWS)}
        />
      </Suspense>
    </div>
  )
}

export default OcsdsIndicatorsUc053
