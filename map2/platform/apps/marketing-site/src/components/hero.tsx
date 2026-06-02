import { ArrowRight, Play } from 'lucide-react';
import { APP_URL } from '@/lib/config';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-accent-400/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Now processing 10M+ hectares monthly
        </div>

        <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          AI-Powered Geospatial Intelligence for{' '}
          <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Every Industry
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 lg:text-xl">
          Transform drone and satellite imagery into actionable insights.
          Orthomosaics, 3D models, spectral analytics, and AI-driven
          detection — all in one enterprise platform.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={`${APP_URL}/register`}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 hover:shadow-brand-700/30"
          >
            Start Free Trial
            <ArrowRight size={16} />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <Play size={16} className="text-brand-600" />
            See How It Works
          </a>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
          <span>✓ No credit card required</span>
          <span>✓ 14-day free trial</span>
          <span>✓ SOC2 compliant</span>
          <span>✓ 99.9% uptime SLA</span>
        </div>

        {/* Hero image placeholder */}
        <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-slate-400">app.terrascan.ai</span>
          </div>
          <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl">🛰️</div>
              <p className="mt-4 text-sm text-slate-400">Platform Dashboard Preview</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
