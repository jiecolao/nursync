import { DataTable } from "@/components/layout/DataTable";
import { StudentTableType } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"

export const columns: ColumnDef<StudentTableType>[] = [
  // { accessorKey: "student_uuid", header: "Student UUID" },
  { accessorKey: "student_id", header: "Student ID" },
  // { accessorKey: "last_name", header: "Last Name" },
  // { accessorKey: "first_name", header: "First Name" },
  // { accessorKey: "middle_name", header: "Middle Name" },
  {
    id: "full_name",
    header: "Full Name",
    accessorFn: (row) => `${row.last_name.toUpperCase()}, ${row.first_name} ${row.middle_name}`,
  },
  // { accessorKey: "gender_id", header: "Gender ID" },
  { accessorKey: "dob", header: "Date of Birth" },
  { accessorKey: "contact_no", header: "Contact No." },
  { accessorKey: "email", header: "Email" },
  // { accessorKey: "provincial_addr", header: "Provincial Address" },
  // { accessorKey: "city_addr", header: "City Address" },
  { accessorKey: "yr_admitted", header: "Year Admitted" },
  { accessorKey: "yr_residency", header: "Year Residency" },
  { accessorKey: "yr_graduated", header: "Year Graduated" },
  // { accessorKey: "is_HD", header: "Is HD" },
  // { accessorKey: "status", header: "Status" },
  // { accessorKey: "created_at", header: "Created At" },
  // { accessorKey: "updated_at", header: "Updated At" },
];

type StudentApiRecord = {
  studentUuid: string;
  studentId: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  genderId: number | null;
  dob: string | null;
  contactNo: string | null;
  email: string | null;
  provincialAddr: string | null;
  cityAddr: string | null;
  yrAdmitted: number;
  yrResidency: number;
  yrGraduated: number | null;
  isHd: boolean;
  status: boolean;
  createdAt: string;
  updatedAt: string;
};

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
    is_HD: student.isHd,
    status: student.status,
    created_at: student.createdAt,
    date_modified: student.updatedAt,
  };
}

export default function StudentsPage(){
  const [students, setStudents] = useState<StudentTableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                  />
          </div>
      </>
  );
}