import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { GeoViewer } from '@/components/geo-viewer';
import {
  ApiException,
  fetchProject,
  fetchProjectOutputs,
} from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewerPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }

  try {
    const [project, outputs] = await Promise.all([
      fetchProject(session.accessToken, id),
      fetchProjectOutputs(session.accessToken, id),
    ]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/app/projects/${project.id}`}
              className="text-xs text-slate-500 hover:underline"
            >
              ← Project
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              {project.name} · viewer
            </h1>
          </div>
          <div className="text-xs text-slate-500">
            {outputs.length} layer{outputs.length === 1 ? '' : 's'}
          </div>
        </div>
        <GeoViewer
          project={{
            id: project.id,
            name: project.name,
            regionOfInterest: project.regionOfInterest,
          }}
          outputs={outputs}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiException && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
