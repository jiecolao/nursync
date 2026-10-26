import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { normalizeFirstName } from "@/lib/utils";

type PreviewRow = { row: number; payload: Record<string, unknown>; errors: string[] };

function normalizeStudentId(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export default function StudentImportDialog({ open, onOpenChange, onComplete }: {
  open: boolean; onOpenChange: (open: boolean) => void; onComplete?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  if (!open) return null;

  const reset = () => { setFile(null); setRows([]); setMessage(""); setIsDraggingFile(false); if (inputRef.current) inputRef.current.value = ""; };
  const parse = async (selected?: File) => {
    reset();
    if (!selected) return;
    if (!/\.(csv|xlsx|xls)$/i.test(selected.name)) { setMessage("Choose a CSV or Excel (.xlsx, .xls) file."); return; }
    setFile(selected);
    try {
      const workbook = XLSX.read(await selected.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook contains no worksheet.");
      const source = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!source.length) throw new Error("The file contains no student rows.");
      const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const aliases: Record<string, string[]> = {
        studentId:["studentid","studentnumber","studentno"], firstName:["firstname","givenname"], lastName:["lastname","surname","familyname"],
        middleName:["middlename"], genderId:["genderid","gender"], dob:["dob","dateofbirth","birthdate"], contactNo:["contactno","contactnumber","phonenumber","phone"],
        email:["email","emailaddress"], provincialAddr:["provincialaddr","provincialaddress"], cityAddr:["cityaddr","cityaddress"],
        yrAdmitted:["yradmitted","yearadmitted","admittedyear"], yrResidency:["yrresidency","yearresidency","yearofresidency","residencyyear"],
        yrGraduated:["yrgraduated","yeargraduated","graduationyear"], isNonGraduate:["isnongraduate","nongraduate"]
      };
      const parsed = source.map((sourceRow, index) => {
        const values = new Map(Object.entries(sourceRow).map(([key, value]) => [normalize(key), value]));
        const get = (key: string) => { const alias = aliases[key].find((candidate) => values.has(candidate)); return alias ? String(values.get(alias) ?? "").trim() : ""; };
        const firstName = normalizeFirstName(get("firstName")), lastName = get("lastName"), middleName = get("middleName");
        const yrAdmitted = Number(get("yrAdmitted")), yrResidency = Number(get("yrResidency"));
        const optionalInt = (key: string) => get(key) ? Number(get(key)) : undefined;
        const genderId = optionalInt("genderId"), yrGraduated = optionalInt("yrGraduated");
        const boolValue = get("isNonGraduate").toLowerCase();
        const isNonGraduate = !boolValue ? undefined : ["true","1","yes"].includes(boolValue) ? true : ["false","0","no"].includes(boolValue) ? false : null;
        const errors: string[] = [];
        if (!firstName) errors.push("First Name is required.");
        if (!lastName) errors.push("Last Name is required.");
        if (!Number.isInteger(yrAdmitted) || yrAdmitted < 1900 || yrAdmitted > 2100) errors.push("Year Admitted must be between 1900 and 2100.");
        if (!Number.isInteger(yrResidency)) errors.push("Year of Residency must be a whole number.");
        if (get("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email"))) errors.push("Email address is invalid.");
        if (genderId !== undefined && !Number.isInteger(genderId)) errors.push("Gender ID must be a whole number.");
        if (yrGraduated !== undefined && !Number.isInteger(yrGraduated)) errors.push("Year Graduated must be a whole number.");
        if (isNonGraduate === null) errors.push("Is Non-Graduate must be true or false.");
        const date = get("dob") ? new Date(get("dob")) : null;
        if (date && Number.isNaN(date.getTime())) errors.push("Date of Birth is invalid.");
        const payload: Record<string, unknown> = { firstName, lastName, yrAdmitted, yrResidency };
        for (const key of ["studentId","contactNo","email","provincialAddr","cityAddr"] as const) if (get(key)) payload[key] = get(key);
        if (middleName) payload.middleName = middleName;
        if (genderId !== undefined && Number.isInteger(genderId)) payload.genderId = genderId;
        if (date && !Number.isNaN(date.getTime())) payload.dob = date.toISOString();
        if (yrGraduated !== undefined && Number.isInteger(yrGraduated)) payload.yrGraduated = yrGraduated;
        if (isNonGraduate !== undefined && isNonGraduate !== null) payload.isNonGraduate = isNonGraduate;
        return { row: index + 2, payload, errors };
      });
      const response = await fetch("/api/student", { credentials: "include" });
      if (!response.ok) throw new Error(`Unable to validate duplicate student IDs (${response.status}).`);
      const existingStudents = await response.json() as Array<{ studentId?: string | null }>;
      const existingIds = new Set(
        existingStudents.map((student) => normalizeStudentId(student.studentId)).filter(Boolean),
      );
      const importedIdRows = new Map<string, number[]>();
      for (const row of parsed) {
        const studentId = normalizeStudentId(row.payload.studentId);
        if (!studentId) continue;
        importedIdRows.set(studentId, [...(importedIdRows.get(studentId) ?? []), row.row]);
      }
      const validated = parsed.map((row) => {
        const studentId = normalizeStudentId(row.payload.studentId);
        const duplicateRows = studentId ? importedIdRows.get(studentId) ?? [] : [];
        const errors = [...row.errors];
        if (studentId && existingIds.has(studentId)) {
          errors.push("Student ID already exists.");
        } else if (duplicateRows.length > 1) {
          errors.push(`Student ID is duplicated in rows ${duplicateRows.join(", ")}.`);
        }
        return { ...row, errors };
      });
      setRows(validated);
      setMessage(`Loaded ${validated.length} row(s); ${validated.filter((r) => r.errors.length).length} need attention.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to read the file."); }
  };
  const downloadTemplate = async () => {
    try {
      // Points directly to public/templates/import-template.xlsx
      const response = await fetch('/templates/import-template.xlsx');

      // 1. Check if HTTP status is OK (200) before downloading
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download template:", error);
    }
  };
  const submit = async () => {
    if (!rows.length || rows.some((r) => r.errors.length)) return;
    setBusy(true);
    let succeeded = 0; const failures: string[] = [];
    for (const row of rows) {
      try {
        const response = await fetch("/api/student", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row.payload) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(Array.isArray(body?.message) ? body.message.join(", ") : body?.message || `HTTP ${response.status}`); }
        succeeded++;
      } catch (error) { failures.push(`Row ${row.row}: ${error instanceof Error ? error.message : "Request failed"}`); }
    }
    setBusy(false);
    setMessage(`Processed ${rows.length}; succeeded ${succeeded}; failed ${failures.length}.${failures.length ? " " + failures.slice(0, 10).join(" | ") : ""}`);
    if (!failures.length) { onComplete?.(); reset(); onOpenChange(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="import-students-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><h3 id="import-students-title" className="text-xl font-semibold">Import Students</h3><p className="mt-2 text-sm text-muted-foreground">Upload CSV or Excel. First Name, Last Name, Year Admitted, and Year of Residency are required.</p></div><Button variant="ghost" size="icon" onClick={() => { reset(); onOpenChange(false); }} disabled={busy} aria-label="Close"><X className="size-4" /></Button></div>
      <div className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Column guidelines</p>
        <p className="mt-1">Use the column names below (spaces, underscores, and capitalization are accepted). Fields marked optional may be left blank.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-background">
          <table className="w-full min-w-[42rem] text-left text-xs">
            <thead className="bg-secondary text-stone-500">
              <tr><th className="px-3 py-2">Column</th><th className="px-3 py-2">Acceptable value</th><th className="px-3 py-2">Example</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr><td className="px-3 py-2 font-medium">studentID</td><td className="px-3 py-2">Optional; 4+ letters/numbers, a hyphen, then 5+ letters/numbers; max 20 characters</td><td className="px-3 py-2"><code>2026-12345</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">lastName, firstName</td><td className="px-3 py-2">Required text; max 255 characters</td><td className="px-3 py-2"><code>Santos, Jamie</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">middleName</td><td className="px-3 py-2">Optional text; max 255 characters</td><td className="px-3 py-2"><code>Reyes</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">genderId</td><td className="px-3 py-2">Optional whole-number gender ID</td><td className="px-3 py-2"><code>1</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">dob</td><td className="px-3 py-2">Optional valid date, preferably <code>YYYY-MM-DD</code></td><td className="px-3 py-2"><code>2000-01-15</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">contactNo, email</td><td className="px-3 py-2">Optional; contact number max 50 characters, email must be valid</td><td className="px-3 py-2"><code>09171234567</code>, <code>jamie@example.com</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">provincialAddr, cityAddr</td><td className="px-3 py-2">Optional text addresses</td><td className="px-3 py-2"><code>Manila</code>, <code>Cebu City</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">yrAdmitted</td><td className="px-3 py-2">Required whole year from 1900 to 2100</td><td className="px-3 py-2"><code>2026</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">yrResidency</td><td className="px-3 py-2">Required whole number</td><td className="px-3 py-2"><code>1</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">yrGraduated</td><td className="px-3 py-2">Optional whole-number year</td><td className="px-3 py-2"><code>2026</code></td></tr>
              <tr><td className="px-3 py-2 font-medium">isNonGraduate</td><td className="px-3 py-2">Optional boolean: <code>true/false</code>, <code>yes/no</code>, or <code>1/0</code></td><td className="px-3 py-2"><code>false</code></td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">A sample row is available from <strong>Download XLSX Template</strong>. Header aliases such as <code>studentNo</code>, <code>surname</code>, <code>givenName</code>, and <code>yearAdmitted</code> are also recognized.</p>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a student import file"
        className={`my-5 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDraggingFile
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingFile(false);
          void parse(event.dataTransfer.files[0]);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => void parse(e.target.files?.[0])}/>
        <FileSpreadsheet className="mx-auto size-9 text-primary"/>
        <p className="mt-2 text-sm">{isDraggingFile ? "Drop your file here" : file?.name ?? "Drag and drop your file here"}</p>
        <p className="mt-1 text-xs text-muted-foreground">CSV, XLSX, or XLS files only</p>
        <Button type="button" className="mt-3" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="mr-2 size-4" />Choose File</Button>
      </div>
      <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 size-4"/>Download XLSX Template</Button>
      {message && <p role="status" className="my-3 text-sm">{message}</p>}
      {!!rows.length && <div className="mt-4 max-h-56 overflow-auto rounded border p-3 text-sm"><p className="mb-2 font-medium">{rows.length} row(s)</p>{rows.map((r) => <p key={r.row} className={r.errors.length ? "text-red-600" : "text-green-700"}>Row {r.row}: {String(r.payload.firstName)} {String(r.payload.lastName)}{r.errors.length ? " — " + r.errors.join(" ") : " — Valid"}</p>)}</div>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button><Button disabled={busy || !rows.length || rows.some((r) => r.errors.length)} onClick={() => void submit()}>{busy ? "Importing…" : `Import ${rows.length || ""} Students`}</Button></div>
    </section>
  </div>;
}
