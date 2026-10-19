import { DataTable, type DataTableAction } from "@/components/layout/DataTable"
import { StudentTableType, StudentApiRecord } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronRight, Plus, Trash2, Upload, Download } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogBox } from "@/components/layout/DialogBox";
import { AddStudentPanel } from "./AddStudentPanel";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { notify } from "@/components/layout/Toasty";


function toStudentTableRecord(student: StudentApiRecord): StudentTableType {
  return {
    student_uuid: student.studentUuid,
    student_id: student.studentId ?? "",
    last_name: student.lastName,
    first_name: student.firstName,
    middle_name: student.middleName ?? "",
    gender_id: student.genderId ?? 0,
    dob: student.dob ? student.dob.slice(0, 10) : "",
    contact_no: student.contactNo ?? "",
    email: student.email ?? "",
    provincial_addr: student.provincialAddr ?? "",
    city_addr: student.cityAddr ?? "",
    yr_admitted: student.yrAdmitted,
    yr_residency: student.yrResidency,
    yr_graduated: student.yrGraduated ?? 0,
    is_non_graduate: student.isNonGraduate ? "Yes" : "No",
    status: student.status,
    created_at: student.createdAt,
    date_modified: student.updatedAt,
  };
}

function createColumns(navigate: NavigateFunction): ColumnDef<StudentTableType>[] {
  return [
  { accessorKey: "student_id", header: "Student ID" },
  {
    id: "full_name",
    header: "Full Name",
    accessorFn: (row) => `${row.last_name.toUpperCase()}, ${row.first_name} ${row.middle_name}`,
  },
  { accessorKey: "dob", header: "Date of Birth" },
  { accessorKey: "is_non_graduate", header: "Non-Graduate" },
  { 
    id: "actions", 
    enableHiding: false, 
    enableSorting: false, 
    cell: ({ row }) => {
      return (
        <div className="size-8">
          <Button variant="ghost" size="icon" className="size-8" 
            onClick={() => {
            navigate(`/students/profile/${row.original.student_uuid}`)
            }}>
            <ChevronRight/>
          </Button>
        </div>
      )
    },
  },
  ];
}

