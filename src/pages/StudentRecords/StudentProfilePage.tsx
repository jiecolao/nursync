"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { 
  Camera, Pencil, RotateCcw, Save, X, Trash, Upload
 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/layout/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { formatDateTime, formatDate } from "@/lib/utils";
import { notify } from "@/components/layout/Toasty";
import { DataTable, type DataTableAction } from "@/components/layout/DataTable";
import { DocumentsTableType } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";

/* ------------------------------------------------------------------ */
/* Types (mirrors the ERD)                                             */
/* ------------------------------------------------------------------ */

type Status = "active" | "inactive" | "graduated" | "disabled";

interface Student {
  image: string | null;
  student_uuid: string;
  student_id: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  gender_id: number | null;
  dob: string; // YYYY-MM-DD
  contact_no: string;
  email: string;
  provincial_addr: string;
  city_addr: string;
  yr_admitted: number | null;
  yr_residency: number | null;
  yr_graduated: number | null;
  is_non_graduate: boolean;
  status: Status;
  created_at: string; // ISO
  updated_at: string; // ISO
}

type ApiStudent = {
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
  isNonGraduate: boolean;
  status: boolean;
  createdAt: string;
  updatedAt: string;
};

type Gender = { genderId: number; genderName: string };

const EMPTY_STUDENT: Student = {
  image: null, student_uuid: "", student_id: "", last_name: "", first_name: "",
  middle_name: "", gender_id: null, dob: "", contact_no: "", email: "",
  provincial_addr: "", city_addr: "", yr_admitted: null, yr_residency: null,
  yr_graduated: null, is_non_graduate: false, status: "active",
  created_at: "", updated_at: "",
};

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-900 border-emerald-200",
  inactive: "bg-amber-100 text-amber-900 border-amber-200",
  graduated: "bg-sky-100 text-sky-900 border-sky-200",
  disabled: "bg-red-100 text-red-900 border-red-200",
};

const PRIMARY = "var(--color-primary)";
const SECONDARY = "var(--color-secondary)";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function ReadValue({ value, mono = false }: { value?: string | number | null; mono?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <p
      className={`min-h-9 py-1.5 text-[15px] ${mono ? "font-mono text-sm break-all" : ""} ${
        empty ? "text-neutral-400" : "text-neutral-900"
      }`}
    >
      {empty ? "Not provided" : value}
    </p>
  );
}

function toStudent(student: ApiStudent): Student {
  return {
    image: null,
    student_uuid: student.studentUuid,
    student_id: student.studentId ?? "",
    last_name: student.lastName,
    first_name: student.firstName,
    middle_name: student.middleName ?? "",
    gender_id: student.genderId,
    dob: student.dob ? student.dob.slice(0, 10) : "",
    contact_no: student.contactNo ?? "",
    email: student.email ?? "",
    provincial_addr: student.provincialAddr ?? "",
    city_addr: student.cityAddr ?? "",
    yr_admitted: student.yrAdmitted,
    yr_residency: student.yrResidency,
    yr_graduated: student.yrGraduated,
    is_non_graduate: student.isNonGraduate,
    status: student.status ? "active" : "disabled",
    created_at: student.createdAt,
    updated_at: student.updatedAt,
  };
}

