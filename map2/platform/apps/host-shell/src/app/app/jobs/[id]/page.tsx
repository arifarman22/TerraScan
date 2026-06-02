import {
  ArrowLeft,
  Calendar,
  Clock,
  Cpu,
  Layers,
  Settings,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { JobMonitor } from '@/components/job-monitor';
import { JobOutputsPanel } from '@/components/job-outputs-panel';
import { Badge, statusTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ApiException,
  fetchJob,
  fetchJobOutputs,
  fetchMission,
} from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

function durationOf(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.max(0, (end - start) / 1000);
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

export default async function JobPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }

  try {
    const job = await fetchJob(session.accessToken, id);
    const [outputs, mission] = await Promise.all([
      fetchJobOutputs(session.accessToken, id).catch(() => []),
      fetchMission(session.accessToken, job.missionId).catch(() => null),
    ]);
    const duration = durationOf(
      job.startedAt ?? null,
      job.completedAt ?? null,
    );

    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/app/jobs"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={12} /> All jobs
          </Link>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-slate-900">
                <Layers size={22} className="text-brand-500" />
                {job.type.replaceAll('_', ' ')}
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500">{job.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(job.status)}>{job.status}</Badge>
              {duration && (
                <Badge tone="neutral" className="font-mono">
                  <Timer size={11} /> {duration}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <JobMonitor
          jobId={job.id}
          jobType={job.type}
          initialStatus={job.status}
          initialPercent={job.progressPercent}
          initialError={job.errorMessage ?? null}
        />

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Outputs
          </h2>
          <JobOutputsPanel outputs={outputs} projectId={job.projectId} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Details</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <DetailCard icon={Layers} label="Mission">
              {mission ? (
                <Link
                  href={`/app/missions/${mission.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {mission.name}
                </Link>
              ) : (
                <span className="font-mono text-xs">{job.missionId.slice(0, 8)}…</span>
              )}
              <div className="mt-0.5 text-[11px] text-slate-500">
                {mission?.fileCount ?? '?'} source image
                {mission?.fileCount === 1 ? '' : 's'}
              </div>
            </DetailCard>
            <DetailCard icon={Settings} label="Quality preset">
              <span className="text-sm font-medium text-slate-900">
                {job.preset ?? '—'}
              </span>
            </DetailCard>
            <DetailCard icon={Calendar} label="Submitted">
              <span className="text-sm text-slate-900">
                {new Date(job.createdAt).toLocaleString()}
              </span>
            </DetailCard>
            <DetailCard icon={Clock} label="Completed">
              <span className="text-sm text-slate-900">
                {job.completedAt
                  ? new Date(job.completedAt).toLocaleString()
                  : '—'}
              </span>
            </DetailCard>
            {job.engineVersion && (
              <DetailCard icon={Cpu} label="Engine">
                <span className="font-mono text-xs text-slate-700">
                  {job.engineVersion}
                </span>
              </DetailCard>
            )}
          </div>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiException && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

function DetailCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </Card>
  );
}
