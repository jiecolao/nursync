import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ChevronRight, File, FileArchive, FileCode2, FileImage,
  FileText, Folder, FolderOpen, HardDrive, LayoutGrid, List, RefreshCw,
  Search, Wifi, WifiOff, Upload, CheckCircle2, AlertCircle,
  X, MoreHorizontal, UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StudentFileViewer from '@/components/student-documents/StudentFileViewer';
import StudentImportDialog from './StudentImportDialog';
import { useDirectoryLive } from '@/hooks/use-directory-live';
import { useDirectoryStore, type DirectoryEntry } from '@/stores/directory-store';

type ViewMode = 'grid' | 'list';
type ImportPreviewItem = { path: string; valid: boolean; reason?: string; warning?: string; studentName?: string; category?: string };
type StudentSummary = {
  studentUuid: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
};
type PreviewFile = { entry: DirectoryEntry; studentUuid: string };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5151';

function formatBytes(bytes: number) {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function studentFolderNames(student: StudentSummary) {
  const lastName = student.lastName.trim();
  const firstName = student.firstName.trim();
  const middleName = student.middleName?.trim();
  return [
    `${lastName}, ${firstName}`,
    middleName ? `${lastName}, ${firstName} ${middleName}` : '',
    middleName ? `${lastName}, ${firstName} ${middleName.charAt(0)}.` : '',
  ].filter(Boolean).map(normalizeName);
}

function flattenEntries(items: DirectoryEntry[]): DirectoryEntry[] {
  return items.flatMap((item) => [
    item,
    ...(item.type === 'directory' ? flattenEntries(item.children ?? []) : []),
  ]);
}

function FileGlyph({ entry }: { entry: DirectoryEntry }) {
  if (entry.type === 'directory') return <Folder className="size-6 fill-emerald-100 text-primary" strokeWidth={1.6} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(entry.extension)) return <FileImage className="size-6 text-violet-600" strokeWidth={1.6} />;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(entry.extension)) return <FileText className="size-6 text-sky-700" strokeWidth={1.6} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(entry.extension)) return <FileArchive className="size-6 text-amber-600" strokeWidth={1.6} />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html'].includes(entry.extension)) return <FileCode2 className="size-6 text-primary" strokeWidth={1.6} />;
  return <File className="size-6 text-stone-500" strokeWidth={1.6} />;
}

