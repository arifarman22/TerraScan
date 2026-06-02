import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-md border p-3 flex gap-3 items-start text-sm', {
  variants: {
    tone: {
      info: 'border-sky-200 bg-sky-50 text-sky-900',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      warning: 'border-amber-200 bg-amber-50 text-amber-900',
      danger: 'border-red-200 bg-red-50 text-red-900',
    },
  },
  defaultVariants: { tone: 'info' },
});

const TONE_ICON: Record<NonNullable<VariantProps<typeof alertVariants>['tone']>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children?: ReactNode;
  className?: string;
  correlationId?: string;
}

export function Alert({ tone = 'info', title, children, className, correlationId }: AlertProps) {
  const Icon = TONE_ICON[tone ?? 'info'];
  return (
    <div className={cn(alertVariants({ tone }), className)} role="alert">
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium leading-5">{title}</div>}
        {children && <div className={cn('text-xs leading-5 opacity-90', title && 'mt-1')}>{children}</div>}
        {correlationId && (
          <div className="mt-2 font-mono text-[10px] opacity-60">
            correlation: {correlationId}
          </div>
        )}
      </div>
    </div>
  );
}
