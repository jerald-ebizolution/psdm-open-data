import { type PageSearchParams } from "@/lib/ocds-paging"
import { DecisionPeriodPage } from "../_components/decision-period-page"

const OcdsRedFlagR062 = ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => (
  <DecisionPeriodPage flag="R062" searchParams={searchParams} />
)

export default OcdsRedFlagR062
