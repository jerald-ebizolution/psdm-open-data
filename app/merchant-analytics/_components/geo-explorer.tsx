"use client"

import * as echarts from "echarts"
import { ChevronRight, Loader2, MapPin, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIsMobile } from "@/hooks/use-mobile"

import { BarList } from "@/components/analytics/ui"
import { formatCount } from "@/components/ocds/format"
import { Button } from "@/components/ui/button"
import { type RegionStats } from "@/lib/merchant-analytics-data"
import {
  type AreaNode,
  CHILD_LABEL,
  CHILD_PROP,
  cleanAreaName,
  type GeoDepth,
  geoUrl,
  getAreaStats,
  getSectorBreakdown,
} from "@/lib/merchant-geo"
// import { cn } from "@/lib/utils"

type Crumb = { psgc: number; name: string; suppliers: number; activeRate: number; topCategory: string }
type Feature = { properties: Record<string, string | number> }
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] }

// Sequential single-hue ramp (light → dark blue) for supplier counts.
const RAMP = ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"]
const pctFmt = (n: number) => `${Math.round(n * 100)}%`

export function GeoExplorer({
  regions,
  regionNames,
  seed,
  initialRegion,
}: {
  regions: RegionStats[]
  regionNames: Record<string, string>
  /** Filter key, so child figures change with the slicers. */
  seed: string
  /** Start drilled into this region (from the Region slicer). */
  initialRegion?: RegionStats
}) {
  // Phones: no pan/zoom so a swipe scrolls the page; tap still drills down.
  const isMobile = useIsMobile()
  const country: Crumb = useMemo(() => {
    const suppliers = regions.reduce((a, r) => a + r.suppliers, 0)
    const activeRate = regions.reduce((a, r) => a + r.activeRate * r.suppliers, 0) / (suppliers || 1)
    return { psgc: 0, name: "Philippines", suppliers, activeRate, topCategory: regions[0]?.topCategory ?? "—" }
  }, [regions])

  const [path, setPath] = useState<Crumb[]>(() =>
    initialRegion ? [{ ...initialRegion, name: regionNames[initialRegion.code] ?? initialRegion.code }] : []
  )
  const depth = path.length as GeoDepth
  const current = path.at(-1) ?? country

  const [geo, setGeo] = useState<{ key: string; json: FeatureCollection } | null>(null)
  const [nodes, setNodes] = useState<AreaNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const mapKey = `ph-${depth}-${current.psgc}`
  const loading = geo?.key !== mapKey && !error

  // Load the boundaries of the current level's children, then their stats.
  useEffect(() => {
    let cancelled = false
    const prop = CHILD_PROP[depth]
    fetch(geoUrl(depth, depth === 0 ? null : current.psgc))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<FeatureCollection>
      })
      .then(async (json) => {
        for (const f of json.features) f.properties.name = String(f.properties[`${prop}_psgc`])
        const children = json.features.map((f) => ({
          psgc: Number(f.properties[`${prop}_psgc`]),
          name: cleanAreaName(String(f.properties[`${prop}_en`])),
        }))
        const stats =
          depth === 0
            ? children.map((c) => {
                const r = regions.find((x) => x.psgc === c.psgc)
                return {
                  ...c,
                  name: r ? (regionNames[r.code] ?? c.name) : c.name,
                  suppliers: r?.suppliers ?? 0,
                  activeRate: r?.activeRate ?? 0,
                  topCategory: r?.topCategory ?? "—",
                }
              })
            : await getAreaStats(current, children, seed)
        if (cancelled) return
        echarts.registerMap(mapKey, json as never)
        setNodes(stats.sort((a, b) => b.suppliers - a.suppliers))
        setGeo({ key: mapKey, json })
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError("Map boundaries could not be loaded for this area.")
      })
    return () => {
      cancelled = true
    }
  }, [mapKey, depth, current, regions, regionNames, seed])

  // Create the chart once; clicks drill into the clicked area.
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const drillRef = useRef<(psgc: number) => void>(() => {})

  useEffect(() => {
    drillRef.current = (psgc: number) => {
      const n = nodes.find((x) => x.psgc === psgc)
      if (!n || depth >= 3) return
      setError(null)
      setPath((p) => [...p, n])
    }
  }, [nodes, depth])

  useEffect(() => {
    if (!elRef.current) return
    const chart = echarts.init(elRef.current)
    chartRef.current = chart
    chart.on("click", (p) => drillRef.current(Number(p.name)))
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
    if (!chart || geo?.key !== mapKey) return
    const max = Math.max(1, ...nodes.map((n) => n.suppliers))
    const next = depth < 3 ? CHILD_LABEL[(depth + 1) as GeoDepth].many.toLowerCase() : null
    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          borderColor: "#e5e7eb",
          textStyle: { fontSize: 12, color: "#111827" },
          formatter: (p: { data?: AreaNode }) => {
            const d = p.data
            if (!d) return ""
            return `<div style="min-width:180px">
              <div style="font-weight:600;margin-bottom:4px">${d.name}</div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#6b7280">Suppliers</span><b>${formatCount(d.suppliers)}</b></div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#6b7280">Active</span><b>${pctFmt(d.activeRate)}</b></div>
              <div style="color:#6b7280;margin-top:4px">Top category</div>
              <div style="white-space:normal;max-width:220px">${d.topCategory}</div>
              ${next ? `<div style="color:#2563eb;margin-top:6px">Click to view ${next}</div>` : ""}
            </div>`
          },
        },
        visualMap: {
          type: "continuous",
          min: 0,
          max,
          left: 8,
          bottom: 8,
          itemHeight: isMobile ? 60 : 90,
          itemWidth: 10,
          text: [formatCount(max), "0"],
          textStyle: { color: "#6b7280", fontSize: 11 },
          inRange: { color: RAMP },
          calculable: false,
        },
        series: [
          {
            type: "map",
            layoutCenter: ["50%", "50%"],
            layoutSize: "96%",
            map: mapKey,
            roam: !isMobile,
            scaleLimit: { min: 0.8, max: 12 },
            itemStyle: { borderColor: "#ffffff", borderWidth: 0.6, areaColor: "#f3f4f6" },
            emphasis: { label: { show: false }, itemStyle: { areaColor: "#f59e0b" } },
            select: { disabled: true },
            label: { show: false },
            data: nodes.map((n) => ({ ...n, name: String(n.psgc), value: n.suppliers })),
          },
        ],
      },
      { notMerge: true }
    )
  }, [geo, mapKey, nodes, depth, isMobile])

  const sectors = useMemo(
    () => getSectorBreakdown(current.psgc || "ph", current.suppliers),
    [current.psgc, current.suppliers]
  )
  const childLabel = CHILD_LABEL[depth]

  return (
    <div className="grid lg:h-110 lg:grid-cols-[4fr_6fr]">
      {/* Map */}
      <div className="relative flex min-h-0 flex-col border-t lg:border-r">
        <div className="flex flex-wrap items-center gap-1 px-4 py-3 text-sm">
          <MapPin className="mr-1 size-4 text-muted-foreground" aria-hidden />
          {[country, ...path].map((c, i) => (
            <span key={c.psgc} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
              {i < path.length ? (
                <button
                  type="button"
                  className="text-[#2a78d6] hover:underline"
                  onClick={() => {
                    setError(null)
                    setPath(path.slice(0, i))
                  }}
                >
                  {c.name}
                </button>
              ) : (
                <span className="font-semibold">{c.name}</span>
              )}
            </span>
          ))}
          {path.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => {
                setError(null)
                setPath([])
              }}
            >
              <RotateCcw /> Reset
            </Button>
          )}
        </div>
        <div
          ref={elRef}
          className="h-72 w-full sm:h-80 lg:h-auto lg:min-h-0 lg:flex-1"
          role="img"
          aria-label={`Map of suppliers by ${childLabel.one.toLowerCase()}`}
        />
        {(loading || error) && (
          <div className="absolute inset-0 top-12 flex items-center justify-center bg-white/70 text-sm text-muted-foreground">
            {error ? (
              <span>{error}</span>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Loading map…
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selected area */}
      <aside className="space-y-4 border-t p-4 lg:min-h-0">
        <div>
          <p className="text-xs text-muted-foreground">
            {path.length ? CHILD_LABEL[(depth - 1) as GeoDepth].one : "Country"}
          </p>
          <p className="text-base font-semibold">{current.name}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Suppliers</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatCount(current.suppliers)}</dd>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Active</dt>
              <dd className="text-lg font-semibold tabular-nums">{pctFmt(current.activeRate)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Top category: <span className="text-foreground">{current.topCategory}</span>
          </p>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Industry Sectors</p>
          <BarList items={sectors} color="#00C49F" label="Suppliers" />
        </div>
      {/* 
        <div>
          <p className="mb-1 text-sm font-semibold">Top {childLabel.many}</p>
          <ul className="space-y-0.5">
            {nodes.slice(0, 6).map((n) => (
              <li key={n.psgc}>
                <button
                  type="button"
                  disabled={depth >= 3}
                  onClick={() => drillRef.current(n.psgc)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm",
                    depth < 3 && "hover:bg-muted/60"
                  )}
                >
                  <span className="truncate">{n.name}</span>
                  <span className="tabular-nums">{formatCount(n.suppliers)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div> */}
      </aside>
    </div>
  )
}
