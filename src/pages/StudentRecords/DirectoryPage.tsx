import { useMemo, useState } from 'react';
import {
  Activity, ChevronRight, File, FileArchive, FileCode2, FileImage,
  FileText, Folder, FolderOpen, HardDrive, LayoutGrid, List, RefreshCw,
  Search, Wifi, WifiOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDirectoryLive } from '@/hooks/use-directory-live';
import { useDirectoryStore, type DirectoryEntry } from '@/stores/directory-store';

type ViewMode = 'grid' | 'list';

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

function FileGlyph({ entry }: { entry: DirectoryEntry }) {
  if (entry.type === 'directory') return <Folder className="size-6 fill-emerald-100 text-primary" strokeWidth={1.6} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(entry.extension)) return <FileImage className="size-6 text-violet-600" strokeWidth={1.6} />;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(entry.extension)) return <FileText className="size-6 text-sky-700" strokeWidth={1.6} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(entry.extension)) return <FileArchive className="size-6 text-amber-600" strokeWidth={1.6} />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html'].includes(entry.extension)) return <FileCode2 className="size-6 text-primary" strokeWidth={1.6} />;
  return <File className="size-6 text-stone-500" strokeWidth={1.6} />;
}

export default function DirectoryPage() {
  useDirectoryLive();
  const tree = useDirectoryStore((state) => state.tree);
  const root = useDirectoryStore((state) => state.root);
  const connected = useDirectoryStore((state) => state.connected);
  const lastEventAt = useDirectoryStore((state) => state.lastEventAt);
  const [currentPath, setCurrentPath] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');

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
    return currentEntries
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

  const goToFolder = (entry: DirectoryEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
      setSearch('');
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-6 text-secondary shadow-sm sm:px-8">
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
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h3 className="font-semibold text-stone-900">All files</h3>
              <p className="mt-1 text-xs text-stone-500">{root || 'Loading watched directory…'}</p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-lg border border-stone-200 bg-secondary/60 p-1">
              <Button type="button" variant={view === 'grid' ? 'default' : 'ghost'} size="icon" aria-label="Grid view" onClick={() => setView('grid')}><LayoutGrid className="size-4" /></Button>
              <Button type="button" variant={view === 'list' ? 'default' : 'ghost'} size="icon" aria-label="List view" onClick={() => setView('list')}><List className="size-4" /></Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
              <button type="button" onClick={() => { setCurrentPath(''); setSearch(''); }} className={`shrink-0 rounded px-2 py-1.5 font-medium hover:bg-secondary ${!currentPath ? 'text-primary' : 'text-stone-500'}`}>Root</button>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.path} className="flex shrink-0 items-center gap-1">
                  <ChevronRight className="size-3.5 text-stone-400" />
                  <button type="button" onClick={() => { setCurrentPath(crumb.path); setSearch(''); }} className={`max-w-36 truncate rounded px-1 py-1.5 hover:bg-secondary ${crumb.path === currentPath ? 'font-semibold text-primary' : 'text-stone-500'}`}>{crumb.name}</button>
                </span>
              ))}
            </nav>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this folder…" className="pl-9" aria-label="Search files and folders" />
            </div>
          </div>
        </div>

        {visibleEntries.length ? view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
            {visibleEntries.map((entry) => (
              <button key={entry.path} type="button" onClick={() => goToFolder(entry)} disabled={entry.type !== 'directory'}
                className={`group flex min-w-0 items-start gap-3 rounded-xl border border-stone-200/80 p-4 text-left transition hover:border-primary/30 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${entry.type === 'directory' ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary transition group-hover:bg-emerald-100"><FileGlyph entry={entry} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-stone-800" title={entry.name}>{entry.name}</div>
                  <div className="mt-1 text-xs text-stone-500">{entry.type === 'directory' ? `${entry.children?.length ?? 0} items` : formatBytes(entry.size)}</div>
                  <div className="mt-2 truncate text-[11px] text-stone-400">{formatDate(entry.modifiedAt)}</div>
                </div>
                {entry.type === 'directory' && <ChevronRight className="mt-1 size-4 shrink-0 text-stone-300 group-hover:text-primary" />}
              </button>
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
                    <td className="px-5 py-3"><button type="button" disabled={entry.type !== 'directory'} onClick={() => goToFolder(entry)} className="flex max-w-sm items-center gap-3 text-left disabled:cursor-default"><FileGlyph entry={entry} /><span className="truncate font-medium text-stone-800">{entry.name}</span></button></td>
                    <td className="px-5 py-3 text-stone-500">{entry.type === 'directory' ? 'Folder' : entry.extension ? `.${entry.extension}` : 'File'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-stone-600">{entry.type === 'directory' ? '—' : formatBytes(entry.size)}</td>
                    <td className="px-5 py-3 text-stone-500">{formatDate(entry.modifiedAt)}</td>
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
          <span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-600' : 'bg-amber-500'}`} />{connected ? 'Changes sync automatically' : 'Live updates reconnect automatically'}</span>
        </div>
      </section>
    </div>
  );
}