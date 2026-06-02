import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ring-1 ring-inset',
  {
    variants: {
      tone: {
        neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
        brand: 'bg-brand-50 text-brand-700 ring-brand-200',
        success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        warning: 'bg-amber-50 text-amber-700 ring-amber-200',
        danger: 'bg-red-50 text-red-700 ring-red-200',
        info: 'bg-sky-50 text-sky-700 ring-sky-200',
        muted: 'bg-slate-50 text-slate-500 ring-slate-200',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Map common backend statuses to badge tones (no defaults applied yet). */
export function statusTone(status: string): VariantProps<typeof badgeVariants>['tone'] {
  switch (status) {
    case 'COMPLETE':
    case 'ACTIVE':
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
    case 'SUSPENDED':
    case 'DISABLED':
    case 'CLOSED':
      return 'danger';
    case 'CANCELLED':
    case 'ARCHIVED':
    case 'DRAFT':
      return 'muted';
    case 'SUBMITTED':
      return 'neutral';
    case 'PROCESSING':
    case 'UPLOADING':
    case 'INITIALIZING':
    case 'FEATURE_EXTRACTION':
    case 'POINT_CLOUD_GENERATION':
    case 'SURFACE_RECONSTRUCTION':
    case 'ORTHOMOSAIC_GENERATION':
    case 'POST_PROCESSING':
      return 'info';
    default:
      return 'neutral';
  }
}
