
const CollusionMonitoring = () => {
  return (
    <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
      <h1 className="text-3xl">Collusion Monitoring</h1>
      <span>The Collusion Monitoring module provides internal risk oversight and network analysis to detect potential anti-competitive behavior, bid rigging, and price fixing in procurement. It features a Bidder Network Analysis view utilizing network graphs where nodes represent suppliers and edges indicate shared bidding history, highlighting risk signals such as shared contacts, identical document metadata, alternating win-loss patterns, and regular mutual subcontracting. Additionally, the Bid Rotation and Price Fixing Monitor tracks recurrence patterns, cover and complementary bidding, price clustering within 0.5%, and market concentration to generate risk scores and GPPB/PCC referral reports</span>
    </div>
  )
}

export default CollusionMonitoring