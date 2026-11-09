"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { DateCell, RefCell, WrapCell } from "@/components/ocds/cells"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { FixedSortHeader } from "@/components/ocds/data-table/sortable-header"
import { formatCount, formatPercent } from "@/components/ocds/format"
import { ListIndicatorCard, type FilterOption } from "@/components/ocds/list-indicator-card"
import { type Uc053Notice, type Uc053Response } from "./types"

type Row = Uc053Notice & { characters: number }

const col = createColumnHelper<DataTableFeatures, Row>()

const columns = col.columns([
  col.accessor("bidReferenceNo", { header: "Bid reference no.", cell: (c) => <RefCell>{c.getValue()}</RefCell> }),
  col.accessor("noticeTitle", {
    header: "Notice title",
    cell: (c) => <span className="font-semibold">“{c.getValue()}”</span>,
  }),
  col.accessor("characters", {
    header: () => <div className="text-center">Characters</div>,
    cell: (c) => (
      <div className="flex justify-center">
        <span className="inline-flex size-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-xs font-semibold tabular-nums text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {c.getValue()}
        </span>
      </div>
    ),
  }),
  col.accessor("procuringEntity", { header: "Procuring entity", cell: (c) => <WrapCell className="max-w-80">{c.getValue()}</WrapCell> }),
  col.accessor("procurementMode", { header: "Mode of procurement", cell: (c) => <WrapCell>{c.getValue()}</WrapCell> }),
  col.accessor("publishedDate", {
    header: () => <FixedSortHeader label="Published" />,
    cell: (c) => <DateCell value={c.getValue()} />,
  }),
])

export function ShortTitlesCard({
  fiscalYear,
  fiscalYears,
  mode,
  modes,
  viewAll,
  data,
  bidNoticeCount,
}: {
  fiscalYear: number
  fiscalYears: number[]
  mode: string | null
  modes: FilterOption[]
  viewAll: boolean
  data: Uc053Response
  /** From GET /api/ocds/bid-notices-published?fy=&mode= → `count`. */
  bidNoticeCount: number | null
}) {
  const rows = useMemo<Row[]>(
    () => data.items.map((n) => ({ ...n, characters: [...n.noticeTitle.trim()].length })),
    [data.items]
  )
  const share = bidNoticeCount ? data.total / bidNoticeCount : null

  return (
    <ListIndicatorCard
      code="UC053"
      badges={["indicator"]}
      title="Tenders with Short Titles"
      description={`Bid notices whose title has fewer than ${data.thresholdChars} characters — too vague for suppliers and the public to know what is being bought.`}
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      mode={{ value: mode, options: modes }}
      summary={
        <div className="flex flex-wrap items-end gap-x-10 gap-y-1">
          <div>
            <p className="text-xs text-muted-foreground">Share of tenders with short titles</p>
            <p className="text-3xl font-bold tabular-nums">
              {share === null ? "—" : formatPercent(share, 1)}
            </p>
          </div>
          <p className="mb-1.5 text-sm text-muted-foreground tabular-nums">
            {formatCount(data.total)}
            {bidNoticeCount !== null && ` of ${formatCount(bidNoticeCount)}`} bid notices · FY{" "}
            {fiscalYear}
          </p>
        </div>
      }
      columns={columns}
      rows={rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      viewAll={viewAll}
      noun="bid notices"
      statusSuffix=" · newest first"
      viewAllLabel="View All Short Titles"
      csv={{
        filename: `uc053-short-titles-fy${fiscalYear}${mode ? `-${mode}` : ""}.csv`,
        header: ["Bid reference no.", "Notice title", "Characters", "Procuring entity", "Mode of procurement", "Published"],
        row: (r) => [r.bidReferenceNo, r.noticeTitle, r.characters, r.procuringEntity, r.procurementMode, r.publishedDate],
      }}
      notes={[
        {
          title: "How it's computed",
          body: `Count tenders where the character length of Notice Title is under ${data.thresholdChars}; divide by all tenders × 100. Sorted by Published Date, newest first.`,
        },
        {
          title: "Fields used",
          body: "Bid Reference No. · Notice Title · Procuring Entity · Procurement Mode · Published Date",
        },
      ]}
    />
  )
}
