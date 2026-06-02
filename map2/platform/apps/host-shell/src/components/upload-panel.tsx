'use client';

/**
 * Mission upload panel (SRS §8).
 *
 * Drag-drop or browse multiple images → POST `/uploads/initiate` to get
 * pre-signed PUT URLs → each file is PUT directly to MinIO with progress
 * tracking → SHA-256 is computed client-side via SubtleCrypto → on
 * completion the manifest is sent to `/uploads/missions/:id/complete`.
 *
 * Resumability: storageKey + checksum for every successfully-uploaded file
 * is persisted to localStorage so a refresh resumes from where we stopped.
 * If `/complete` fails the cache is preserved so the user can retry without
 * re-PUTting bytes.
 */
import { RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'dng'];
const MAX_FILE_BYTES = 500 * 1024 * 1024;

type Status = 'pending' | 'uploading' | 'done' | 'failed' | 'skipped';

interface FileSlot {
  file: File;
  status: Status;
  progress: number;
  storageKey?: string;
  checksum?: string;
  error?: string;
}

interface CompletionSummary {
  imagesIngested: number;
  totalImages: number;
  rawSizeBytes: number;
  imagesMissingGps: number;
}

interface ErrorState {
  message: string;
  correlationId?: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const k = 1024;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / k;
  let unit = 0;
  while (value >= k && unit < units.length - 1) {
    value /= k;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

async function computeSha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function putWithProgress(
  url: string,
  body: ArrayBuffer | Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });
}

interface Props {
  missionId: string;
  ingestedCount?: number;
}

