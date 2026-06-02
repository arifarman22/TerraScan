import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MissionCreateForm } from '@/components/mission-create-form';
import { ApiException, fetchMissions, fetchProject } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }

  try {
    const [project, missions] = await Promise.all([
      fetchProject(session.accessToken, id),
      fetchMissions(session.accessToken, id),
    ]);

    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/app/projects" className="text-xs text-slate-500 hover:underline">
              ← All projects
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {project.type.replaceAll('_', ' ')} · status {project.status}
            </p>
            {project.description && (
              <p className="mt-3 text-sm text-slate-700">{project.description}</p>
            )}
          </div>
          <Link
            href={`/app/projects/${project.id}/viewer`}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-500 hover:text-brand-600"
          >
            Open viewer →
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">Add a mission</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <MissionCreateForm projectId={project.id} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">
            Missions ({missions.length})
          </h2>
          {missions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No missions yet. Add one above to start uploading imagery.
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((mission) => (
                <Link
                  key={mission.id}
                  href={`/app/missions/${mission.id}`}
                  className="block rounded border border-slate-200 bg-white p-3 hover:border-brand-500"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{mission.name}</div>
                      <div className="text-xs text-slate-500">
                        {mission.sourceType} · {mission.fileCount} file(s) · {mission.status}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(mission.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
