import { useEffect, useState } from "react"
import { DataTable } from "@/components/layout/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { ActivityLogResponse, ActivityLogsType } from "./logs.type"

const columns: ColumnDef<ActivityLogsType>[] = [
  { accessorKey: "uuid", header: "UUID" },
  { accessorKey: "user", header: "User" },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "date_modified", header: "Date Modified" },
]

export default function ActivityLogsPage(){
    const [logs, setLogs] = useState<ActivityLogsType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const controller = new AbortController()

        const loadLogs = async () => {
            try {
                const response = await fetch("/api/audit-logs/activity", {
                    credentials: "include",
                    signal: controller.signal,
                })
                const payload = await response.json().catch(() => null)

                if (!response.ok) {
                    throw new Error(payload?.message || "Unable to load activity logs.")
                }
                if (!Array.isArray(payload)) {
                    throw new Error("Unable to load activity logs: invalid response.")
                }

                setLogs((payload as ActivityLogResponse[]).map((log) => ({
                    uuid: log.activityUuid,
                    user: log.adminName,
                    action: log.action,
                    date_modified: log.createdAt,
                })))
                setError("")
            } catch (cause) {
                if (controller.signal.aborted) return
                setError(cause instanceof Error ? cause.message : "Unable to load activity logs.")
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }

        void loadLogs()
        return () => controller.abort()
    }, [])

    return (
        <>  
            <h2 className="text-3xl font-bold text-primary mb-2">Activity Logs</h2>
            <p className="mt-1 mb-8 text-[.95rem] text-stone-600">A detailed record of system interactions made by users.</p>
            {loading && <p className="mb-4 text-sm text-stone-500">Loading activity logs…</p>}
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <DataTable
                columns={columns}
                data={logs}
                dateKey="date_modified"
                searchPlaceholder="Search activity logs"
                exportFileName="activity_logs"
                defaultVisibleColumnIds={["user", "action", "date_modified"]}
            />
        </>
    )
}