'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { DataSourceType } from '@platform/shared-types';

export function MissionCreateForm({ projectId }: { projectId: string }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<DataSourceType>(DataSourceType.DRONE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/missions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, name, sourceType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Could not create mission');
      }
      const mission = (await res.json()) as { id: string };
      router.push(`/app/missions/${mission.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="mname" className="block text-xs font-medium text-slate-700">
          Mission name
        </label>
        <input
          id="mname"
          required
          minLength={2}
          maxLength={255}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Flight 001"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="stype" className="block text-xs font-medium text-slate-700">
          Source
        </label>
        <select
          id="stype"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as DataSourceType)}
          className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value={DataSourceType.DRONE}>Drone</option>
          <option value={DataSourceType.SATELLITE}>Satellite</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add mission'}
      </button>
      {error && <div className="basis-full text-xs text-red-700">{error}</div>}
    </form>
  );
}
