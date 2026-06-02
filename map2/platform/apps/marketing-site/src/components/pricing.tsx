import { Check } from 'lucide-react';
import { APP_URL } from '@/lib/config';

const plans = [
  {
    name: 'Trial',
    price: 'Free',
    period: '14 days',
    description: 'Explore the platform with limited processing.',
    features: [
      '5 projects',
      '2 GB storage',
      'Standard quality processing',
      'Orthomosaic & DSM outputs',
      'Community support',
    ],
    cta: 'Start Free Trial',
    href: `${APP_URL}/register?plan=trial`,
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$299',
    period: '/month',
    description: 'For teams that need production-grade processing.',
    features: [
      'Unlimited projects',
      '100 GB storage',
      'High quality processing',
      'All output types (ortho, DSM, DTM, point cloud)',
      'Satellite imagery integration',
      'Spectral indices & analytics',
      'API access',
      'Priority support',
      '5 team members',
    ],
    cta: 'Get Started',
    href: `${APP_URL}/register?plan=professional`,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced security and scale needs.',
    features: [
      'Everything in Professional',
      'Unlimited storage',
      'Ultra quality processing',
      'SSO / SAML integration',
      'Custom roles & permissions',
      'Dedicated processing cluster',
      'On-premise deployment option',
      'SLA guarantee (99.9%)',
      'Unlimited team members',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@terrascan.ai',
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Plans that scale with your operations
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Start free, upgrade when you need more power.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-brand-300 bg-brand-50/30 shadow-lg shadow-brand-100/50 ring-1 ring-brand-200'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-slate-500">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">{plan.description}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
