export type StudentTableType = {
  student_uuid: string;
  student_id: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  gender_id: number;
  dob: Date | string;
  contact_no: string;
  email: string;
  provincial_addr: string;
  city_addr: string;
  yr_admitted: number;
  yr_residency: number;
  yr_graduated: number;
  status: boolean;
  created_at: Date | string;
  date_modified: Date | string;
};

export type StudentApiRecord = {
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
  status: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentsTableType = {
  fileName: string;
  filePath: string;
  docuStatus: string;
  createdAt: string;
  updatedAt: string;
}
