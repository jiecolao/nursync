"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ban, Camera, Eye, EyeOff, KeyRound, Pencil, RotateCcw, Save, X } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { API_BASE, authRequest, type AuthUser } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/* Types (mirrors the ERD)                                             */
/* ------------------------------------------------------------------ */

type Status = "active" | "inactive" | "disabled";

interface Faculty {
  image: string | null;
  photoPath: string | null;
  faculty_id: string;
  username: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  genderId: number | null;
  email: string;
  status: Status;
  created_at: string; // ISO
}

const GENDERS = [
  { id: 1, label: "Male" },
  { id: 2, label: "Female" },
];

const INITIAL_FACULTY: Faculty = {
  image: null,
  photoPath: null,
  faculty_id: "FAC-2019-0042",
  username: "mreyes",
  last_name: "Reyes",
  first_name: "Maria",
  middle_name: "Lopez",
  suffix: "",
  genderId: 2,
  email: "maria.reyes@example.edu.ph",
  status: "active",
  created_at: "2019-08-05T09:00:00.000Z",
};

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-900 border-emerald-200",
  inactive: "bg-amber-100 text-amber-900 border-amber-200",
  disabled: "bg-red-100 text-red-900 border-red-200",
};

const PRIMARY = "var(--color-primary)";
const SECONDARY = "var(--color-secondary)";

const onPrimaryBtn = "border-white/30 bg-transparent text-inherit hover:bg-white/10 hover:text-inherit";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { dateStyle: "long" });

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
      className={`min-h-9 py-1.5 text-[15px] ${mono ? "font-mono text-sm" : ""} ${
        empty ? "text-neutral-400" : "text-neutral-900"
      }`}
    >
      {empty ? "-" : value}
    </p>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold" style={{ color: PRIMARY }}>
          {title}
        </h3>
        {hint && <p className="text-sm text-neutral-500">{hint}</p>}
      </div>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Change password dialog                                              */
/* ------------------------------------------------------------------ */

function ChangePasswordDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const empty = { current: "", next: "", confirm: "" };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<typeof empty> & { form?: string }>({});
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setValues(empty);
    setErrors({});
    setShow(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Partial<typeof empty> = {};
    if (!values.current) err.current = "Enter your current password.";
    if (values.next.length < 8) err.next = "Use at least 8 characters.";
    else if (values.next === values.current) err.next = "Choose a password you haven't used here.";
    if (values.confirm !== values.next) err.confirm = "Passwords don't match.";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSubmitting(true);
    try {
      await authRequest("/api/admin/me/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: values.current,
          newPassword: values.next,
        }),
      });
      handleOpenChange(false);
      onChanged();
    } catch (cause) {
      setErrors({ form: cause instanceof Error ? cause.message : "Unable to update password." });
    } finally {
      setSubmitting(false);
    }
  };

  const type = show ? "text" : "password";
  const toggle = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className="text-sm text-neutral-600 underline-offset-4 hover:underline"
    >
      {show ? "Hide passwords" : "Show passwords"}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Current password" htmlFor="pw_current" error={errors.current}>
              <Input
                id="pw_current"
                type={type}
                autoComplete="current-password"
                value={values.current}
                onChange={(e) => setValues((v) => ({ ...v, current: e.target.value }))}
              />
            </Field>
            <Field label="New password" htmlFor="pw_next" error={errors.next}>
              <Input
                id="pw_next"
                type={type}
                autoComplete="new-password"
                value={values.next}
                onChange={(e) => setValues((v) => ({ ...v, next: e.target.value }))}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="pw_confirm" error={errors.confirm}>
              <Input
                id="pw_confirm"
                type={type}
                autoComplete="new-password"
                value={values.confirm}
                onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
              />
            </Field>
            {toggle}
            {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: PRIMARY }}
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const [saved, setSaved] = useState<Faculty>(INITIAL_FACULTY);
  const [draft, setDraft] = useState<Faculty>(INITIAL_FACULTY);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const result = await authRequest<{ user: AuthUser }>("/api/auth/session", {
          signal: controller.signal,
        });
        const profile = result.user.profile;
        if (!profile) throw new Error("Your profile details are unavailable.");

        const faculty: Faculty = {
          image: profile.photoPath ? `${API_BASE}${profile.photoPath}` : null,
          photoPath: profile.photoPath,
          faculty_id: profile.facultyId ?? "",
          username: profile.username,
          last_name: profile.lastName,
          first_name: profile.firstName,
          middle_name: profile.middleName ?? "",
          suffix: profile.suffix ?? "",
          genderId: profile.genderId,
          email: result.user.email,
          status: profile.status ? "active" : "disabled",
          created_at: profile.createdAt,
        };
        setSaved(faculty);
        setDraft(faculty);
        setPhotoFile(null);
        setLoadError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setLoadError(cause instanceof Error ? cause.message : "Unable to load your profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, []);

  const isDisabled = saved.status === "disabled";
  const f = editing ? draft : saved;

  const set = <K extends keyof Faculty>(key: K, value: Faculty[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const startEdit = () => {
    setDraft(saved);
    setPhotoFile(null);
    setErrors({});
    setNotice(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(saved);
    setPhotoFile(null);
    setErrors({});
    setEditing(false);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!draft.last_name.trim()) e.last_name = "Enter a last name.";
    if (!draft.first_name.trim()) e.first_name = "Enter a first name.";
    if (!draft.genderId) e.genderId = "Select a sex.";
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.email = "Enter a valid email address.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await authRequest("/api/admin/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          facultyId: draft.faculty_id || undefined,
          lastName: draft.last_name.trim(),
          fastName: draft.first_name.trim(),
          middleName: draft.middle_name.trim() || undefined,
          suffix: draft.suffix.trim() || undefined,
          genderId: draft.genderId,
          email: draft.email.trim(),
        }),
      });
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await authRequest("/api/admin/me/profile-photo", {
          method: "PUT",
          body: formData,
        });
      }
      const updated = await authRequest<{ user: AuthUser }>("/api/auth/session");
      const profile = updated.user.profile;
      if (!profile) throw new Error("Updated profile details are unavailable.");
      const faculty: Faculty = {
        image: profile.photoPath ? `${API_BASE}${profile.photoPath}` : null,
        photoPath: profile.photoPath,
        faculty_id: profile.facultyId ?? "",
        username: profile.username,
        last_name: profile.lastName,
        first_name: profile.firstName,
        middle_name: profile.middleName ?? "",
        suffix: profile.suffix ?? "",
        genderId: profile.genderId,
        email: updated.user.email,
        status: profile.status ? "active" : "disabled",
        created_at: profile.createdAt,
      };
      setSaved(faculty);
      setDraft(faculty);
      setEditing(false);
      setNotice("Profile saved.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: Status) => {
    setSaving(true);
    try {
      await authRequest("/api/admin/me/status", {
        method: "PUT",
        body: JSON.stringify({ status: status !== "disabled" }),
      });
      setSaved((p) => ({ ...p, status }));
      setConfirmDisable(false);
      setNotice(status === "disabled" ? "Account disabled." : "Account enabled.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to update account status.");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => set("image", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fullName =
    [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" ") +
    (f.suffix ? `, ${f.suffix}` : "");
  const initials = `${saved.first_name[0] ?? ""}${saved.last_name[0] ?? ""}`.toUpperCase();
  const genderLabel = GENDERS.find((g) => g.id === f.genderId)?.label;

  return (
    <div className="min-h-screen" style={{ backgroundColor: SECONDARY }}>
      <div className="mx-auto max-w space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: PRIMARY }}>
          Profile Overview
        </h2>

        {loading && <p role="status" className="text-sm text-neutral-500">Loading your profile…</p>}
        {loadError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {loadError}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            {notice}
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
              className="ml-4 rounded p-0.5 hover:bg-black/5"
            >
              <X className="size-4" />
            </button>
          </p>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
          {/* ---------------- Identity + actions ---------------- */}
          <aside
            className="space-y-6 rounded-2xl p-6 text-center lg:sticky lg:top-8 h-full"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            <div className="space-y-4">
              <div className="relative mx-auto w-fit">
                <Avatar className="size-36 border-4" style={{ borderColor: SECONDARY }}>
                  <AvatarImage src={f.image ?? undefined} alt={fullName} className="object-cover" />
                  <AvatarFallback className="bg-white text-4xl font-semibold text-[var(--color-primary)]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Change photo"
                      className="absolute right-1 bottom-1 grid size-10 place-items-center rounded-full border-2 shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

              <div className="space-y-1">
                <h1 className="text-xl leading-tight font-semibold">{fullName}</h1>
                <p className="text-sm opacity-80">@{saved.username}</p>
                <p className="text-sm opacity-80">Role: {saved.faculty_id}</p>
              </div>

              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[saved.status]}`}>
                {saved.status}
              </Badge>
            </div>

            <Separator className="bg-white/20" />

            <div className="flex flex-col gap-2">
              {editing ? (
                <>
                  <Button
                    onClick={() => void save()}
                    disabled={saving}
                    className="hover:opacity-90"
                    style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                  >
                    <Save className="size-4" /> Save changes
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className={onPrimaryBtn}>
                    <X className="size-4" /> Cancel
                  </Button>
                </>
              ) : isDisabled ? (
                <Button
                  onClick={() => void setStatus("active")}
                  disabled={saving}
                  className="hover:opacity-90"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                >
                  <RotateCcw className="size-4" /> Enable account
                </Button>
              ) : (
                <>
                  <Button
                    onClick={startEdit}
                    disabled={saving}
                    className="hover:opacity-90"
                    style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                  >
                    <Pencil className="size-4" /> Edit profile
                  </Button>
                  <Button variant="outline" onClick={() => setPasswordOpen(true)} className={onPrimaryBtn}>
                    <KeyRound className="size-4" /> Change password
                  </Button>
                  {/* <Button variant="outline" onClick={() => setConfirmDisable(true)} className={onPrimaryBtn}>
                    <Ban className="size-4" /> Disable account
                  </Button> */}
                </>
              )}
            </div>
          </aside>

          {/* ---------------- Details ---------------- */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) void save();
            }}
            className="space-y-8 rounded-2xl border bg-white p-6 md:p-8"
          >
            {isDisabled && (
              <p
                role="status"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              >
                This account is disabled. Enable it to edit the profile or change the password.
              </p>
            )}

            <Section title="Name">
              <Field label="Last name" htmlFor="last_name" error={errors.last_name} className="sm:col-span-3">
                {editing ? (
                  <Input id="last_name" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
                ) : (
                  <ReadValue value={f.last_name} />
                )}
              </Field>
              <Field label="First name" htmlFor="first_name" error={errors.first_name} className="sm:col-span-3">
                {editing ? (
                  <Input id="first_name" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
                ) : (
                  <ReadValue value={f.first_name} />
                )}
              </Field>
              <Field label="Middle name" htmlFor="middle_name" className="sm:col-span-4">
                {editing ? (
                  <Input id="middle_name" value={f.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
                ) : (
                  <ReadValue value={f.middle_name} />
                )}
              </Field>
              <Field label="Suffix" htmlFor="suffix" className="sm:col-span-2">
                {editing ? (
                  <Input
                    id="suffix"
                    placeholder="Jr., III"
                    value={f.suffix}
                    onChange={(e) => set("suffix", e.target.value)}
                  />
                ) : (
                  <ReadValue value={f.suffix} />
                )}
              </Field>
              <Field label="Sex" htmlFor="genderId" error={errors.genderId} className="sm:col-span-3">
                {editing ? (
                  <Select
                    value={f.genderId ? String(f.genderId) : ""}
                    onValueChange={(v) => set("genderId", Number(v))}
                  >
                    <SelectTrigger id="genderId" className="w-full">
                      <SelectValue placeholder="Select sex">
                        {GENDERS.find((g) => String(g.id) === String(f.genderId))?.label}
                      </SelectValue>
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
            </Section>

            <Separator />

            <Section title="Account" hint="Your faculty ID and username can't be changed here.">
              <Field label="Faculty ID" className="sm:col-span-3">
                <ReadValue value={saved.faculty_id} mono />
              </Field>
              <Field label="Username" className="sm:col-span-3">
                <ReadValue value={saved.username} mono />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email} className="sm:col-span-6">
                {editing ? (
                  <Input id="email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
                ) : (
                  <ReadValue value={f.email} />
                )}
              </Field>
              <Field label="Status" className="sm:col-span-3">
                <div className="flex min-h-9 items-center">
                  <Badge variant="outline" className={`capitalize ${STATUS_STYLES[saved.status]}`}>
                    {saved.status}
                  </Badge>
                </div>
              </Field>
              <Field label="Member since" className="sm:col-span-3">
                <ReadValue value={formatDate(saved.created_at)} />
              </Field>
            </Section>
          </form>
        </div>
      </div>

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChanged={() => setNotice("Password updated.")}
      />

      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {saved.first_name} {saved.last_name} will be marked as disabled and the profile will
              be locked from editing. You can enable the account again at any time.
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
