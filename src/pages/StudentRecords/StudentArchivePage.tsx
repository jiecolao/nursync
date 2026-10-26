import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/layout/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/layout/Toasty";
import type { StudentApiRecord } from "./student.type";

export default function StudentArchivePage() {
  const [students, setStudents] = useState<StudentApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadArchived = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/student/archived", { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load archived students.");
      const records = await response.json() as StudentApiRecord[];
      setStudents(records.filter((student) => student.status === false));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load archived students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadArchived(); }, [loadArchived]);

  const reactivate = async (student: StudentApiRecord) => {
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(student.studentUuid)}/status`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: true }),
      });
      if (!response.ok) throw new Error("Unable to reactivate student.");
      setStudents((current) => current.filter((item) => item.studentUuid !== student.studentUuid));
      notify.success("Student reactivated");
    } catch (cause) {
      notify.error("Unable to reactivate student", { description: cause instanceof Error ? cause.message : "Please try again." });
    }
  };

  const permanentlyDelete = async (student: StudentApiRecord) => {
    if (!window.confirm(`Permanently delete ${student.lastName}, ${student.firstName} and their student record? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(student.studentUuid)}`, {
        method: "DELETE", credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to permanently delete student.");
      setStudents((current) => current.filter((item) => item.studentUuid !== student.studentUuid));
      notify.success("Student permanently deleted");
    } catch (cause) {
      notify.error("Unable to permanently delete student", { description: cause instanceof Error ? cause.message : "Please try again." });
    }
  };

  const columns: ColumnDef<StudentApiRecord>[] = [
    { accessorKey: "studentId", header: "Student ID" },
    { id: "fullName", header: "Full Name", accessorFn: (row) => `${row.lastName.toUpperCase()}, ${row.firstName} ${row.middleName ?? ""}`.trim() },
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "firstName", header: "First Name" },
    { accessorKey: "middleName", header: "Middle Name" },
    { accessorKey: "genderId", header: "Gender ID" },
    { accessorKey: "dob", header: "Date of Birth" },
    { accessorKey: "contactNo", header: "Contact No." },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "provincialAddr", header: "Provincial Address" },
    { accessorKey: "cityAddr", header: "City Address" },
    { accessorKey: "yrAdmitted", header: "Year Admitted" },
    { accessorKey: "yrResidency", header: "Year Residency" },
    { accessorKey: "yrGraduated", header: "Year Graduated" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "createdAt", header: "Created At" },
    { accessorKey: "updatedAt", header: "Date Modified" },
    { id: "actions", header: "Actions", enableHiding: false, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void reactivate(row.original)}>
            <RotateCcw className="mr-1 size-4" /> Reactivate
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void permanentlyDelete(row.original)}>
            <Trash2 className="mr-1 size-4" /> Permanently Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <h2 className="mb-2 text-3xl font-bold text-primary">Student Archive</h2>
      <p className="mb-8 mt-1 text-[.95rem] text-stone-600">Inactive student records. Reactivate a record or permanently delete it.</p>
      {loading && <p className="mb-4 text-sm text-stone-500">Loading inactive student records…</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <DataTable columns={columns} data={students} searchPlaceholder="Search archived students"
          exportFileName="Student Archive" defaultVisibleColumnIds={["studentId", "fullName", "dob", "yrGraduated", "actions"]} />
      )}
    </>
  );
}
