import { DataTable } from "@/components/layout/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { FileLogsType } from "./logs.type";
import { ActivityLogsType } from "./logs.type"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const columns: ColumnDef<FileLogsType>[] = [
  { accessorKey: "uuid", header: "UUID" },
  { accessorKey: "user", header: "User" },
  { accessorKey: "student_name", header: "Student" },
  { accessorKey: "file_action", header: "Action" },
  { accessorKey: "file_modified", header: "File Modified" },
  { accessorKey: "file_loc", header: "File Path" },
  { accessorKey: "date_modified", header: "Date Modified" },

  { 
    id: "actions", 
    enableHiding: false, 
    enableSorting: false, 
    cell: ({ row }) => {
      const order = row.original // the full data object for this row
      return (
        <DropdownMenu>
          <DropdownMenuTrigger >
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.uuid)}>
              Copy UUID
            </DropdownMenuItem> */}
            <DropdownMenuItem onClick={() => console.log("view", order)}>
              See User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("view", order)}>
              See Student
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("view", order)}>
              See File
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => console.log("delete", order)}>
              Delete
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }},
]

const orders = [
    {
        uuid: "string",
        user: "string",
        student_name: "a",
        file_action: "strings",
        file_modified: "strings",
        file_loc: "strings",
        date_modified: "string",    
    }
]

export default function FileLogsPage(){
    return (
        <>  
            <h1 className="font-header text-primary font-bold text-2xl w-full h-auto mb-4">
                File Modification History
            </h1>
            <DataTable
                columns={columns}
                data={orders}
                dateKey="date_modified"
                searchPlaceholder="Search orders…"
                exportFileName="orders"
            />
        </>
    )
}