import { Suspense } from "react"

import { OcdsStatCards } from "@/components/ocds/stat-cards"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions, resolveRegion, type OcdsRegion } from "@/lib/ocds-regions"
import { AwardeesByRegionCard } from "./_components/awardees-by-region-card"
import { getAwardeesByRegion } from "./_components/get-awardees-by-region"

async function AwardeesByRegionSection({
  fiscalYear,
  fiscalYears,
  region,
  regions,
}: {
  fiscalYear: number
  fiscalYears: number[]
  region: string | null
  regions: OcdsRegion[]
}) {
  const selected = regions.find((r) => r.code === region) ?? null
  const awardees = await getAwardeesByRegion(fiscalYear, selected)

  return (
    <AwardeesByRegionCard
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      region={region}
      regions={regions}
      awardees={awardees ?? []}
    />
  )
}

function AwardeesByRegionSkeleton() {
  return (
    <Card className="gap-4 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </Card>
  )
}

const OcsdsIndicatorsUc036 = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const [query, fiscalYears, regions] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getRegions(),
  ])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)
  const region = resolveRegion(query.region, regions)

  return (
    <div className="flex flex-col gap-5">
      <OcdsStatCards fiscalYear={fiscalYear} />
      <Suspense
        key={`uc036-${fiscalYear}-${region ?? "all"}`}
        fallback={<AwardeesByRegionSkeleton />}
      >
        <AwardeesByRegionSection
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          region={region}
          regions={regions}
        />
      </Suspense>
    </div>
  )
}

export default OcsdsIndicatorsUc036
