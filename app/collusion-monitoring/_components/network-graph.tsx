"use client"

import * as echarts from "echarts"
import { Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIsMobile } from "@/hooks/use-mobile"

import { formatCount } from "@/components/ocds/format"
import { Input } from "@/components/ui/input"
import { type BidderNetwork, type RiskBand, SIGNALS } from "@/lib/collusion-data"
import { cn } from "@/lib/utils"

export const BAND: Record<RiskBand, { label: string; color: string; badge: string }> = {
  high: { label: "High risk", color: "#dc2626", badge: "bg-red-600 text-white" },
  medium: { label: "Medium risk", color: "#f59e0b", badge: "bg-amber-500 text-white" },
  low: { label: "Low risk", color: "#312e81", badge: "bg-indigo-900 text-white" },
}
const signalLabel = Object.fromEntries(SIGNALS.map((s) => [s.key, s.label]))

export function NetworkGraph({ network, regionNames }: { network: BidderNetwork; regionNames: Record<string, string> }) {
  // Phones: no pan/zoom/drag so a swipe scrolls the page; tap still selects.
  const isMobile = useIsMobile()
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const byId = useMemo(() => new Map(network.suppliers.map((s) => [s.id, s])), [network])
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? network.suppliers.filter((s) => s.name.toLowerCase().includes(needle)).slice(0, 6) : []
  }, [q, network])

  // Create the chart once.
  useEffect(() => {
    if (!elRef.current) return
    const chart = echarts.init(elRef.current)
    chartRef.current = chart
    chart.on("click", (p) => {
      if (p.dataType === "node") setSelected((p.data as { id: string }).id)
    })
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // Data → chart.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const maxTenders = Math.max(1, ...network.suppliers.map((s) => s.tenders))
    chart.setOption(
      {
        tooltip: {
          borderColor: "#e5e7eb",
          textStyle: { fontSize: 12, color: "#111827" },
          formatter: (p: { dataType: string; data: Record<string, unknown> }) => {
            if (p.dataType === "node") {
              const s = byId.get(p.data.id as string)!
              return `<b>${s.name}</b><br/>Risk score <b>${s.risk}</b> · ${formatCount(s.tenders)} tenders`
            }
            const e = p.data as { source: string; target: string; sharedTenders: number; signals: string[] }
            return `<b>${byId.get(e.source)?.name}</b> ↔ <b>${byId.get(e.target)?.name}</b><br/>${e.sharedTenders} shared tenders${
              e.signals.length ? `<br/>${e.signals.map((k) => signalLabel[k]).join(", ")}` : ""
            }`
          },
        },
        series: [
          {
            type: "graph",
            layout: "force",
            roam: !isMobile,
            draggable: !isMobile,
            force: isMobile ? { repulsion: 90, edgeLength: [30, 80], gravity: 0.12 } : { repulsion: 160, edgeLength: [50, 140], gravity: 0.08 },
            emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
            label: { show: false, position: "right", fontSize: 11, color: "#111827" },
            data: network.suppliers.map((s) => ({
              id: s.id,
              name: s.name,
              symbolSize: 10 + (s.tenders / maxTenders) * 26,
              itemStyle: { color: BAND[s.band].color, borderColor: "#fff", borderWidth: 1.5 },
              label: { show: s.band === "high" && !isMobile },
            })),
            links: network.edges.map((e) => ({
              ...e,
              lineStyle: {
                color: e.risk >= 60 ? "#dc2626" : e.risk >= 35 ? "#f59e0b" : "#94a3b8",
                width: 1 + Math.min(5, e.sharedTenders / 8),
                opacity: e.risk >= 35 ? 0.9 : 0.45,
              },
            })),
          },
        ],
      },
      { notMerge: true }
    )
  }, [network, byId, isMobile])

  // Highlight the selected supplier and its neighbours.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 })
    if (selected) {
      const index = network.suppliers.findIndex((s) => s.id === selected)
      if (index >= 0) chart.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: index })
    }
  }, [selected, network])

  const supplier = selected ? byId.get(selected) : null
  const links = supplier
    ? network.edges
        .filter((e) => e.source === supplier.id || e.target === supplier.id)
        .map((e) => ({ ...e, other: byId.get(e.source === supplier.id ? e.target : e.source)! }))
        .sort((a, b) => b.risk - a.risk)
    : []

  return (
    <div className="grid lg:grid-cols-[1fr_20rem]">
      <div className="border-t lg:border-r">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search supplier"
              aria-label="Search supplier"
              className="pl-9"
            />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-md border bg-background py-1 shadow-md">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelected(m.id)
                        setQ("")
                      }}
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="size-2 shrink-0 rounded-full" style={{ background: BAND[m.band].color }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(BAND) as RiskBand[]).map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: BAND[b].color }} aria-hidden />
                {BAND[b].label}
              </li>
            ))}
            <li>Node size = tenders · line = shared bidding</li>
          </ul>
        </div>
        <div ref={elRef} className="h-85 w-full sm:h-115" role="img" aria-label="Bidder network graph" />
      </div>

      <aside className="border-t p-5">
        {supplier ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{supplier.name}</p>
                <p className="text-xs text-muted-foreground">{regionNames[supplier.region] ?? supplier.region}</p>
              </div>
              <button type="button" aria-label="Clear selection" onClick={() => setSelected(null)} className="rounded p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tabular-nums">{supplier.risk}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", BAND[supplier.band].badge)}>
                {BAND[supplier.band].label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCount(supplier.tenders)} tenders · {formatCount(supplier.wins)} won
            </p>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Linked suppliers</p>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.other.id} className="rounded-md p-2 text-sm border border-gray-200">
                    <button type="button" className="font-medium hover:underline" onClick={() => setSelected(l.other.id)}>
                      {l.other.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{l.sharedTenders} shared tenders</p>
                    {l.signals.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.signals.map((s) => (
                          <span key={s} className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
                            {signalLabel[s]}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Highest-risk suppliers</p>
            <ul className="space-y-1">
              {network.suppliers.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: BAND[s.band].color }} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{s.risk}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Select a supplier to see its links and risk signals.</p>
          </div>
        )}
      </aside>
    </div>
  )
}
