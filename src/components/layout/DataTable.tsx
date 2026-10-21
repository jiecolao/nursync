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
import type { LucideIcon } from "lucide-react"

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

export interface DataTableActionContext<TData> {
  /** All rows passed to the table, before table filtering and pagination. */
  data: TData[]
  /** Currently selected rows. */
  selectedRows: TData[]
}

export interface DataTableAction<TData> {
  /** Stable key for React rendering. */
  id: string
  label: string
  /** Pass a Lucide icon component, e.g. Download or Plus. */
  icon?: LucideIcon
  onClick: (context: DataTableActionContext<TData>) => void
  variant?: React.ComponentProps<typeof Button>["variant"]
  className?: string
  /** Hide the action or compute visibility from the current table context. */
  visible?: boolean | ((context: DataTableActionContext<TData>) => boolean)
  disabled?: boolean | ((context: DataTableActionContext<TData>) => boolean)
}

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
  /** Extra toolbar actions rendered after the built-in filters and before view/export controls. */
  actions?: DataTableAction<TData>[]
  /** Column ids shown initially. Omitted columns remain available in View settings. */
  defaultVisibleColumnIds?: string[]
  /** Called when a row is clicked outside of an interactive cell control. */
  onRowClick?: (row: TData) => void
}

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
  actions = [],
  defaultVisibleColumnIds,
  onRowClick,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    if (!defaultVisibleColumnIds) return {}
    const visible = new Set(defaultVisibleColumnIds)
    return Object.fromEntries(
      columns
        .map((column) => {
          const id = "id" in column && column.id
            ? column.id
            : "accessorKey" in column && typeof column.accessorKey === "string"
              ? column.accessorKey
              : undefined
          return id
            ? [id, column.enableHiding === false || visible.has(id)]
            : null
        })
        .filter((entry): entry is [string, boolean] => entry !== null),
    )
  })

  React.useEffect(() => {
    if (!defaultVisibleColumnIds) return
    const visible = new Set(defaultVisibleColumnIds)
    const columnIds = columns
    .map((column) => {
      if ("id" in column && column.id) return column.id
      if ("accessorKey" in column && typeof column.accessorKey === "string") {
        return column.accessorKey
      }
      return undefined
    })
    .filter((id): id is string => Boolean(id))

    setColumnVisibility((current) => {
    const next = { ...current }
    let changed = false
    for (const id of columnIds) {
      if (!(id in next)) {
        const column = columns.find((candidate) => {
          const candidateId =
            "id" in candidate && candidate.id
              ? candidate.id
              : "accessorKey" in candidate && typeof candidate.accessorKey === "string"
                ? candidate.accessorKey
                : undefined
          return candidateId === id
        })
        next[id] = column?.enableHiding === false || visible.has(id)
        changed = true
      }
    }
    return changed ? next : current
    })
  }, [columns, defaultVisibleColumnIds])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [range, setRange] = React.useState<DateRange | undefined>()

  // Table settings
  const [bordered, setBordered] = React.useState(false)

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

  const cell = "px-5 py-1"
  const rows = table.getRowModel().rows
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length
  const actionContext: DataTableActionContext<TData> = {
    data,
    selectedRows: table.getSelectedRowModel().flatRows.map((row) => row.original),
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div data-tour="table-tools" className="flex flex-wrap items-center gap-2">
        <div data-tour="table-search" className="relative min-w-[220px] flex-1 sm:max-w-sm">
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions.map((action) => {
            const visible =
              typeof action.visible === "function"
                ? action.visible(actionContext)
                : action.visible ?? true
            if (!visible) return null

            const disabled =
              typeof action.disabled === "function"
                ? action.disabled(actionContext)
                : action.disabled ?? false
            const Icon = action.icon

            return (
              <Button
                key={action.id}
                type="button"
                variant={action.variant ?? "outline"}
                className={action.className}
                disabled={disabled}
                onClick={() => action.onClick(actionContext)}
              >
                {Icon && <Icon className="mr-2 size-4" aria-hidden="true" />}
                {action.label}
              </Button>
            )
          })}

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
                <Label>Rows per page</Label>
                <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {([
                ["Cell borders", bordered, setBordered],
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
              <Button className="border-primary bg-transparent text-primary hover:text-white hover:bg-primary hover:border-transparent">
                <Download className="mr-2 size-4" />Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportAs("csv")}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAs("xlsx")}>Export as Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div data-tour="table-results" className={cn("overflow-hidden bg-background", "max-h-[560px] overflow-auto")}>
        <Table className="border-separate border-spacing-y-1">
          <TableHeader className={cn("[&>tr]:border-b-0 bg-primary text-white", "sticky top-0 z-10")}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b-0 bg-primary hover:bg-primary [&>th:first-child]:rounded-tl-lg [&>th:first-child]:rounded-bl-lg [&>th:last-child]:rounded-tr-lg [&>th:last-child]:rounded-br-lg">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn("font-semibold text-white px-5", bordered && "border-r last:border-r-0")}>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "bg-white data-[state=selected]:bg-white hover:bg-secondary/70 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg border-0",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={(event) => {
                    if (!onRowClick) return
                    const target = event.target as HTMLElement
                    if (target.closest("button, a, input, [role='checkbox']")) return
                    onRowClick(row.original)
                  }}
                >
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
          <Button variant="outline" className={"bg-primary hover:bg-green-800"} size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-4 text-white" />
          </Button>
          <Button variant="outline" className={"bg-primary hover:bg-green-800"} size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="size-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  )
}
