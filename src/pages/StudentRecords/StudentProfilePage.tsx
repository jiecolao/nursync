"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { 
  Archive, Camera, Pencil, RotateCcw, Save, X, Upload
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
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { formatDateTime, formatDate, normalizeFirstName } from "@/lib/utils";
import { notify } from "@/components/layout/Toasty";
import { DataTable, type DataTableAction } from "@/components/layout/DataTable";
import { DocumentsTableType } from "./student.type";
import { ColumnDef } from "@tanstack/react-table";
import StudentDocumentsPanel from "@/components/student-documents/StudentDocumentsPanel";

/* ------------------------------------------------------------------ */
/* Types (mirrors the ERD)                                             */
/* ------------------------------------------------------------------ */

type Status = "active" | "inactive" | "graduated" | "disabled";

interface Student {
  image?: string | null;
  student_uuid: string;
  student_id?: string | null;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  gender_id?: number | null;
  dob?: string | null; // YYYY-MM-DD
  contact_no?: string | null;
  email?: string | null;
  provincial_addr?: string | null;
  city_addr?: string | null;
  yr_admitted: number | null;
  yr_residency: number | null;
  yr_graduated?: number | null;
  status: Status;
  created_at: string; // ISO
  updated_at: string; // ISO
}

type ApiStudent = {
  studentUuid: string;
  studentId?: string | null;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  genderId?: number | null;
  dob?: string | null;
  contactNo?: string | null;
  email?: string | null;
  provincialAddr?: string | null;
  cityAddr?: string | null;
  yrAdmitted: number;
  yrResidency: number;
  yrGraduated?: number | null;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Gender = { genderId: number; genderName: string };

const EMPTY_STUDENT: Student = {
  image: null, student_uuid: "", student_id: "", last_name: "", first_name: "",
  middle_name: "", gender_id: null, dob: "", contact_no: "", email: "",
  provincial_addr: "", city_addr: "", yr_admitted: null, yr_residency: null,
  yr_graduated: null, status: "active",
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
      className={`min-h-9 py-1.5 text-[15px] break-all ${
        mono ? "font-mono text-sm" : ""
      } ${empty ? "text-neutral-400" : "text-neutral-900"}`}
    >
      {empty ? "-" : value}
    </p>
  );
}

