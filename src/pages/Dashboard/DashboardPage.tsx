import { DataTable } from "@/components/layout/DataTable";
import { ColumnDef } from "@tanstack/react-table"
import { FileLogsType } from "../HistoryLogs/logs.type"; 
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DashboardCard from "@/components/layout/DashboardCard";

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
              Go to File
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

export default function DashboardPage(){
    return (
        <div className="flex flex-col gap-3">
            <div>
                <h2 className="m-0 text-3xl font-bold text-primary">Dashboard</h2>
                {/* <p className="mt-1 text-[.95rem] text-stone-600">View and manage this student account.</p> */}
            </div>
            <div className="relative">
                <h1 className="text-primary font-header font-bold border-b-3 text-lg border-primary mb-3">STUDENTS</h1>
                <div className="flex flex-row gap-3 flex-wrap">
                    <DashboardCard
                        bg_color="bg-yellow-300"
                        data={123}
                        legend="Total Students"
                    />
                    {
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                        />
                    }
                </div>
            </div>
            <div className="relative">
                <h1 className="text-primary font-header font-bold border-b-3 text-lg border-primary mb-3">DOCUMENTS</h1>
                <div className="flex flex-row gap-3 flex-wrap">
                    <DashboardCard
                        bg_color="bg-yellow-300"
                        data={123}
                        legend="Total Documents"
                    />
                    {
                        <>
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        <DashboardCard
                            bg_color="bg-white"
                            data={123}
                            legend="..."
                            />
                        </>
                    }
                </div>
            </div>
            <div>
                <h1 className="text-primary font-header font-bold text-lg my-4">RECENT</h1>
                <DataTable
                    columns={columns}
                    data={orders}
                    dateKey="date_modified"
                    searchPlaceholder="Search uuid, user, or action"
                    exportFileName="orders"
                />
            </div>
        </div>
    );
}