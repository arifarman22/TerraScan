import { HardDrive, TriangleAlert } from 'lucide-react';
import type { StorageSummary } from '@/lib/api';
import { formatBytes } from '@/lib/utils';

export function StorageMeter({ summary }: { summary: StorageSummary }): React.ReactElement {
  const fill = Math.min(100, Math.max(0, summary.usedPercent));
  const barColor =
    fill >= 90 ? 'bg-red-500' : fill >= 75 ? 'bg-amber-500' : fill >= 50 ? 'bg-sky-500' : 'bg-emerald-500';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200">
          <HardDrive size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Storage
          </div>
          <div className="text-sm font-medium text-slate-900">
            {formatBytes(summary.usedBytes)}{' '}
            <span className="text-slate-500">of {formatBytes(summary.quotaBytes)}</span>
          </div>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {summary.projectCount} project{summary.projectCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full transition-all ${barColor}`} style={{ width: `${fill}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
        <span>{fill.toFixed(1)}% used</span>
        <span>{formatBytes(summary.quotaBytes - summary.usedBytes)} free</span>
      </div>
      {fill >= 80 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            {fill >= 100
              ? 'Storage limit exceeded — new uploads are blocked.'
              : 'Approaching storage limit. Consider archiving old projects.'}
          </span>
        </div>
      )}
    </div>
  );
}
