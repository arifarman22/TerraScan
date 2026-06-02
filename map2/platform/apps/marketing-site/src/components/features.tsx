import {
  Camera,
  Cpu,
  Globe2,
  Layers3,
  Lock,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: 'Drone Photogrammetry',
    description:
      'Upload drone imagery and generate high-resolution orthomosaics, DSMs, DTMs, and 3D point clouds with enterprise-grade accuracy.',
  },
  {
    icon: Globe2,
    title: 'Satellite Analytics',
    description:
      'Access Sentinel-2, Planet, and commercial satellite feeds. Compute NDVI, NDWI, and custom spectral indices at scale.',
  },
  {
    icon: Cpu,
    title: 'AI-Powered Detection',
    description:
      'Machine learning models for object detection, change analysis, land cover classification, and anomaly identification.',
  },
  {
    icon: Layers3,
    title: 'Multi-Layer Viewer',
    description:
      'Interactive geospatial viewer with raster overlays, point cloud rendering, annotations, and measurement tools.',
  },
  {
    icon: Zap,
    title: 'Real-Time Processing',
    description:
      'Distributed processing engine with live progress tracking. From upload to deliverable in minutes, not hours.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description:
      'Multi-tenant isolation, RBAC, SSO/SAML, audit logging, API keys, and row-level security. SOC2 ready.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Platform Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need for geospatial intelligence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            One platform to ingest, process, analyze, and deliver insights from
            aerial and satellite imagery.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                <feature.icon size={24} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
