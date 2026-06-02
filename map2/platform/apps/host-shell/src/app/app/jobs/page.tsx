import { redirect } from 'next/navigation';
import { JobsTable } from '@/components/jobs-table';
import { fetchJobs } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

export default async function JobsPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }
  const jobs = await fetchJobs(session.accessToken);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {jobs.length} processing job{jobs.length === 1 ? '' : 's'} in your
          organisation
        </p>
      </div>
      <JobsTable initialJobs={jobs} />
    </div>
  );
}
