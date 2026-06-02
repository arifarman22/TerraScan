'use client';

/**
 * Live job progress monitor (SRS FR-PHOTO-007 / §3.2).
 *
 * Connects to the Core Service `/jobs` socket.io namespace using a token
 * fetched from `/api/proxy/ws-token`. Visualises the photogrammetry
 * pipeline as a vertical stage list with the current stage highlighted,
 * an animated progress bar, an estimated time-to-finish, a full activity
 * log, and an enterprise-grade error display when the job fails.
 */
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge, statusTone } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProgressMessage {
  jobId: string;
  status: string;
  percent: number;
  stageLabel?: string;
}

interface Props {
  jobId: string;
  jobType: string;
  initialStatus: string;
  initialPercent: number;
  initialError: string | null;
}

interface LogLine {
  ts: Date;
  status: string;
  percent: number;
  label: string;
}

/** Ordered photogrammetry pipeline stages (SRS §6). */
const PHOTOGRAMMETRY_STAGES: { code: string; label: string }[] = [
  { code: 'INITIALIZING', label: 'Initializing' },
  { code: 'FEATURE_EXTRACTION', label: 'Feature extraction' },
  { code: 'POINT_CLOUD_GENERATION', label: 'Point cloud generation' },
  { code: 'SURFACE_RECONSTRUCTION', label: 'Surface reconstruction' },
  { code: 'ORTHOMOSAIC_GENERATION', label: 'Orthomosaic generation' },
  { code: 'POST_PROCESSING', label: 'Post-processing' },
];

const ANALYTICS_STAGES: { code: string; label: string }[] = [
  { code: 'INITIALIZING', label: 'Initializing' },
  { code: 'POST_PROCESSING', label: 'Computing analytics' },
];

function stagesForJobType(jobType: string) {
  if (jobType === 'PHOTOGRAMMETRY') return PHOTOGRAMMETRY_STAGES;
  return ANALYTICS_STAGES;
}

function stageState(
  stageCode: string,
  currentStatus: string,
  stages: { code: string }[],
): 'done' | 'current' | 'pending' {
  const currentIndex = stages.findIndex((s) => s.code === currentStatus);
  const myIndex = stages.findIndex((s) => s.code === stageCode);
  if (currentStatus === 'COMPLETE') return 'done';
  if (currentStatus === 'FAILED' || currentStatus === 'CANCELLED') {
    return myIndex < currentIndex ? 'done' : myIndex === currentIndex ? 'current' : 'pending';
  }
  if (currentIndex === -1) return 'pending';
  if (myIndex < currentIndex) return 'done';
  if (myIndex === currentIndex) return 'current';
  return 'pending';
}

