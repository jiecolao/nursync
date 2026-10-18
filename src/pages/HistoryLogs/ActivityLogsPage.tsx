import { DataTable } from "@/components/layout/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { ActivityLogsType } from "./logs.type"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


// type Order = { id: string; customer: string; status: string; amount: number; date: string }

const columns: ColumnDef<ActivityLogsType>[] = [
  { accessorKey: "uuid", header: "UUID" },
  { accessorKey: "user", header: "User" },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "date_modified", header: "Date Modified" },
]

const orders = [
              {
                uuid: "string",
                user: "string",
                action: "string",
                date_modified: "string",
              },
              {
                uuid: "string",
                user: "string",
                action: "strings",
                date_modified: "string",    
              }
            ]

export default function ActivityLogsPage(){
    return (
        <>  
            <h2 className="text-3xl font-bold text-primary mb-2">Activity Logs</h2>
            <p className="mt-1 mb-8 text-[.95rem] text-stone-600">A detailed record of system interactions made by users.</p>
            <DataTable
                columns={columns}
                data={orders}
                dateKey="date_modified"
                searchPlaceholder="Search activity logs"
                exportFileName="activity_logs"
            />
        </>
    )
}