import Image from "next/image"

const GreenProcurement = () => {
  return (
    // <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
    //   <h1 className="text-5xl text-[#313D85]">Green Procurement</h1>
    //   <span className="text-lg">The Green Public Procurement (GPP) module tracks environmentally sustainable purchasing practices, supplier certifications, and agency compliance across public procurement channels. It monitors key KPIs including total green spend, GPP percentage share, green-certified suppliers, and compliance rates across item categories in both eMarketplace and e-Bidding systems. The module utilizes OCR technology to extract green data from procurement documents, highlights DENR-certified products, and evaluates carbon impact by measuring avoided emissions ($tCO_2e$) and mapping energy-efficient items against UN Sustainable Development Goals (SDGs 7, 11, 12, and 13) using DENR, DOE, and IPCC Tier 1 frameworks. </span>
    // </div>
    <div className="flex flex-col gap-5">
      <Image src="/images/green-procurement.webp" alt="PSDBM Logo"  width={2000} height={2000}  />
    </div>
  )
}

export default GreenProcurement