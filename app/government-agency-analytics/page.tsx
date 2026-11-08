import Image from "next/image"

const GovernmentAgencyAnalytics = () => {
  return (
    // <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
    //   <h1 className="text-5xl text-[#313D85]">Government Agency Analytics</h1>
    //   <span className="text-lg">The Government Agency Analytics module provides overview of agency registration, procurement planning, and compliance monitoring. It tracks key KPIs including active agency counts, Annual Procurement Plan (APP) submissions, total agency budgets, and planned versus actual orders. The dashboard distinguishes centralized (PS-DBM) from decentralized buyers, highlights agencies with submitted APPs but zero procurement, and delivers insights into agency registration trends, geographic distribution, and overall report compliance.</span>
    // </div>
    <div className="flex flex-col gap-5">
      <Image src="/images/government-agency-analytics.webp" alt="PSDBM Logo"  width={2000} height={2000}  />
    </div>
  )
}

export default GovernmentAgencyAnalytics