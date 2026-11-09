"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { AlertCell, RefCell, RightCell, TitleCell, WrapCell } from "@/components/ocds/cells"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { FixedSortHeader } from "@/components/ocds/data-table/sortable-header"
import { formatPeso } from "@/components/ocds/format"
import { ListIndicatorCard, type FilterOption } from "@/components/ocds/list-indicator-card"
import { type R059Contract, type R059Response } from "@/lib/ocds-red-flags/types"

type Row = R059Contract & { overBudget: number; overByRatio: number }

const col = createColumnHelper<DataTableFeatures, Row>()

const columns = col.columns([
  col.accessor("awardReferenceNo", { header: "Award reference no.", cell: (c) => <RefCell wrap>{c.getValue()}</RefCell> }),
  col.accessor("projectName", { header: "Project", cell: (c) => <TitleCell>{c.getValue()}</TitleCell> }),
  col.accessor("procuringEntity", { header: "Procuring entity", cell: (c) => <WrapCell>{c.getValue()}</WrapCell> }),
  col.accessor("abc", {
    header: () => <RightCell>ABC</RightCell>,
    cell: (c) => <RightCell className="text-muted-foreground">{formatPeso(c.getValue())}</RightCell>,
  }),
  col.accessor("contractAmount", {
    header: () => <RightCell>Contract amount</RightCell>,
    cell: (c) => <RightCell className="font-semibold">{formatPeso(c.getValue())}</RightCell>,
  }),
  col.accessor("overBudget", {
    header: () => <RightCell>Over budget</RightCell>,
    cell: (c) => <AlertCell>+{formatPeso(c.getValue())}</AlertCell>,
  }),
  col.accessor("overByRatio", {
    header: () => <FixedSortHeader label="Over by" align="right" />,
    cell: (c) => (
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-700 dark:bg-red-950 dark:text-red-300">
          <span className="size-1.5 rounded-full bg-current" aria-hidden />+
          {(c.getValue() * 100).toFixed(1)}%
        </span>
      </div>
    ),
  }),
])

export function R059Card({
  fiscalYear,
  fiscalYears,
  q,
  region,
  regions,
  viewAll,
  data,
}: {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  region: string | null
  regions: FilterOption[]
  viewAll: boolean
  data: R059Response
}) {
  const rows = useMemo<Row[]>(
    () =>
      data.items.map((c) => ({
        ...c,
        overBudget: c.contractAmount - c.abc,
        overByRatio: c.abc ? (c.contractAmount - c.abc) / c.abc : 0,
      })),
    [data.items]
  )

  return (
    <ListIndicatorCard
      code="R059"
      badges={["red-flag", "possible-irregularity"]}
      title="Contract Amount Above the Approved Budget"
      description="Contracts signed for more than the Approved Budget for the Contract (ABC), the ceiling set for that procurement."
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      search={{ value: q, placeholder: "Search project, entity or award no." }}
      region={{ value: region, options: regions }}
      columns={columns}
      rows={rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      viewAll={viewAll}
      noun="flagged contracts"
      viewAllLabel="View All Flagged Contracts"
      csv={{
        filename: `r059-above-approved-budget-fy${fiscalYear}${region ? `-${region}` : ""}.csv`,
        header: ["Award reference no.", "Project", "Procuring entity", "ABC (PHP)", "Contract amount (PHP)", "Over budget (PHP)", "Over by (%)"],
        row: (r) => [r.awardReferenceNo, r.projectName, r.procuringEntity, r.abc.toFixed(2), r.contractAmount.toFixed(2), r.overBudget.toFixed(2), (r.overByRatio * 100).toFixed(1)],
      }}
      notes={[
        {
          title: "How it's computed",
          body: "Flag when Contract Amount > ABC. Over by % = (Contract Amount − ABC) ÷ ABC × 100. Needs the ABC field, which is not yet in the indicator sheet.",
        },
        {
          title: "Basis",
          body: "The ABC is the ceiling for bid prices (RA 9184 Revised IRR, Sec. 31.1); all procurement must stay within the approved budget (RA 12009 IRR, Sec. 7.7).",
        },
      ]}
    />
  )
}
