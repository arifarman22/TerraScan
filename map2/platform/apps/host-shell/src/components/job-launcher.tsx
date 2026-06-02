'use client';

import { Loader2, Play, TriangleAlert, Upload, X, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { JobType, QualityPreset } from '@platform/shared-types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const MIN_IMAGES_FOR_PHOTOGRAMMETRY = 3;

type ProcessingMode = 'standard' | 'gcp_corrected';

interface GCPGroundTruth {
  id: string;
  x: number;
  y: number;
  z: number;
}

interface GCPProjection {
  id: string;
  x: number;
  y: number;
}

interface JobLauncherProps {
  missionId: string;
  ingestedCount?: number;
  imageNames?: string[];
}

function parseGroundTruthCSV(text: string): GCPGroundTruth[] {
  const lines = text.trim().split('\n');
  const gcps: GCPGroundTruth[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      gcps.push({
        id: parts[0].trim(),
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3]),
      });
    }
  }
  return gcps;
}

function parseProjectionsFile(
  text: string,
  imageName: string,
): { imageName: string; projections: GCPProjection[] } {
  const lines = text.trim().split('\n');
  const projections: GCPProjection[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/[\s,]+/);
    if (parts.length >= 3) {
      projections.push({
        id: parts[0].trim(),
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
      });
    }
  }
  return { imageName, projections };
}

