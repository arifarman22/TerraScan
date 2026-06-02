'use client';

import { useState } from 'react';
import { Menu, X, Satellite } from 'lucide-react';
import { APP_URL } from '@/lib/config';

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Industries', href: '/industries' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-brand-700">
          <Satellite size={28} strokeWidth={2.2} />
          <span>TerraScan</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-slate-600 transition hover:text-brand-700"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`${APP_URL}/login`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/register`}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Get Started Free
          </a>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
          <ul className="space-y-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium text-slate-700"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={`${APP_URL}/login`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium"
            >
              Sign In
            </a>
            <a
              href={`${APP_URL}/register`}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started Free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
