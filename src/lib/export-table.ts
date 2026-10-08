// src/lib/export-table.ts
import { format } from "date-fns"

export type ExportCell = string | number | boolean

export interface ExportData {
  headers: string[]
  rows: ExportCell[][]
}

function stamp(fileName: string, ext: string) {
  return `${fileName}-${format(new Date(), "yyyy-MM-dd")}.${ext}`
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeCsv(cell: ExportCell) {
  let text = String(cell)
  // Stops spreadsheet apps from running user-entered text as a formula.
  // Remove this line if you'd rather keep values like "+63 917…" untouched.
  if (typeof cell === "string" && /^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv({ headers, rows }: ExportData, fileName: string) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(","))
  // The BOM makes Excel read the file as UTF-8, so accents and ñ display correctly.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  saveBlob(blob, stamp(fileName, "csv"))
}

export async function downloadXlsx(
  { headers, rows }: ExportData,
  fileName: string
) {
  // Loaded on demand so the xlsx library stays out of your main bundle.
  const XLSX = await import("xlsx")
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  sheet["!cols"] = headers.map((header, i) => ({
    wch: Math.min(
      40,
      Math.max(header.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2
    ),
  }))

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1")
  XLSX.writeFile(book, stamp(fileName, "xlsx"))
}
