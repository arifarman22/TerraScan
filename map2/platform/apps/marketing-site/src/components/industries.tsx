import { Sprout, HardHat, Mountain, Compass, Building2, Shield } from 'lucide-react';

const industries = [
  {
    icon: Sprout,
    name: 'Agriculture',
    description: 'Crop health monitoring, yield estimation, irrigation planning, and pest detection with multispectral analytics.',
    stats: '40% faster crop assessments',
  },
  {
    icon: HardHat,
    name: 'Construction',
    description: 'Site progress tracking, volumetric measurements, as-built vs. design comparison, and safety compliance monitoring.',
    stats: '60% reduction in site visits',
  },
  {
    icon: Mountain,
    name: 'Mining',
    description: 'Stockpile volumetrics, pit progression analysis, environmental compliance, and tailings dam monitoring.',
    stats: '95% volumetric accuracy',
  },
  {
    icon: Compass,
    name: 'Surveying',
    description: 'Topographic mapping, boundary surveys, corridor mapping, and GCP-based georeferencing with cm-level accuracy.',
    stats: '10x faster than traditional surveys',
  },
  {
    icon: Building2,
    name: 'Urban Planning',
    description: 'City-scale 3D modeling, land use classification, infrastructure inspection, and change detection over time.',
    stats: 'Cover 1000+ hectares per flight',
  },
  {
    icon: Shield,
    name: 'Government & Defense',
    description: 'Border monitoring, disaster response mapping, environmental assessment, and classified-ready deployment options.',
    stats: 'On-premise deployment available',
  },
];

export function Industries() {
  return (
    <section id="industries" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Built For Your Industry
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Trusted across industries worldwide
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="flex flex-col rounded-2xl border border-slate-200 p-7 transition hover:border-brand-200 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600">
                <industry.icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {industry.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {industry.description}
              </p>
              <p className="mt-4 text-xs font-semibold text-accent-600">
                {industry.stats}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
