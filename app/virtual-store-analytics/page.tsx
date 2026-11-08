import Image from "next/image"

const VirtualStoreAnalytics = () => {
  return (
    // <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
    //   <h1 className="text-5xl text-[#313D85]">Virtual Store Analytics</h1>
    //   <span className="text-lg">The Virtual Store Analytics module provides comprehensive tracking of government procurement activity, item utilization, and store fulfillment performance. It measures core KPIs including active product listings, total purchase/delivery orders, overall spending, and active agency adoption rates. The dashboard analyzes percentage utilization across regions and months, tracks actual versus fulfilled Agency Delivery Orders—including unmet demand from out-of-stock items—and features price search tools, external price benchmarking, and real-time updates integrated with IAR and FACT.</span>
    // </div>
    <div className="flex flex-col gap-5">
      <Image src="/images/virtual-store-analytics.webp" alt="PSDBM Logo"  width={2000} height={2000}  />
    </div>
  )
}

export default VirtualStoreAnalytics