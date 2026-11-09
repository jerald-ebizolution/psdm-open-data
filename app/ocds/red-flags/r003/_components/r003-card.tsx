"use client"

import { useMemo } from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { AlertCell, DateCell, RefCell, RightCell, TitleCell, WrapCell } from "@/components/ocds/cells"
import { type DataTableFeatures } from "@/components/ocds/data-table/features"
import { FixedSortHeader } from "@/components/ocds/data-table/sortable-header"
import { daysBetween, formatDays } from "@/components/ocds/format"
import { ListIndicatorCard, type FilterOption } from "@/components/ocds/list-indicator-card"
import { type R003Response, type R003Tender } from "@/lib/ocds-red-flags/types"

type Row = R003Tender & { periodDays: number; shortByDays: number }

const col = createColumnHelper<DataTableFeatures, Row>()

const columns = col.columns([
  col.accessor("bidReferenceNo", { header: "Bid reference no.", cell: (c) => <RefCell>{c.getValue()}</RefCell> }),
  col.accessor("noticeTitle", { header: "Notice title", cell: (c) => <TitleCell>{c.getValue()}</TitleCell> }),
  col.accessor("procuringEntity", { header: "Procuring entity", cell: (c) => <WrapCell>{c.getValue()}</WrapCell> }),
  col.accessor("procurementMode", { header: "Mode", cell: (c) => <WrapCell className="max-w-32 min-w-24">{c.getValue()}</WrapCell> }),
  col.accessor("publishedDate", { header: "Published", cell: (c) => <DateCell value={c.getValue()} /> }),
  col.accessor("closingDate", { header: "Closing", cell: (c) => <DateCell value={c.getValue()} /> }),
  col.accessor("periodDays", { header: () => <RightCell>Period</RightCell>, cell: (c) => <RightCell>{formatDays(c.getValue())}</RightCell> }),
  col.accessor("minimumDays", { header: () => <RightCell>Minimum</RightCell>, cell: (c) => <RightCell>{formatDays(c.getValue())}</RightCell> }),
  col.accessor("shortByDays", {
    header: () => <FixedSortHeader label="Short by" align="right" />,
    cell: (c) => <AlertCell>{formatDays(c.getValue())}</AlertCell>,
  }),
])

export function R003Card({
  fiscalYear,
  fiscalYears,
  q,
  mode,
  modes,
  viewAll,
  data,
}: {
  fiscalYear: number
  fiscalYears: number[]
  q: string
  mode: string | null
  modes: FilterOption[]
  viewAll: boolean
  data: R003Response
}) {
  const rows = useMemo<Row[]>(
    () =>
      data.items.map((t) => {
        const periodDays = daysBetween(t.publishedDate, t.closingDate)
        return { ...t, periodDays, shortByDays: t.minimumDays - periodDays }
      }),
    [data.items]
  )

  return (
    <ListIndicatorCard
      code="R003"
      badges={["red-flag"]}
      title="Submission Period Is Too Short"
      description="Bid notices whose time between publishing and the closing date is shorter than the minimum posting period for their procurement mode."
      fiscalYear={fiscalYear}
      fiscalYears={fiscalYears}
      search={{ value: q, placeholder: "Search title, entity or reference no." }}
      mode={{ value: mode, options: modes }}
      columns={columns}
      rows={rows}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      viewAll={viewAll}
      noun="flagged tenders"
      viewAllLabel="View All Flagged Tenders"
      csv={{
        filename: `r003-short-submission-period-fy${fiscalYear}.csv`,
        header: ["Bid reference no.", "Notice title", "Procuring entity", "Mode", "Published", "Closing", "Period (days)", "Minimum (days)", "Short by (days)"],
        row: (r) => [r.bidReferenceNo, r.noticeTitle, r.procuringEntity, r.procurementMode, r.publishedDate, r.closingDate, r.periodDays, r.minimumDays, r.shortByDays],
      }}
      notes={[
        {
          title: "How it's computed",
          body: "Flag when (Closing Date − Published Date) is less than the minimum for the Procurement Mode. Public Bidding: 7 calendar days. Small Value Procurement and Shopping: 3 calendar days (placeholder). Negotiated modes are not checked.",
        },
        {
          title: "Basis",
          body: "Invitation to Bid is posted for 7 calendar days on PhilGEPS (RA 9184 Revised IRR, Sec. 21.2.1). The 3-day RFQ posting period for alternative modes is a placeholder until confirmed against the RA 12009 IRR and GPPB manual.",
        },
      ]}
    />
  )
}
