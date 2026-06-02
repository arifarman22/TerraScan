'use client';

import {
  Box,
  Boxes,
  Check,
  Copy,
  Download,
  GitCompare,
  Image as ImageIcon,
  Layers,
  Map,
  Mountain,
  Waypoints,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ProcessingOutput } from '@platform/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBytes } from '@/lib/utils';

const OUTPUT_LABEL: Record<string, string> = {
  ORTHOMOSAIC: 'Orthomosaic',
  DSM: 'Digital Surface Model',
  DTM: 'Digital Terrain Model',
  POINT_CLOUD: 'Point Cloud',
  MESH_3D: '3D Mesh',
  CONTOURS: 'Contour Lines',
  VOLUME_REPORT: 'Volume Report',
  SPECTRAL_INDEX: 'Spectral Index',
  CHANGE_LAYER: 'Change Detection Layer',
  ML_DETECTION: 'Object Detection',
  LAND_COVER: 'Land Cover Classification',
  THERMAL_MAP: 'Thermal Map',
};

const OUTPUT_ICON: Record<string, LucideIcon> = {
  ORTHOMOSAIC: ImageIcon,
  DSM: Mountain,
  DTM: Mountain,
  POINT_CLOUD: Boxes,
  MESH_3D: Box,
  CONTOURS: Waypoints,
  SPECTRAL_INDEX: Layers,
  CHANGE_LAYER: GitCompare,
};

const OUTPUT_TONE_CLASS: Record<string, string> = {
  ORTHOMOSAIC: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  POINT_CLOUD: 'bg-violet-50 text-violet-700 ring-violet-200',
  DSM: 'bg-sky-50 text-sky-700 ring-sky-200',
  DTM: 'bg-sky-50 text-sky-700 ring-sky-200',
  SPECTRAL_INDEX: 'bg-amber-50 text-amber-700 ring-amber-200',
  CHANGE_LAYER: 'bg-rose-50 text-rose-700 ring-rose-200',
};

interface Props {
  outputs: ProcessingOutput[];
  projectId: string;
}

export function JobOutputsPanel({ outputs, projectId }: Props): React.ReactElement {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function onDownload(outputId: string): Promise<void> {
    setDownloadingId(outputId);
    try {
      const res = await fetch(`/api/proxy/outputs/${outputId}/download`);
      if (!res.ok) throw new Error('Could not get download URL');
      const data = (await res.json()) as { url: string; expiresIn: number };
      window.open(data.url, '_blank', 'noopener');
      toast.success('Download started', {
        description: `URL is valid for ${Math.round(data.expiresIn / 60)} minutes.`,
      });
    } catch (error) {
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function onCopyKey(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      toast.error('Clipboard unavailable');
    }
  }

  if (outputs.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No outputs yet"
        description="Processed deliverables (orthomosaic, point cloud, indices, …) appear here once the pipeline completes."
      />
    );
  }

  return (
    <Card>
      <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
        Outputs ({outputs.length})
      </div>
      <ul className="divide-y divide-slate-100">
        {outputs.map((output) => {
          const Icon = OUTPUT_ICON[output.type] ?? Layers;
          const tone = OUTPUT_TONE_CLASS[output.type] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
          const label = OUTPUT_LABEL[output.type] ?? output.type;
          const isDownloading = downloadingId === output.id;
          const isCopied = copiedKey === output.storageKey;
          const stats =
            output.statistics &&
            typeof output.statistics === 'object' &&
            'meanValue' in output.statistics
              ? (output.statistics as { minValue?: number; maxValue?: number; meanValue?: number })
              : null;
          return (
            <li key={output.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${tone}`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
                    <Badge tone="neutral">{output.format}</Badge>
                    <span className="text-xs text-slate-500">
                      {formatBytes(Number(output.sizeBytes))}
                    </span>
                    {output.crs && (
                      <span className="text-xs text-slate-400">EPSG:{output.crs}</span>
                    )}
                    {output.groundSampleDistanceM && (
                      <span className="text-xs text-slate-400">
                        GSD {output.groundSampleDistanceM.toFixed(3)} m
                      </span>
                    )}
                  </div>
                  {stats && (
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                      {stats.minValue !== undefined && (
                        <span>
                          min <span className="font-mono text-slate-700">{stats.minValue.toFixed(3)}</span>
                        </span>
                      )}
                      {stats.maxValue !== undefined && (
                        <span>
                          max <span className="font-mono text-slate-700">{stats.maxValue.toFixed(3)}</span>
                        </span>
                      )}
                      {stats.meanValue !== undefined && (
                        <span>
                          mean <span className="font-mono text-slate-700">{stats.meanValue.toFixed(3)}</span>
                        </span>
                      )}
                    </dl>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="truncate font-mono">{output.storageKey.split('/').pop()}</span>
                    <button
                      onClick={() => onCopyKey(output.storageKey)}
                      className="ml-1 inline-flex items-center gap-0.5 hover:text-slate-700"
                      title="Copy full storage key"
                    >
                      {isCopied ? <Check size={11} /> : <Copy size={11} />}
                      {isCopied ? 'copied' : 'key'}
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/app/projects/${projectId}/viewer`}>
                    <Button variant="outline" size="sm">
                      <Map size={13} /> View in map
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => onDownload(output.id)}
                    disabled={isDownloading}
                  >
                    <Download size={13} />
                    {isDownloading ? 'Preparing…' : 'Download'}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
