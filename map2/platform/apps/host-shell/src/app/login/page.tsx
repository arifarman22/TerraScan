import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage(): React.ReactElement {
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
        <div className="relative space-y-6 text-white">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Enterprise drone &amp; satellite image processing — at scale.
          </h1>
          <p className="max-w-md text-sm text-white/70">
            Photogrammetry · 8 spectral indices · pre-signed delivery ·
            multi-tenant RBAC · live job monitoring · audit-trail.
          </p>
          <ul className="grid max-w-md grid-cols-2 gap-3 text-xs text-white/80">
            <li className="rounded-md bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white">Multi-tenant</div>
              <div className="mt-0.5 text-[11px] text-white/60">
                PostgreSQL Row-Level Security per request
              </div>
            </li>
            <li className="rounded-md bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white">Real-time</div>
              <div className="mt-0.5 text-[11px] text-white/60">
                socket.io progress &amp; WS gateway
              </div>
            </li>
            <li className="rounded-md bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white">Open standards</div>
              <div className="mt-0.5 text-[11px] text-white/60">
                COG · STAC · 3D Tiles · OGC
              </div>
            </li>
            <li className="rounded-md bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white">Observable</div>
              <div className="mt-0.5 text-[11px] text-white/60">
                Prometheus · structured logs · audit-log
              </div>
            </li>
          </ul>
        </div>
        <div className="text-xs text-white/40">SOC 2 ready · v1.0</div>
      </div>
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your workspace to continue.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_-8px_rgb(15_23_42/0.08)]">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            No account yet?{' '}
            <Link
              href="/register"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Create an organisation →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
