import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Blog — TerraScan',
  description: 'Insights on drone mapping, satellite analytics, photogrammetry, and geospatial AI.',
};

const posts = [
  {
    title: 'How AI is Transforming Precision Agriculture',
    excerpt: 'Learn how multispectral drone imagery combined with machine learning is helping farmers detect crop stress weeks before it becomes visible.',
    date: '2026-05-20',
    category: 'Agriculture',
    readTime: '5 min read',
  },
  {
    title: 'Drone Photogrammetry vs. LiDAR: When to Use What',
    excerpt: 'A practical comparison of photogrammetry and LiDAR for surveying, construction, and mining applications.',
    date: '2026-05-15',
    category: 'Technology',
    readTime: '8 min read',
  },
  {
    title: 'Building Enterprise-Grade Multi-Tenant Geospatial Platforms',
    excerpt: 'Technical deep-dive into row-level security, tenant isolation, and RBAC for SaaS geospatial applications.',
    date: '2026-05-10',
    category: 'Engineering',
    readTime: '12 min read',
  },
  {
    title: 'Satellite Change Detection for Construction Progress Monitoring',
    excerpt: 'How bi-weekly Sentinel-2 imagery can automate construction site progress reporting at scale.',
    date: '2026-05-05',
    category: 'Construction',
    readTime: '6 min read',
  },
  {
    title: 'Getting Started with NDVI: A Practical Guide',
    excerpt: 'Everything you need to know about the Normalized Difference Vegetation Index — from theory to actionable insights.',
    date: '2026-04-28',
    category: 'Tutorials',
    readTime: '7 min read',
  },
];

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Blog
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
                Insights on geospatial technology, industry use cases, and platform updates.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.title}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden transition hover:border-brand-200 hover:shadow-md"
                >
                  <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-50" />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
                        {post.category}
                      </span>
                      <span>{post.readTime}</span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-brand-700 transition">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm text-slate-600">{post.excerpt}</p>
                    <p className="mt-4 text-xs text-slate-400">
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
