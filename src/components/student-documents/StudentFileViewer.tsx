import { useEffect, useState } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2, LoaderCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { fileUrl: string; fileName?: string; fileType?: 'txt' | 'pdf' };

export default function StudentFileViewer({ fileUrl, fileName, fileType }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  const type = fileType ?? (/\.txt($|\?)/i.test(fileUrl) ? 'txt' : 'pdf');

  useEffect(() => { setLoading(true); setError(''); }, [fileUrl]);
  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2">
        <FileText className="size-4 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{fileName || 'Document preview'}</span>
        {type === 'pdf' && <>
          <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => setZoom(v => Math.max(50, v - 10))}><ZoomOut className="size-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums">{zoom}%</span>
          <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => setZoom(v => Math.min(200, v + 10))}><ZoomIn className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(100)}><Maximize2 className="mr-1 size-3" />Fit</Button>
        </>}
        <a href={fileUrl} download={fileName} className="inline-flex items-center rounded-md border px-3 py-2 text-sm"><Download className="mr-2 size-4" />Download</a>
      </header>
      <div className="relative min-h-[360px] flex-1 bg-slate-100">
        {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 text-sm text-slate-600"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Loading document…</div>}
        {error && <p role="alert" className="p-6 text-sm text-red-700">{error}</p>}
        {type === 'pdf' ? <iframe title={fileName || 'PDF preview'} src={fileUrl} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError('Unable to preview this PDF. Download it to open externally.'); }} className="h-[70vh] min-h-[360px] w-full border-0" style={{ zoom: zoom / 100 }} /> :
          <iframe title={fileName || 'Text preview'} src={fileUrl} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError('Unable to preview this file.'); }} className="h-[70vh] min-h-[360px] w-full border-0" />}
      </div>
    </section>
  );
}
