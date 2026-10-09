import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Activity, Archive, ArrowDownAZ, ChevronRight, Clock3, File, FileImage, FileText, Folder, FolderOpen, Grid2X2, HardDrive, LayoutList, LoaderCircle, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';

type Node = { name: string; path: string; type: 'file' | 'directory'; size: number; extension: string; modifiedAt: string; children?: Node[] };
type FsEvent = { event: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'; path: string; node?: Node };
const API = import.meta.env.VITE_API_URL || 'http://localhost:5151';
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1073741824 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1073741824).toFixed(1)} GB`;
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const byName = (a: Node, b: Node) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1;

function updateTree(root: Node | null, event: FsEvent): Node | null {
  if (!root) return root;
  if (event.event === 'unlink' || event.event === 'unlinkDir') {
    const remove = (parent: Node): Node => ({ ...parent, children: parent.children?.filter(child => child.path !== event.path).map(remove) });
    return remove(root);
  }
  if (!event.node) return root;
  const upsert = (parent: Node): Node => {
    if (parent.path === event.node!.path) return { ...event.node!, children: event.node!.type === 'directory' ? parent.children ?? [] : undefined };
    const children = parent.children?.map(upsert);
    const parentPath = event.node!.path.split('/').slice(0, -1).join('/');
    if (parent.path === parentPath) return { ...parent, children: [...(children ?? []).filter(item => item.path !== event.node!.path), event.node!].sort(byName) };
    return { ...parent, children };
  };
  return upsert(root);
}
function findNode(root: Node | null, path: string): Node | undefined {
  if (!root) return;
  if (root.path === path) return root;
  for (const child of root.children ?? []) { const found = findNode(child, path); if (found) return found; }
}
function allFiles(root: Node | null): Node[] {
  if (!root) return [];
  return (root.children ?? []).flatMap(child => child.type === 'directory' ? allFiles(child) : [child]);
}
function FileGlyph({ node, large = false }: { node: Node; large?: boolean }) {
  const size = large ? 29 : 19;
  if (node.type === 'directory') return <Folder size={size} strokeWidth={1.7} className="text-[#b18b45]" />;
  if (['png','jpg','jpeg','svg','webp','gif'].includes(node.extension)) return <FileImage size={size} className="text-violet-500" />;
  if (['pdf','doc','docx','txt','md'].includes(node.extension)) return <FileText size={size} className="text-blue-500" />;
  return <File size={size} className="text-slate-400" />;
}
function Sidebar({ current, onNavigate, root }: { current: string; onNavigate: (p: string) => void; root: Node | null }) {
  const folders = (root?.children ?? []).filter(item => item.type === 'directory');
  return <aside className="flex w-[248px] shrink-0 flex-col bg-[#025034] px-4 py-5 text-white max-md:hidden">
    <div className="flex items-center gap-3 px-2 pb-8"><div className="grid size-10 place-items-center rounded-xl bg-white/12"><Archive size={21}/></div><div><div className="text-lg font-semibold tracking-tight">Nursync</div><div className="text-[11px] text-white/55">FILE WORKSPACE</div></div></div>
    <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/45">Workspace</div>
    <button onClick={() => onNavigate('')} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${current === '' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/8'}`}><HardDrive size={17}/> All files <span className="ml-auto rounded-md bg-white/12 px-2 py-0.5 text-[11px]">{allFiles(root).length}</span></button>
    <button onClick={() => onNavigate('')} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/8"><Clock3 size={17}/> Recent</button>
    <div className="mt-7 flex items-center justify-between px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/45"><span>Folders</span><span>⌄</span></div>
    {folders.map(folder => <button key={folder.path} onClick={() => onNavigate(folder.path)} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${current === folder.path ? 'bg-white/15' : 'text-white/70 hover:bg-white/8'}`}><Folder size={15} className="text-[#e7c982]"/><span className="truncate">{folder.name}</span></button>)}
    <div className="mt-auto rounded-xl border border-white/15 bg-white/5 p-3.5"><div className="mb-2 flex items-center gap-2 text-xs text-white/85"><ShieldCheck size={15}/> Local storage</div><div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[38%] rounded-full bg-[#c6d8a8]"/></div><div className="mt-2 text-[10px] text-white/50">Your files stay on your server</div></div>
  </aside>;
}
function Breadcrumbs({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const parts = path ? path.split('/') : [];
  return <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm"><button onClick={() => onNavigate('')} className="shrink-0 text-slate-500 hover:text-[#025034]">My files</button>{parts.map((part,index) => { const target=parts.slice(0,index+1).join('/'); return <span key={target} className="flex min-w-0 items-center gap-1.5"><ChevronRight size={14} className="shrink-0 text-slate-300"/><button onClick={() => onNavigate(target)} className={`truncate ${index===parts.length-1?'font-semibold text-[#173e2e]':'text-slate-500 hover:text-[#025034]'}`}>{part}</button></span>; })}</div>;
}
function FileCard({ node, onOpen }: { node: Node; onOpen: (node: Node) => void }) {
  const [selected,setSelected] = useState(false);
  return <button onDoubleClick={() => onOpen(node)} onClick={() => setSelected(!selected)} className={`group rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9dbba9] hover:shadow-sm ${selected?'border-[#025034] bg-[#edf4ee]':'border-[#e9e7df] bg-white'}`}>
    <div className="mb-5 flex items-start justify-between"><div className="grid size-12 place-items-center rounded-xl bg-[#f6f3ec]"><FileGlyph node={node} large/></div><span className="rounded-md bg-[#f6f3ec] px-2 py-1 text-[10px] font-medium uppercase text-slate-500">{node.type==='directory'?'Folder':node.extension||'File'}</span></div>
    <div className="truncate text-[13px] font-semibold text-[#24372e]" title={node.name}>{node.name}</div><div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{node.type==='directory'?`${node.children?.length??'—'} items`:formatSize(node.size)}</span><span>{formatDate(node.modifiedAt)}</span></div>
  </button>;
}
export default function FileExplorerPage() {
  const [tree,setTree] = useState<Node|null>(null);
  const [activePath,setActivePath] = useState('');
  const [query,setQuery] = useState('');
  const [view,setView] = useState<'grid'|'list'>('grid');
  const [connected,setConnected] = useState(false);
  const [loading,setLoading] = useState(true);
  const [lastEvent,setLastEvent] = useState('Waiting for filesystem events');
  const [eventCount,setEventCount] = useState(0);
  const [error,setError] = useState('');
  const connect = useCallback(() => {
    const socket:Socket = io(API,{transports:['websocket','polling']});
    socket.on('connect',()=>setConnected(true)); socket.on('disconnect',()=>setConnected(false));
    socket.on('filesystem:initial',(initial:Node)=>{setTree(initial);setLoading(false);setError('');});
    socket.on('filesystem:event',(event:FsEvent)=>{setTree(previous=>updateTree(previous,event));setLastEvent(`${event.event==='addDir'?'Folder added':event.event==='unlinkDir'?'Folder removed':event.event==='unlink'?'File removed':event.event==='change'?'File updated':'File added'} · ${event.path.split('/').pop()}`);setEventCount(count=>count+1);});
    socket.on('filesystem:error',(payload:{message:string})=>setError(payload.message));
    return socket;
  },[]);
  useEffect(()=>{const socket=connect();return()=>{socket.disconnect();};},[connect]);
  const active = useMemo(()=>findNode(tree,activePath),[tree,activePath]);
  const entries = useMemo(()=>(active?.children??[]).filter(node=>node.name.toLowerCase().includes(query.trim().toLowerCase())).sort(byName),[active,query]);
  const totalFiles = allFiles(tree).length;
  const totalFolders = useMemo(()=>{let count=0;const walk=(node:Node|null)=>{(node?.children??[]).forEach(child=>{if(child.type==='directory'){count++;walk(child);}});};walk(tree);return count;},[tree]);
  const openNode = (node:Node)=>{if(node.type==='directory'){setActivePath(node.path);setQuery('');}};
  const refresh = () => {setLoading(true);fetch(`${API}/api/file-explorer/tree`).then(r=>{if(!r.ok)throw new Error('Request failed');return r.json();}).then(setTree).catch(()=>setError('Could not reach the file server.')).finally(()=>setLoading(false));};
  return <div className="flex min-h-screen bg-[#f6f3ec] text-[#23352c]">
    <Sidebar current={activePath} onNavigate={path=>{setActivePath(path);setQuery('');}} root={tree}/>
    <main className="min-w-0 flex-1">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e8e5dc] bg-white/80 px-8 max-md:px-4"><div className="min-w-0"><div className="text-[11px] text-slate-400">Workspace <span className="px-1.5">/</span> Files</div><div className="mt-1 text-lg font-semibold tracking-tight">File explorer</div></div><div className="flex items-center gap-3"><div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium ${connected?'bg-[#e7f2e9] text-[#17623e]':'bg-amber-50 text-amber-700'}`}><span className={`size-1.5 rounded-full ${connected?'animate-pulse bg-emerald-500':'bg-amber-500'}`}/>{connected?'Live sync on':'Connecting'}</div><div className="grid size-9 place-items-center rounded-full bg-[#e5eee6] text-xs font-semibold text-[#025034]">NS</div></div></header>
      <div className="mx-auto max-w-[1440px] p-8 max-md:p-4">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><div className="text-2xl font-semibold tracking-tight">Your files, in one place<span className="text-[#6e9a75]">.</span></div><p className="mt-1.5 text-sm text-slate-500">A clear view of your workspace, always up to date.</p></div><button onClick={refresh} className="flex items-center gap-2 rounded-lg border border-[#deded4] bg-white px-3 py-2.5 text-xs font-medium hover:bg-slate-50"><RefreshCw size={14}/> Refresh</button></div>
        <div className="mb-7 grid grid-cols-3 gap-4 max-sm:grid-cols-1"><div className="rounded-xl border border-[#e8e5dc] bg-white p-4"><div className="flex items-center justify-between text-xs text-slate-500">Total files <FileText size={16} className="text-[#659476]"/></div><div className="mt-3 text-2xl font-semibold">{totalFiles}</div><div className="mt-1 text-[11px] text-slate-400">Across all folders</div></div><div className="rounded-xl border border-[#e8e5dc] bg-white p-4"><div className="flex items-center justify-between text-xs text-slate-500">Folders <FolderOpen size={16} className="text-[#b18b45]"/></div><div className="mt-3 text-2xl font-semibold">{totalFolders}</div><div className="mt-1 text-[11px] text-slate-400">Organized in your workspace</div></div><div className="rounded-xl border border-[#e8e5dc] bg-white p-4"><div className="flex items-center justify-between text-xs text-slate-500">Live activity <Activity size={16} className="text-[#659476]"/></div><div className="mt-3 text-2xl font-semibold">{eventCount.toLocaleString()}</div><div className="mt-1 truncate text-[11px] text-slate-400">{lastEvent}</div></div></div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Breadcrumbs path={activePath} onNavigate={path=>{setActivePath(path);setQuery('');}}/><div className="flex items-center gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input id="file-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this folder..." className="w-60 rounded-lg border border-[#e4e1d8] bg-white py-2.5 pl-9 pr-8 text-xs outline-none focus:border-[#025034] max-sm:w-44"/>{query&&<button onClick={()=>setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13}/></button>}</div><div className="flex rounded-lg border border-[#e4e1d8] bg-white p-1"><button aria-label="Grid view" onClick={()=>setView('grid')} className={`rounded-md p-1.5 ${view==='grid'?'bg-[#e7f0e8] text-[#025034]':'text-slate-400'}`}><Grid2X2 size={15}/></button><button aria-label="List view" onClick={()=>setView('list')} className={`rounded-md p-1.5 ${view==='list'?'bg-[#e7f0e8] text-[#025034]':'text-slate-400'}`}><LayoutList size={15}/></button></div></div></div>
        <div className="overflow-hidden rounded-xl border border-[#e8e5dc] bg-white"><div className="flex items-center justify-between border-b border-[#eeece5] px-5 py-3.5"><div className="text-sm font-semibold">{activePath?activePath.split('/').pop():'All files'} <span className="ml-1.5 text-xs font-normal text-slate-400">{entries.length} items</span></div><div className="flex items-center gap-1.5 text-[11px] text-slate-400"><ArrowDownAZ size={14}/> Name</div></div>
          {error&&<div className="m-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error} <span className="text-red-500">· Check that the Nest server is running.</span></div>}
          {loading?<div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle size={18} className="animate-spin"/> Loading your files…</div>:entries.length===0?<div className="flex flex-col items-center py-16 text-center"><div className="mb-3 grid size-12 place-items-center rounded-2xl bg-[#f6f3ec]"><FolderOpen size={22} className="text-[#8aa58d]"/></div><div className="text-sm font-medium">{query?'No matching files':'This folder is empty'}</div><div className="mt-1 text-xs text-slate-400">{query?'Try another search term.':'Files added to the watched directory will appear here.'}</div></div>:view==='grid'?<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{entries.map(node=><FileCard key={node.path} node={node} onOpen={openNode}/>)}</div>:<div className="divide-y divide-[#f0eee8]">{entries.map(node=><button key={node.path} onDoubleClick={()=>openNode(node)} onClick={()=>node.type==='directory'&&openNode(node)} className="grid w-full grid-cols-[minmax(0,1fr)_110px_145px] items-center gap-4 px-5 py-3 text-left hover:bg-[#faf9f5] max-sm:grid-cols-[minmax(0,1fr)_80px]"><span className="flex min-w-0 items-center gap-3"><FileGlyph node={node}/><span className="truncate text-xs font-medium">{node.name}</span></span><span className="text-xs text-slate-400">{node.type==='directory'?'—':formatSize(node.size)}</span><span className="text-xs text-slate-400 max-sm:hidden">{formatDate(node.modifiedAt)}</span></button>)}</div>}
          <div className="flex items-center justify-between border-t border-[#eeece5] px-5 py-3 text-[11px] text-slate-400"><span>{entries.length} items shown</span><span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${connected?'bg-emerald-500':'bg-amber-400'}`}/>{connected?'Changes sync automatically':'Reconnecting to live sync'}</span></div></div>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-[#71947a]"/> Files are indexed locally by your Nursync server.</div>
      </div>
    </main>
  </div>;
}
