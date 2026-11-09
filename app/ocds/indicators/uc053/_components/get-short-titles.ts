import { dateBefore, MOCK_ENTITIES, pick } from "@/lib/ocds-mock"
import { mockPage } from "@/lib/ocds-paging"
import { type Uc053Notice, type Uc053Response } from "./types"

// Dummy data shaped exactly like the backend response.
// Replace the body of `getShortTitles` with:
//   const params = new URLSearchParams({ fy: String(fiscalYear), page: String(page), pageSize: String(pageSize) })
//   if (modeCode) params.set("mode", modeCode)
//   const res = await fetch(`${API_URL}/ocds/indicators/uc053?${params}`)
//   if (!res.ok) return undefined
//   return (await res.json()) as Uc053Response

const THRESHOLD_CHARS = 10
const TOTALS: Record<number, number> = { 2026: 442, 2025: 398 }

const NAMED_2026: Uc053Notice[] = [
  { bidReferenceNo: "11873041", noticeTitle: "Supplies", procuringEntity: "Department of Agriculture – Region V", procurementMode: "Small Value Procurement", publishedDate: "2026-09-29" },
  { bidReferenceNo: "11861527", noticeTitle: "Meals", procuringEntity: "Department of Health – CHD Region IX", procurementMode: "Small Value Procurement", publishedDate: "2026-09-28" },
  { bidReferenceNo: "11840396", noticeTitle: "Repair", procuringEntity: "DPWH – Region II", procurementMode: "Public Bidding", publishedDate: "2026-09-26" },
  { bidReferenceNo: "11812774", noticeTitle: "Fuel", procuringEntity: "Bureau of Fire Protection – Region XII", procurementMode: "Shopping", publishedDate: "2026-09-24" },
  { bidReferenceNo: "11797208", noticeTitle: "Tarpaulin", procuringEntity: "Commission on Elections – Region I", procurementMode: "Small Value Procurement", publishedDate: "2026-09-23" },
  { bidReferenceNo: "11764930", noticeTitle: "IT Equip", procuringEntity: "Bureau of Jail Management and Penology – NCR", procurementMode: "Public Bidding", publishedDate: "2026-09-21" },
  { bidReferenceNo: "11730662", noticeTitle: "Catering", procuringEntity: "Department of Labor and Employment – Region VI", procurementMode: "Small Value Procurement", publishedDate: "2026-09-19" },
  { bidReferenceNo: "11702185", noticeTitle: "Vehicle", procuringEntity: "DENR – Region XI", procurementMode: "Public Bidding", publishedDate: "2026-09-17" },
]

const SHORT_TITLES = ["Uniforms", "Tires", "Rice", "Printing", "Lumber", "Paint", "Snacks", "Toner", "Gravel", "Laptop", "Cement", "Venue", "Repairs", "Diesel", "Medicine"]
// Weighted towards Small Value Procurement, as in the real data.
const MODES = ["Small Value Procurement", "Small Value Procurement", "Public Bidding", "Shopping", "Small Value Procurement", "Public Bidding", "Negotiated Procurement"]

function buildYear(fy: number): Uc053Notice[] {
  const count = TOTALS[fy]
  if (!count) return []
  const named = fy === 2026 ? NAMED_2026 : []
  const generated = Array.from({ length: count - named.length }, (_, i) => ({
    bidReferenceNo: String(11_690_000 - i * 613),
    noticeTitle: pick(SHORT_TITLES, i),
    procuringEntity: pick(MOCK_ENTITIES, i + 7).name,
    procurementMode: pick(MODES, i),
    publishedDate: dateBefore(`${fy}-${named.length ? "09-15" : "12-20"}`, Math.floor(i / 2), 1),
  }))
  return [...named, ...generated]
}

export async function getShortTitles({
  fiscalYear,
  modeName,
  page,
  pageSize,
}: {
  fiscalYear: number
  modeName: string | null
  page: number
  pageSize: number
}): Promise<Uc053Response | undefined> {
  const rows = buildYear(fiscalYear)
  if (!rows.length) return undefined
  return {
    ...mockPage(
      rows.filter((r) => !modeName || r.procurementMode === modeName),
      page,
      pageSize
    ),
    thresholdChars: THRESHOLD_CHARS,
  }
}
