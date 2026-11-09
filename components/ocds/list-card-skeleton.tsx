import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ListCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="gap-4 p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-80" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </Card>
  )
}
