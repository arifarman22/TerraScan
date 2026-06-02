import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { JobLauncher } from '@/components/job-launcher';
import { UploadPanel } from '@/components/upload-panel';
import {
  ApiException,
  fetchJobs,
  fetchMission,
  fetchMissionImages,
} from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

const JOB_TONE: Record<string, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export default async function MissionPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }

  try {
    const [mission, library, jobs] = await Promise.all([
      fetchMission(session.accessToken, id),
      fetchMissionImages(session.accessToken, id),
      fetchJobs(session.accessToken, { missionId: id }),
    ]);

    return (
      <div className="space-y-8">
        <div>
          <Link
            href={`/app/projects/${mission.projectId}`}
            className="text-xs text-slate-500 hover:underline"
          >
            ← Project
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{mission.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mission.sourceType} · status {mission.status} · {mission.fileCount} file(s){' '}
            ({formatBytes(Number(mission.rawSizeBytes))})
          </p>
        </div>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">Upload imagery</h2>
          <UploadPanel missionId={mission.id} ingestedCount={library.summary.count} />
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">Processing jobs</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <JobLauncher missionId={mission.id} ingestedCount={library.summary.count} />
          </div>
          {jobs.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 border-b">
                  <tr>
                    <th className="px-4 py-2">Job</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const tone = JOB_TONE[job.status] ?? 'bg-blue-100 text-blue-700';
                    return (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="font-mono text-xs text-brand-600 hover:underline"
                          >
                            {job.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-700">{job.type.replaceAll('_', ' ')}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>{job.status}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-900 mb-3">
            Image library ({library.summary.count})
          </h2>
          {library.summary.missingGpsCount > 0 && (
            <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {library.summary.missingGpsCount} image(s) are missing GPS metadata —
              photogrammetry accuracy will be reduced.
            </div>
          )}
          {library.images.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No imagery ingested yet.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 border-b">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">GPS</th>
                    <th className="px-3 py-2">Camera</th>
                    <th className="px-3 py-2">Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {library.images.map((image) => (
                    <tr key={image.id}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        {image.fileName}
                      </td>
                      <td className="px-3 py-2">{formatBytes(Number(image.sizeBytes))}</td>
                      <td className="px-3 py-2">
                        {image.hasGps ? (
                          <span className="text-emerald-700">✓</span>
                        ) : (
                          <span className="text-amber-700">missing</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {image.metadata.cameraMake || image.metadata.cameraModel
                          ? `${image.metadata.cameraMake ?? ''} ${image.metadata.cameraModel ?? ''}`.trim()
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {image.metadata.capturedAt
                          ? new Date(image.metadata.capturedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
