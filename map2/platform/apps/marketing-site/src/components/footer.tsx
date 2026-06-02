import { Satellite } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'API Docs', href: 'https://docs.terrascan.ai' },
    { label: 'Changelog', href: '/blog' },
    { label: 'Status', href: 'https://status.terrascan.ai' },
  ],
  Industries: [
    { label: 'Agriculture', href: '/industries' },
    { label: 'Construction', href: '/industries' },
    { label: 'Mining', href: '/industries' },
    { label: 'Surveying', href: '/industries' },
    { label: 'Government', href: '/industries' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/contact' },
    { label: 'Contact', href: '/contact' },
    { label: 'Partners', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security', href: '/security' },
    { label: 'GDPR', href: '/gdpr' },
    { label: 'DPA', href: '/dpa' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
              <Satellite size={22} />
              TerraScan
            </a>
            <p className="mt-3 text-sm text-slate-500">
              AI-powered geospatial intelligence for enterprises.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-slate-900">{category}</h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition hover:text-brand-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} TerraScan. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="https://twitter.com/terrascanai" className="hover:text-brand-600">Twitter</a>
            <a href="https://linkedin.com/company/terrascan" className="hover:text-brand-600">LinkedIn</a>
            <a href="https://github.com/terrascan" className="hover:text-brand-600">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