function toStudent(student: ApiStudent): Student {
  return {
    image: null,
    student_uuid: student.studentUuid,
    student_id: student.studentId ?? "",
    last_name: student.lastName.toUpperCase(),
    first_name: normalizeFirstName(student.firstName),
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
    status: student.status === false ? "disabled" : "active",
    created_at: student.createdAt ?? "",
    updated_at: student.updatedAt ?? "",
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
    <section id={`profile-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="space-y-4 scroll-mt-6">
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
  const { batchNo = "", studentUuid } = useParams<{ batchNo: string; studentUuid: string }>();
  const [saved, setSaved] = useState<Student>(EMPTY_STUDENT);
  const [draft, setDraft] = useState<Student>(EMPTY_STUDENT);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (!studentUuid || !studentUuid.trim()) {
      setError("Student Not Found");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadProfile() {
      try {
        const [studentResponse, gendersResponse] = await Promise.all([
          fetch(`/api/student/${encodeURIComponent(studentUuid)}`, { credentials: "include", signal: controller.signal }),
          fetch("/api/lookups/genders", { credentials: "include", signal: controller.signal }),
        ]);
        if (studentResponse.status === 404) {
          setError("Student Not Found");
          return;
        }
        if (!studentResponse.ok) throw new Error(`Unable to load student profile (${studentResponse.status}).`);
        if (!gendersResponse.ok) throw new Error(`Unable to load gender options (${gendersResponse.status}).`);

        const apiStudent = await studentResponse.json() as ApiStudent;
        if (!apiStudent?.studentUuid || apiStudent.studentUuid !== studentUuid) {
          setError("Student Not Found");
          return;
        }
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
    setErrors(e);
    if (draft.email?.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) {
      e.email = "Enter a valid email address.";
    }
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
          lastName: draft.last_name.trim().toUpperCase(),
          firstName: normalizeFirstName(draft.first_name),
          middleName: draft.middle_name?.trim() || undefined,
          genderId: draft.gender_id ?? undefined,
          dob: draft.dob || undefined,
          contactNo: draft.contact_no?.trim() || undefined,
          email: draft.email?.trim() || undefined,
          provincialAddr: draft.provincial_addr?.trim() || undefined,
          cityAddr: draft.city_addr?.trim() || undefined,
          yrAdmitted: draft.yr_admitted,
          yrResidency: draft.yr_residency,
          // Send null explicitly so clearing the field is persisted instead of
          // being treated as an omitted partial-update property.
          yrGraduated: draft.yr_graduated,
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
      const response = await fetch(`/api/student/${encodeURIComponent(saved.student_uuid)}/status`, {
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

  const disableStudent = async () => {
    if (!saved.student_uuid || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(saved.student_uuid)}/status`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: false }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getApiError(body, "Unable to archive student profile."));
      }
      setConfirmOpen(false);
      notify.success("Student archived");
      navigate(`/records/${encodeURIComponent(batchNo)}`);
    } catch (cause) {
      notify.error("Unable to archive student", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
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

  const fullName = [
    s.last_name ? `${s.last_name},` : null,
    s.first_name, 
    s.middle_name
  ].filter(Boolean).join(" ");
  const initials = `${saved.last_name[0] ?? ""}${saved.first_name[0] ?? ""}`.toUpperCase();
  const genderLabel = genders.find((g) => g.genderId === s.gender_id)?.genderName;

  /* ----------------------------- render --------------------------- */

  if (loading) {
    return <p className="p-6 text-neutral-600">Loading student profile...</p>;
  }

  if (error) {
    return <div className="p-6 space-y-3"><p role="alert" className={error === "Student Not Found" ? "text-neutral-700" : "text-red-600"}>{error}</p><Button variant="outline" onClick={() => navigate("/student-archive")}>Back to Student Archive</Button></div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: SECONDARY }}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_210px]">
      <main className="min-w-0 space-y-6">
      <div className="mx-auto space-y-6">
        <h2 id="profile-overview" className="scroll-mt-6 text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
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
            
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{fullName || "Unnamed student"}</h1>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[saved.status]}`}>
                {saved.status}
              </Badge>
              {s.yr_graduated === null && (
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
                  className="border-white/40 bg-amber-500 text-inherit hover:bg-amber-600 hover:text-inherit"
                >
                  <Archive className="size-4" /> Disable
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
                <Input id="last_name" className={fieldClass("last_name")} value={s.last_name ?? ""} onChange={(e) => set("last_name", e.target.value.toUpperCase())} />
              ) : (
                <ReadValue value={s.last_name} />
              )}
            </Field>
            <Field label="First name" htmlFor="first_name" error={errors.first_name} className="md:col-span-2">
              {editing ? (
                <Input id="first_name" className={fieldClass("first_name")} value={s.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
              ) : (
                <ReadValue value={s.first_name} />
              )}
            </Field>
            <Field label="Middle name" htmlFor="middle_name" className="md:col-span-2">
              {editing ? (
                <Input id="middle_name" className={fieldClass("middle_name")} value={s.middle_name ?? ""} onChange={(e) => set("middle_name", e.target.value)} />
              ) : (
                <ReadValue value={s.middle_name} />
              )}
            </Field>

            <Field label="Sex" htmlFor="gender_id" error={errors.gender_id} className="md:col-span-3">
              {editing ? (
                <Select
                  value={s.gender_id ? String(s.gender_id) : ""}
                  onValueChange={(v) => set("gender_id", Number(v))}
                >
                  <SelectTrigger id="gender_id" className={`w-full ${fieldClass("gender_id")}`}>
                    <SelectValue placeholder="Select sex">
                      {genderLabel ?? "Select sex"}
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
                <Input id="dob" type="date" className={fieldClass("dob")} value={s.dob ?? ""} onChange={(e) => set("dob", e.target.value)} />
              ) : (
                <ReadValue value={formatDate(s.dob ?? "")} />
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
                  value={s.contact_no ?? ""}
                  onChange={(e) => set("contact_no", e.target.value)}
                />
              ) : (
                <ReadValue value={s.contact_no} />
              )}
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} className="md:col-span-3">
              {editing ? (
                <Input id="email" type="email" className={fieldClass("email")} value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} />
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
                  value={s.provincial_addr ?? ""}
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
                  value={s.city_addr ?? ""}
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
                  value={s.student_id ?? ""}
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
            <Field label="Graduation status" className="md:col-span-3">
              <div className="flex min-h-9 items-center">
                <span className="text-[15px] text-neutral-900">
                  {s.yr_graduated === null ? "Active / non-graduate" : "Graduated"}
                </span>
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

      <StudentDocumentsPanel studentUuid={saved.student_uuid} />
      </main>
      <aside className="hidden xl:block">
        <nav aria-label="Student profile sections" className="sticky top-6 space-y-1 rounded-xl border bg-white p-3 shadow-sm">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
          {[
            ["Profile Overview", "profile-overview"],
            ["Personal", "documents-personal-records"], 
            ["Academic", "documents-academic-records"], 
            ["Clinical", "documents-clinical-records"],
            ["Completion & Certificate", "documents-completion-and-certification-records"],
            ["Others", "documents-others"], 
          ].map(([label, id]) => 
            <a 
              key={id} 
              href={`#${id}`} 
              onClick={(event) => { 
                event.preventDefault(); 
                document.getElementById(id)?.scrollIntoView({ 
                  behavior: "smooth", 
                  block: "start" }); 
                }} 
              className="block rounded-md px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {label}
            </a>
          )}
        </nav>
      </aside>
      </div>
      {/* Disable confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive student record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {saved.last_name}, {saved.first_name} to the student archive. Their record and documents will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void disableStudent()}
              disabled={deleting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {deleting ? "Archiving..." : "Archive student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
