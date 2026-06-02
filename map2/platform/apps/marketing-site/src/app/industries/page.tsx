import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Industries } from '@/components/industries';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Industries — TerraScan',
  description: 'See how TerraScan serves agriculture, construction, mining, surveying, and government sectors.',
};

const caseStudies = [
  {
    industry: 'Agriculture',
    company: 'GreenField Farms',
    result: 'Reduced crop loss by 35% using weekly NDVI monitoring across 12,000 hectares.',
    metric: '35% less crop loss',
  },
  {
    industry: 'Construction',
    company: 'BuildCorp International',
    result: 'Cut site inspection costs by 60% with automated drone surveys and progress tracking.',
    metric: '60% cost reduction',
  },
  {
    industry: 'Mining',
    company: 'Atlas Mining Co.',
    result: 'Achieved 98% volumetric accuracy for stockpile measurements, replacing manual surveys.',
    metric: '98% accuracy',
  },
];

export default function IndustriesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Built for Your Industry
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              TerraScan powers geospatial workflows across agriculture, construction, mining, surveying, and government.
            </p>
          </div>
        </section>

        <Industries />

        <section className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                Case Studies
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Real results from real customers
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              {caseStudies.map((study) => (
                <div
                  key={study.company}
                  className="rounded-2xl border border-slate-200 bg-white p-8"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                    {study.industry}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{study.company}</h3>
                  <p className="mt-3 text-sm text-slate-600">{study.result}</p>
                  <p className="mt-4 text-2xl font-bold text-accent-600">{study.metric}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Cta />
      </main>
      <Footer />
    </>
  );
}
