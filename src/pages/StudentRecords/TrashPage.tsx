import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, RefreshCw, RotateCcw, Search, Trash2, Trash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogBox } from '@/components/layout/DialogBox';
import StudentFileViewer from '@/components/student-documents/StudentFileViewer';

type TrashDocument = {
  studentDocId: string;
  studentUuid: string;
  filename: string | null;
  filepath: string | null;
  submittedAt: string | null;
  updatedAt: string;
  student?: { firstName?: string; lastName?: string };
  documentCategories?: { docuName?: string };
  documentStatus?: { docuStatusName?: string };
};

type PendingAction = { kind: 'restore' | 'delete' | 'empty'; document?: TrashDocument };

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function TrashPage() {
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [preview, setPreview] = useState<TrashDocument | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/student-documents/trash', { credentials: 'include' });
      const payload = await response.json().catch(() => []);
      if (!response.ok) throw new Error(payload?.message || 'Unable to load Trash.');
      setDocuments(Array.isArray(payload) ? payload : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Trash.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return documents.filter((doc) => [
      doc.filename, doc.filepath, doc.student?.firstName, doc.student?.lastName,
      doc.documentCategories?.docuName,
    ].some((value) => value?.toLocaleLowerCase().includes(term)) || !term);
  }, [documents, search]);

  const executeAction = async () => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      let url = '/api/student-documents/trash';
      let method = 'DELETE';
      if (pending.kind === 'restore') {
        url += `/${encodeURIComponent(pending.document!.studentDocId)}/restore`;
        method = 'POST';
      } else if (pending.kind === 'delete') {
        url += `/${encodeURIComponent(pending.document!.studentDocId)}`;
      }
      const response = await fetch(url, { method, credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'The action could not be completed.');
      setPending(null);
      if (preview && (pending.kind === 'empty' || preview.studentDocId === pending.document?.studentDocId)) setPreview(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const fileUrl = preview?.filepath
    ? `/api/student-documents/trash/file?path=${encodeURIComponent(preview.filepath)}`
    : '';

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-3xl font-bold text-primary">Trash</h2>
          <p className="text-[.95rem] text-stone-600">Restore deleted documents or permanently remove them.</p>
          <p className="mt-2 text-sm text-stone-500">{documents.length} document{documents.length === 1 ? '' : 's'} in Trash</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading || busy}><RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button variant="destructive" onClick={() => setPending({ kind: 'empty' })} disabled={!documents.length || busy}><Trash className="mr-2 size-4" />Empty Trash</Button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-4 sm:p-5">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, student, or category…" className="pl-9" aria-label="Search trashed documents" />
          </div>
        </div>
        {loading ? <div className="py-16 text-center text-sm text-stone-500">Loading trashed documents…</div> : visibleDocuments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-secondary/55 text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Deleted / updated</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleDocuments.map((doc) => (
                  <tr key={doc.studentDocId} className="transition-colors hover:bg-secondary/30">
                    <td className="max-w-[280px] px-5 py-4">
                      <div className="flex items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><FileText className="size-4 text-primary" /></div><div className="min-w-0"><p className="truncate font-medium text-stone-900" title={doc.filename || ''}>{doc.filename || 'Unnamed document'}</p><p className="mt-1 truncate font-mono text-[11px] text-stone-400" title={doc.filepath || ''}>{doc.filepath || 'Path unavailable'}</p></div></div>
                    </td>
                    <td className="px-5 py-4 text-stone-600">{[doc.student?.lastName, doc.student?.firstName].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-5 py-4 text-stone-600">{doc.documentCategories?.docuName || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-stone-500">{formatDate(doc.updatedAt)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">
                      {/\.pdf$/i.test(doc.filename || '') && <Button variant="ghost" size="icon" title="View PDF" aria-label={`View ${doc.filename}`} onClick={() => setPreview(doc)}><Eye className="size-4" /></Button>}
                      <Button variant="outline" size="sm" onClick={() => setPending({ kind: 'restore', document: doc })}><RotateCcw className="mr-2 size-4" />Restore</Button>
                      <Button variant="destructive" size="sm" onClick={() => setPending({ kind: 'delete', document: doc })}><Trash2 className="mr-2 size-4" />Delete Permanently</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="px-6 py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary"><Trash className="size-6 text-primary/70" /></div><h3 className="mt-4 font-semibold text-stone-800">{search ? 'No matching documents' : 'Trash is empty'}</h3><p className="mt-1 text-sm text-stone-500">{search ? 'Try a different search term.' : 'Documents you move to Trash will appear here.'}</p></div>}
        <div className="border-t border-stone-100 bg-secondary/35 px-5 py-3 text-xs text-stone-500">{visibleDocuments.length} of {documents.length} document{documents.length === 1 ? '' : 's'}</div>
      </section>

      <DialogBox
        open={!!pending}
        onOpenChange={(open) => { if (!open && !busy) setPending(null); }}
        title={pending?.kind === 'restore' ? 'Restore document?' : pending?.kind === 'empty' ? 'Empty Trash permanently?' : 'Delete document permanently?'}
        desc={pending?.kind === 'restore' ? 'The file will be moved back to its original student category folder.' : 'This permanently deletes the selected file and its database record. This action cannot be undone.'}
        noBtnName="Cancel"
        yesBtnName={busy ? 'Working…' : pending?.kind === 'restore' ? 'Restore' : pending?.kind === 'empty' ? 'Empty Trash' : 'Delete Permanently'}
        yesBtnStyle="bg-red-700 hover:bg-red-600"
        onClick={() => { void executeAction(); }}
      >
        <p className="text-sm text-stone-600">{pending?.kind === 'empty' ? `Permanently delete all ${documents.length} document(s) in Trash?` : pending?.document?.filename || 'This document'}</p>
      </DialogBox>

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="PDF preview">
        <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="truncate font-semibold">{preview.filename}</h3><Button variant="outline" onClick={() => setPreview(null)}>Close preview</Button></div>
          <StudentFileViewer fileUrl={fileUrl} fileName={preview.filename || undefined} fileType="pdf" />
        </div>
      </div>}
    </div>
  );
}