export default function RecordsPage() {
  useDirectoryLive();
  const navigate = useNavigate();
  const tree = useDirectoryStore((state) => state.tree);
  const root = useDirectoryStore((state) => state.root);
  const connected = useDirectoryStore((state) => state.connected);
  const lastEventAt = useDirectoryStore((state) => state.lastEventAt);
  const [currentPath, setCurrentPath] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const importInput = useRef<HTMLInputElement>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDocumentImportOpen, setIsDocumentImportOpen] = useState(false);
  const [isStudentImportOpen, setIsStudentImportOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<globalThis.File[]>([]);
  const [importPaths, setImportPaths] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentLookupError, setStudentLookupError] = useState('');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      try {
        const response = await fetch('/api/student', { credentials: 'include' });
        if (!response.ok) throw new Error('Unable to load students for folder actions.');
        const data = await response.json() as StudentSummary[];
        if (!cancelled) {
          setStudents(data);
          setStudentLookupError('');
        }
      } catch (error) {
        if (!cancelled) setStudentLookupError(error instanceof Error ? error.message : 'Unable to load students for folder actions.');
      }
    };
    void loadStudents();
    return () => { cancelled = true; };
  }, []);

  const currentEntries = useMemo(() => {
    if (!currentPath) return tree;
    const find = (items: DirectoryEntry[]): DirectoryEntry | undefined => {
      for (const item of items) {
        if (item.path === currentPath) return item;
        if (item.children) {
          const result = find(item.children);
          if (result) return result;
        }
      }
      return undefined;
    };
    return find(tree)?.children ?? [];
  }, [tree, currentPath]);

  const visibleEntries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const entries = term ? flattenEntries(currentEntries) : currentEntries;
    return entries
      .filter((entry) => !term || entry.name.toLocaleLowerCase().includes(term) || entry.extension.includes(term))
      .sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
  }, [currentEntries, search]);

  const breadcrumbs = currentPath ? currentPath.split('/').map((name, index, parts) => ({
    name,
    path: parts.slice(0, index + 1).join('/'),
  })) : [];

  const totalFiles = useMemo(() => {
    const count = (items: DirectoryEntry[]): number => items.reduce((sum, item) =>
      sum + (item.type === 'file' ? 1 : count(item.children ?? [])), 0);
    return count(tree);
  }, [tree]);

  const totalFolders = useMemo(() => {
    const count = (items: DirectoryEntry[]): number => items.reduce((sum, item) =>
      sum + (item.type === 'directory' ? 1 + count(item.children ?? []) : 0), 0);
    return count(tree);
  }, [tree]);

  const prepareImport = async (selected: globalThis.File[]) => {
    setImportFiles(selected); setImportPreview([]); setImportMessage('');
    if (!selected.length) { setImportPaths([]); return; }
    const paths = selected.map((file) => file.webkitRelativePath.split('/').slice(1).join('/'));
    setImportPaths(paths); setImportBusy(true);
    try {
      const response = await fetch(API_URL + '/api/student-documents/import/preview', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not preview the selected folder.');
      setImportPreview(data.items || []);
    } catch (error) { setImportMessage(error instanceof Error ? error.message : 'Could not preview the selected folder.'); }
    finally { setImportBusy(false); }
  };

  const runImport = async () => {
    const validIndexes = importPreview.map((item, index) => item.valid ? index : -1).filter((index) => index >= 0);
    const skipped = importPreview.length - validIndexes.length;
    if (!validIndexes.length) return;
    setImportBusy(true); setImportMessage('');
    try {
      const body = new FormData();
      validIndexes.forEach((index) => body.append('files', importFiles[index], importFiles[index].name));
      body.append('paths', JSON.stringify(validIndexes.map((index) => importPaths[index])));
      const response = await fetch(API_URL + '/api/student-documents/import', { method: 'POST', credentials: 'include', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Array.isArray(data.invalid) ? data.invalid.map((item: { path?: string; reason?: string }) => `${item.path ?? 'File'}: ${item.reason ?? 'Invalid'}`).join(' | ') : '';
        throw new Error((typeof data.message === 'string' ? data.message : 'Document import failed.') + (details ? ` ${details}` : ''));
      }
      const succeeded = Number(data.count ?? 0);
      setImportMessage(`Processed ${importPreview.length} file(s): ${succeeded} succeeded, ${skipped} skipped, ${Math.max(0, validIndexes.length - succeeded)} failed.`);
      setImportFiles([]); setImportPaths([]); setImportPreview([]);
      if (importInput.current) importInput.current.value = '';
    } catch (error) {
      setImportMessage(`Processed ${importPreview.length} file(s): 0 succeeded, ${skipped} skipped, ${validIndexes.length} failed. ${error instanceof Error ? error.message : 'Document import failed.'}`);
    } finally { setImportBusy(false); }
  };

  const closeImport = () => {
    if (importBusy) return;
    setIsDocumentImportOpen(false);
    setImportFiles([]);
    setImportPaths([]);
    setImportPreview([]);
    setImportMessage('');
    if (importInput.current) importInput.current.value = '';
  };

  const goToFolder = (entry: DirectoryEntry) => {
    if (entry.type !== 'directory') return;
    const folderName = entry.name.trim();
    if (!currentPath && (/^BATCH\s+\d{4}$/i.test(folderName) || /^NON-GRADUATE$/i.test(folderName))) {
      const batchNo = /^NON-GRADUATE$/i.test(folderName) ? 'NON-GRADUATE' : folderName.replace(/^BATCH\s+/i, '');
      navigate('/records/' + encodeURIComponent(batchNo));
      return;
    }
    const student = studentForFolder(folderName);
    const batchFolder = currentPath.split('/')[0] ?? '';
    if (student && (/^BATCH\s+\d{4}$/i.test(batchFolder) || /^NON-GRADUATE$/i.test(batchFolder))) {
      const batchNo = /^NON-GRADUATE$/i.test(batchFolder) ? 'NON-GRADUATE' : batchFolder.replace(/^BATCH\s+/i, '');
      navigate('/records/' + encodeURIComponent(batchNo) + '/' + student.studentUuid);
      return;
    }
    setCurrentPath(entry.path);
    setSearch('');
  };

  const studentForFolder = (folderName: string) =>
    students.find((student) => studentFolderNames(student).includes(normalizeName(folderName)));

  const studentForEntry = (entry: DirectoryEntry) => {
    const folderName = entry.path.split('/')[0];
    return studentForFolder(folderName);
  };

  const previewEntry = (entry: DirectoryEntry) => {
    if (entry.type === 'directory' || !['pdf', 'txt'].includes(entry.extension)) return;
    const student = studentForEntry(entry);
    if (student) setPreviewFile({ entry, studentUuid: student.studentUuid });
  };

  const activateEntry = (entry: DirectoryEntry) => {
    if (entry.type === 'directory') {
      goToFolder(entry);
    } else {
      previewEntry(entry);
    }
  };

  const fileUrl = previewFile
    ? `/api/students/${encodeURIComponent(previewFile.studentUuid)}/documents/file?path=${encodeURIComponent(`Database/Students/${previewFile.entry.path}`)}`
    : '';

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-6 text-secondary shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-12 size-44 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
              <HardDrive className="size-3.5" /> STUDENT RECORDS STORAGE
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Directory</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-secondary/75">
              Browse your files and folders in one place. Changes on disk appear here automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs sm:self-auto">
            {connected ? <Wifi className="size-4 text-emerald-200" /> : <WifiOff className="size-4 text-amber-200" />}
            <span>{connected ? 'Live sync connected' : 'Connecting to live sync'}</span>
            <span className={`size-2 rounded-full ${connected ? 'bg-emerald-300' : 'animate-pulse bg-amber-300'}`} />
          </div>
        </div>
      </section> */}

      {/* <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-sm text-stone-500"><span>Files</span><FileText className="size-4" /></div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{totalFiles.toLocaleString()}</div>
          <div className="mt-1 text-xs text-stone-500">Across all folders</div>
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-sm text-stone-500"><span>Folders</span><FolderOpen className="size-4" /></div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{totalFolders.toLocaleString()}</div>
          <div className="mt-1 text-xs text-stone-500">Organized directory tree</div>
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-white p-4">
          <div className="flex items-center justify-between text-sm text-stone-500"><span>Watcher status</span><Activity className="size-4" /></div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-primary">{connected ? 'Operational' : 'Reconnecting…'}</div>
          <div className="mt-1 truncate text-xs text-stone-500">{lastEventAt ? `Updated ${formatDate(lastEventAt)}` : 'Waiting for filesystem events'}</div>
        </div>
      </section> */}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h3 className="font-semibold text-stone-900">Student Records</h3>
              <p className="mt-1 text-xs text-stone-500">{root || 'Loading watched directory…'}</p>
            </div>
              <Button type="button" onClick={() => setIsImportOpen(true)} disabled={importBusy} className="ml-auto shrink-0"><Upload className="mr-2 size-4" />Import</Button>
            <div className="flex items-center gap-2 self-start rounded-lg border border-stone-200 bg-secondary/60 p-1">
              <Button type="button" variant={view === 'grid' ? 'default' : 'ghost'} size="icon" aria-label="Grid view" onClick={() => setView('grid')}><LayoutGrid className="size-4" /></Button>
              <Button type="button" variant={view === 'list' ? 'default' : 'ghost'} size="icon" aria-label="List view" onClick={() => setView('list')}><List className="size-4" /></Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
              <button type="button" onClick={() => { setCurrentPath(''); setSearch(''); }} className={`shrink-0 rounded px-2 py-1.5 font-medium hover:bg-secondary ${!currentPath ? 'text-primary' : 'text-stone-500'}`}>Database</button>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.path} className="flex shrink-0 items-center gap-1">
                  <ChevronRight className="size-3.5 text-stone-400" />
                  <button type="button" onClick={() => { setCurrentPath(crumb.path); setSearch(''); }} className={`max-w-36 truncate rounded px-1 py-1.5 hover:bg-secondary ${crumb.path === currentPath ? 'font-semibold text-primary' : 'text-stone-500'}`}>{crumb.name}</button>
                </span>
              ))}
            </nav>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files and folders…" className="pl-9" aria-label="Search files and folders" />
            </div>
          </div>
        </div>

        {studentLookupError && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">{studentLookupError}</p>}
        {visibleEntries.length ? view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
            {visibleEntries.map((entry) => (
              <div key={entry.path} onClick={() => activateEntry(entry)} className={`group flex min-w-0 items-start gap-3 rounded-xl border border-stone-200/80 p-4 text-left transition hover:border-primary/30 hover:bg-secondary/50 ${entry.type === 'directory' || ['pdf', 'txt'].includes(entry.extension) ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary transition group-hover:bg-emerald-100"><FileGlyph entry={entry} /></div>
                <button type="button" onClick={(event) => { event.stopPropagation(); activateEntry(entry); }} disabled={entry.type !== 'directory' && !['pdf', 'txt'].includes(entry.extension)} className="min-w-0 flex-1 text-left disabled:cursor-default">
                  <div className="truncate text-sm font-medium text-stone-800" title={entry.name}>{entry.name}</div>
                  {/* <div className="mt-1 text-xs text-stone-500">{entry.type === 'directory' ? `${entry.children?.length ?? 0} items` : formatBytes(entry.size)}</div> */}
                  <div className="mt-2 truncate text-[11px] text-stone-400">{formatDate(entry.modifiedAt)}</div>
                </button>
                {entry.type === 'directory' && studentForFolder(entry.name) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${entry.name}`} onClick={(event) => event.stopPropagation()} />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/records/' + encodeURIComponent(/^NON-GRADUATE$/i.test(currentPath.split('/')[0] ?? '') ? 'NON-GRADUATE' : (currentPath.split('/')[0] ?? '').replace(/^BATCH\s+/i, '')) + '/' + (studentForFolder(entry.name)?.studentUuid ?? ''))}><UserRound className="size-4" />See Student</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : entry.type === 'directory' ? (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); goToFolder(entry); }}
                    className="mt-1 shrink-0 rounded text-stone-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label={`Open ${entry.name}`}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-secondary/55 text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Size</th><th className="px-5 py-3">Last modified</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleEntries.map((entry) => (
                  <tr key={entry.path} className="group hover:bg-secondary/40">
                    <td className="px-5 py-3"><button type="button" disabled={entry.type !== 'directory' && !['pdf', 'txt'].includes(entry.extension)} onClick={() => entry.type === 'directory' ? goToFolder(entry) : previewEntry(entry)} className="flex max-w-sm items-center gap-3 text-left disabled:cursor-default"><FileGlyph entry={entry} /><span className="truncate font-medium text-stone-800">{entry.name}</span></button></td>
                    <td className="px-5 py-3 text-stone-500">{entry.type === 'directory' ? 'Folder' : entry.extension ? `.${entry.extension}` : 'File'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-stone-600">{entry.type === 'directory' ? '—' : formatBytes(entry.size)}</td>
                    <td className="px-5 py-3 text-stone-500"><div className="flex items-center justify-between gap-3">{formatDate(entry.modifiedAt)}{entry.type === 'directory' && studentForFolder(entry.name) && <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${entry.name}`} />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/students/profile/${studentForFolder(entry.name)?.studentUuid}`)}><UserRound className="size-4" />See Student</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary"><FolderOpen className="size-7 text-primary/70" /></div>
            <h4 className="mt-4 font-semibold text-stone-800">{search ? 'No matching files' : 'This folder is empty'}</h4>
            <p className="mt-1 max-w-sm text-sm text-stone-500">{search ? 'Try another search term or browse a different folder.' : 'New files and folders will appear here as soon as they are created.'}</p>
            {search && <Button variant="outline" className="mt-4" onClick={() => setSearch('')}><RefreshCw className="mr-2 size-4" />Clear search</Button>}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-stone-100 bg-secondary/35 px-4 py-3 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'item' : 'items'}{search ? ' matching your search' : ''}</span>
          {/* <span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-600' : 'bg-amber-500'}`} />{connected ? 'Changes sync automatically' : 'Live updates reconnect automatically'}</span> */}
        </div>
      </section>

      {isImportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="records-import-choice-title" className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div><h3 id="records-import-choice-title" className="text-xl font-semibold">Import Records</h3><p className="mt-2 text-sm text-muted-foreground">Choose what you want to import.</p></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsImportOpen(false)} aria-label="Close import choices"><X className="size-4" /></Button>
            </div>
            <div className="mt-5 grid gap-3">
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => { setIsImportOpen(false); setIsStudentImportOpen(true); }}>
                <UserRound className="mr-3 size-5 shrink-0" /><span><span className="block font-semibold">Import Students</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Create student records from a CSV or Excel file.</span></span>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => { setIsImportOpen(false); setIsDocumentImportOpen(true); }}>
                <FolderOpen className="mr-3 size-5 shrink-0" /><span><span className="block font-semibold">Import Student Documents</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Import PDFs grouped by batch, student, and category.</span></span>
              </Button>
            </div>
          </section>
        </div>
      )}
      <StudentImportDialog open={isStudentImportOpen} onOpenChange={setIsStudentImportOpen} onComplete={() => { void fetch('/api/student', { credentials: 'include' }).then((response) => response.ok ? response.json() : []).then(setStudents).catch(() => undefined); }} />
      {isDocumentImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="directory-import-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="directory-import-title" className="text-xl font-semibold">Import Student Documents</h3>
                <p className="mt-2 text-sm text-muted-foreground">Choose an import directory containing BATCH [YEAR] or NON-GRADUATE / Student / Category / PDF files. Invalid files are skipped and summarized.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={closeImport} disabled={importBusy} aria-label="Close import dialog">
                <X className="size-4" />
              </Button>
            </div>

            <div className="my-5 rounded-xl border border-dashed border-stone-300 bg-secondary/30 p-5">
              <input ref={importInput} type="file" multiple className="hidden" aria-label="Choose student folder for bulk import" {...({ webkitdirectory: '', directory: '' } as any)} onChange={(event) => void prepareImport(Array.from(event.target.files ?? []))} />
              <div className="flex flex-col items-center text-center">
                <FolderOpen className="size-10 text-primary" />
                <p className="mt-3 font-medium text-stone-800">Select the import directory</p>
                <p className="mt-1 text-sm text-muted-foreground">Expected structure: BATCH [YEAR] / Student / Category / PDF.</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => importInput.current?.click()} disabled={importBusy}>
                  <FolderOpen className="mr-2 size-4" />Choose Directory
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 text-sm text-stone-600">
              <p className="font-medium text-stone-800">Folder structure and naming guide</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Use <code>BATCH 2021</code> (graduation year) or <code>NON-GRADUATE</code> as the first folder.</li>
                <li>Inside the batch folder, use student folders named <code>LAST NAME, First Name Middle Name</code>, then one of the five database category names.</li>
                <li>Put PDF files directly inside the category folder. Student and batch must already exist and match the database.</li>
                <li>Invalid rows are skipped. Existing files at the same destination are overwritten; successful imports create or update database rows and are audited.</li>
              </ol>
            </div>

            {importBusy && <p className="mt-3 text-sm text-stone-500">Validating or importing folder contents...</p>}
            {importMessage && <p role="status" className="mt-3 text-sm text-stone-700">{importMessage}</p>}
            {importPreview.length > 0 && <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium text-stone-800">{importPreview.length} files · {importPreview.filter((item) => item.valid).length} valid · {importPreview.filter((item) => item.warning).length} warnings · {importPreview.filter((item) => !item.valid).length} need attention</span><Button type="button" onClick={() => void runImport()} disabled={importBusy || !importPreview.some((item) => item.valid)}><Upload className="mr-2 size-4" />Import valid files</Button></div>
              <div className="max-h-72 overflow-auto rounded-lg border border-stone-200"><table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-secondary text-xs uppercase text-stone-500"><tr><th className="px-3 py-2">File path</th><th className="px-3 py-2">Student / category</th><th className="px-3 py-2">Validation</th></tr></thead>
                <tbody className="divide-y divide-stone-100">{importPreview.map((item, index) => <tr key={item.path + '-' + index}><td className="max-w-64 break-all px-3 py-2 text-stone-600">{item.path}</td><td className="px-3 py-2">{item.valid ? <>{item.studentName}<div className="text-xs text-stone-500">{item.category}</div></> : '—'}</td><td className="px-3 py-2">{item.valid ? item.warning ? <span className="inline-flex items-start gap-1 text-amber-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{item.warning}</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-4" />Valid</span> : <span className="inline-flex items-start gap-1 text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{item.reason}</span>}</td></tr>)}</tbody>
              </table></div>
            </div>}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={importBusy} onClick={closeImport}>Cancel</Button>
              <Button type="button" disabled={importBusy || importPreview.length === 0 || !importPreview.some((item) => item.valid)} onClick={() => void runImport()}>
                {importBusy ? "Importing..." : `Import ${importPreview.length || ""} Files`}
              </Button>
            </div>
          </section>
        </div>
      )}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="File preview">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" onClick={() => setPreviewFile(null)}>Close preview</Button>
            </div>
            <StudentFileViewer
              fileUrl={fileUrl}
              fileName={previewFile.entry.name}
              fileType={previewFile.entry.extension === 'txt' ? 'txt' : 'pdf'}
            />
          </div>
        </div>
      )}
    </div>
  );
}