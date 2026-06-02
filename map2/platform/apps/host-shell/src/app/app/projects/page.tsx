import { ProjectCard } from '@/components/project-card';
import { fetchProjects } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

export default async function ProjectsPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) {
    return <div>Not signed in.</div>;
  }
  const projects = await fetchProjects(session.accessToken);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">
          {projects.length} project{projects.length === 1 ? '' : 's'} in your organisation
        </p>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
