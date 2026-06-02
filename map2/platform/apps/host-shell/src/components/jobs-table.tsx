'use client';

import { Loader2, MoreVertical, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Job } from '@platform/shared-types';
import { Badge, statusTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime } from '@/lib/utils';
import { Activity } from 'lucide-react';

const TERMINAL = new Set(['COMPLETE', 'FAILED', 'CANCELLED']);

export function JobsTable({
  initialJobs,
}: {
  initialJobs: Job[];
}): React.ReactElement {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const cleanable = jobs.filter((j) => TERMINAL.has(j.status));

  async function onCancel(id: string): Promise<void> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/proxy/jobs/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Cancel failed');
      const updated = (await res.json()) as Job;
      setJobs((previous) => previous.map((j) => (j.id === id ? updated : j)));
      toast.success('Job cancelled');
    } catch {
      toast.error('Could not cancel job');
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string): Promise<void> {
    if (
      !confirm(
        'Delete this job and its processing outputs?\n\nIf the job is still in flight it will be cancelled first. This cannot be undone.',
      )
    )
      return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/proxy/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      setJobs((previous) => previous.filter((j) => j.id !== id));
      toast.success('Job deleted');
      router.refresh();
    } catch {
      toast.error('Could not delete job');
    } finally {
      setBusyId(null);
    }
  }

  async function onClearAllTerminal(): Promise<void> {
    if (cleanable.length === 0) return;
    if (
      !confirm(
        `Delete all ${cleanable.length} completed/failed/cancelled job(s) and their outputs? This cannot be undone.`,
      )
    )
      return;
    const ids = cleanable.map((j) => j.id);
    setBusyId('__bulk__');
    let removed = 0;
    for (const id of ids) {
      const res = await fetch(`/api/proxy/jobs/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) removed += 1;
    }
    setJobs((previous) => previous.filter((j) => !TERMINAL.has(j.status)));
    setBusyId(null);
    toast.success(`Cleared ${removed} job(s)`);
    router.refresh();
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No jobs yet"
        description="Launch a job from a mission to start processing imagery."
      />
    );
  }

  return (
    <Card>
      {cleanable.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 text-xs">
          <span className="text-slate-500">
            {cleanable.length} terminal job{cleanable.length === 1 ? '' : 's'}{' '}
            can be cleared
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === '__bulk__'}
            onClick={onClearAllTerminal}
          >
            {busyId === '__bulk__' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Clear all terminal
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Job</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Progress</th>
              <th className="px-4 py-2.5">Submitted</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const isTerminal = TERMINAL.has(job.status);
              const isBusy = busyId === job.id;
              return (
                <tr key={job.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="font-mono text-xs text-brand-600 hover:underline"
                    >
                      {job.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {job.type.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={
                            job.status === 'FAILED'
                              ? 'h-full bg-red-400'
                              : job.status === 'COMPLETE'
                                ? 'h-full bg-emerald-500'
                                : 'h-full bg-brand-500'
                          }
                          style={{
                            width: `${Math.max(0, Math.min(100, job.progressPercent))}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {Math.round(job.progressPercent)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">
                    {formatRelativeTime(job.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {!isTerminal && (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => onCancel(job.id)}
                          title="Cancel job"
                          className="h-7 w-7 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                        >
                          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => onDelete(job.id)}
                        title="Delete job"
                        className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        {isBusy && busyId === job.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