export function JobMonitor({
  jobId,
  jobType,
  initialStatus,
  initialPercent,
  initialError,
}: Props): React.ReactElement {
  const [status, setStatus] = useState(initialStatus);
  const [percent, setPercent] = useState(initialPercent);
  const [stageLabel, setStageLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);

  const startedAt = useRef<number | null>(null);
  const isTerminal = status === 'COMPLETE' || status === 'FAILED' || status === 'CANCELLED';
  const stages = useMemo(() => stagesForJobType(jobType), [jobType]);

  useEffect(() => {
    if (initialStatus !== 'SUBMITTED' && initialStatus !== 'INITIALIZING') {
      startedAt.current = Date.now();
    }
  }, [initialStatus]);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;
    async function connect(): Promise<void> {
      try {
        const tokenRes = await fetch('/api/proxy/ws-token');
        if (!tokenRes.ok) {
          setWsError('Could not obtain a WebSocket token');
          return;
        }
        const { token, wsUrl } = (await tokenRes.json()) as {
          token: string;
          wsUrl: string;
        };
        if (cancelled) return;
        socket = io(`${wsUrl}/jobs`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
        });
        socket.on('connect', () => {
          setConnected(true);
          setWsError(null);
          socket?.emit('subscribe', { jobId });
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('subscribed', (snapshot: { status?: string; progressPercent?: number }) => {
          if (typeof snapshot.status === 'string') setStatus(snapshot.status);
          if (typeof snapshot.progressPercent === 'number') setPercent(snapshot.progressPercent);
        });
        socket.on('progress', (message: ProgressMessage) => {
          if (!startedAt.current && message.percent > 0) {
            startedAt.current = Date.now();
          }
          setStatus(message.status);
          setPercent(message.percent);
          if (message.stageLabel) setStageLabel(message.stageLabel);
          if (message.status === 'FAILED' && message.stageLabel) {
            setErrorMessage(message.stageLabel);
          }
          setLog((previous) =>
            [
              ...previous,
              {
                ts: new Date(),
                status: message.status,
                percent: message.percent,
                label: message.stageLabel ?? '',
              },
            ].slice(-30),
          );
        });
        socket.on('error', (event: { message?: string }) =>
          setWsError(event?.message ?? 'WebSocket error'),
        );
      } catch {
        setWsError('Failed to establish a real-time connection');
      }
    }
    void connect();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [jobId]);

  /** Naïve linear ETA based on observed progress rate. */
  const eta = useMemo(() => {
    if (isTerminal || percent <= 0 || !startedAt.current) return null;
    const elapsed = (Date.now() - startedAt.current) / 1000;
    const remaining = (elapsed / percent) * (100 - percent);
    if (!Number.isFinite(remaining) || remaining < 1) return null;
    if (remaining < 60) return `${Math.round(remaining)}s`;
    if (remaining < 3600) return `${Math.round(remaining / 60)}m`;
    return `${Math.round(remaining / 3600)}h ${Math.round((remaining % 3600) / 60)}m`;
  }, [percent, isTerminal]);

  async function onRetry(): Promise<void> {
    window.location.reload();
  }

  const barColor =
    status === 'FAILED'
      ? 'bg-red-500'
      : status === 'COMPLETE'
        ? 'bg-emerald-500'
        : 'bg-brand-500';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(status)}>{status}</Badge>
            <span className="text-xs text-slate-500">
              {stageLabel ?? (isTerminal ? '—' : 'Waiting for update…')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {!isTerminal && eta && (
              <span className="tabular-nums">~{eta} remaining</span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1',
                connected ? 'text-emerald-600' : 'text-slate-400',
              )}
            >
              {connected ? (
                <>
                  <Wifi size={11} className="animate-pulse" /> live
                </>
              ) : isTerminal ? (
                <>
                  <WifiOff size={11} /> closed
                </>
              ) : (
                <>
                  <Loader2 size={11} className="animate-spin" /> connecting…
                </>
              )}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span className="font-mono text-sm font-medium text-slate-900 tabular-nums">
              {Math.round(percent)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full transition-all duration-500 ease-out', barColor)}
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
        </div>
      </div>

      {status === 'FAILED' && errorMessage && (
        <Alert tone="danger" title="Processing failed">
          <p>{errorMessage}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCcw size={12} /> Reload
            </Button>
          </div>
        </Alert>
      )}
      {wsError && (
        <Alert tone="warning" title="Live updates unavailable">
          {wsError}
        </Alert>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">Pipeline stages</h3>
        <ol className="mt-3 space-y-2">
          {stages.map((stage, index) => {
            const state = stageState(stage.code, status, stages);
            return (
              <li key={stage.code} className="flex items-center gap-3">
                <div className="flex shrink-0">
                  {state === 'done' ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : state === 'current' ? (
                    status === 'FAILED' ? (
                      <AlertCircle size={18} className="text-red-500" />
                    ) : (
                      <Loader2 size={18} className="animate-spin text-brand-500" />
                    )
                  ) : (
                    <Circle size={18} className="text-slate-300" />
                  )}
                </div>
                <div
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    state === 'done'
                      ? 'text-slate-700'
                      : state === 'current'
                        ? 'font-medium text-slate-900'
                        : 'text-slate-400',
                  )}
                >
                  {stage.label}
                </div>
                <div className="text-[11px] tabular-nums text-slate-400">
                  {index + 1} / {stages.length}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {log.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold text-slate-900">
            Activity log ({log.length})
          </summary>
          <div className="border-t border-slate-200 px-5 py-3">
            <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-700">
              {log
                .map(
                  (line) =>
                    `[${line.ts.toLocaleTimeString()}]  ${line.status.padEnd(28)}  ${line.percent
                      .toString()
                      .padStart(3)}%  ${line.label}`,
                )
                .join('\n')}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
