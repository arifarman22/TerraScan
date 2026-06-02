import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Pricing } from '@/components/pricing';
import { Footer } from '@/components/footer';
import { Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing — TerraScan',
  description: 'Simple, transparent pricing for teams of all sizes. Start free, scale as you grow.',
};

const comparison = [
  { feature: 'Projects', trial: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Storage', trial: '2 GB', pro: '100 GB', enterprise: 'Unlimited' },
  { feature: 'Processing quality', trial: 'Standard', pro: 'High', enterprise: 'Ultra' },
  { feature: 'Team members', trial: '1', pro: '5', enterprise: 'Unlimited' },
  { feature: 'Orthomosaic output', trial: true, pro: true, enterprise: true },
  { feature: 'DSM / DTM', trial: true, pro: true, enterprise: true },
  { feature: 'Point cloud', trial: false, pro: true, enterprise: true },
  { feature: '3D mesh', trial: false, pro: true, enterprise: true },
  { feature: 'Satellite imagery', trial: false, pro: true, enterprise: true },
  { feature: 'Spectral indices', trial: false, pro: true, enterprise: true },
  { feature: 'AI detection', trial: false, pro: false, enterprise: true },
  { feature: 'API access', trial: false, pro: true, enterprise: true },
  { feature: 'SSO / SAML', trial: false, pro: false, enterprise: true },
  { feature: 'Custom roles', trial: false, pro: false, enterprise: true },
  { feature: 'On-premise option', trial: false, pro: false, enterprise: true },
  { feature: 'SLA guarantee', trial: false, pro: false, enterprise: true },
  { feature: 'Dedicated support', trial: false, pro: false, enterprise: true },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check size={16} className="text-accent-500" />
    ) : (
      <X size={16} className="text-slate-300" />
    );
  }
  return <span className="text-sm text-slate-700">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Start free. Upgrade when you need more power. No hidden fees.
            </p>
          </div>
        </section>

        <Pricing />

        <section className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900">
              Feature Comparison
            </h2>
            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 pr-4 text-sm font-semibold text-slate-900">Feature</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">Trial</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-700">Professional</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature} className="border-b border-slate-100">
                      <td className="py-3 pr-4 text-sm text-slate-700">{row.feature}</td>
                      <td className="px-4 py-3 text-center"><CellValue value={row.trial} /></td>
                      <td className="px-4 py-3 text-center bg-brand-50/30"><CellValue value={row.pro} /></td>
                      <td className="px-4 py-3 text-center"><CellValue value={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
            <div className="mt-12 space-y-6">
              {[
                { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel your subscription at any time from your account settings.' },
                { q: 'What happens after my trial ends?', a: 'Your data is preserved for 30 days. You can upgrade to continue or export your outputs.' },
                { q: 'Do you offer annual billing?', a: 'Yes — save 20% with annual billing. Contact sales for enterprise annual agreements.' },
                { q: 'Is there a per-image or per-job fee?', a: 'No. All plans include unlimited processing within your storage quota. No surprise charges.' },
                { q: 'Can I deploy on-premise?', a: 'Yes — the Enterprise plan includes an on-premise deployment option for air-gapped or classified environments.' },
              ].map((faq) => (
                <div key={faq.q} className="rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900">{faq.q}</h3>
                  <p className="mt-2 text-sm text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
