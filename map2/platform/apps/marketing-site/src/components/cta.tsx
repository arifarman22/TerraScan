import { ArrowRight } from 'lucide-react';
import { APP_URL } from '@/lib/config';

export function Cta() {
  return (
    <section className="py-24 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to transform your geospatial workflow?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-brand-200">
          Join hundreds of organizations using TerraScan to turn aerial imagery
          into actionable intelligence.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={`${APP_URL}/register`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
          >
            Start Your Free Trial
            <ArrowRight size={16} />
          </a>
          <a
            href="mailto:sales@terrascan.ai"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-400 px-8 py-4 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Talk to Sales
          </a>
        </div>
        <p className="mt-6 text-sm text-brand-300">
          No credit card required · Setup in under 2 minutes
        </p>
      </div>
    </section>
  );
}
