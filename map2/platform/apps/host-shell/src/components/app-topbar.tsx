'use client';

import { LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Organisation, User } from '@platform/shared-types';
import { Button } from './ui/button';

interface TopbarProps {
  user: Pick<User, 'email' | 'fullName'>;
  organisation: Pick<Organisation, 'name' | 'slug'>;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppTopbar({ user, organisation }: TopbarProps) {
  const router = useRouter();

  async function onLogout(): Promise<void> {
    await fetch('/api/proxy/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu size={16} />
      </Button>
      <div className="md:hidden text-sm font-medium text-slate-900">
        {organisation.name}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-xs font-medium text-slate-900">{user.fullName}</div>
          <div className="text-[11px] text-slate-500">{user.email}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-medium text-white">
          {initials(user.fullName || user.email)}
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut size={14} />
          Sign out
        </Button>
      </div>
    </header>
  );
}
