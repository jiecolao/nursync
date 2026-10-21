import { useEffect, useState } from "react"
import { DataTable } from "@/components/layout/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { FileLogResponse, FileLogsType } from "./logs.type"

const columns: ColumnDef<FileLogsType>[] = [
  { accessorKey: "uuid", header: "UUID" },
  { accessorKey: "user", header: "User" },
  { accessorKey: "student_name", header: "Student" },
  { accessorKey: "file_action", header: "Action" },
  { accessorKey: "file_modified", header: "File Modified" },
  { accessorKey: "file_loc", header: "File Path" },
  { accessorKey: "date_modified", header: "Date Modified" },
]

export default function FileLogsPage(){
    const [logs, setLogs] = useState<FileLogsType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const controller = new AbortController()

        const loadLogs = async () => {
            try {
                const response = await fetch("/api/audit-logs/file-modifications", {
                    credentials: "include",
                    signal: controller.signal,
                })
                const payload = await response.json().catch(() => null)

                if (!response.ok) {
                    throw new Error(payload?.message || "Unable to load file logs.")
                }
                if (!Array.isArray(payload)) {
                    throw new Error("Unable to load file logs: invalid response.")
                }

                setLogs((payload as FileLogResponse[]).map((log) => ({
                    uuid: log.fileModUuid,
                    user: log.adminName,
                    student_name: log.studentName,
                    file_action: log.fileAction,
                    file_modified: log.fileModified,
                    file_loc: log.fileLoc,
                    date_modified: log.createdAt,
                })))
                setError("")
            } catch (cause) {
                if (controller.signal.aborted) return
                setError(cause instanceof Error ? cause.message : "Unable to load file logs.")
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }

        void loadLogs()
        return () => controller.abort()
    }, [])

    return (
        <>              
          <h2 className="text-3xl font-bold text-primary mb-2">File Modification History</h2>
          <p className="mt-1 mb-8 text-[.95rem] text-stone-600">A detailed record of file interactions made by users.</p>
            {loading && <p className="mb-4 text-sm text-stone-500">Loading file logs…</p>}
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <DataTable
                columns={columns}
                data={logs}
                dateKey="date_modified"
                searchPlaceholder="Search file logs…"
                exportFileName="file_logs"
                defaultVisibleColumnIds={["user", "student_name", "file_action", "file_modified", "date_modified"]}
            />
        </>
    )
}