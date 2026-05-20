import { RegionPerYearCard } from "@/components/dashboard/region-per-year/region-per-year-card";
import { YearlyPerRegionCard } from "@/components/dashboard/yearly-per-region/yearly-per-region-card";
import Image from "next/image";

export default async function Home() {

  return (
    <div className="min-h-full bg-[#f4f5f7]">
      <header className="border-b border-border/70 bg-white">
        <div className="mx-auto flex max-w-9xl flex-col gap-1 px-4 py-5 sm:px-6 lg:px-8">
          <p className="flex items-center gap-3 text-md font-medium tracking-wide text-muted-foreground uppercase">
            <Image src="/philgeps-logo.png" alt="PSDBM Logo" width={150} height={150} /> PSDBM Open Data Portal
          </p>
          {/* <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Regional Budget Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Explore yearly budget allocation ranges across regions. Data is
            published for transparency and public use.
          </p> */}
        </div>
      </header>

      {/* <main className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5"> */}
      <main className="mx-auto w-full flex-1 space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        <YearlyPerRegionCard />
        <RegionPerYearCard />
      </main>

      <footer className="border-t border-border/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          Mock data for demonstration. Values represent budget ranges in millions
          of Philippine Pesos (₱).
        </div>
      </footer>
    </div>
  );
}
