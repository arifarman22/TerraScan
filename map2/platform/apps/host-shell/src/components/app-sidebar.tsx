'use client';

import {
  Activity,
  FolderKanban,
  Key,
  LayoutDashboard,
  ScrollText,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/app/projects', label: 'Projects', icon: FolderKanban },
      { href: '/app/jobs', label: 'Jobs', icon: Activity },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/app/settings/api-keys', label: 'API keys', icon: Key },
      { href: '/app/settings/audit-log', label: 'Audit log', icon: ScrollText },
      { href: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  organisationName: string;
  subscriptionTier: string;
}

export function AppSidebar({ organisationName, subscriptionTier }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <path d="M2 4l6-3 6 3v8l-6 3-6-3V4zm6-1.3L4.4 4.5 8 6.3l3.6-1.8L8 2.7zM3 6v5.6l4 2v-5.6L3 6zm6 7.6l4-2V6L9 8v5.6z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {organisationName}
          </div>
          <Badge tone="brand" className="mt-0.5">
            {subscriptionTier}
          </Badge>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const exact =
                  item.href === '/app' || item.href === '/app/settings';
                const active = exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-brand-50 font-medium text-brand-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600',
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400">
        Drone &amp; Satellite Platform · v1.0
      </div>
    </aside>
  );
}
