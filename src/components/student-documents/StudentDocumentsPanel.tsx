import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FileText, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentFileUploader from './StudentFileUploader';
import StudentFileViewer from './StudentFileViewer';
import { DialogBox } from '../layout/DialogBox';

const CATEGORIES = [
  'Personal Records',
  'Academic Records',
  'Clinical Records',
  'Completion and Certification Records',
  'Others',
] as const;
type DocumentRecord = {
  studentDocId: string;
  docuId: number;
  filename: string | null;
  filepath: string | null;
  submittedAt: string | null;
  documentStatus?: { docuStatusName: string } | null;
  documentCategories?: { docuName: string } | null;
};
type Category = { name: string; count: number; documents: DocumentRecord[] };

export default function StudentDocumentsPanel({
  studentUuid,
  isArchived = false,
}: {
  studentUuid: string;
  isArchived?: boolean;
}) {
  const [categories, setCategories] = useState<Category[]>(
    CATEGORIES.map((name) => ({ name, count: 0, documents: [] })),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentRecord | null>(null);
  const [documentToRemove, setDocumentToRemove] =
    useState<DocumentRecord | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [completionByStudent, setCompletionByStudent] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const stored = localStorage.getItem('nursync:student-record-completion');
      return stored ? JSON.parse(stored) as Record<string, Record<string, boolean>> : {};
    } catch {
      return {};
    }
  });

  const toggleCategoryCompletion = (categoryName: string, completed: boolean) => {
    setCompletionByStudent((current) => {
      const next = {
        ...current,
        [studentUuid]: {
          ...current[studentUuid],
          [categoryName]: completed,
        },
      };
      try {
        localStorage.setItem('nursync:student-record-completion', JSON.stringify(next));
      } catch {
        setError('Unable to save record completion status in this browser.');
      }
      return next;
    });
  };

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentUuid)}/documents`,
        { credentials: 'include' },
      );
      if (!response.ok) throw new Error('Unable to load student documents.');
      const payload = await response.json();
      setCategories(
        CATEGORIES.map(
          (name) =>
            payload.categories?.find((c: Category) => c.name === name) ?? {
              name,
              count: 0,
              documents: [],
            },
        ),
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load documents.');
    } finally {
      setLoading(false);
    }
  }, [studentUuid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  const completedCategoryCount = CATEGORIES.filter(
    (name) => Boolean(completionByStudent[studentUuid]?.[name]),
  ).length;
  const completionPercent = Math.round((completedCategoryCount / CATEGORIES.length) * 100);
  const totalDocumentCount = categories.reduce((total, category) => total + category.count, 0);

  const fileUrl = useMemo(
    () =>
      preview?.filepath
        ? `/api/students/${encodeURIComponent(studentUuid)}/documents/file?path=${encodeURIComponent(preview.filepath)}`
        : '',
    [preview],
  );

  const remove = async (doc: DocumentRecord) => {
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentUuid)}/documents/${encodeURIComponent(doc.studentDocId)}`,
        { method: 'DELETE', credentials: 'include' },
      );

      if (!response.ok) {
        setError('Unable to delete document.');
        return;
      }

      await refresh();
    } catch (err) {
      setError('Unable to delete document.');
    }
  };

  return (
    <section id="student-documents" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Student Documents
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Manage submissions and track completion by record category.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
              <FileText className="size-4 text-slate-400" />
              {totalDocumentCount} {totalDocumentCount === 1 ? 'file' : 'files'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums ${completedCategoryCount === CATEGORIES.length ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700'}`}
              role="status"
              aria-live="polite"
              aria-label={`${completedCategoryCount} of ${CATEGORIES.length} record categories completed`}
            >
              <CheckCircle2 className="size-4" />
              {completedCategoryCount}/{CATEGORIES.length} Completed
            </span>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
            <span className="text-slate-500">Overall completion</span>
            <span className="tabular-nums text-slate-700">{completionPercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Record category completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercent}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${completionPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading documents…
        </p>
      ) : (
        categories.map((category) => (
          <article
            key={category.name}
            id={`documents-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 transition-colors ${completionByStudent[studentUuid]?.[category.name] ? "border-emerald-100 bg-emerald-50/80" : "border-slate-100 bg-slate-50/70"}`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{category.name}</h3>
                  {completionByStudent[studentUuid]?.[category.name] && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" role="status">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {category.count} document{category.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                {!isArchived && !completionByStudent[studentUuid]?.[category.name] && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setUploadCategory(
                        uploadCategory === category.name ? null : category.name,
                      )
                    }
                  >
                    <UploadCloud className="mr-2 size-4" />
                    Upload
                  </Button>
                )}
                {!isArchived && (
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                      completionByStudent[studentUuid]?.[category.name]
                        ? 'border-emerald-200 text-emerald-700 '
                        : 'border-slate-200 bg-white/80 text-slate-700 hover:border-emerald-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-emerald-600"
                      checked={Boolean(completionByStudent[studentUuid]?.[category.name])}
                      onChange={(event) => toggleCategoryCompletion(category.name, event.target.checked)}
                      aria-label={`Mark ${category.name} complete`}
                    />
                    Complete
                  </label>
                )}
              </div>
            </div>
            {!isArchived && uploadCategory === category.name && (
              <div className="border-b p-4">
                <StudentFileUploader
                  studentUuid={studentUuid}
                  category={category.name}
                  onUploaded={() => {
                    setUploadCategory(null);
                    void refresh();
                  }}
                />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Filename</th>
                    <th className="px-5 py-3">Filepath</th>
                    <th className="px-5 py-3">Date submitted</th>
                    {/* <th className="px-5 py-3">Status</th> */}
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {category.documents.length ? (
                    category.documents.map((doc) => (
                      <tr
                        key={doc.studentDocId}
                        className="transition-colors hover:bg-slate-50"
                      >
                        <td className="max-w-[220px] px-5 py-3 font-medium text-slate-900">
                          <span
                            className="block truncate"
                            title={doc.filename || ''}
                          >
                            {doc.filename || 'Unnamed file'}
                          </span>
                        </td>
                        <td className="max-w-[240px] px-5 py-3 font-mono text-xs text-slate-500">
                          <span
                            className="block truncate"
                            title={doc.filepath || ''}
                          >
                            {doc.filepath || '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {doc.submittedAt
                            ? new Date(doc.submittedAt).toLocaleDateString()
                            : '—'}
                        </td>
                        {/* <td className="px-5 py-3">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {doc.documentStatus?.docuStatusName || 'Unknown'}
                          </span>
                        </td> */}
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View file"
                              onClick={() => setPreview(doc)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <a
                              className="inline-flex size-9 items-center justify-center rounded-md hover:bg-slate-100"
                              href={
                                doc.filepath
                                  ? `/api/students/${encodeURIComponent(studentUuid)}/documents/file?path=${encodeURIComponent(doc.filepath)}&download=1`
                                  : '#'
                              }
                              title="Download file"
                            >
                              <Download className="size-4" />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete file"
                              onClick={() => {
                                setDocumentToRemove(doc);
                                setIsOpen(true);
                              }}
                            >
                              <Trash2 className="size-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No documents in this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))
      )}
      {isOpen && (
        <DialogBox
          title="Move document to Trash?"
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setDocumentToRemove(null);
          }}
          onClick={() => {
            if (documentToRemove) void remove(documentToRemove);
          }}
          yesBtnName="Delete"
          yesBtnStyle="bg-red-700 hover:bg-red-600"
        >
          <p>
            Move {documentToRemove?.filename || 'this file'} to Database/Trash? Its record will be retained with status Trashed.
          </p>
        </DialogBox>
      )}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
        >
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close preview
              </Button>
            </div>
            <StudentFileViewer
              fileUrl={fileUrl}
              fileName={preview.filename || undefined}
              fileType={/\.txt$/i.test(preview.filename || '') ? 'txt' : 'pdf'}
            />
          </div>
        </div>
      )}
    </section>
  );
}
