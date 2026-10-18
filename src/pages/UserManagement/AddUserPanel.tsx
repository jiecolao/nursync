"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const permissionKeys = ["students_read", "students_write", "user_read", "user_write", "logs_read", "logs_write"] as const;
type PermissionKey = typeof permissionKeys[number];
type Permissions = Record<PermissionKey, boolean>;
const defaultPermissions: Permissions = { students_read: true, students_write: false, user_read: false, user_write: false, logs_read: false, logs_write: false };
type UserRecord = { userId: string; facultyId?: string | null; lastName: string; fastName: string; middleName?: string | null; suffix?: string | null; account?: { username: string; email: string; status: boolean; role?: { roleId: number; role?: { roleId: number; roleName: string; permission?: Partial<Permissions> } } | null } | null };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; user?: UserRecord | null; onSaved: (user: UserRecord) => void };
const blank = { userId: "", facultyId: "", lastName: "", fastName: "", middleName: "", suffix: "", username: "", email: "", password: "", roleId: "1", status: true };
const permissionLabels: Record<PermissionKey, string> = { students_read: "View students", students_write: "Create and edit students", user_read: "View user accounts", user_write: "Create and edit users", logs_read: "View activity logs", logs_write: "Manage log permissions" };

export function AddUserPanel({ open, onOpenChange, user, onSaved }: Props) {
  const [form, setForm] = useState(blank);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(user ? { ...blank, userId: user.userId, facultyId: user.facultyId ?? "", lastName: user.lastName, fastName: user.fastName, middleName: user.middleName ?? "", suffix: user.suffix ?? "", username: user.account?.username ?? "", email: user.account?.email ?? "", roleId: String(user.account?.role?.roleId ?? user.account?.role?.role?.roleId ?? 1), status: user.account?.status ?? true } : blank);
    const stored = user?.account?.role?.role?.permission;
    setPermissions(stored ? Object.fromEntries(permissionKeys.map(key => [key, Boolean(stored[key])])) as Permissions : defaultPermissions);
  }, [open, user]);

  const set = (key: keyof typeof blank, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  const togglePermission = (key: PermissionKey, checked: boolean) => setPermissions(current => ({ ...current, [key]: checked }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const payload: Record<string, unknown> = { userId: form.userId.trim() || undefined, facultyId: form.facultyId.trim() || undefined, lastName: form.lastName.trim(), fastName: form.fastName.trim(), middleName: form.middleName.trim() || undefined, suffix: form.suffix.trim() || undefined, username: form.username.trim(), email: form.email.trim(), roleId: Number(form.roleId), status: form.status, permissions };
      if (form.password) payload.password = form.password;
      if (!editing && !form.password) throw new Error("Set an initial password for the new account.");
      const response = await fetch(editing ? `/api/admin/${encodeURIComponent(form.userId)}` : "/api/admin", { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(Array.isArray(result?.message) ? result.message.join(", ") : result?.message || "Unable to save user.");
      onSaved(result); onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save user."); }
    finally { setLoading(false); }
  }

  const field = (key: keyof typeof blank, label: string, required = false, type = "text") => <div className="space-y-2" key={key}><Label htmlFor={key}>{label}{required ? " *" : ""}</Label><Input id={key} type={type} required={required} value={String(form[key])} onChange={e => set(key, e.target.value)} /></div>;
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>{editing ? "Edit User" : "Add User"}</SheetTitle><SheetDescription>Manage account details, account status, and independent custom permissions.</SheetDescription></SheetHeader><form onSubmit={submit} className="flex flex-col gap-6 px-4 pb-6">
    <section className="space-y-4"><h3 className="font-semibold">Personal Information</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field("userId", "User ID (optional for new users)")}{field("facultyId", "Faculty ID")}{field("lastName", "Last Name", true)}{field("fastName", "First Name", true)}{field("middleName", "Middle Name")}{field("suffix", "Suffix")}</div></section>
    <section className="space-y-4"><h3 className="font-semibold">Account &amp; Access</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field("username", "Username", true)}{field("email", "Email", true)}{field("password", editing ? "New Password (leave blank to keep current)" : "Initial Password", !editing, "password")}
      <p className="text-sm text-muted-foreground sm:col-span-2">Custom permissions are saved to a dedicated role for this account and will not change other users\u2019 access.</p>
      <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2"><div><Label htmlFor="status">Account enabled</Label><p className="text-xs text-muted-foreground">Disabled accounts should not be able to sign in.</p></div><Switch id="status" checked={form.status} onCheckedChange={checked => set("status", checked)} /></div>
    </div></section>
    <section className="space-y-4"><div><h3 className="font-semibold">Custom Permissions</h3><p className="text-sm text-muted-foreground">Choose exactly which actions this account can perform.</p></div>
      {(["students", "user", "logs"] as const).map((group) => <div key={group} className="space-y-3 rounded-md border p-4"><h4 className="font-medium">{group === "students" ? "Students" : group === "user" ? "User management" : "Activity logs"}</h4>
        {permissionKeys.filter(key => key.startsWith(group + "_")).map(key => <div key={key} className="flex items-center justify-between gap-4"><Label htmlFor={key} className="cursor-pointer">{permissionLabels[key]}</Label><Switch id={key} checked={permissions[key]} onCheckedChange={checked => togglePermission(key, checked)} /></div>)}
      </div>)}
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<SheetFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Saving..." : editing ? "Save Changes" : "Create User"}</Button></SheetFooter></form></SheetContent></Sheet>;
}
