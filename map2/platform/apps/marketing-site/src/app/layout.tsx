import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TerraScan — AI-Powered Geospatial Intelligence',
  description:
    'Enterprise drone & satellite image processing platform for agriculture, construction, mining, and surveying.',
  keywords: ['drone mapping', 'satellite imagery', 'orthomosaic', 'photogrammetry', 'geospatial AI', 'precision agriculture'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
