import { useEffect, useState } from "react"
import { DataTable } from "@/components/layout/DataTable"
import { ColumnDef } from "@tanstack/react-table"

export default function StudentArchivePage(){
    // const [logs, setLogs] = useState<FileLogsType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        
    }, [])

    return (
        <>              
          <h2 className="text-3xl font-bold text-primary mb-2">Student Archive</h2>
          <p className="mt-1 mb-8 text-[.95rem] text-stone-600">Archived student records.</p>
            {loading && <p className="mb-4 text-sm text-stone-500">Loading inactive student records…</p>}
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {/* <DataTable
                columns={columns}
                data={logs}
                dateKey="date_modified"
                searchPlaceholder="Search file logs…"
                exportFileName="file_logs"
                defaultVisibleColumnIds={["user", "student_name", "file_action", "file_modified", "date_modified"]}
            /> */}
        </>
    )
}