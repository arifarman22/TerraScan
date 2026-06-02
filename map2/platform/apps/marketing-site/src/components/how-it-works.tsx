import { Upload, Cog, Map, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload Imagery',
    description: 'Drag & drop drone photos or connect satellite feeds. We support JPG, TIFF, DNG, and all major drone formats.',
  },
  {
    icon: Cog,
    step: '02',
    title: 'Automated Processing',
    description: 'Our engine generates orthomosaics, elevation models, point clouds, and spectral indices — with real-time progress.',
  },
  {
    icon: Map,
    step: '03',
    title: 'Analyze & Visualize',
    description: 'Explore results in the interactive map viewer. Overlay layers, measure areas, annotate, and run AI detection.',
  },
  {
    icon: Download,
    step: '04',
    title: 'Export & Share',
    description: 'Download GeoTIFFs, generate PDF reports, share via public links, or integrate via our REST API.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Simple Workflow
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From raw imagery to insights in minutes
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute top-10 left-1/2 hidden h-0.5 w-full bg-gradient-to-r from-brand-200 to-transparent lg:block" />
              )}
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm">
                <step.icon size={32} className="text-brand-600" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
