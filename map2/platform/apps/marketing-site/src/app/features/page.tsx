import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';
import {
  BarChart3,
  BrainCircuit,
  FileOutput,
  GitCompare,
  Ruler,
  Share2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features — TerraScan',
  description: 'Explore the full capabilities of the TerraScan geospatial intelligence platform.',
};

const advancedFeatures = [
  {
    icon: BrainCircuit,
    title: 'AI Object Detection',
    description: 'Detect vehicles, buildings, solar panels, crop damage, and custom objects using pre-trained or fine-tuned models.',
  },
  {
    icon: GitCompare,
    title: 'Change Detection',
    description: 'Compare imagery across time periods to identify construction progress, deforestation, erosion, or unauthorized activity.',
  },
  {
    icon: BarChart3,
    title: 'Spectral Analytics',
    description: 'Compute NDVI, NDWI, EVI, SAVI, and custom band math formulas. Visualize vegetation health, water stress, and soil conditions.',
  },
  {
    icon: Ruler,
    title: 'Measurement Tools',
    description: 'Measure distances, areas, and volumes directly on the map. Export measurements for reporting and compliance.',
  },
  {
    icon: FileOutput,
    title: 'Flexible Exports',
    description: 'Download GeoTIFF, LAZ, OBJ, PDF reports, or integrate via REST API and webhooks. Supports all major GIS formats.',
  },
  {
    icon: Share2,
    title: 'Collaboration & Sharing',
    description: 'Share projects via public links with time-limited access. Role-based permissions for teams of any size.',
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Platform Features
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Everything you need to process, analyze, and deliver geospatial intelligence at enterprise scale.
            </p>
          </div>
        </section>

        <Features />

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                Advanced Capabilities
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Go beyond basic mapping
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {advancedFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-8 transition hover:border-brand-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HowItWorks />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
