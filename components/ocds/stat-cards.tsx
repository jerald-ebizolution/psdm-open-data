import { Suspense } from "react"

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getBidNoticesPublished,
  getSuppliersAwarded,
  getTendersWithRedFlags,
  getTotalContract,
} from "@/lib/ocds-statistics"

const compactPeso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 2,
})

const fullPeso = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const count = (n: number) => n.toLocaleString("en-PH")

// ---------------------------------------------------------------------------
// Presentational
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-2">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-44" />
      </CardContent>
    </Card>
  )
}

const unavailable = (title: string) => (
  <StatCard title={title} value="—" description="Not available for this fiscal year" />
)

// ---------------------------------------------------------------------------
// One async card per endpoint
// ---------------------------------------------------------------------------

async function TotalContractCard({ fiscalYear }: { fiscalYear: number }) {
  const title = `Total contract - FY ${fiscalYear}`
  const data = await getTotalContract(fiscalYear)
  if (!data) return unavailable(title)

  return (
    <StatCard
      title={title}
      value={compactPeso.format(data.amount)}
      description={`₱ ${fullPeso.format(data.amount)} across all awards`}
    />
  )
}

async function SuppliersAwardedCard({ fiscalYear }: { fiscalYear: number }) {
  const title = "Suppliers awarded"
  const data = await getSuppliersAwarded(fiscalYear)
  if (!data) return unavailable(title)

  return (
    <StatCard title={title} value={count(data.count)} description="Distinct awardee organizations" />
  )
}

async function BidNoticesPublishedCard({ fiscalYear }: { fiscalYear: number }) {
  const title = "Bid notices published"
  const data = await getBidNoticesPublished(fiscalYear)
  if (!data) return unavailable(title)

  return <StatCard title={title} value={count(data.count)} description="All procurement modes" />
}

async function TendersWithRedFlagsCard({ fiscalYear }: { fiscalYear: number }) {
  const title = "Tenders with red flags"
  const data = await getTendersWithRedFlags(fiscalYear)
  if (!data) return unavailable(title)

  return (
    <StatCard
      title={title}
      value={count(data.count)}
      description={`Across ${data.checkCount} red-flag checks`}
    />
  )
}

// ---------------------------------------------------------------------------
// Grid — each card has its own Suspense boundary, so the four endpoints are
// requested in parallel and each card appears as soon as its API responds.
// ---------------------------------------------------------------------------

const CARDS = [
  TotalContractCard,
  SuppliersAwardedCard,
  BidNoticesPublishedCard,
  TendersWithRedFlagsCard,
]

export function OcdsStatCards({ fiscalYear }: { fiscalYear: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((StatCardComponent, i) => (
        <Suspense
          key={`${i}-${fiscalYear}`}
          fallback={<StatCardSkeleton />}
        >
          <StatCardComponent fiscalYear={fiscalYear} />
        </Suspense>
      ))}
    </div>
  )
}
