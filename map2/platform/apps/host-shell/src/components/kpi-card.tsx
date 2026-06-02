import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
  className?: string;
}

const TONES: Record<NonNullable<KpiProps['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200',
  info: 'bg-sky-50 text-sky-600 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  className,
}: KpiProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-colors hover:border-slate-300',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 ring-inset',
          TONES[tone],
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 truncate text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}