function getApiError(body: unknown, fallback: string) {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
  }
  return fallback;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-base font-semibold" style={{ color: PRIMARY }}>
          {title}
        </h3>
        <Separator className="flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function StudentProfilePage() {
  const { studentUuid } = useParams<{ studentUuid: string }>();
  const [saved, setSaved] = useState<Student>(EMPTY_STUDENT);
  const [draft, setDraft] = useState<Student>(EMPTY_STUDENT);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const actions: DataTableAction<DocumentsTableType>[] = [
    {
      id: "upload",
      label: "Upload",
      icon: Upload,
      variant: "default",
      onClick: () => {
        console.log("Hello")
      },
    },
  ]
  
  const columns: ColumnDef<DocumentsTableType>[] = [
    { accessorKey: "fileName", header: "Filename" },
    { accessorKey: "filePath", header: "File Path" },
    { accessorKey: "docuStatus", header: "Document Status" },
    { accessorKey: "createdAt", header: "Created" },
    { accessorKey: "updatedAt", header: "Updated" },
    { 
    id: "actions", 
    enableHiding: false, 
    enableSorting: false, 
    cell: ({ row }) => {
      const order = row.original // the full data object for this row
      return (
        <DropdownMenu>
          <DropdownMenuTrigger >
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.uuid)}>
              Copy UUID
            </DropdownMenuItem> */}
            <DropdownMenuItem onClick={() => console.log("view", order)}>
              Edit File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("view", order)}>
              File Location...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => console.log("delete", order)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }},
  ]

  useEffect(() => {
    if (!studentUuid) {
      setError("Student ID is missing.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadProfile() {
      try {
        const [studentResponse, gendersResponse] = await Promise.all([
          fetch(`/api/student/${studentUuid}`, { credentials: "include", signal: controller.signal }),
          fetch("/api/lookups/genders", { credentials: "include", signal: controller.signal }),
        ]);
        if (!studentResponse.ok) throw new Error(`Unable to load student profile (${studentResponse.status}).`);
        if (!gendersResponse.ok) throw new Error(`Unable to load gender options (${gendersResponse.status}).`);

        const apiStudent = await studentResponse.json() as ApiStudent;
        const nextStudent = toStudent(apiStudent);
        setSaved(nextStudent);
        setDraft(nextStudent);
        setGenders(await gendersResponse.json() as Gender[]);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load student profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [studentUuid]);

  const isDisabled = saved.status === "disabled";
  const s = editing ? draft : saved; // what the form currently shows

  const set = <K extends keyof Student>(key: K, value: Student[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const fieldClass = <K extends keyof Student>(key: K) =>
    editing && draft[key] !== saved[key]
      ? "bg-amber-50 border-amber-300 focus-visible:ring-amber-300"
      : "";

  const numberChange = (key: "yr_admitted" | "yr_residency" | "yr_graduated") => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => set(key, e.target.value === "" ? null : Number(e.target.value));

  /* ---------------------------- actions --------------------------- */

  const startEdit = () => {
    setDraft(saved);
    setErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(saved);
    setErrors({});
    setEditing(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.last_name.trim()) e.last_name = "Enter a last name.";
    if (!draft.first_name.trim()) e.first_name = "Enter a first name.";
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.email = "Enter a valid email address.";
    if (!draft.gender_id) e.gender_id = "Select a gender.";
    if (!draft.dob) e.dob = "Enter a date of birth.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/student/${draft.student_uuid}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: draft.student_id || undefined,
          lastName: draft.last_name.trim(),
          firstName: draft.first_name.trim(),
          middleName: draft.middle_name.trim() || undefined,
          genderId: draft.gender_id ?? undefined,
          dob: draft.dob || undefined,
          contactNo: draft.contact_no.trim() || undefined,
          email: draft.email.trim() || undefined,
          provincialAddr: draft.provincial_addr.trim() || undefined,
          cityAddr: draft.city_addr.trim() || undefined,
          yrAdmitted: draft.yr_admitted,
          yrResidency: draft.yr_residency,
          yrGraduated: draft.yr_graduated ?? undefined,
          isNonGraduate: draft.is_non_graduate,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getApiError(body, "Unable to save student profile."));
      }
      const next = toStudent(await response.json() as ApiStudent);
      setSaved(next);
      setDraft(next);
      setEditing(false);
      notify.success("Profile saved");
    } catch (cause) {
      notify.error("Unable to save profile", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: Status) => {
    try {
      const response = await fetch(`/api/student/${saved.student_uuid}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status !== "disabled" }),
      });
      if (!response.ok) throw new Error("Unable to update student status.");
      const next = toStudent(await response.json() as ApiStudent);
      setSaved(next);
      setDraft(next);
      setConfirmOpen(false);
    } catch (cause) {
      notify.error("Unable to update status", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    }
  };

  const pickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: upload `file` to storage and save the returned URL instead of a local preview.
    const reader = new FileReader();
    reader.onload = () => set("image", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
  const initials = `${saved.first_name[0] ?? ""}${saved.last_name[0] ?? ""}`.toUpperCase();
  const genderLabel = genders.find((g) => g.genderId === s.gender_id)?.genderName;

  /* ----------------------------- render --------------------------- */

  if (loading) {
    return <p className="p-6 text-neutral-600">Loading student profile...</p>;
  }

  if (error) {
    return <p role="alert" className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: SECONDARY }}>
      <div className="mx-auto  space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Profile Overview
        </h2>

        {/* Identity header */}
        <div
          className="flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          <div className="relative w-fit">
            <Avatar className="size-24 border-4" style={{ borderColor: SECONDARY }}>
              <AvatarImage src={s.image ?? undefined} alt={fullName} className="object-cover" />
              <AvatarFallback className="bg-white text-2xl font-semibold text-[var(--color-primary)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change photo"
                  className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY, borderColor: PRIMARY }}
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickImage}
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{fullName || "Unnamed student"}</h1>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[saved.status]}`}>
                {saved.status}
              </Badge>
              {s.is_non_graduate && (
                <Badge variant="outline" className="border-white/40 text-inherit">
                  HD
                </Badge>
              )}
            </div>
            <p className="text-sm opacity-80">Student ID: {saved.student_id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  onClick={save}
                  disabled={saving}
                  className="hover:opacity-90"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                >
                  <Save className="size-4" /> {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  className="border-white/40 bg-transparent text-inherit hover:bg-white/10 hover:text-inherit"
                >
                  <X className="size-4" /> Cancel
                </Button>
              </>
            ) : isDisabled ? (
              <Button
                onClick={() => setStatus("active")}
                className="hover:opacity-90"
                style={{ backgroundColor: SECONDARY, color: PRIMARY }}
              >
                <RotateCcw className="size-4" /> Enable account
              </Button>
            ) : (
              <>
                <Button
                  onClick={startEdit}
                  className="hover:opacity-90"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                  className="border-white/40 bg-red-500 text-inherit hover:bg-red-700 hover:text-inherit"
                >
                  <Trash className="size-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {isDisabled && (
          <p
            role="status"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            This account is disabled. Enable it to edit the profile.
          </p>
        )}

        {/* Details */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) save();
          }}
          className="space-y-8 rounded-2xl border bg-white p-6 md:p-8"
        >
          <Section title="Personal information">
            <Field label="Last name" htmlFor="last_name" error={errors.last_name} className="md:col-span-2">
              {editing ? (
                <Input id="last_name" className={fieldClass("last_name")} value={s.last_name} onChange={(e) => set("last_name", e.target.value)} />
              ) : (
                <ReadValue value={s.last_name} />
              )}
            </Field>
            <Field label="First name" htmlFor="first_name" error={errors.first_name} className="md:col-span-2">
              {editing ? (
                <Input id="first_name" className={fieldClass("first_name")} value={s.first_name} onChange={(e) => set("first_name", e.target.value)} />
              ) : (
                <ReadValue value={s.first_name} />
              )}
            </Field>
            <Field label="Middle name" htmlFor="middle_name" className="md:col-span-2">
              {editing ? (
                <Input id="middle_name" className={fieldClass("middle_name")} value={s.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
              ) : (
                <ReadValue value={s.middle_name} />
              )}
            </Field>

            <Field label="Gender" htmlFor="gender_id" error={errors.gender_id} className="md:col-span-3">
              {editing ? (
                <Select
                  value={s.gender_id ? String(s.gender_id) : ""}
                  onValueChange={(v) => set("gender_id", Number(v))}
                >
                  <SelectTrigger id="gender_id" className={`w-full ${fieldClass("gender_id")}`}>
                    <SelectValue placeholder="Select gender">
                      {genderLabel ?? "Select gender"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g.genderId} value={String(g.genderId)}>
                        {g.genderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ReadValue value={genderLabel} />
              )}
            </Field>
            <Field label="Date of birth" htmlFor="dob" error={errors.dob} className="md:col-span-3">
              {editing ? (
                <Input id="dob" type="date" className={fieldClass("dob")} value={s.dob} onChange={(e) => set("dob", e.target.value)} />
              ) : (
                <ReadValue value={formatDate(s.dob)} />
              )}
            </Field>
          </Section>

          <Section title="Contact details">
            <Field label="Contact number" htmlFor="contact_no" className="md:col-span-3">
              {editing ? (
                <Input
                  id="contact_no"
                  type="tel"
                  className={fieldClass("contact_no")}
                  value={s.contact_no}
                  onChange={(e) => set("contact_no", e.target.value)}
                />
              ) : (
                <ReadValue value={s.contact_no} />
              )}
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} className="md:col-span-3">
              {editing ? (
                <Input id="email" type="email" className={fieldClass("email")} value={s.email} onChange={(e) => set("email", e.target.value)} />
              ) : (
                <ReadValue value={s.email} />
              )}
            </Field>
            <Field label="Provincial address" htmlFor="provincial_addr" className="md:col-span-3">
              {editing ? (
                <Textarea
                  id="provincial_addr"
                  rows={3}
                  className={fieldClass("provincial_addr")}
                  value={s.provincial_addr}
                  onChange={(e) => set("provincial_addr", e.target.value)}
                />
              ) : (
                <ReadValue value={s.provincial_addr} />
              )}
            </Field>
            <Field label="City address" htmlFor="city_addr" className="md:col-span-3">
              {editing ? (
                <Textarea
                  id="city_addr"
                  rows={3}
                  className={fieldClass("city_addr")}
                  value={s.city_addr}
                  onChange={(e) => set("city_addr", e.target.value)}
                />
              ) : (
                <ReadValue value={s.city_addr} />
              )}
            </Field>
          </Section>

          <Section title="Academic record">
            <Field label="Student ID" htmlFor="student_id" className="md:col-span-2">
              {editing ? (
                <Input
                  id="student_id"
                  className={fieldClass("student_id")}
                  value={s.student_id}
                  onChange={(e) => set("student_id", e.target.value)}
                />
              ) : (
                <ReadValue value={s.student_id} />
              )}
            </Field>
            <Field label="Year admitted" htmlFor="yr_admitted" className="md:col-span-2">
              {editing ? (
                <Input id="yr_admitted" type="number" className={fieldClass("yr_admitted")} value={s.yr_admitted ?? ""} onChange={numberChange("yr_admitted")} />
              ) : (
                <ReadValue value={s.yr_admitted} />
              )}
            </Field>
            <Field label="Years in residency" htmlFor="yr_residency" className="md:col-span-2">
              {editing ? (
                <Input id="yr_residency" type="number" className={fieldClass("yr_residency")} value={s.yr_residency ?? ""} onChange={numberChange("yr_residency")} />
              ) : (
                <ReadValue value={s.yr_residency} />
              )}
            </Field>
            <Field label="Year graduated" htmlFor="yr_graduated" className="md:col-span-2">
              {editing ? (
                <Input id="yr_graduated" type="number" className={fieldClass("yr_graduated")} value={s.yr_graduated ?? ""} onChange={numberChange("yr_graduated")} />
              ) : (
                <ReadValue value={s.yr_graduated} />
              )}
            </Field>
            <Field label="Non Graduate?" htmlFor="is_non_graduating" className="md:col-span-3">
              <div className={`flex min-h-9 items-center gap-3 rounded-md px-2 ${fieldClass("is_non_graduate")}`}>
                <Switch
                  id="is_non_graduating"
                  checked={s.is_non_graduate}
                  disabled={!editing}
                  onCheckedChange={(v) => set("is_non_graduate", v)}
                  className="data-[state=checked]:bg-[var(--color-primary)]"
                />
                <span className="text-[15px] text-neutral-900">{s.is_non_graduate ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Status" className="md:col-span-3">
              <div className="flex min-h-9 items-center">
                <Badge variant="outline" className={`capitalize ${STATUS_STYLES[saved.status]}`}>
                  {saved.status}
                </Badge>
              </div>
            </Field>
          </Section>

          <Section title="System record">
            <Field label="Student UUID" className="md:col-span-6">
              <ReadValue value={saved.student_uuid} mono />
            </Field>
            <Field label="Created" className="md:col-span-2">
              <ReadValue value={formatDateTime(saved.created_at)} />
            </Field>
            <Field label="Last updated" className="md:col-span-2">
              <ReadValue value={formatDateTime(saved.updated_at)} />
            </Field>
          </Section>
        </form>
      </div>

      {/* Personal Records */}
      <div className="flex flex-col my-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Personal Records
        </h2>
        <DataTable
          columns={columns}
          data={[
            {
              fileName: "a",
              filePath: "a",
              docuStatus: "1",
              createdAt: "a",
              updatedAt: "a"
            }
          ]} // fetch records 
          dateKey="updatedAt"
          searchPlaceholder="Search personal records"
          exportFileName="Personal Records"
          actions={actions}
          enableRowSelection={true}
          pageSizeOptions={[10]}
        />
      </div>

      {/* Academic Records */}
      <div className="flex flex-col my-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Academic Records
        </h2>
        <DataTable
          columns={columns}
          data={[
            {
              fileName: "a",
              filePath: "a",
              docuStatus: "1",
              createdAt: "a",
              updatedAt: "a"
            }
          ]} // fetch records 
          dateKey="updatedAt"
          searchPlaceholder="Search academic records"
          exportFileName="Academic Records"
          actions={actions}
          enableRowSelection={true}
          pageSizeOptions={[10]}
        />
      </div>        

      {/* RLE / Clinical Records */}
      <div className="flex flex-col my-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          RLE / Clinical Records
        </h2>
        <DataTable
          columns={columns}
          data={[]} // fetch records 
          dateKey="updatedAt"
          searchPlaceholder="Search RLE / Clinical records"
          exportFileName="Clinical Records"
          actions={actions}
          enableRowSelection={true}
          pageSizeOptions={[10]}
        />
      </div>

      {/* Completion and Certificate Records */}
      <div className="flex flex-col my-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Completion and Certificate Records
        </h2>
        <DataTable
          columns={columns}
          data={[]} // fetch records 
          dateKey="updatedAt"
          searchPlaceholder="Search personal records"
          exportFileName="Personal Records"
          actions={actions}
          enableRowSelection={true}
          pageSizeOptions={[10]}
        />
      </div>
      
      {/* Others */}
      <div className="flex flex-col my-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Others
        </h2>
        <DataTable
          columns={columns}
          data={[]} // fetch records 
          dateKey="updatedAt"
          searchPlaceholder="Search personal records"
          exportFileName="Personal Records"
          actions={actions}
          enableRowSelection={true}
          pageSizeOptions={[10]}
        />
      </div>

      {/* Disable confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {saved.last_name}, {saved.first_name}'s record 
              including their documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const response = await fetch(`/api/student/${saved.student_uuid}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    throw new Error(getApiError(body, "Unable to delete student profile."));
                  }
                  notify.success("Student deleted");
                  navigate("/students");
                } catch (cause) {
                  notify.error("Unable to delete student", {
                    description: cause instanceof Error ? cause.message : "Please try again.",
                  });
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
