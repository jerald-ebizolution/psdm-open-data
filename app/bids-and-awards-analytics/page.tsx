import Image from "next/image"

const BidsAndAwardsAnalytics = () => {
  return (
    // <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
    //   <h1 className="text-5xl text-[#313D85]">Bids and Awards Analytics</h1>
    //   <span className="text-lg">The Bids and Awards Analytics module provides complete visibility into public procurement tenders, financial values, and bidding outcomes. It tracks key monetary metrics such as Approved Budget for the Contract (ABC) values vs. awarded amounts, failed or cancelled bids, and OCDS priority indicators. Users can explore tender distributions across procurement modes, analyze bid activity trends, and drill down into top-performing agencies and suppliers.</span>
    // </div>
    <div className="flex flex-col gap-5">
      <Image src="/images/bids-and-awards-analytics.webp" alt="PSDBM Logo"  width={2000} height={2000}  />
    </div>
  )
}

export default BidsAndAwardsAnalytics