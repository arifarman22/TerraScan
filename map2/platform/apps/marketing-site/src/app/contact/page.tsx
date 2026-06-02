import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — TerraScan',
  description: 'Get in touch with the TerraScan team. Sales inquiries, support, and partnerships.',
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Get in Touch
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
                Have questions? Want a demo? Our team is ready to help.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
              {/* Contact Form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Send us a message</h2>
                <form className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">First name</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Last name</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Work email</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Company</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Interest</label>
                    <select className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none">
                      <option>Product demo</option>
                      <option>Enterprise pricing</option>
                      <option>Partnership</option>
                      <option>Technical support</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Message</label>
                    <textarea
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none"
                      placeholder="Tell us about your use case..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Send Message
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Contact Information</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Reach out directly or fill out the form and we'll get back to you within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Email</p>
                      <a href="mailto:hello@terrascan.ai" className="text-sm text-brand-600 hover:underline">
                        hello@terrascan.ai
                      </a>
                      <br />
                      <a href="mailto:sales@terrascan.ai" className="text-sm text-brand-600 hover:underline">
                        sales@terrascan.ai
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Phone</p>
                      <p className="text-sm text-slate-600">+1 (555) 000-0000</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Office</p>
                      <p className="text-sm text-slate-600">
                        123 Innovation Drive<br />
                        San Francisco, CA 94105<br />
                        United States
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-sm font-semibold text-slate-900">Enterprise & Government</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Need a custom deployment, dedicated infrastructure, or compliance certifications?
                    Our enterprise team can help.
                  </p>
                  <a
                    href="mailto:enterprise@terrascan.ai"
                    className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
                  >
                    enterprise@terrascan.ai →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
