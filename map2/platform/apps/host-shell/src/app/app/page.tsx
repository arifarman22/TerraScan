import { Activity, CheckCircle2, FolderKanban, Plus, XCircle } from 'lucide-react';
import Link from 'next/link';
import { KpiCard } from '@/components/kpi-card';
import { ProjectCard } from '@/components/project-card';
import { StorageMeter } from '@/components/storage-meter';
import { Badge, statusTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  fetchJobs,
  fetchOrganisation,
  fetchProjects,
  fetchStorageSummary,
} from '@/lib/api';
import { getSessionTokens } from '@/lib/session';
import { formatRelativeTime } from '@/lib/utils';

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) {
    return <div>Not signed in.</div>;
  }
  const [organisation, projects, storage, jobs] = await Promise.all([
    fetchOrganisation(session.accessToken),
    fetchProjects(session.accessToken),
    fetchStorageSummary(session.accessToken),
    fetchJobs(session.accessToken),
  ]);

  const activeProjects = projects.filter((p) => p.status !== 'ARCHIVED');
  const runningJobs = jobs.filter(
    (job) =>
      job.status !== 'COMPLETE' &&
      job.status !== 'FAILED' &&
      job.status !== 'CANCELLED',
  );
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETE').length;
  const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
  const recent = activeProjects.slice(0, 6);
  const latestJobs = [...jobs]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {organisation.name} ·{' '}
            <span className="font-medium">{organisation.subscriptionTier}</span>{' '}
            plan
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button>
            <Plus size={14} />
            New project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={FolderKanban}
          tone="brand"
          label="Active projects"
          value={activeProjects.length}
          hint={`${projects.length - activeProjects.length} archived`}
        />
        <KpiCard
          icon={Activity}
          tone="info"
          label="Jobs in flight"
          value={runningJobs.length}
          hint={`${jobs.length} total`}
        />
        <KpiCard
          icon={CheckCircle2}
          tone="success"
          label="Completed jobs"
          value={completedJobs}
          hint={`${(((completedJobs) / Math.max(1, jobs.length)) * 100).toFixed(0)}% success rate`}
        />
        <KpiCard
          icon={XCircle}
          tone={failedJobs > 0 ? 'warning' : 'neutral'}
          label="Failed jobs"
          value={failedJobs}
          hint={failedJobs > 0 ? 'Review the audit log' : 'All clear'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent projects</h2>
            <Link
              href="/app/projects"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start ingesting imagery and running pipelines."
              action={
                <Link href="/app/projects/new">
                  <Button size="sm">
                    <Plus size={14} />
                    New project
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {recent.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <StorageMeter summary={storage} />
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent jobs</h3>
              <Link
                href="/app/jobs"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {latestJobs.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No jobs yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {latestJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="min-w-0 flex-1 truncate font-mono text-slate-600 hover:text-brand-600"
                    >
                      {job.id.slice(0, 8)}… · {job.type.replaceAll('_', ' ')}
                    </Link>
                    <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                    <span className="hidden text-[10px] tabular-nums text-slate-400 sm:inline">
                      {formatRelativeTime(job.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
