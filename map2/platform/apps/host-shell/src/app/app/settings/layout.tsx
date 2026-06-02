'use client';

import { Key, Settings as SettingsIcon, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/app/settings/api-keys', label: 'API keys', icon: Key },
  { href: '/app/settings/audit-log', label: 'Audit log', icon: ScrollText },
  { href: '/app/settings/organisation', label: 'Organisation', icon: SettingsIcon },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage organisation policies, programmatic access and audit history.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <nav className="space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
