"use client";

import { useRef, useState, type ReactNode } from "react";
import { 
  Ban, Camera, Pencil, RotateCcw, Save, X,
  KeyRound, RotateCcwKey, UserKey
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  is_hd: boolean;
  status: Status;
  created_at: string; // ISO
  updated_at: string; // ISO
}

// TODO: replace with your gender lookup table (fetched from the API).
const GENDERS = [
  { id: 1, label: "Male" },
  { id: 2, label: "Female" },
  { id: 3, label: "Other" },
];

// TODO: replace with data from your API.
const INITIAL_STUDENT: Student = {
  image: null,
  student_uuid: "3f2b8c1e-7a4d-4e9b-9c6a-1d2e5f8a0b34",
  student_id: "2023-00123",
  last_name: "Dela Cruz",
  first_name: "Juan",
  middle_name: "Santos",
  gender_id: 1,
  dob: "2003-05-14",
  contact_no: "0917 123 4567",
  email: "juan.delacruz@example.com",
  provincial_addr: "Brgy. San Isidro, Tarlac City, Tarlac",
  city_addr: "Unit 4B, Katipunan Ave., Quezon City",
  yr_admitted: 2023,
  yr_residency: 2,
  yr_graduated: null,
  is_hd: false,
  status: "active",
  created_at: "2023-06-01T08:30:00.000Z",
  updated_at: "2026-09-12T14:05:00.000Z",
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

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

const formatDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", { dateStyle: "long" }) : "";

function Field({
  label,
  htmlFor,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-neutral-600">
        {label}
      </Label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-base font-semibold" style={{ color: PRIMARY }}>
          {title}
        </h3>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const [saved, setSaved] = useState<Student>(INITIAL_STUDENT);
  const [draft, setDraft] = useState<Student>(INITIAL_STUDENT);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDisabled = saved.status === "disabled";
  const s = editing ? draft : saved; // what the form currently shows

  const set = <K extends keyof Student>(key: K, value: Student[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

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
    // TODO: await fetch(`/api/students/${draft.student_uuid}`, { method: "PATCH", body: ... })
    const next = { ...draft, updated_at: new Date().toISOString() };
    setSaved(next);
    setDraft(next);
    setEditing(false);
  };

  const setStatus = async (status: Status) => {
    // TODO: await fetch(`/api/students/${saved.student_uuid}/status`, { method: "PATCH", ... })
    setSaved((p) => ({ ...p, status, updated_at: new Date().toISOString() }));
    setConfirmOpen(false);
  };

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const genderLabel = GENDERS.find((g) => g.id === s.gender_id)?.label;

  /* ----------------------------- render --------------------------- */

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
              {s.is_hd && (
                <Badge variant="outline" className="border-white/40 text-inherit">
                  HD
                </Badge>
              )}
            </div>
            <p className="text-sm opacity-80">Role: {saved.student_id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  onClick={save}
                  className="hover:opacity-90"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                >
                  <Save className="size-4" /> Save changes
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
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                  className="border-white/40 bg-mustard text-black hover:bg-mustard/70 hover:text-white"
                >
                  <KeyRound className="size-4" /> Change Password
                </Button>
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
                  className="border-white/40 bg-red-500 text-inherit hover:bg-white/10 hover:text-inherit"
                >
                  <Ban className="size-4" /> Disable
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
                <Input id="last_name" value={s.last_name} onChange={(e) => set("last_name", e.target.value)} />
              ) : (
                <ReadValue value={s.last_name} />
              )}
            </Field>
            <Field label="First name" htmlFor="first_name" error={errors.first_name} className="md:col-span-2">
              {editing ? (
                <Input id="first_name" value={s.first_name} onChange={(e) => set("first_name", e.target.value)} />
              ) : (
                <ReadValue value={s.first_name} />
              )}
            </Field>
            <Field label="Middle name" htmlFor="middle_name" className="md:col-span-2">
              {editing ? (
                <Input id="middle_name" value={s.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
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
                  <SelectTrigger id="gender_id" className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.label}
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
                <Input id="dob" type="date" value={s.dob} onChange={(e) => set("dob", e.target.value)} />
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
                  value={s.contact_no}
                  onChange={(e) => set("contact_no", e.target.value)}
                />
              ) : (
                <ReadValue value={s.contact_no} />
              )}
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} className="md:col-span-3">
              {editing ? (
                <Input id="email" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
              ) : (
                <ReadValue value={s.email} />
              )}
            </Field>
            <Field label="Provincial address" htmlFor="provincial_addr" className="md:col-span-3">
              {editing ? (
                <Textarea
                  id="provincial_addr"
                  rows={3}
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
                  value={s.city_addr}
                  onChange={(e) => set("city_addr", e.target.value)}
                />
              ) : (
                <ReadValue value={s.city_addr} />
              )}
            </Field>
          </Section>

          <Section title="Academic record">
            <Field label="Year admitted" htmlFor="yr_admitted" className="md:col-span-2">
              {editing ? (
                <Input id="yr_admitted" type="number" value={s.yr_admitted ?? ""} onChange={numberChange("yr_admitted")} />
              ) : (
                <ReadValue value={s.yr_admitted} />
              )}
            </Field>
            <Field label="Years in residency" htmlFor="yr_residency" className="md:col-span-2">
              {editing ? (
                <Input id="yr_residency" type="number" value={s.yr_residency ?? ""} onChange={numberChange("yr_residency")} />
              ) : (
                <ReadValue value={s.yr_residency} />
              )}
            </Field>
            <Field label="Year graduated" htmlFor="yr_graduated" className="md:col-span-2">
              {editing ? (
                <Input id="yr_graduated" type="number" value={s.yr_graduated ?? ""} onChange={numberChange("yr_graduated")} />
              ) : (
                <ReadValue value={s.yr_graduated} />
              )}
            </Field>
            <Field label="HD" htmlFor="is_hd" className="md:col-span-3">
              <div className="flex min-h-9 items-center gap-3">
                <Switch
                  id="is_hd"
                  checked={s.is_hd}
                  disabled={!editing}
                  onCheckedChange={(v) => set("is_hd", v)}
                  className="data-[state=checked]:bg-[var(--color-primary)]"
                />
                <span className="text-[15px] text-neutral-900">{s.is_hd ? "Yes" : "No"}</span>
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
            <Field label="Student ID" className="md:col-span-2">
              <ReadValue value={saved.student_id} />
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

      {/* Disable confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {saved.first_name} {saved.last_name} will be marked as disabled and the profile
              will be locked from editing. You can enable the account again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setStatus("disabled")}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Disable account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
