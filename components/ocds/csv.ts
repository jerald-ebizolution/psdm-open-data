type CsvValue = string | number

/** Builds a CSV (RFC 4180 quoting, CRLF line endings) and triggers a download. */
export function downloadCsv(filename: string, header: string[], rows: CsvValue[][]) {
  const escape = (v: CsvValue) => `"${String(v).replace(/"/g, '""')}"`
  const body = [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n")
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
