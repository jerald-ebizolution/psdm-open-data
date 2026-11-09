"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { AlertCell, DateCell, RefCell, RightCell, TitleCell, WrapCell } from "@/components/ocds/cells"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { FixedSortHeader } from "@/components/ocds/data-table/sortable-header"
import { daysBetween, formatDays } from "@/components/ocds/format"
import { ListIndicatorCard } from "@/components/ocds/list-indicator-card"
import { type R060Contract, type R060Response } from "@/lib/ocds-red-flags/types"

type Row = R060Contract & { daysTaken: number; overLimitDays: number }

const col = createColumnHelper<DataTableFeatures, Row>()

const columns = col.columns([
  col.accessor("awardReferenceNo", { header: "Award reference no.", cell: (c) => <RefCell wrap>{c.getValue()}</RefCell> }),
  col.accessor("projectName", { header: "Project", cell: (c) => <TitleCell className="max-w-52">{c.getValue()}</TitleCell> }),
  col.accessor("procuringEntity", { header: "Procuring entity", cell: (c) => <WrapCell>{c.getValue()}</WrapCell> }),
  col.accessor("awardeeName", { header: "Awardee", cell: (c) => <WrapCell className="max-w-48">{c.getValue()}</WrapCell> }),
  col.accessor("awardDate", { header: "Award date", cell: (c) => <DateCell value={c.getValue()} /> }),
  col.accessor("contractSignedDate", { header: "Contract signed", cell: (c) => <DateCell value={c.getValue()} /> }),
  col.accessor("daysTaken", {
    header: () => <RightCell>Days taken</RightCell>,
    cell: (c) => <RightCell>{formatDays(c.getValue())}</RightCell>,
  }),
  col.accessor("overLimitDays", {
    header: () => <FixedSortHeader label="Over limit" align="right" />,
    cell: (c) => <AlertCell>+{formatDays(c.getValue())}</AlertCell>,
  }),
])

export function R060Card({
  fiscalYear,
  fiscalYears,
  q,
  viewAll,
  data,
}: {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  viewAll: boolean
  data: R060Response
}) {
  const rows = useMemo<Row[]>(
    () =>
      data.items.map((c) => {
        const daysTaken = daysBetween(c.awardDate, c.contractSignedDate)
        return { ...c, daysTaken, overLimitDays: daysTaken - data.limitDays }
      }),
    [data.items, data.limitDays]
  )

  return (
    <ListIndicatorCard
      code="R060"
      badges={["red-flag", "possible-irregularity"]}
      title="Contract Signed Late After the Award"
      description={`Awards where the contract was signed more than ${data.limitDays} calendar days after the Notice of Award.`}
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      search={{ value: q, placeholder: "Search project, entity or awardee" }}
      columns={columns}
      rows={rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      viewAll={viewAll}
      noun="flagged contracts"
      viewAllLabel="View All Flagged Contracts"
      csv={{
        filename: `r060-late-contract-signing-fy${fiscalYear}.csv`,
        header: ["Award reference no.", "Project", "Procuring entity", "Awardee", "Award date", "Contract signed", "Days taken", "Over limit (days)"],
        row: (r) => [r.awardReferenceNo, r.projectName, r.procuringEntity, r.awardeeName, r.awardDate, r.contractSignedDate, r.daysTaken, r.overLimitDays],
      }}
      notes={[
        {
          title: "How it's computed",
          body: `Flag when (Contract Signing Date − Award Date) > ${data.limitDays} calendar days. Award Date stands in for the date the bidder received the Notice of Award.`,
        },
        {
          title: "Basis",
          body: "The winning bidder signs the contract and posts performance security within 10 calendar days of receiving the Notice of Award (RA 9184 Revised IRR, Sec. 37.2). Confirm against the RA 12009 IRR.",
        },
      ]}
    />
  )
}