export function JobLauncher({
  missionId,
  ingestedCount = 0,
  imageNames = [],
}: JobLauncherProps): React.ReactElement {
  const router = useRouter();
  const [mode, setMode] = useState<ProcessingMode>('standard');
  const [preset, setPreset] = useState<QualityPreset>(QualityPreset.STANDARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GCP state
  const [groundTruthFile, setGroundTruthFile] = useState<File | null>(null);
  const [groundTruth, setGroundTruth] = useState<GCPGroundTruth[]>([]);
  const [projectionFiles, setProjectionFiles] = useState<File[]>([]);
  const [projections, setProjections] = useState<Record<string, GCPProjection[]>>({});

  const insufficient = ingestedCount < MIN_IMAGES_FOR_PHOTOGRAMMETRY;
  const recommended = ingestedCount < 20;

  const handleGroundTruthUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseGroundTruthCSV(text);
      if (parsed.length === 0) {
        toast.error('Invalid GCP file', {
          description: 'Expected CSV format: id,x,y,z (one GCP per line)',
        });
        return;
      }
      setGroundTruthFile(file);
      setGroundTruth(parsed);
      toast.success(`${parsed.length} GCPs loaded`, {
        description: parsed.map((g) => g.id).join(', '),
      });
    },
    [],
  );

  const handleProjectionsUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      const newProjections: Record<string, GCPProjection[]> = {};
      for (const file of files) {
        const text = await file.text();
        const imageName = file.name.replace('.txt', '');
        const result = parseProjectionsFile(text, imageName);
        if (result.projections.length > 0) {
          newProjections[imageName] = result.projections;
        }
      }
      setProjectionFiles(files);
      setProjections(newProjections);
      const totalProjs = Object.values(newProjections).reduce(
        (sum, p) => sum + p.length,
        0,
      );
      toast.success(`${files.length} projection files loaded`, {
        description: `${totalProjs} total GCP observations across ${Object.keys(newProjections).length} images`,
      });
    },
    [],
  );

  const gcpReady =
    mode === 'standard' ||
    (groundTruth.length >= 3 && Object.keys(projections).length >= 2);

  async function onLaunch(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        missionId,
        type:
          mode === 'gcp_corrected'
            ? 'GCP_PHOTOGRAMMETRY'
            : JobType.PHOTOGRAMMETRY,
        preset,
      };

      if (mode === 'gcp_corrected') {
        body.config = {
          gcpGroundTruth: groundTruth,
          gcpProjections: projections,
        };
      }

      const response = await fetch('/api/proxy/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const respBody = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(respBody.message ?? 'Could not launch job');
      }
      const job = (await response.json()) as { id: string };
      toast.success(
        mode === 'gcp_corrected'
          ? 'GCP-corrected job launched'
          : 'Photogrammetry job launched',
        { description: 'Real-time progress will stream in on the job page.' },
      );
      router.push(`/app/jobs/${job.id}`);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unexpected error';
      setError(message);
      toast.error('Could not launch job', { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {insufficient && (
        <Alert tone="warning" title="Not enough imagery">
          Photogrammetry needs at least {MIN_IMAGES_FOR_PHOTOGRAMMETRY}{' '}
          overlapping images. This mission has{' '}
          <span className="font-medium">{ingestedCount}</span>.
        </Alert>
      )}
      {!insufficient && recommended && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            {ingestedCount} images — quality improves beyond 20 images with good
            overlap.
          </span>
        </div>
      )}

      {/* Processing Mode Selector */}
      <div className="space-y-2">
        <Label>Processing mode</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('standard')}
            className={`rounded-lg border p-4 text-left transition ${
              mode === 'standard'
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Play size={16} className="text-brand-600" />
              <span className="text-sm font-semibold text-slate-900">
                Standard Processing
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              NodeODM engine. Fast results, meter-level accuracy from camera GPS.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('gcp_corrected')}
            className={`rounded-lg border p-4 text-left transition ${
              mode === 'gcp_corrected'
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-accent-600" />
              <span className="text-sm font-semibold text-slate-900">
                GCP-Corrected Processing
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              NodeCM + COLMAP GCPs. Survey-grade, centimeter-level accuracy.
            </p>
          </button>
        </div>
      </div>

      {/* GCP Upload Section */}
      {mode === 'gcp_corrected' && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Ground Control Points
          </h4>

          {/* Ground Truth File */}
          <div className="space-y-1.5">
            <Label htmlFor="gcp-ground-truth">
              Ground truth coordinates (CSV: id,x,y,z)
            </Label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="gcp-ground-truth"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Upload size={14} />
                Choose file
              </label>
              <input
                id="gcp-ground-truth"
                type="file"
                accept=".csv,.txt"
                onChange={handleGroundTruthUpload}
                className="hidden"
              />
              {groundTruthFile && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">{groundTruthFile.name}</span>
                  <span className="text-accent-600">
                    ({groundTruth.length} GCPs)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGroundTruthFile(null);
                      setGroundTruth([]);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Example: gcp1,456789.12,2345678.45,45.67
            </p>
          </div>

          {/* Projection Files */}
          <div className="space-y-1.5">
            <Label htmlFor="gcp-projections">
              Image projections (one .txt per image: gcp_id pixel_x pixel_y)
            </Label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="gcp-projections"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Upload size={14} />
                Choose files
              </label>
              <input
                id="gcp-projections"
                type="file"
                accept=".txt"
                multiple
                onChange={handleProjectionsUpload}
                className="hidden"
              />
              {projectionFiles.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">
                    {projectionFiles.length} files
                  </span>
                  <span className="text-accent-600">
                    ({Object.keys(projections).length} images matched)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectionFiles([]);
                      setProjections({});
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Each file named like DJI_0001.txt containing: gcp1 1234.5 567.8
            </p>
          </div>

          {/* GCP Validation Status */}
          {groundTruth.length > 0 && (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                gcpReady
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {gcpReady ? (
                <>
                  ✓ Ready: {groundTruth.length} GCPs with projections in{' '}
                  {Object.keys(projections).length} images
                </>
              ) : (
                <>
                  ⚠ Need at least 3 GCPs and projections in 2+ images.
                  Currently: {groundTruth.length} GCPs,{' '}
                  {Object.keys(projections).length} images with projections.
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quality Preset + Launch */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="preset">Quality preset</Label>
          <select
            id="preset"
            value={preset}
            onChange={(event) =>
              setPreset(event.target.value as QualityPreset)
            }
            className="flex h-9 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            <option value={QualityPreset.DRAFT}>Draft (fast)</option>
            <option value={QualityPreset.STANDARD}>Standard</option>
            <option value={QualityPreset.HIGH}>High</option>
            <option value={QualityPreset.ULTRA}>Ultra (archive)</option>
          </select>
        </div>
        <Button
          type="button"
          onClick={onLaunch}
          disabled={loading || insufficient || !gcpReady}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : mode === 'gcp_corrected' ? (
            <MapPin size={14} />
          ) : (
            <Play size={14} />
          )}
          {loading
            ? 'Launching…'
            : mode === 'gcp_corrected'
              ? 'Launch GCP-corrected processing'
              : 'Launch photogrammetry'}
        </Button>
      </div>

      {error && (
        <Alert tone="danger" title="Could not launch job">
          {error}
        </Alert>
      )}
    </div>
  );
}
