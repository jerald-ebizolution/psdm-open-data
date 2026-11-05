
const BenificialOwnership = () => {
  return (
    <div className="min-h-full bg-[#f4f5f7] flex justify-center items-center flex-col gap-3 text-center px-5">
      <h1 className="text-3xl">Beneficial Ownership</h1>
      <span>The Beneficial Ownership module provides internal transparency and risk screening to verify corporate control, trace linked entities, and detect conflicts of interest in procurement. It tracks KPIs including profiled suppliers, verified disclosures, linked corporate entities, and conflict-of-interest flags using data integrated from sources such as SEC GIS, DTI, BIR, and PCAB. Featuring an entity relationship map, the module cross-checks ownership against public officials and relatives using CSC PDS data to flag potential conflicts of interest, support shell company detection, and enable SALN linkages.</span>
    </div>
  )
}

export default BenificialOwnership