export function UploadPanel({ missionId, ingestedCount = 0 }: Props): React.ReactElement {
  const router = useRouter();
  const [slots, setSlots] = useState<FileSlot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [cachedCount, setCachedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheKey = `upload:${missionId}`;

  // If the backend says no images are ingested for this mission but
  // localStorage still has cached entries, that cache is stale (the prior
  // ingestion never succeeded) — invalidate it so the user starts fresh.
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) ?? '{}');
      const count = Object.keys(cached).length;
      if (count > 0 && ingestedCount === 0) {
        localStorage.removeItem(cacheKey);
        setCachedCount(0);
      } else {
        setCachedCount(count);
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey, ingestedCount]);

  function addFiles(incoming: FileList | File[]): void {
    const list = Array.from(incoming);
    const validated: FileSlot[] = list.map((file) => {
      const ext = extensionOf(file.name);
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return { file, status: 'failed' as Status, progress: 0, error: `Unsupported format: .${ext || 'unknown'}` };
      }
      if (file.size > MAX_FILE_BYTES) {
        return { file, status: 'failed' as Status, progress: 0, error: 'File exceeds 500 MB' };
      }
      return { file, status: 'pending' as Status, progress: 0 };
    });
    setSlots((previous) => [...previous, ...validated]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  function onBrowse(event: ChangeEvent<HTMLInputElement>): void {
    if (event.target.files) addFiles(event.target.files);
  }

  function resetState(): void {
    localStorage.removeItem(cacheKey);
    setCachedCount(0);
    setSlots([]);
    setError(null);
    setSummary(null);
    toast.success('Upload state cleared');
  }

  async function start(): Promise<void> {
    setRunning(true);
    setSummary(null);
    setError(null);

    const pending = slots.filter((slot) => slot.status === 'pending');
    const cached: Record<string, { storageKey: string; checksum: string }> = JSON.parse(
      localStorage.getItem(cacheKey) ?? '{}',
    );

    try {
      // Only initiate for actually-pending files; cached files are
      // re-submitted to `/complete` directly.
      let accepted: Array<{ fileName: string; storageKey: string; uploadUrl: string }> = [];
      if (pending.length > 0) {
        const descriptors = pending.map((slot) => ({
          fileName: slot.file.name,
          sizeBytes: slot.file.size,
          contentType: slot.file.type || 'image/jpeg',
        }));
        const initiateRes = await fetch('/api/proxy/uploads/initiate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ missionId, files: descriptors }),
        });
        if (!initiateRes.ok) {
          const err = (await initiateRes.json().catch(() => ({}))) as { message?: string; correlationId?: string };
          throw new UploadError(err.message ?? 'Could not initiate upload', err.correlationId);
        }
        const initiate = (await initiateRes.json()) as {
          accepted: typeof accepted;
          rejected: Array<{ fileName: string; reason: string }>;
        };
        accepted = initiate.accepted;
        setSlots((previous) =>
          previous.map((slot) => {
            const rejection = initiate.rejected.find((r) => r.fileName === slot.file.name);
            return rejection
              ? { ...slot, status: 'failed' as Status, error: rejection.reason }
              : slot;
          }),
        );

        for (const item of accepted) {
          const slot = slots.find((s) => s.file.name === item.fileName);
          if (!slot) continue;
          try {
            setSlots((previous) =>
              previous.map((s) =>
                s.file.name === item.fileName
                  ? { ...s, status: 'uploading' as Status, progress: 0 }
                  : s,
              ),
            );
            const checksum = await computeSha256Hex(slot.file);
            await putWithProgress(item.uploadUrl, slot.file, (percent) => {
              setSlots((previous) =>
                previous.map((s) =>
                  s.file.name === item.fileName ? { ...s, progress: percent } : s,
                ),
              );
            });
            cached[item.fileName] = { storageKey: item.storageKey, checksum };
            localStorage.setItem(cacheKey, JSON.stringify(cached));
            setSlots((previous) =>
              previous.map((s) =>
                s.file.name === item.fileName
                  ? {
                      ...s,
                      status: 'done' as Status,
                      progress: 100,
                      storageKey: item.storageKey,
                      checksum,
                    }
                  : s,
              ),
            );
          } catch (uploadError) {
            setSlots((previous) =>
              previous.map((s) =>
                s.file.name === item.fileName
                  ? {
                      ...s,
                      status: 'failed' as Status,
                      error:
                        uploadError instanceof Error
                          ? uploadError.message
                          : 'Upload failed',
                    }
                  : s,
              ),
            );
          }
        }
      }

      const completedFiles = Object.entries(cached).map(([fileName, value]) => ({
        fileName,
        storageKey: value.storageKey,
        checksumSha256: value.checksum,
      }));
      if (completedFiles.length === 0) {
        return;
      }

      const completeRes = await fetch(`/api/proxy/uploads/missions/${missionId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: completedFiles }),
      });
      if (!completeRes.ok) {
        const body = (await completeRes.json().catch(() => ({}))) as {
          message?: string;
          correlationId?: string;
        };
        throw new UploadError(body.message ?? 'Ingestion failed', body.correlationId);
      }
      const result = (await completeRes.json()) as CompletionSummary;
      setSummary(result);
      localStorage.removeItem(cacheKey);
      setCachedCount(0);
      toast.success(`Ingested ${result.imagesIngested} image(s)`, {
        description: `Mission has ${result.totalImages} file(s) ready for processing.`,
      });
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unexpected error during upload';
      const correlationId =
        caught instanceof UploadError ? caught.correlationId : undefined;
      setError({ message, correlationId });
      toast.error('Upload failed', { description: message });
    } finally {
      setRunning(false);
    }
  }

  const cachedNeedsIngest = cachedCount > 0 && summary === null;
  const startDisabled =
    running ||
    (slots.every((slot) => slot.status !== 'pending') && !cachedNeedsIngest);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
        }`}
      >
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UploadCloud size={20} />
        </div>
        <p className="text-sm text-slate-700">
          Drop drone imagery here, or{' '}
          <button
            type="button"
            className="text-brand-600 underline"
            onClick={() => inputRef.current?.click()}
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Accepted: {ACCEPTED_EXTENSIONS.join(', ')} · up to 500 MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.tif,.tiff,.dng"
          className="hidden"
          onChange={onBrowse}
        />
      </div>

      {cachedNeedsIngest && slots.length === 0 && (
        <Alert tone="info" title="Resume previous upload">
          {cachedCount} file(s) were uploaded but not yet ingested. Click{' '}
          <span className="font-medium">Retry ingestion</span> to finish, or{' '}
          <button
            onClick={resetState}
            className="font-medium underline hover:no-underline"
          >
            reset and start over
          </button>
          .
          <div className="mt-3">
            <Button size="sm" onClick={start} disabled={running}>
              <RotateCcw size={12} /> Retry ingestion
            </Button>
          </div>
        </Alert>
      )}

      {error && (
        <Alert tone="danger" title="Upload could not complete" correlationId={error.correlationId}>
          {error.message}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={start} disabled={running}>
              <RotateCcw size={12} /> Try again
            </Button>
            <Button size="sm" variant="ghost" onClick={resetState}>
              <Trash2 size={12} /> Reset state
            </Button>
          </div>
        </Alert>
      )}

      {slots.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-xs">
            <span className="text-slate-500">
              {slots.length} file(s) ·{' '}
              {formatBytes(slots.reduce((total, slot) => total + slot.file.size, 0))}
            </span>
            <Button
              size="sm"
              onClick={start}
              disabled={startDisabled}
            >
              {running ? 'Uploading…' : cachedNeedsIngest ? 'Retry ingestion' : 'Start upload'}
            </Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {slots.map((slot) => (
              <li key={slot.file.name} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{slot.file.name}</div>
                    <div className="text-xs text-slate-500">{formatBytes(slot.file.size)}</div>
                  </div>
                  <div className="w-24 text-right text-xs">
                    {slot.status === 'pending' && <span className="text-slate-500">queued</span>}
                    {slot.status === 'uploading' && (
                      <span className="font-mono text-brand-600">{Math.round(slot.progress)}%</span>
                    )}
                    {slot.status === 'done' && <span className="text-emerald-600">uploaded</span>}
                    {slot.status === 'skipped' && (
                      <span className="text-slate-500">already uploaded</span>
                    )}
                    {slot.status === 'failed' && (
                      <span className="text-red-600" title={slot.error}>
                        failed
                      </span>
                    )}
                  </div>
                </div>
                {slot.status === 'uploading' && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-brand-500 transition-all"
                      style={{ width: `${slot.progress}%` }}
                    />
                  </div>
                )}
                {slot.status === 'failed' && slot.error && (
                  <div className="mt-1 text-xs text-red-600">{slot.error}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <Alert tone="success" title={`Ingested ${summary.imagesIngested} image(s)`}>
          Mission now has {summary.totalImages} file{summary.totalImages === 1 ? '' : 's'}{' '}
          ({formatBytes(summary.rawSizeBytes)}).
          {summary.imagesMissingGps > 0 && (
            <>
              {' '}
              <span className="font-medium">{summary.imagesMissingGps}</span> missing GPS.
            </>
          )}
        </Alert>
      )}
    </div>
  );
}

class UploadError extends Error {
  correlationId?: string;
  constructor(message: string, correlationId?: string) {
    super(message);
    this.correlationId = correlationId;
  }
}
