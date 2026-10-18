import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Trash2, UploadCloud } from 'lucide-react';
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
}: {
  studentUuid: string;
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
  const fileUrl = useMemo(
    () =>
      preview?.filepath
        ? `/api/students/${encodeURIComponent(studentUuid)}/documents/file?path=${encodeURIComponent(preview.filepath)}`
        : '',
    [preview],
  );

  const remove = async (doc: DocumentRecord) => {
    const response = await fetch(
      `/api/students/${encodeURIComponent(studentUuid)}/documents/${encodeURIComponent(doc.studentDocId)}`,
      { method: 'DELETE', credentials: 'include' },
    );
    if (!response.ok) {
      setError('Unable to delete document.');
      return;
    }
    await refresh();
  };

  return (
    <section id="student-documents" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">
            Student Documents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Files are grouped by their directory category.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
          {categories.reduce((n, c) => n + c.count, 0)} files
        </span>
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
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {category.count} document{category.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
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
            </div>
            {uploadCategory === category.name && (
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
