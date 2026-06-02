import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';
import { Globe2, Shield, Zap, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — TerraScan',
  description: 'Learn about TerraScan, our mission, and the team building the future of geospatial intelligence.',
};

const values = [
  {
    icon: Globe2,
    title: 'Global Impact',
    description: 'We believe geospatial intelligence should be accessible to every organization, from smallholder farms to multinational enterprises.',
  },
  {
    icon: Zap,
    title: 'Speed & Accuracy',
    description: 'We obsess over processing speed and output quality. Every algorithm is benchmarked against ground truth data.',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Enterprise data demands enterprise security. Multi-tenant isolation, encryption at rest, and SOC2 compliance are non-negotiable.',
  },
  {
    icon: Users,
    title: 'Customer Obsession',
    description: 'We build what our customers need. Every feature starts with a real workflow problem from the field.',
  },
];

const stats = [
  { value: '10M+', label: 'Hectares processed' },
  { value: '500+', label: 'Organizations' },
  { value: '45+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Making Earth observation actionable for everyone
              </h1>
              <p className="mt-6 text-lg text-slate-600">
                TerraScan was founded with a simple belief: the explosion of aerial and
                satellite imagery should translate into better decisions — for farmers,
                builders, miners, and governments alike. We build the platform that
                bridges raw pixels and real-world action.
              </p>
            </div>

            <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-brand-700">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900">Our Values</h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              {values.map((value) => (
                <div key={value.title} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <value.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{value.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Our Mission</h2>
            <p className="mt-6 text-lg text-slate-600">
              To democratize geospatial intelligence by providing an end-to-end platform
              that transforms raw aerial and satellite imagery into actionable insights —
              enabling organizations of all sizes to make better decisions about the
              physical world.
            </p>
          </div>
        </section>

        <Cta />
      </main>
      <Footer />
    </>
  );
}
