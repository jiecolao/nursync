"use client"

import * as React from "react"
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { DateRange } from "react-day-picker"
import { format, endOfDay, startOfDay } from "date-fns"
import * as XLSX from "xlsx"
import {
  ArrowUpDown, CalendarIcon, ChevronLeft, ChevronRight,
  Download, Eye, Search, Settings2, X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

/* ---------- Types ---------- */

export interface DataTableProps<TData> {
  /** Your column definitions. Set `meta: { exportable: false }` to leave a column out of exports. */
  columns: ColumnDef<TData, any>[]
  data: TData[]
  /** Key of the date field on each row. Omit to hide the date picker. */
  dateKey?: keyof TData & string
  searchPlaceholder?: string
  /** File name for exports, without extension. */
  exportFileName?: string
  pageSizeOptions?: number[]
  className?: string
  /** Adds a checkbox column. Off by default. */
  enableRowSelection?: boolean
  /** Called with the selected rows whenever the selection changes. */
  onSelectionChange?: (rows: TData[]) => void
  /** Stable id per row (e.g. row => row.id). Recommended with selection so it survives filtering and sorting. */
  getRowId?: (row: TData, index: number) => string
}

type Density = "compact" | "comfortable"

/* ---------- Component ---------- */

export function DataTable<TData>({
  columns,
  data,
  dateKey,
  searchPlaceholder = "Search…",
  exportFileName = "export",
  pageSizeOptions = [10, 20, 50],
  className,
  enableRowSelection = false,
  onSelectionChange,
  getRowId,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [range, setRange] = React.useState<DateRange | undefined>()

  // Table settings
  const [density, setDensity] = React.useState<Density>("comfortable")
  const [striped, setStriped] = React.useState(true)
  const [bordered, setBordered] = React.useState(false)
  const [stickyHeader, setStickyHeader] = React.useState(false)

  // Date range filter is applied to the data before the table sees it
  const filteredData = React.useMemo(() => {
    if (!dateKey || !range?.from) return data
    const from = startOfDay(range.from).getTime()
    const to = endOfDay(range.to ?? range.from).getTime()
    return data.filter((row) => {
      const t = new Date(row[dateKey] as unknown as string | number | Date).getTime()
      return t >= from && t <= to
    })
  }, [data, dateKey, range])

  const allColumns = React.useMemo<ColumnDef<TData, any>[]>(() => {
    if (!enableRowSelection) return columns
    const selectCol: ColumnDef<TData, any> = {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      ),
    }
    return [selectCol, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data: filteredData,
    columns: allColumns,
    getRowId,
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    state: { globalFilter, sorting, columnVisibility, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: pageSizeOptions[0] } },
  })

  React.useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().flatRows.map((r) => r.original))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection])

  /* ---------- Export (filtered rows, visible columns) ---------- */

  const buildExportRows = () => {
    const cols = table
      .getVisibleLeafColumns()
      .filter((c) => (c.columnDef.meta as any)?.exportable !== false && c.id !== "actions" && c.id !== "select")
    const label = (c: (typeof cols)[number]) =>
      typeof c.columnDef.header === "string" ? c.columnDef.header : c.id
    const selected = table.getFilteredSelectedRowModel().rows
    const source = selected.length ? selected : table.getFilteredRowModel().rows
    return source.map((row) =>
      Object.fromEntries(
        cols.map((c) => {
          const v = row.getValue(c.id)
          return [label(c), v instanceof Date ? format(v, "yyyy-MM-dd") : v ?? ""]
        })
      )
    )
  }

  const exportAs = (type: "csv" | "xlsx") => {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, `${exportFileName}.${type}`, { bookType: type })
  }

  /* ---------- Render ---------- */

  const cell = density === "compact" ? "py-1.5" : "py-3.5"
  const rows = table.getRowModel().rows
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-white pl-9"
          />
        </div>

        {dateKey && (
          <Popover>
            <PopoverTrigger >
              <Button variant="outline" className={cn("justify-start font-normal", !range && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 size-4" />
                {range?.from
                  ? range.to
                    ? `${format(range.from, "MMM d, y")} – ${format(range.to, "MMM d, y")}`
                    : format(range.from, "MMM d, y")
                  : "Pick a date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} />
              <div className="flex justify-end border-t p-2">
                <Button size="sm" variant="ghost" onClick={() => setRange(undefined)} disabled={!range}>
                  Clear dates
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {(globalFilter || range) && (
          <Button variant="ghost" size="sm" onClick={() => { setGlobalFilter(""); setRange(undefined) }}>
            <X className="mr-1 size-4" /> Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* View settings: which columns show */}
          <Popover>
            <PopoverTrigger >
              <Button variant="outline"><Eye className="mr-2 size-4" />View</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-3">
              <p className="text-sm font-medium">Show columns</p>
              {table.getAllColumns().filter((c) => c.getCanHide()).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <Label htmlFor={`col-${c.id}`}>
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </Label>
                  <Switch
                    id={`col-${c.id}`}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  />
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Table settings: how the table looks */}
          <Popover>
            <PopoverTrigger >
              <Button variant="outline"><Settings2 className="mr-2 size-4" />Table</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-4">
              <div className="space-y-1.5">
                <Label>Row density</Label>
                <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rows per page</Label>
                <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {([
                ["Striped rows", striped, setStriped],
                ["Cell borders", bordered, setBordered],
                ["Sticky header", stickyHeader, setStickyHeader],
              ] as const).map(([label, value, set]) => (
                <div key={label} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger >
              <Button><Download className="mr-2 size-4" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAs("csv")}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("xlsx")}>Export as Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className={cn("rounded-lg border bg-background", stickyHeader && "max-h-[560px] overflow-auto")}>
        <Table>
          <TableHeader className={cn("bg-secondary", stickyHeader && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-secondary">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn("font-semibold text-primary", bordered && "border-r last:border-r-0")}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        className="inline-flex items-center gap-1.5 hover:underline"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown className={cn("size-3.5", h.column.getIsSorted() ? "opacity-100" : "opacity-40")} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={cn("data-[state=selected]:bg-primary/10", striped && "odd:bg-secondary/40", "hover:bg-secondary/70")}>
                  {row.getVisibleCells().map((c) => (
                    <TableCell key={c.id} className={cn(cell, bordered && "border-r last:border-r-0")}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center text-muted-foreground">
                  No results match your search or dates.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0
            ? `${table.getFilteredSelectedRowModel().rows.length} of ${total} selected`
            : total
              ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)} of ${total}`
              : "0 results"}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
