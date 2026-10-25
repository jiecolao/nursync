import { DataTable, type DataTableAction } from "@/components/layout/DataTable"
import { StudentTableType, StudentApiRecord } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronRight, Download, FileSpreadsheet, Plus, Trash2, Upload, X } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogBox } from "@/components/layout/DialogBox";
import { AddStudentPanel } from "./AddStudentPanel";
import { useNavigate, useParams, type NavigateFunction } from "react-router-dom";
import { notify } from "@/components/layout/Toasty";
import { parseSafeDate } from "@/lib/utils";


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

function createColumns(navigate: NavigateFunction, batchNo: string): ColumnDef<StudentTableType>[] {
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
        <div>
          <Button variant="ghost" size="icon"
            onClick={() => {
            navigate(`/records/${encodeURIComponent(batchNo)}/${row.original.student_uuid}`)
            }}>
            <ChevronRight className="size-4 p-0 m-0"/>
          </Button>
        </div>
      )
    },
  },
  ];
}

async function getImportRequestError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as {
    message?: string | string[];
    error?: string;
  } | null;
  const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
  if (message) return message;
  if (body?.error) return body.error;
  return `Request failed with status ${response.status}.`;
}

export default function BatchPage(){
  const { batchNo = "" } = useParams<{ batchNo: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ row: number; payload: Record<string, unknown>; errors: string[] }>>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [studentsToDelete, setStudentsToDelete] = useState<StudentTableType[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [students, setStudents] = useState<StudentTableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const columns = createColumns(navigate, batchNo);

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
      id: "import-students",
      label: "Import Students",
      icon: Upload,
      variant: "outline",
      visible: ({ selectedRows }) => selectedRows.length <= 0,
      onClick: () => {
        setIsImportOpen(true);
        setImportMessage(null);
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
      "studentID,lastName,firstName,middleName,genderId,dob,contactNo,email,provincialAddr,cityAddr,yrAdmitted,yrResidency,yrGraduated,isNonGraduate",
      "2026-12345,Santos,Jamie,,1,2000-01-15,09171234567,jamie.santos@example.com,Manila,Cebu,2026,1,,false",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const headerAliases: Record<string, string[]> = {
    studentId: ["studentid", "studentnumber", "studentno"],
    lastName: ["lastname", "surname", "familyname"],
    firstName: ["firstname", "givenname"],
    middleName: ["middlename"],
    genderId: ["genderid", "gender"],
    dob: ["dob", "dateofbirth", "birthdate"],
    contactNo: ["contactno", "contactnumber", "phonenumber", "phone"],
    email: ["email", "emailaddress"],
    provincialAddr: ["provincialaddr", "provincialaddress"],
    cityAddr: ["cityaddr", "cityaddress"],
    yrAdmitted: ["yradmitted", "yearadmitted", "admittedyear"],
    yrResidency: ["yrresidency", "yearresidency", "yearofresidency", "residencyyear"],
    yrGraduated: ["yrgraduated", "yeargraduated", "graduationyear"],
    isNonGraduate: ["isnongraduate", "nongraduate"],
  };

  const handleImportFile = async (file?: File) => {
    setImportMessage(null);
    setImportPreview([]);
    setImportFile(null);
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      setImportMessage("Choose a CSV or Excel (.xlsx, .xls) file.");
      return;
    }
    setImportFile(file);
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
        const parseOptionalInteger = (key: string) => {
          const value = get(key);
          return value ? Number(value) : undefined;
        };
        const parseOptionalBoolean = (key: string) => {
          const value = get(key).toLowerCase();
          if (!value) return undefined;
          if (["true", "1", "yes"].includes(value)) return true;
          if (["false", "0", "no"].includes(value)) return false;
          return null;
        };
        const studentId = get("studentId");
        const firstName = get("firstName");
        const lastName = get("lastName");
        const middleName = get("middleName");
        const genderId = parseOptionalInteger("genderId");
        const dob = get("dob");
        const rawDobValue = row["dob"] ?? row["DOB"] ?? row["Date of Birth"]; // adjust based on your aliases
        const dobFormatted = parseSafeDate(rawDobValue);
        const contactNo = get("contactNo");
        const email = get("email");
        const provincialAddr = get("provincialAddr");
        const cityAddr = get("cityAddr");
        const yrAdmitted = Number(get("yrAdmitted"));
        const yrResidency = Number(get("yrResidency"));
        const yrGraduated = parseOptionalInteger("yrGraduated");
        const isNonGraduate = parseOptionalBoolean("isNonGraduate");
        const errors: string[] = [];
        if (!firstName) errors.push("First Name is required.");
        if (!lastName) errors.push("Last Name is required.");
        if (studentId && (studentId.length > 20 || !/^[A-Za-z0-9]{4}-[A-Za-z0-9]{5,}$/.test(studentId))) {
          errors.push("Student ID must have 4 letters or numbers, followed by at least 5 letters or numbers.");
        }
        if (firstName.length > 255 || lastName.length > 255 || middleName.length > 255) errors.push("Names must be 255 characters or fewer.");
        if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100)) errors.push("Email address is invalid.");
        if (genderId !== undefined && !Number.isInteger(genderId)) errors.push("Gender ID must be a whole number.");
        if (contactNo.length > 50) errors.push("Contact Number must be 50 characters or fewer.");
        if (dobFormatted && Number.isNaN(Date.parse(dobFormatted))) errors.push("Date of Birth must be a valid date.");
        if (!Number.isInteger(yrAdmitted) || yrAdmitted < 1900 || yrAdmitted > 2100) errors.push("Year Admitted must be a year from 1900 to 2100.");
        if (!Number.isInteger(yrResidency)) errors.push("Year of Residency must be a whole number.");
        if (yrGraduated !== undefined && !Number.isInteger(yrGraduated)) errors.push("Year Graduated must be a whole number.");
        if (isNonGraduate === null) errors.push("Is Non-Graduate must be true or false.");
        const payload: Record<string, unknown> = {
          firstName, lastName, yrAdmitted, yrResidency,
          ...(studentId && { studentId }),
          ...(middleName && { middleName }),
          ...(genderId !== undefined && Number.isInteger(genderId) && { genderId }),
          ...(dobFormatted && { dob: `${dobFormatted}T00:00:00.000Z` }),
          ...(contactNo && { contactNo }),
          ...(email && { email }),
          ...(provincialAddr && { provincialAddr }),
          ...(cityAddr && { cityAddr }),
          ...(yrGraduated !== undefined && Number.isInteger(yrGraduated) && { yrGraduated }),
          ...(isNonGraduate !== null && isNonGraduate !== undefined && { isNonGraduate }),
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

  const clearImportFile = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportMessage(null);
    if (importInputRef.current) importInputRef.current.value = "";
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
            throw new Error(await getImportRequestError(response));
          }
          const student = await response.json() as StudentApiRecord;
          setStudents((current) => [toStudentTableRecord(student), ...current]);
          created += 1;
        } catch (cause) {
          failures.push(`Row ${record.row}: ${cause instanceof Error ? cause.message : "Request failed"}`);
        }
      }
      if (failures.length) {
        setImportMessage(`Import completed with errors. Imported ${created} of ${importPreview.length} records. ${failures.slice(0, 5).join(" | ")}${failures.length > 5 ? " | …" : ""}`);
      } else {
        notify.success("Students imported", { description: `${created} student record(s) created.` });
        setIsImportOpen(false);
        setImportPreview([]);
        setImportFile(null);
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
        const normalizedBatch = decodeURIComponent(batchNo).trim().toLocaleUpperCase();
        const batchRecords = normalizedBatch === "NON-GRADUATE" ? records.filter((student) => student.isNonGraduate) : records.filter((student) => !student.isNonGraduate && String(student.yrGraduated ?? "").trim() === normalizedBatch);
        setStudents(batchRecords.map(toStudentTableRecord));
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
  }, [batchNo]);

  return (
      <>
          <div className="flex flex-col">
              <h2 className="text-3xl font-bold text-primary mb-2">{decodeURIComponent(batchNo).toLocaleUpperCase() === "NON-GRADUATE" ? "Non-Graduate Students" : `Batch ${decodeURIComponent(batchNo)}`}</h2>
              <p className="mt-1 mb-8 text-[.95rem] text-stone-600">Manage, organize, and track student profiles.</p>
              {isLoading && <p>Loading student records...</p>}
              {error && <p className="text-red-600">{error}</p>}
              <DataTable
                columns={columns}
                data={students}
                dateKey="date_modified"
                searchPlaceholder="Search student"
                exportFileName="Student Records"
                actions={actions}
                enableRowSelection={true}
                pageSizeOptions={[10, 20, 50]}
                defaultVisibleColumnIds={["student_id", "full_name", "dob", "is_non_graduate"]}
                onRowClick={(student) => navigate(`/students/profile/${student.student_uuid}`)}
              />
              {isImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
                  <section role="dialog" aria-modal="true" aria-labelledby="student-import-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
                    <h3 id="student-import-title" className="text-xl font-semibold">Import Student Records</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Upload CSV or Excel using the CreateStudentDto fields. First Name, Last Name, Year Admitted, and Year of Residency are required. Student IDs must follow the existing format, e.g. 2026-12345.</p>
                    <div className="my-5 flex flex-col gap-3">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Choose a student import file"
                        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                          isDraggingFile
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/30 bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDraggingFile(false);
                          void handleImportFile(event.dataTransfer.files[0]);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            importInputRef.current?.click();
                          }
                        }}
                      >
                        <input
                          ref={importInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="sr-only"
                          onChange={(event) => void handleImportFile(event.target.files?.[0])}
                        />
                        <FileSpreadsheet className="mx-auto size-10 text-primary" />
                        <p className="mt-3 font-medium">
                          {isDraggingFile ? "Drop your file here" : "Drag and drop your file here"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">CSV, XLSX, or XLS files only</p>
                        <Button type="button" variant="outline" className="mt-4" onClick={() => importInputRef.current?.click()}>
                          <Upload className="mr-2 size-4" />Choose File
                        </Button>
                      </div>
                      {importFile && (
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileSpreadsheet className="size-4 shrink-0 text-primary" />
                            <span className="truncate">{importFile.name}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={clearImportFile} aria-label="Remove selected file">
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                      <Button type="button" variant="outline" className="self-start" onClick={downloadStudentTemplate}>
                        <Download className="mr-2 size-4" />Download CSV Template
                      </Button>
                    </div>
                    {importMessage && <p role="status" className="mb-3 text-sm">{importMessage}</p>}
                    {importPreview.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-sm font-medium">{importPreview.length} row(s) detected</p>
                        <div className="max-h-48 overflow-auto rounded border p-3 text-sm">
                          {importPreview.map((record) => (
                            <p key={record.row} className={record.errors.length ? "text-red-600" : "text-green-700"}>
                              Row {record.row}: {String(record.payload.firstName)} {String(record.payload.lastName)}{record.errors.length ? ` — ${record.errors.join(" ")}` : " — Valid"}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" disabled={importing} onClick={() => { setIsImportOpen(false); clearImportFile(); }}>Cancel</Button>
                      <Button type="button" disabled={importing || importPreview.length === 0 || importPreview.some((record) => record.errors.length > 0)} onClick={() => void submitImport()}>{importing ? "Importing..." : `Import ${importPreview.length || ""} Students`}</Button>
                    </div>
                  </section>
                </div>
              )}
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