export default function StudentsPage(){
  const [isOpen, setIsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ row: number; payload: Record<string, unknown>; errors: string[] }>>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [studentsToDelete, setStudentsToDelete] = useState<StudentTableType[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [students, setStudents] = useState<StudentTableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const columns = createColumns(navigate);

  const actions: DataTableAction<StudentTableType>[] = [
    {
      id: "add-student",
      label: "Add Student",
      icon: Plus,
      variant: "default",
      visible: ({ selectedRows }) => selectedRows.length <= 0,
      onClick: () => {
        setIsAddStudentOpen(true);
      },
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      visible: ({ selectedRows }) => selectedRows.length > 0,
      onClick: ({ selectedRows }) => {
        setStudentsToDelete(selectedRows);
        setIsOpen(true);
      },
      disabled: isDeleting,
    },
  ]

  const downloadStudentTemplate = () => {
    const csv = [
      "First Name,Last Name,Email,Student ID,Grade/Level,Year Admitted,Year of Residency",
      "Jamie,Santos,jamie.santos@example.com,2026-12345,1,2026,1",
    ].join("\\r\\n");
    const url = URL.createObjectURL(new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const headerAliases: Record<string, string[]> = {
    firstName: ["firstname", "givenname"], lastName: ["lastname", "surname", "familyname"],
    email: ["email", "emailaddress"], studentId: ["studentid", "idnumber"],
    level: ["gradelevel", "grade", "level"], yrAdmitted: ["yearadmitted", "yradmitted", "admittedyear"],
    yrResidency: ["yearofresidency", "yearresidency", "yrresidency", "residencyyear"],
  };

  const handleImportFile = async (file?: File) => {
    setImportMessage(null);
    setImportPreview([]);
    if (!file) return;
    if (!/\\.(csv|xlsx|xls)$/i.test(file.name)) {
      setImportMessage("Choose a CSV or Excel (.xlsx, .xls) file.");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook does not contain a worksheet.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("The file contains no student rows.");
      const records = rows.map((row, index) => {
        const values = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
        const get = (key: string) => {
          const alias = headerAliases[key].find((name) => values.has(name));
          return alias ? String(values.get(alias) ?? "").trim() : "";
        };
        const firstName = get("firstName");
        const lastName = get("lastName");
        const email = get("email");
        const studentId = get("studentId");
        const level = get("level");
        const yrAdmitted = Number(get("yrAdmitted"));
        const yrResidency = Number(get("yrResidency") || level);
        const errors: string[] = [];
        if (!firstName) errors.push("First Name is required.");
        if (!lastName) errors.push("Last Name is required.");
        if (firstName.length > 255 || lastName.length > 255) errors.push("Names must be 255 characters or fewer.");
        if (email && (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 100)) errors.push("Email address is invalid.");
        if (studentId && !/^[A-Za-z0-9]{4}-[A-Za-z0-9]{5,}$/.test(studentId)) errors.push("Student ID must look like 2026-12345 (4 alphanumeric characters, hyphen, then at least 5).");
        if (!Number.isInteger(yrAdmitted) || yrAdmitted < 1900 || yrAdmitted > 2100) errors.push("Year Admitted must be a year from 1900 to 2100.");
        if (!Number.isInteger(yrResidency) || yrResidency < 0) errors.push("Year of Residency (or Grade/Level) must be a non-negative whole number.");
        const payload: Record<string, unknown> = {
          firstName, lastName, yrAdmitted, yrResidency, isNonGraduate: false,
          ...(studentId && { studentId }), ...(email && { email }),
        };
        return { row: index + 2, payload, errors };
      });
      setImportPreview(records);
      const invalid = records.filter((record) => record.errors.length).length;
      setImportMessage(`Loaded ${records.length} row(s). ${invalid ? `${invalid} need correction.` : "All rows passed validation."}`);
    } catch (cause) {
      setImportMessage(cause instanceof Error ? cause.message : "Unable to read this file.");
    }
  };

  const submitImport = async () => {
    if (!importPreview.length || importPreview.some((record) => record.errors.length)) return;
    setImporting(true);
    let created = 0;
    const failures: string[] = [];
    try {
      for (const record of importPreview) {
        try {
          const response = await fetch("/api/student", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record.payload),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(Array.isArray(body?.message) ? body.message.join(", ") : body?.message || `HTTP ${response.status}`);
          }
          const student = await response.json() as StudentApiRecord;
          setStudents((current) => [toStudentTableRecord(student), ...current]);
          created += 1;
        } catch (cause) {
          failures.push(`Row ${record.row}: ${cause instanceof Error ? cause.message : "Request failed"}`);
        }
      }
      if (failures.length) {
        setImportMessage(`Imported ${created} of ${importPreview.length} records. Failures: ${failures.slice(0, 5).join(" | ")}${failures.length > 5 ? " | …" : ""}`);
      } else {
        notify.success("Students imported", { description: `${created} student record(s) created.` });
        setIsImportOpen(false);
        setImportPreview([]);
        setImportMessage(null);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    } finally {
      setImporting(false);
    }
  };

  const deleteStudents = async () => {
    if (!studentsToDelete.length) return;

    setIsDeleting(true);
    try {
      const uuids = studentsToDelete.map((student) => student.student_uuid);
      const response = await fetch(
        uuids.length === 1 ? `/api/student/${uuids[0]}` : "/api/student",
        {
          method: "DELETE",
          credentials: "include",
          headers: uuids.length > 1 ? { "Content-Type": "application/json" } : undefined,
          body: uuids.length > 1 ? JSON.stringify({ studentUuids: uuids }) : undefined,
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(message || "Unable to delete the selected student records.");
      }

      setStudents((current) =>
        current.filter((student) => !uuids.includes(student.student_uuid)),
      );
      setStudentsToDelete([]);
      notify.success(
        uuids.length === 1 ? "Student deleted" : "Students deleted",
        { description: `${uuids.length} student record${uuids.length === 1 ? "" : "s"} deleted.` },
      );
    } catch (requestError) {
      notify.error("Unable to delete students", {
        description: requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStudents() {
      try {
        const response = await fetch("/api/student", {
          signal: controller.signal,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Unable to fetch student records (${response.status})`);
        }

        const records: StudentApiRecord[] = await response.json();
        setStudents(records.map(toStudentTableRecord));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to fetch student records");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchStudents();
    return () => controller.abort();
  }, []);

  return (
      <>
          <div className="flex flex-col">
              <h2 className="text-3xl font-bold text-primary mb-2">Student Record</h2>
              <p className="mt-1 mb-8 text-[.95rem] text-stone-600">Manage, organize, and track student profiles.</p>
              {isLoading && <p>Loading student records...</p>}
              {error && <p className="text-red-600">{error}</p>}
              <div className="mb-4 flex flex-wrap gap-2">
                <Button onClick={() => { setIsImportOpen(true); setImportMessage(null); }}><Upload className="mr-2 size-4" />Import Students</Button>
                <Button variant="outline" onClick={downloadStudentTemplate}><Download className="mr-2 size-4" />Download Template</Button>
              </div>
              <DataTable
                columns={columns}
                data={students}
                dateKey="date_modified"
                searchPlaceholder="Search student"
                exportFileName="Student Records"
                actions={actions}
                enableRowSelection={true}
                pageSizeOptions={[10]}
              />
              <AddStudentPanel
                open={isAddStudentOpen}
                onOpenChange={setIsAddStudentOpen}
                onCreated={(created) => {
                  const student = created as unknown as StudentApiRecord;
                  setStudents((current) => [toStudentTableRecord(student), ...current]);
                }}
              />
              
              {isOpen && (
                <DialogBox
                  title={`Delete ${studentsToDelete.length === 1 ? "student" : "students"}?`}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open && !isDeleting) setStudentsToDelete([]);
                  }}
                  onClick={() => { void deleteStudents(); }}
                  yesBtnName={isDeleting ? "Deleting..." : "Delete"}
                  yesBtnStyle="bg-red-700 hover:bg-red-600"
                >
                  <p>
                    This will permanently delete {studentsToDelete.length} selected student
                    record including their documents{studentsToDelete.length === 1 ? "" : "s"}. This action cannot be undone.
                  </p>
                </DialogBox>
              )}
          </div>
      </>
  );
}