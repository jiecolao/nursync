import { DataTable, type DataTableAction } from "@/components/layout/DataTable"
import { StudentTableType, StudentApiRecord } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogBox } from "@/components/layout/DialogBox";
import { AddStudentPanel } from "./AddStudentPanel";
import { useNavigate, type NavigateFunction } from "react-router-dom";


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
              navigate("/students/profile/1")
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
        // Open a confirmation dialog before deleting
        console.log(selectedRows)
      },
    },
  ]

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
              {/* <Button>Export</Button> */}
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
                  title="Discard input?"
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  onClick={() => navigate("/students")}
                  yesBtnName="Discard"
                  yesBtnStyle="bg-red-700 hover:bg-red-600"
                >
                  <p>If you leave this page, the information you entered won't be saved.</p>
                </DialogBox>
              )}
          </div>
      </>
  );
}