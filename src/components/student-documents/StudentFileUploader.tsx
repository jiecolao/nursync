import { useState, type ChangeEvent } from 'react';
import { Upload, X, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { studentUuid: string; category: string; onUploaded?: () => void };

export default function StudentFileUploader({ studentUuid, category, onUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    if (!files.length) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const body = new FormData();
      files.forEach(file => body.append('files', file));
      const response = await fetch(`/api/students/${encodeURIComponent(studentUuid)}/documents/upload?category=${encodeURIComponent(category)}`, {
        method: 'POST', credentials: 'include', body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Upload failed.');
      setSuccess(`${files.length} file(s) uploaded.`); setFiles([]); onUploaded?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-3 rounded-lg border bg-white p-4">
    <label className="block text-sm font-medium">Upload to {category}
      <input className="mt-2 block w-full rounded-md border p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white" type="file" multiple onChange={(e: ChangeEvent<HTMLInputElement>) => { setFiles(Array.from(e.target.files || [])); setError(''); setSuccess(''); }} />
    </label>
    {files.length > 0 && <div className="flex items-center justify-between text-sm text-slate-600"><span>{files.length} selected</span><button type="button" onClick={() => setFiles([])} aria-label="Clear selected files"><X className="size-4" /></button></div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
    <Button type="button" onClick={submit} disabled={!files.length || busy}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}{busy ? 'Uploading…' : 'Upload files'}</Button>
  </div>;
}
