import { type PageSearchParams } from "@/lib/ocds-paging"
import { DecisionPeriodPage } from "../_components/decision-period-page"

const OcdsRedFlagR061 = ({ searchParams }: { searchParams: Promise<PageSearchParams> }) => (
  <DecisionPeriodPage flag="R061" searchParams={searchParams} />
)

export default OcdsRedFlagR061
