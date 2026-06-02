import { ArrowUpRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@platform/shared-types';
import { Badge, statusTone } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

export function ProjectCard({ project }: { project: Project }): React.ReactElement {
  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="group block rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">
            {project.name}
          </h3>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {project.type.replaceAll('_', ' ')}
          </div>
        </div>
        <ArrowUpRight
          size={14}
          className="shrink-0 text-slate-300 transition-colors group-hover:text-brand-500"
        />
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs text-slate-600">
        {project.description || (
          <span className="italic text-slate-400">No description</span>
        )}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <Badge tone={statusTone(project.status)}>{project.status}</Badge>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Calendar size={11} />
          {formatRelativeTime(project.lastActivityAt)}
        </span>
      </div>
    </Link>
  );
}
