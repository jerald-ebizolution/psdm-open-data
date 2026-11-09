import { Suspense } from "react"

import { OcdsStatCards } from "@/components/ocds/stat-cards"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFiscalYears, resolveFiscalYear } from "@/lib/ocds-fiscal-years"
import { getSupplierOptions, resolveSupplier } from "@/lib/ocds-suppliers"
import { getSupplierProjects } from "./_components/get-supplier-projects"
import { SupplierProjectsCard, type Uc043Filters } from "./_components/supplier-projects-card"

const PREVIEW_PAGE_SIZE = 6
const VIEW_ALL_PAGE_SIZE = 25

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

async function SupplierProjectsSection({
  fiscalYear,
  fiscalYears,
  supplierParam,
  viewAll,
  page,
}: {
  fiscalYear: number
  fiscalYears: number[]
  supplierParam: string | undefined
  viewAll: boolean
  page: number
}) {
  const suppliers = await getSupplierOptions(fiscalYear)
  const supplier = resolveSupplier(supplierParam, suppliers)

  const data = supplier
    ? await getSupplierProjects({
        fiscalYear,
        supplier,
        page: viewAll ? page : 1,
        pageSize: viewAll ? VIEW_ALL_PAGE_SIZE : PREVIEW_PAGE_SIZE,
      })
    : undefined

  const filters: Uc043Filters = {
    fiscalYear,
    supplierId: supplier?.supplierId ?? null,
    viewAll,
    page,
  }

  return (
    <SupplierProjectsCard
      filters={filters}
      fiscalYears={fiscalYears}
      suppliers={suppliers}
      data={data ?? null}
    />
  )
}

function SupplierProjectsSkeleton() {
  return (
    <Card className="gap-4 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-80" />
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </Card>
  )
}

const OcsdsIndicatorsUc043 = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const [query, fiscalYears] = await Promise.all([searchParams, getFiscalYears()])
  const fiscalYear = resolveFiscalYear(query.fy, fiscalYears)

  return (
    <div className="flex flex-col gap-5">
      <OcdsStatCards fiscalYear={fiscalYear} />
      <Suspense fallback={<SupplierProjectsSkeleton />}>
        <SupplierProjectsSection
          fiscalYear={fiscalYear}
          fiscalYears={fiscalYears}
          supplierParam={first(query.supplier)}
          viewAll={first(query.view) === "all"}
          page={Math.max(1, Math.floor(Number(first(query.page))) || 1)}
        />
      </Suspense>
    </div>
  )
}

export default OcsdsIndicatorsUc043
