import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, LoaderCircle, Plus, Trash2, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const STUDENT_DOCUMENT_CATEGORIES = ['Academic', 'Completion & Certificate', 'Others', 'Personal', 'RLE'] as const;
type Category = typeof STUDENT_DOCUMENT_CATEGORIES[number];
type DocumentRecord = { studentDocId: string; filename: string | null; filepath: string | null; submittedAt: string | null; documentCategories?: { docuName: string }; documentStatus?: { docuStatusName: string } };
type CategoryData = { name: Category; count: number; documents: DocumentRecord[] };

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5151/api';
const fileUrl = (uuid: string, doc: DocumentRecord) => doc.filepath ? `${API}/students/${encodeURIComponent(uuid)}/documents/file?path=${encodeURIComponent(doc.filepath)}` : '';

export function StudentFileViewer({ fileUrl: url, fileName, fileType, onClose }: { fileUrl: string; fileName: string; fileType: 'txt' | 'pdf'; onClose: () => void }) {
  const [zoom, setZoom] = useState(100);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    if (fileType === 'txt') fetch(url).then(r => { if (!r.ok) throw new Error('Unable to load file'); return r.text(); }).then(t => { if (active) setText(t); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    return () => { active = false; };
  }, [url, fileType]);
  const pdfUrl = useMemo(() => `${url}#toolbar=0&navpanes=0&zoom=${zoom}`, [url, zoom]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={fileName}>
    <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <FileText className="size-5 text-primary" /><strong className="min-w-0 flex-1 truncate">{fileName}</strong>
        {fileType === 'pdf' && <><Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(50, z - 10))} aria-label="Zoom out"><ZoomOut className="size-4" /></Button><span className="text-sm tabular-nums">{zoom}%</span><Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(200, z + 10))} aria-label="Zoom in"><ZoomIn className="size-4" /></Button><Button size="sm" variant="outline" onClick={() => setZoom(100)}>Fit width</Button></>}
        <a className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" href={url} download={fileName}><Download className="size-4" /> Download</a>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close viewer"><X className="size-4" /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
        {loading ? <div className="flex h-full items-center justify-center gap-2 text-slate-600"><LoaderCircle className="size-5 animate-spin" /> Loading document…</div>
        : error ? <p className="p-8 text-center text-red-600">{error}</p>
        : fileType === 'pdf' ? <iframe title={fileName} src={pdfUrl} className="h-full min-h-[70vh] w-full border-0" onError={() => setError('This PDF could not be displayed. Download it to open in another viewer.')} />
        : <pre className="whitespace-pre-wrap p-6 font-mono text-sm">{text}</pre>}
      </div>
    </div>
  </div>;
}

