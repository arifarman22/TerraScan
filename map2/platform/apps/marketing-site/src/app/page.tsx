import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { Industries } from '@/components/industries';
import { HowItWorks } from '@/components/how-it-works';
import { Pricing } from '@/components/pricing';
import { Cta } from '@/components/cta';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Industries />
        <HowItWorks />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
