import { Suspense } from "react"

import { OcdsStatCards } from "@/components/ocds/stat-cards"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getRegions, resolveRegion, type OcdsRegion } from "@/lib/ocds-regions"
import { getTotalContract } from "@/lib/ocds-statistics"
import { getSupplierAwards } from "./_components/get-supplier-awards"
import { SupplierAwardsCard, type Uc040Filters } from "./_components/supplier-awards-card"

const PREVIEW_PAGE_SIZE = 10
const VIEW_ALL_PAGE_SIZE = 50

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

async function SupplierAwardsSection({
  filters,
  fiscalYears,
  regions,
}: {
  filters: Uc040Filters
  fiscalYears: number[]
  regions: OcdsRegion[]
}) {
  const [data, totalContract] = await Promise.all([
    getSupplierAwards({
      fiscalYear: filters.fiscalYear,
      region: regions.find((r) => r.code === filters.region) ?? null,
      q: filters.q,
      page: filters.viewAll ? filters.page : 1,
      pageSize: filters.viewAll ? VIEW_ALL_PAGE_SIZE : PREVIEW_PAGE_SIZE,
    }),
    getTotalContract(filters.fiscalYear),
  ])

  return (
    <SupplierAwardsCard
      filters={filters}
      fiscalYears={fiscalYears}
      regions={regions}
      data={
        data ?? {
          total: 0,
          page: 1,
          pageSize: filters.viewAll ? VIEW_ALL_PAGE_SIZE : PREVIEW_PAGE_SIZE,
          items: [],
        }
      }
      totalContractValue={totalContract?.amount ?? 0}
    />
  )
}

function SupplierAwardsSkeleton() {
  return (
    <Card className="gap-4 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-72" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </Card>
  )
}

const OcsdsIndicatorsUc040 = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const [query, fiscalYears, regions] = await Promise.all([
    searchParams,
    getFiscalYears(),
    getRegions(),
  ])

  const filters: Uc040Filters = {
    fiscalYear: resolveFiscalYear(query.fy, fiscalYears),
    region: resolveRegion(query.region, regions),
    q: first(query.q)?.trim() ?? "",
    viewAll: first(query.view) === "all",
    page: Math.max(1, Math.floor(Number(first(query.page))) || 1),
  }

  return (
    <div className="flex flex-col gap-5">
      <OcdsStatCards fiscalYear={filters.fiscalYear} />
      {/* No `key` here on purpose: filter changes run as a transition, so the
          card (and the search input's focus) stays mounted while data loads. */}
      <Suspense fallback={<SupplierAwardsSkeleton />}>
        <SupplierAwardsSection filters={filters} fiscalYears={fiscalYears} regions={regions} />
      </Suspense>
    </div>
  )
}

export default OcsdsIndicatorsUc040
