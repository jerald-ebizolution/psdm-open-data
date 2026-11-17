"use client"

import * as echarts from "echarts"
import { AlertTriangle, BadgeCheck, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIsMobile } from "@/hooks/use-mobile"

import { Input } from "@/components/ui/input"
import { BO_SOURCES, type BoEntity } from "@/lib/beneficial-ownership-data"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { name: "Supplier", color: "#4338ca" },
  { name: "Owner or director", color: "#818cf8" },
  { name: "Linked company", color: "#94a3b8" },
  { name: "Public official", color: "#dc2626" },
]
const sourceName = Object.fromEntries(BO_SOURCES.map((s) => [s.code, s.name]))

export function EntityMap({ entities }: { entities: BoEntity[] }) {
  // Phones: no pan/zoom/drag so a swipe scrolls the page; relationship labels hidden.
  const isMobile = useIsMobile()
  const [q, setQ] = useState("")
  const initial = entities.find((e) => e.coi.length) ?? entities[0]
  const [selectedId, setSelectedId] = useState<string | undefined>(initial?.id)
  const entity = entities.find((e) => e.id === selectedId) ?? initial

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (needle ? entities.filter((e) => e.name.toLowerCase().includes(needle)) : entities).slice(0, 12)
  }, [entities, q])

  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!elRef.current) return
    const chart = echarts.init(elRef.current)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !entity) return
    type Node = { id: string; name: string; category: number; symbolSize: number; symbol?: string }
    type Edge = { source: string; target: string; label: string; risk?: boolean }
    const nodes = new Map<string, Node>()
    const edges: Edge[] = []
    const add = (n: Node) => nodes.set(n.id, nodes.get(n.id) ?? n)

    add({ id: entity.id, name: entity.name, category: 0, symbolSize: 46, symbol: "roundRect" })
    for (const o of entity.owners) {
      add({ id: o.id, name: o.initials, category: 1, symbolSize: 30 })
      edges.push({ source: o.id, target: entity.id, label: o.share !== null ? `${o.role} · ${o.share}%` : o.role })
      for (const c of o.otherCompanies) {
        const id = `C-${c.name}`
        add({ id, name: c.name, category: 2, symbolSize: 26, symbol: "roundRect" })
        edges.push({ source: o.id, target: id, label: c.share !== null ? `Also owns ${c.share}%` : "Also a director" })
      }
    }
    for (const m of entity.coi) {
      const id = `OFF-${m.official.id}`
      add({ id, name: `${m.official.initials}\n${m.official.position}`, category: 3, symbolSize: 32 })
      edges.push({ source: m.owner.id, target: id, label: m.relationship === "Self" ? "Same person" : `${m.relationship} of`, risk: true })
    }

    chart.setOption(
      {
        color: CATEGORIES.map((c) => c.color),
        tooltip: { show: false },
        series: [
          {
            type: "graph",
            layout: "force",
            roam: !isMobile,
            draggable: !isMobile,
            force: isMobile ? { repulsion: 220, edgeLength: [55, 95], gravity: 0.1 } : { repulsion: 420, edgeLength: [90, 150], gravity: 0.06 },
            categories: CATEGORIES.map((c) => ({ name: c.name, itemStyle: { color: c.color } })),
            label: { show: true, position: "bottom", fontSize: 11, color: "#111827", width: 130, overflow: "truncate" },
            edgeLabel: { show: !isMobile, fontSize: 10, color: "#6b7280", formatter: (p: { data: Edge }) => p.data.label },
            lineStyle: { color: "#94a3b8", width: 1.5, curveness: 0.05 },
            emphasis: { focus: "adjacency" },
            data: [...nodes.values()],
            links: edges.map((e) => ({ ...e, lineStyle: e.risk ? { color: "#dc2626", width: 2.5, type: "dashed" } : undefined })),
          },
        ],
      },
      { notMerge: true }
    )
  }, [entity, isMobile])

  if (!entity) return <p className="border-t px-4 py-10 text-center text-sm text-muted-foreground">No suppliers match the selected filters.</p>

  return (
    <div className="grid lg:grid-cols-[16rem_1fr]">
      {/* Supplier picker */}
      <aside className="border-t p-4 lg:border-r">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplier" aria-label="Search supplier" className="pl-9" />
        </div>
        <ul className="max-h-44 space-y-0.5 overflow-y-auto lg:max-h-[420px]">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  e.id === entity.id && "bg-indigo-50 font-semibold text-indigo-900"
                )}
              >
                <span className="truncate">{e.name}</span>
                {e.coi.length > 0 && <AlertTriangle className="size-3.5 shrink-0 text-red-600" aria-label="Conflict of interest" />}
              </button>
            </li>
          ))}
          {!list.length && <li className="px-2 py-1.5 text-sm text-muted-foreground">No match.</li>}
        </ul>
      </aside>

      <div className="border-t">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <div>
            <p className="font-semibold">{entity.name}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {entity.form}
              <span>·</span>
              {entity.verified ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <BadgeCheck className="size-3.5" /> Disclosure verified
                </span>
              ) : (
                <span>Disclosure not yet verified</span>
              )}
              <span>·</span>
              Sources: {entity.sources.map((s) => sourceName[s]).join(", ")}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {CATEGORIES.map((c) => (
              <li key={c.name} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
                {c.name}
              </li>
            ))}
          </ul>
        </div>
        <div ref={elRef} className="h-[320px] w-full sm:h-[400px]" role="img" aria-label={`Ownership map of ${entity.name}`} />
        {entity.shell.length > 0 && (
          <div className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-semibold">Shell company indicators:</span> {entity.shell.join(" · ")}
          </div>
        )}
      </div>
    </div>
  )
}
