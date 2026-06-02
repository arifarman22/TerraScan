import { redirect } from 'next/navigation';
import { ProjectCreateForm } from '@/components/project-create-form';
import { fetchWorkspaces } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

export default async function NewProjectPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }
  const workspaces = await fetchWorkspaces(session.accessToken);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Create a project</h1>
      <p className="mt-1 text-sm text-slate-500">
        Projects are the unit that organises imagery, processing, and outputs.
      </p>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <ProjectCreateForm workspaces={workspaces} />
      </div>
    </div>
  );
}
