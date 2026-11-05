import { RegionPerYearCard } from "@/components/dashboard/region-per-year/region-per-year-card"
import { YearlyPerRegionCard } from "@/components/dashboard/yearly-per-region/yearly-per-region-card"

const ReportsPage = () => {
  return (
    <div className="min-h-full p-3">
      <h1 className="text-2xl font-bold">Reports Page</h1>
      <div className="mx-auto w-full flex-1 space-y-6 py-6">
        <YearlyPerRegionCard />
        <RegionPerYearCard />
      </div>
    </div>
  )
}

export default ReportsPage