'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ProjectType, type Workspace } from '@platform/shared-types';

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  [ProjectType.DRONE_SURVEY]: 'Drone Survey',
  [ProjectType.SATELLITE_ANALYSIS]: 'Satellite Analysis',
  [ProjectType.COMBINED]: 'Combined (drone + satellite)',
};

interface Props {
  workspaces: Pick<Workspace, 'id' | 'name'>[];
}

export function ProjectCreateForm({ workspaces }: Props): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>(ProjectType.DRONE_SURVEY);
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces[0]?.id ?? '');
  const [newWorkspaceName, setNewWorkspaceName] = useState('Default workspace');
  const [creatingWorkspace] = useState(workspaces.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let chosenWorkspaceId = workspaceId;
      if (creatingWorkspace) {
        const workspaceRes = await fetch('/api/proxy/workspaces', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: newWorkspaceName }),
        });
        if (!workspaceRes.ok) {
          const err = await workspaceRes.json().catch(() => ({}));
          throw new Error(err.message ?? 'Could not create workspace');
        }
        const workspace = (await workspaceRes.json()) as { id: string };
        chosenWorkspaceId = workspace.id;
      }
      const projectRes = await fetch('/api/proxy/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceId: chosenWorkspaceId,
          name,
          type,
          description: description || undefined,
        }),
      });
      if (!projectRes.ok) {
        const err = await projectRes.json().catch(() => ({}));
        throw new Error(err.message ?? 'Could not create project');
      }
      const project = (await projectRes.json()) as { id: string };
      router.push(`/app/projects/${project.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Project name
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          maxLength={255}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. North Field Survey — Q2 2026"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-slate-700">
          Project type
        </label>
        <select
          id="type"
          value={type}
          onChange={(event) => setType(event.target.value as ProjectType)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {creatingWorkspace ? (
        <div>
          <label htmlFor="ws" className="block text-sm font-medium text-slate-700">
            Workspace name (created with the project)
          </label>
          <input
            id="ws"
            type="text"
            required
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="ws" className="block text-sm font-medium text-slate-700">
            Workspace
          </label>
          <select
            id="ws"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="desc" className="block text-sm font-medium text-slate-700">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="desc"
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
