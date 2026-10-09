import { DataTable } from "@/components/layout/DataTable";
import { StudentTableType } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<StudentTableType>[] = [
  { accessorKey: "student_uuid", header: "Student UUID" },
  { accessorKey: "student_id", header: "Student ID" },
  { accessorKey: "last_name", header: "Last Name" },
  { accessorKey: "first_name", header: "First Name" },
  { accessorKey: "middle_name", header: "Middle Name" },
  { accessorKey: "gender_id", header: "Gender ID" },
  { accessorKey: "dob", header: "Date of Birth" },
  { accessorKey: "contact_no", header: "Contact No." },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "provincial_addr", header: "Provincial Address" },
  { accessorKey: "city_addr", header: "City Address" },
  { accessorKey: "yr_admitted", header: "Year Admitted" },
  { accessorKey: "yr_residency", header: "Year Residency" },
  { accessorKey: "yr_graduated", header: "Year Graduated" },
  { accessorKey: "is_HD", header: "Is HD" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "created_at", header: "Created At" },
  { accessorKey: "updated_at", header: "Updated At" },
];

export const students: StudentTableType[] = [
  {
    student_uuid: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    student_id: "2024-00101",
    last_name: "Dela Cruz",
    first_name: "Juan",
    middle_name: "Santos",
    gender_id: 1,
    dob: "2003-05-14",
    contact_no: "+639171234567",
    email: "juan.delacruz@example.com",
    provincial_addr: "Brgy. San Jose, Antipolo, Rizal",
    city_addr: "123 Taft Ave, Ermita, Manila",
    yr_admitted: 2021,
    yr_residency: 4,
    yr_graduated: 2025,
    is_HD: false,
    status: true,
    created_at: "2021-08-15T08:30:00.000Z",
    date_modified: "2024-01-10T10:15:00.000Z",
  },
  {
    student_uuid: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    student_id: "2024-00102",
    last_name: "Santos",
    first_name: "Maria",
    middle_name: "Reyes",
    gender_id: 2,
    dob: "2004-11-22",
    contact_no: "+639189876543",
    email: "maria.santos@example.com",
    provincial_addr: "Poblacion, San Fernando, Pampanga",
    city_addr: "456 España Blvd, Sampaloc, Manila",
    yr_admitted: 2022,
    yr_residency: 3,
    yr_graduated: 2026,
    is_HD: true,
    status: true,
    created_at: "2022-08-10T09:00:00.000Z",
    date_modified: "2024-02-01T14:45:00.000Z",
  },
];

export default function TrashPage(){
    return (
        <div>
            <h2 className="text-3xl font-bold text-primary mb-2">Trash</h2>
            <p className="mt-1 mb-8 text-[.95rem] text-stone-600">Review, restore, or permanently remove deleted files.</p>
            <DataTable
                                columns={columns}
                                data={students}
                                dateKey="date_modified"
                                searchPlaceholder="Search uuid, user, or action"
                                exportFileName="orders"
                                />
        </div>
    );
}