import Link from 'next/link';
import { RegisterForm } from '@/components/register-form';

export default function RegisterPage(): React.ReactElement {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 backdrop-blur">
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor">
              <path d="M2 4l6-3 6 3v8l-6 3-6-3V4zm6-1.3L4.4 4.5 8 6.3l3.6-1.8L8 2.7zM3 6v5.6l4 2v-5.6L3 6zm6 7.6l4-2V6L9 8v5.6z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Drone &amp; Satellite Platform
          </span>
        </div>
        <div className="space-y-6 text-white">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Spin up a new workspace in seconds.
          </h1>
          <p className="max-w-md text-sm text-white/70">
            Your organisation gets its own isolated tenant, an ORG_OWNER role,
            and the TRIAL tier — 10 GB storage and 5 seats — to get started.
          </p>
          <ul className="max-w-md space-y-2.5 text-sm text-white/80">
            {[
              'Strict tenant isolation via PostgreSQL Row-Level Security',
              'Photogrammetry pipelines + 8 spectral indices out of the box',
              'Live job progress over WebSocket — never refresh again',
              'Public API with API keys, scoped rate limits & audit log',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-white/40">SOC 2 ready · v1.0</div>
      </div>
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Create your workspace
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ll be the organisation owner with full access to every
              feature.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_-8px_rgb(15_23_42/0.08)]">
            <RegisterForm />
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
