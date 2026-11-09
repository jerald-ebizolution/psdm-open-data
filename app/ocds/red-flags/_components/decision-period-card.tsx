"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { AlertCell, DateCell, RefCell, TitleCell, WrapCell } from "@/components/ocds/cells"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { FixedSortHeader } from "@/components/ocds/data-table/sortable-header"
import { daysBetween, formatDays } from "@/components/ocds/format"
import { ListIndicatorCard, type FilterOption } from "@/components/ocds/list-indicator-card"
import {
  type DecisionPeriodResponse,
  type DecisionPeriodTender,
} from "@/lib/ocds-red-flags/types"

type Row = DecisionPeriodTender & { decisionDays: number }
export type DecisionFlag = "R061" | "R062"

const col = createColumnHelper<DataTableFeatures, Row>()

/** R061 lists the shortest periods first, R062 the longest first. */
const makeColumns = (flag: DecisionFlag) =>
  col.columns([
    col.accessor("bidReferenceNo", { header: "Bid reference no.", cell: (c) => <RefCell>{c.getValue()}</RefCell> }),
    col.accessor("noticeTitle", { header: "Notice title", cell: (c) => <TitleCell>{c.getValue()}</TitleCell> }),
    col.accessor("procuringEntity", { header: "Procuring entity", cell: (c) => <WrapCell>{c.getValue()}</WrapCell> }),
    col.accessor("procurementMode", { header: "Mode", cell: (c) => <WrapCell className="max-w-36 min-w-24">{c.getValue()}</WrapCell> }),
    col.accessor("closingDate", { header: "Closing", cell: (c) => <DateCell value={c.getValue()} /> }),
    col.accessor("awardDate", { header: "Award date", cell: (c) => <DateCell value={c.getValue()} /> }),
    col.accessor("decisionDays", {
      header: () => (
        <FixedSortHeader
          label="Decision period"
          align="right"
          direction={flag === "R061" ? "asc" : "desc"}
        />
      ),
      cell: (c) => <AlertCell>{c.getValue() === 0 ? "Same day" : formatDays(c.getValue())}</AlertCell>,
    }),
  ])

const COLUMNS = { R061: makeColumns("R061"), R062: makeColumns("R062") }

const COPY: Record<
  DecisionFlag,
  {
    title: string
    description: (days: number) => string
    computed: (days: number) => string
    basis: string
    file: string
  }
> = {
  R061: {
    title: "Decision Period Is Extremely Short",
    description: (d) =>
      `Tenders awarded less than ${d} days after bids closed — too little time for a proper evaluation and post-qualification.`,
    computed: (d) => `Flag when (Award Date − Closing Date) < ${d} days.`,
    basis:
      "3 days is the threshold from the indicator sheet, not a legal limit. Adjust it per procurement mode if the client prefers.",
    file: "r061-decision-period-too-short",
  },
  R062: {
    title: "Decision Period Is Extremely Long",
    description: (d) =>
      `Tenders awarded more than ${d} days after bids closed — a sign of evaluation delays.`,
    computed: (d) => `Flag when (Award Date − Closing Date) > ${d} days.`,
    basis:
      "180 days comes from the indicator sheet. The rules set a stricter limit — 3 months from bid opening to award (RA 9184 Revised IRR, Sec. 38.1) — so 90 days may be the better threshold.",
    file: "r062-decision-period-too-long",
  },
}

export function DecisionPeriodCard({
  flag,
  fiscalYear,
  fiscalYears,
  q,
  mode,
  modes,
  viewAll,
  data,
}: {
  flag: DecisionFlag
  fiscalYear: number
  fiscalYears: number[]
  q: string
  mode: string | null
  modes: FilterOption[]
  viewAll: boolean
  data: DecisionPeriodResponse
}) {
  const copy = COPY[flag]
  const rows = useMemo<Row[]>(
    () => data.items.map((t) => ({ ...t, decisionDays: daysBetween(t.closingDate, t.awardDate) })),
    [data.items]
  )

  return (
    <ListIndicatorCard
      code={flag}
      badges={["red-flag"]}
      title={copy.title}
      description={copy.description(data.thresholdDays)}
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      search={{ value: q, placeholder: "Search title, entity or reference no." }}
      mode={{ value: mode, options: modes }}
      columns={COLUMNS[flag]}
      rows={rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      viewAll={viewAll}
      noun="flagged tenders"
      viewAllLabel="View All Flagged Tenders"
      csv={{
        filename: `${copy.file}-fy${fiscalYear}.csv`,
        header: ["Bid reference no.", "Notice title", "Procuring entity", "Mode", "Closing", "Award date", "Decision period (days)"],
        row: (r) => [r.bidReferenceNo, r.noticeTitle, r.procuringEntity, r.procurementMode, r.closingDate, r.awardDate, r.decisionDays],
      }}
      notes={[
        { title: "How it's computed", body: copy.computed(data.thresholdDays) },
        { title: "Basis", body: copy.basis },
      ]}
    />
  )
}
