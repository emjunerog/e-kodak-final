/**
 * Home.jsx
 * ========
 * THE LANDING PAGE — PUBLIC HOME
 *
 * Section order:
 *  0. AnnouncementBar    — Dismissable dynamic promotions ticker (Supabase-driven)
 *  1. Navbar             — Fixed top navigation
 *  2. Hero               — Immediate visual impact + CTAs
 *  3. IntroSection       — Build trust, explain the studio
 *  4. ServicesPreview    — Showcase what's offered
 *  5. PackageFinder      — Interactive 3-step plan matcher
 *  6. WhyChooseUs        — Differentiate from competition (dark section)
 *  7. GalleryShowcase    — Show actual photography quality
 *  8. HowItWorks         — Introduce the booking workflow
 *  9. MobileCompanion    — Preview the companion app (dark section)
 * 10. Testimonials       — Social proof
 * 11. CTASection         — Convert visitors to registrations
 * 12. Footer
 *
 * ARCHITECTURE NOTE:
 * Each section is a standalone component. Reordering or replacing
 * a section only requires editing this one file.
 */

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/landing/Hero";
import ServicesPreview from "../components/landing/ServicesPreview";
import PackageFinder from "../components/landing/PackageFinder";
import WhyChooseUs from "../components/landing/WhyChooseUs";
import GalleryShowcase from "../components/landing/GalleryShowcase";
import HowItWorks from "../components/landing/HowItWorks";
import MobileCompanionPreview from "../components/landing/MobileCompanionPreview";
import Testimonials from "../components/landing/Testimonials";
import CTASection from "../components/landing/CTASection";

export default function Home() {
  return (
    <>
      {/* ── 1. Navigation (Includes AnnouncementBar) ─────────────────────── */}
      <Navbar />

      {/* ── Main Sections (Clean, non-repetitive flow) ───────────────────── */}
      <main id="main-content">
        <Hero />
        <ServicesPreview />

        {/* Interactive Package Finder — user answers 3 Qs, gets recommendation */}
        <PackageFinder />

        <WhyChooseUs />
        <GalleryShowcase />
        <HowItWorks />
        <MobileCompanionPreview />
        <Testimonials />
        <CTASection />
      </main>

      {/* ── 12. Footer ────────────────────────────────────────────────────── */}
      <Footer />
    </>
  );
}