export function StudentDocumentsPanel({ studentUuid }: { studentUuid: string }) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadCategory, setUploadCategory] = useState<Category | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string; type: 'txt' | 'pdf' } | null>(null);
  const [active, setActive] = useState<Category>('Academic');

  async function refresh() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/students/${encodeURIComponent(studentUuid)}/documents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Could not retrieve student documents.');
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load documents'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [studentUuid]);

  async function upload() {
    if (!uploadCategory || !files?.length) return;
    const body = new FormData(); Array.from(files).forEach(f => body.append('files', f));
    setUploading(true);
    try {
      const res = await fetch(`${API}/students/${encodeURIComponent(studentUuid)}/documents/upload?category=${encodeURIComponent(uploadCategory)}`, { method: 'POST', body, credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Upload failed');
      setUploadCategory(null); setFiles(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploading(false); }
  }

  async function remove(doc: DocumentRecord) {
    if (!window.confirm(`Delete ${doc.filename ?? 'this file'}? This removes the file from disk.`)) return;
    const res = await fetch(`${API}/students/${encodeURIComponent(studentUuid)}/documents/${encodeURIComponent(doc.studentDocId)}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { setError('Could not delete this document.'); return; }
    await refresh();
  }

  const sections = STUDENT_DOCUMENT_CATEGORIES.map(name => categories.find(c => c.name === name) ?? { name, count: 0, documents: [] });
  return <section id="student-documents" className="mt-8 space-y-5">
    <div><p className="text-sm font-medium uppercase tracking-wider text-slate-500">Student records</p><h2 className="text-2xl font-semibold text-primary">Documents</h2><p className="mt-1 text-sm text-slate-500">Manage files by category. Changes are synchronized with the document directory.</p></div>
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border bg-white p-3 lg:sticky lg:top-6"><h3 className="px-2 pb-2 text-sm font-semibold text-slate-500">FOLDERS</h3>
        {sections.map(section => <button key={section.name} onClick={() => { setActive(section.name); document.getElementById(`docs-${section.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${active === section.name ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-700 hover:bg-slate-50'}`}><span>{section.name}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{section.count}</span></button>)}
      </aside>
      <div className="min-w-0 space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="flex items-center gap-2 rounded-xl border bg-white p-8 text-slate-500"><LoaderCircle className="size-5 animate-spin" /> Loading files…</div> : sections.map(section => <section id={`docs-${section.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`} key={section.name} className="scroll-mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b bg-slate-50/70 px-4 py-3"><div className="min-w-0 flex-1"><h3 className="font-semibold">{section.name}</h3><p className="text-xs text-slate-500">{section.count} {section.count === 1 ? 'file' : 'files'}</p></div><Button size="sm" onClick={() => { setUploadCategory(section.name); setFiles(null); }}><Upload className="mr-2 size-4" /> Upload</Button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-white text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Filename</th><th className="px-4 py-3 font-medium">Filepath</th><th className="px-4 py-3 font-medium">Date submitted</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y">
            {section.documents.length === 0 ? <tr><td colSpan={5} className="px-4 py-9 text-center text-slate-400">No files in this folder yet.</td></tr> : section.documents.map(doc => <tr key={doc.studentDocId} className="transition-colors hover:bg-slate-50"><td className="max-w-[220px] px-4 py-3"><div className="flex items-center gap-2"><FileText className="size-4 shrink-0 text-slate-400" /><span className="truncate font-medium text-slate-800">{doc.filename ?? 'Unnamed file'}</span></div></td><td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500" title={doc.filepath ?? ''}>{doc.filepath ?? '—'}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{doc.documentStatus?.docuStatusName ?? 'Pending'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="View" aria-label="View file" disabled={!fileUrl(studentUuid, doc)} onClick={() => { const ext = (doc.filename ?? '').split('.').pop()?.toLowerCase(); const url = fileUrl(studentUuid, doc); if (ext === 'pdf' || ext === 'txt') setViewer({ url, name: doc.filename ?? 'Document', type: ext as 'pdf' | 'txt' }); else window.open(url, '_blank', 'noopener,noreferrer'); }}><Eye className="size-4" /></Button><a className="inline-flex size-9 items-center justify-center rounded-md hover:bg-slate-100" href={fileUrl(studentUuid, doc)} download={doc.filename ?? undefined} title="Download"><Download className="size-4" /></a><Button size="icon" variant="ghost" title="Delete" aria-label="Delete file" onClick={() => void remove(doc)}><Trash2 className="size-4 text-red-600" /></Button></div></td></tr>)}
          </tbody></table></div>
        </section>)}
      </div>
    </div>
    {uploadCategory && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Upload documents</h3><p className="text-sm text-slate-500">Destination: {uploadCategory}</p></div><Button variant="ghost" size="icon" onClick={() => setUploadCategory(null)}><X className="size-4" /></Button></div><label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center hover:border-primary"><Plus className="size-7 text-slate-400" /><span className="font-medium">Choose multiple files</span><span className="text-xs text-slate-500">Up to 20 files, 25 MB each</span><input className="mt-2 max-w-full text-sm" type="file" multiple onChange={e => setFiles(e.target.files)} /></label>{files?.length ? <p className="mt-3 text-sm text-slate-600">{files.length} file(s) selected</p> : null}<div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setUploadCategory(null)}>Cancel</Button><Button disabled={!files?.length || uploading} onClick={() => void upload()}>{uploading && <LoaderCircle className="mr-2 size-4 animate-spin" />}{uploading ? 'Uploading…' : 'Upload files'}</Button></div></div></div>}
    {viewer && <StudentFileViewer fileUrl={viewer.url} fileName={viewer.name} fileType={viewer.type} onClose={() => setViewer(null)} />}
  </section>;
}
