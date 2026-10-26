"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeFirstName } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Gender = { genderId: number; genderName: string };
type StudentPayload = {
  studentId?: string; lastName: string; firstName: string; middleName?: string;
  genderId?: number; dob?: string; contactNo?: string; email?: string;
  provincialAddr?: string; cityAddr?: string; yrAdmitted: number;
  yrResidency: number; yrGraduated?: number; isNonGraduate: boolean;
};

const emptyForm = {
  studentIdPrefix: "", studentIdSuffix: "", lastName: "", firstName: "", middleName: "", genderId: "",
  dob: "", contactNo: "", email: "", provincialAddr: "", cityAddr: "",
  yrAdmitted: "", yrResidency: "", yrGraduated: "", isNonGraduate: false,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (student: Record<string, unknown>) => void;
};

export function AddStudentPanel({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/lookups/genders", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load gender options.");
        const data = await response.json();
        setGenders(Array.isArray(data) ? data : []);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setGenders([]);
      });
    return () => controller.abort();
  }, [open]);

  const setField = (name: keyof typeof emptyForm, value: string | boolean) =>
    setForm((current) => ({ ...current, [name]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const studentIdPrefix = form.studentIdPrefix.trim();
    const studentIdSuffix = form.studentIdSuffix.trim();
    if ((studentIdPrefix || studentIdSuffix) &&
      (!/^[A-Za-z0-9]{4}$/.test(studentIdPrefix) ||
        !/^[A-Za-z0-9]{5,}$/.test(studentIdSuffix))) {
      setError("Student ID must have 4 letters or numbers, followed by at least 5 letters or numbers.");
      return;
    }
    setLoading(true);
    const payload: StudentPayload = {
      lastName: form.lastName.trim(),
      firstName: normalizeFirstName(form.firstName),
      yrAdmitted: Number(form.yrAdmitted),
      yrResidency: Number(form.yrResidency),
      isNonGraduate: form.isNonGraduate,
      ...(studentIdPrefix && studentIdSuffix
        ? { studentId: `${studentIdPrefix}-${studentIdSuffix}` }
        : {}),
      ...(form.middleName.trim() && { middleName: form.middleName.trim() }),
      ...(form.genderId && { genderId: Number(form.genderId) }),
      ...(form.dob && { dob: new Date(form.dob).toISOString() }),
      ...(form.contactNo.trim() && { contactNo: form.contactNo.trim() }),
      ...(form.email.trim() && { email: form.email.trim() }),
      ...(form.provincialAddr.trim() && { provincialAddr: form.provincialAddr.trim() }),
      ...(form.cityAddr.trim() && { cityAddr: form.cityAddr.trim() }),
      ...(form.yrGraduated && { yrGraduated: Number(form.yrGraduated) }),
    };
    try {
      const response = await fetch("/api/student", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message
          ? (Array.isArray(body.message) ? body.message.join(", ") : body.message)
          : "Unable to create student. Please check the information and try again.");
      }
      const created = await response.json();
      onCreated(created);
      setForm(emptyForm);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create student.");
    } finally {
      setLoading(false);
    }
  }

  const field = (name: keyof typeof emptyForm, label: string, maxLength: number, required = false) => (
    <div className="space-y-2" key={name}>
      <div className="flex flex-row gap-1">
        <Label htmlFor={name}>{label}</Label><Label className="text-red-600">{required ? " *" : ""}</Label>
      </div>
      <Input id={name} name={name} maxLength={maxLength} required={required}
        placeholder={`Enter ${label.toLowerCase()}`}
        value={String(form[name])} onChange={(event) => setField(name, event.target.value)} />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Add Student</SheetTitle>
          <SheetDescription>Enter the student's personal, contact, and academic details. Fields marked * are required.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 px-4 pb-6">
          <section className="space-y-4">
            <h3 className="font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Student ID (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input id="studentIdPrefix" name="studentIdPrefix" maxLength={4} pattern="[A-Za-z0-9]{4}"
                    title="Use exactly 4 letters or numbers."
                    placeholder="e.g. 2026"
                    value={form.studentIdPrefix} onChange={(event) => setField("studentIdPrefix", event.target.value)} />
                  <span aria-hidden="true">-</span>
                  <Input id="studentIdSuffix" name="studentIdSuffix" maxLength={15} pattern="[A-Za-z0-9]{5,}"
                    title="Use at least 5 letters or numbers."
                    placeholder="e.g. 12345"
                    value={form.studentIdSuffix} onChange={(event) => setField("studentIdSuffix", event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-row gap-1">
                  <Label htmlFor="lastName">Last Name</Label><Label className="text-red-600"> *</Label>
                </div>
                <Input id="lastName" name="lastName" maxLength={255} required
                  placeholder="Enter last name"
                  value={form.lastName} onChange={(event) => setField("lastName", event.target.value.toUpperCase())} />
              </div>
              {field("firstName", "First Name", 255, true)}
              {field("middleName", "Middle Name", 255)}
              <div className="space-y-2">
                <Label htmlFor="genderId">Gender</Label>
                <select id="genderId" value={form.genderId} onChange={(e) => setField("genderId", e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                  <option value="">Select gender</option>
                  {genders.map((gender) => <option key={gender.genderId} value={gender.genderId}>{gender.genderName}</option>)}
                </select>
                {genders.length === 0 && <p className="text-xs text-muted-foreground">Gender options could not be loaded; you can leave this blank.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" max={new Date().toISOString().slice(0, 10)} placeholder="Select date of birth" value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)} />
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="font-semibold">Contact &amp; Address</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input id="contactNo" name="contactNo" maxLength={50} placeholder="09XXXXXXXXX"
                  value={form.contactNo} onChange={(event) => setField("contactNo", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" maxLength={100} placeholder="name@example.com" value={form.email}
                  onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cityAddr">City Address</Label>
                <Textarea id="cityAddr" placeholder="Enter city address" value={form.cityAddr} onChange={(e) => setField("cityAddr", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="provincialAddr">Provincial Address</Label>
                <Textarea id="provincialAddr" placeholder="Enter provincial address" value={form.provincialAddr} onChange={(e) => setField("provincialAddr", e.target.value)} />
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="font-semibold">Academic Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex flex-row gap-1">
                  <Label htmlFor="yrAdmitted">Year Admitted</Label><Label className="text-red-600"> *</Label>
                </div>
                <Input id="yrAdmitted" type="number" min="1900" max="2100" step="1" required placeholder="e.g. 2026" value={form.yrAdmitted}
                  onChange={(e) => setField("yrAdmitted", e.target.value)} /></div>
              <div className="space-y-2">
                <div className="flex flex-row gap-1">
                  <Label htmlFor="yrResidency">Year of Residency</Label><Label className="text-red-600"> *</Label>
                </div>
                <Input id="yrResidency" type="number" min="0" step="1" required placeholder="e.g. 1" value={form.yrResidency}
                  onChange={(e) => setField("yrResidency", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="yrGraduated">Year Graduated</Label>
                <Input id="yrGraduated" type="number" min="1900" max="2100" step="1" placeholder="e.g. 2026" value={form.yrGraduated}
                  onChange={(e) => setField("yrGraduated", e.target.value)} /></div>
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div><Label htmlFor="isNonGraduate">Non-graduate</Label><p className="text-xs text-muted-foreground">Mark if the student did not graduate.</p></div>
                <Switch id="isNonGraduate" checked={form.isNonGraduate}
                  onCheckedChange={(checked) => setField("isNonGraduate", checked)} />
              </div>
            </div>
          </section>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Student"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
