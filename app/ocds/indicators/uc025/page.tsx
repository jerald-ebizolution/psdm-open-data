import { Suspense } from "react"

import { OcdsStatCards } from "@/components/ocds/stat-cards"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getTotalContract } from "@/lib/ocds-statistics"
import { getTopSuppliers } from "./_components/get-top-suppliers"
import { TopSuppliersCard } from "./_components/top-suppliers-card"

async function TopSuppliersSection({
  fiscalYear,
  fiscalYears,
}: {
  fiscalYear: number
  fiscalYears: number[]
}) {
  // Top 10 array + the shared total-contract statistic, fetched in parallel.
  // The total is the denominator for every share on the card.
  const [suppliers, totalContract] = await Promise.all([
    getTopSuppliers(fiscalYear),
    getTotalContract(fiscalYear),
  ])

  return (
    <TopSuppliersCard
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      suppliers={suppliers ?? []}
      totalContractValue={totalContract?.amount ?? 0}
      dataAsOf={totalContract?.dataAsOf}
    />
  )
}

function TopSuppliersSkeleton() {
  return (
    <Card className="gap-4 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-80" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </Card>
  )
}

const OcsdsIndicatorsUC025 = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const [{ fy }, fiscalYears] = await Promise.all([searchParams, getFiscalYears()])
  const fiscalYear = resolveFiscalYear(fy, fiscalYears)

  // Each section fetches from its own endpoint and streams in independently.
  return (
    <div className="flex flex-col gap-5">
      <OcdsStatCards fiscalYear={fiscalYear} />
      <Suspense key={`uc025-${fiscalYear}`} fallback={<TopSuppliersSkeleton />}>
        <TopSuppliersSection fiscalYear={fiscalYear} fiscalYears={fiscalYears} />
      </Suspense>
    </div>
  )
}

export default OcsdsIndicatorsUC025
