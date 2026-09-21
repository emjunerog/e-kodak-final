/**
 * About.jsx — /about
 * ==================
 * FULL ABOUT PAGE
 *
 * Sections:
 *  1. PageHero
 *  2. Studio Story (text + image split)
 *  3. Stats bar
 *  4. Mission & Vision
 *  5. Core Values grid
 *  6. Meet the Team
 *  7. Studio Timeline
 *  8. Awards & Recognition
 *  9. CTA
 *
 * Data source: src/data/aboutData.js
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Award, Shield, Sparkles, ArrowRight, Trophy, Calendar } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import SectionHeader from "../components/ui/SectionHeader";
import TeamCard from "../components/about/TeamCard";

import {
  STUDIO_STORY,
  MISSION_VISION,
  CORE_VALUES,
  TIMELINE,
  AWARDS,
  STUDIO_STATS,
} from "../data/aboutData";
import { siteConfig } from "../config/siteConfig";
import { useScrollReveal } from "../lib/useScrollReveal";
import { getTeamMembers } from "../services/contentService";

// Map icon names from data to lucide components
const VALUE_ICONS = { Heart, Award, Shield, Sparkles };

export default function About() {
  const { ref: storyRef,    inView: storyIn    } = useScrollReveal();
  const { ref: statsRef,    inView: statsIn    } = useScrollReveal({ threshold: 0.3 });
  const { ref: mvRef,       inView: mvIn       } = useScrollReveal({ threshold: 0.1 });
  const { ref: valuesRef,   inView: valuesIn   } = useScrollReveal({ threshold: 0.05 });
  const { ref: teamRef,     inView: teamIn     } = useScrollReveal({ threshold: 0.03 });
  const { ref: timelineRef, inView: timelineIn } = useScrollReveal({ threshold: 0.05 });
  const { ref: awardsRef,   inView: awardsIn   } = useScrollReveal({ threshold: 0.1 });
  const { ref: ctaRef,      inView: ctaIn      } = useScrollReveal({ threshold: 0.2 });

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getTeamMembers()
      .then((res) => {
        if (isMounted) {
          setTeamMembers(res?.data || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching team members:", error);
        if (isMounted) {
          setTeamMembers([]); // Fallback to empty array
        }
      })
      .finally(() => {
        if (isMounted) {
          setTeamLoading(false);
        }
      });
    
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      <Navbar />

      <main id="main-content">

        {/* ── 1. Page Hero ──────────────────────────────────────────────────── */}
        <PageHero
          eyebrow="Our Story"
          title="About E-Kodak"
          subtitle="A photography studio built on passion, professionalism, and a genuine love for capturing moments that matter."
          image="https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=1920&q=85&auto=format&fit=crop"
          imageAlt="Photographer working in a studio setting"
        />

        {/* ── 2. Studio Story ───────────────────────────────────────────────── */}
        <section className="section-padding bg-surface" aria-labelledby="story-heading">
          <div className="container-custom">
            <div
              ref={storyRef}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-14 items-center transition-all duration-700 ease-smooth ${
                storyIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              {/* Text */}
              <div>
                <p className="font-body text-gold text-xs uppercase tracking-[0.2em] font-medium mb-3">
                  The Beginning
                </p>
                <h2
                  id="story-heading"
                  className="font-heading text-primary text-3xl sm:text-4xl leading-tight mb-6"
                >
                  {STUDIO_STORY.headline}
                </h2>
                <div className="space-y-4">
                  {STUDIO_STORY.paragraphs.map((para, i) => (
                    <p key={i} className="font-body text-neutral-500 text-base leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
                <div className="flex gap-6 mt-8 pt-6 border-t border-neutral-100">
                  <div>
                    <p className="font-heading text-primary text-2xl font-semibold">{STUDIO_STORY.founded}</p>
                    <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mt-0.5">Founded</p>
                  </div>
                  <div className="w-px bg-neutral-100" aria-hidden="true" />
                  <div>
                    <p className="font-heading text-primary text-base font-medium">{STUDIO_STORY.location}</p>
                    <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mt-0.5">Location</p>
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gold/5 rounded-3xl" aria-hidden="true" />
                <img
                  src={STUDIO_STORY.image}
                  alt={STUDIO_STORY.imageAlt}
                  className="relative z-10 w-full h-96 object-cover rounded-2xl shadow-warm-xl no-drag"
                  loading="lazy"
                />
                {/* Gold corner accent */}
                <div
                  className="absolute -bottom-3 -right-3 w-24 h-24 border-r-2 border-b-2 border-gold/40 rounded-br-2xl z-20"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Stats Bar ──────────────────────────────────────────────────── */}
        <div
          ref={statsRef}
          className={`bg-primary py-12 transition-all duration-700 ease-smooth ${
            statsIn ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Studio statistics"
        >
          <div className="container-custom">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {STUDIO_STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className="text-center"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <dt className="font-body text-neutral-400 text-xs uppercase tracking-[0.15em] mb-1">
                    {stat.label}
                  </dt>
                  <dd className="font-heading text-white text-3xl sm:text-4xl font-semibold">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── 4. Mission & Vision ───────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-labelledby="mv-heading">
          <div className="container-custom">
            <div
              ref={mvRef}
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 ease-smooth ${
                mvIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              {[MISSION_VISION.mission, MISSION_VISION.vision].map((item, i) => (
                <div
                  key={item.title}
                  className="p-8 rounded-2xl border border-neutral-200 bg-surface hover:border-gold/40 hover:shadow-warm-sm transition-all duration-300"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="w-10 h-1 bg-gold rounded-full mb-5" aria-hidden="true" />
                  <h3 className="font-heading text-primary text-2xl mb-4">{item.title}</h3>
                  <p className="font-body text-neutral-500 text-base leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Core Values ────────────────────────────────────────────────── */}
        <section className="section-padding bg-white" aria-labelledby="values-heading">
          <div className="container-custom">
            <div
              ref={valuesRef}
              className={`transition-all duration-700 ease-smooth ${
                valuesIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <SectionHeader
                eyebrow="What We Stand For"
                title="Our Core Values"
                subtitle="These principles guide every session, every edit, and every interaction we have with our clients."
                id="values-heading"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {CORE_VALUES.map((value, i) => {
                  const Icon = VALUE_ICONS[value.icon] || Heart;
                  return (
                    <div
                      key={value.id}
                      className="text-center p-6 rounded-2xl border border-neutral-100 hover:border-gold/30 hover:shadow-warm-sm transition-all duration-300 group"
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 text-gold group-hover:bg-gold/20 transition-colors duration-300 mb-4">
                        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <h3 className="font-heading text-primary text-lg mb-2">{value.title}</h3>
                      <p className="font-body text-neutral-500 text-sm leading-relaxed">{value.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Meet the Team ──────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-labelledby="team-heading">
          <div className="container-custom">
            <div
              ref={teamRef}
              className={`transition-all duration-700 ease-smooth ${
                teamIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <SectionHeader
                eyebrow="The People Behind the Lens"
                title="Meet Our Team"
                subtitle="Passionate professionals dedicated to making every session an experience worth remembering."
                id="team-heading"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamLoading ? (
                  // Loading skeletons
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse flex flex-col items-center">
                      <div className="w-48 h-48 rounded-full bg-neutral-200 mb-4"></div>
                      <div className="h-4 w-1/2 bg-neutral-200 rounded mb-2"></div>
                      <div className="h-3 w-1/3 bg-neutral-200 rounded"></div>
                    </div>
                  ))
                ) : (
                  teamMembers.map((member) => (
                    <TeamCard key={member.id} member={member} />
                  ))
                )}
              </div>
              <p className="font-body text-neutral-300 text-xs text-center mt-8 italic">
                * Team photos are placeholder images — will be replaced with real team photos before launch.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7. Timeline ───────────────────────────────────────────────────── */}
        <section className="section-padding bg-primary" aria-labelledby="timeline-heading">
          <div className="container-custom max-w-3xl">
            <div
              ref={timelineRef}
              className={`transition-all duration-700 ease-smooth ${
                timelineIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <SectionHeader
                eyebrow="Our Journey"
                title="Studio Timeline"
                light
                id="timeline-heading"
              />

              {/* Timeline items */}
              <div className="relative">
                {/* Vertical line */}
                <div
                  className="absolute left-6 top-0 bottom-0 w-px bg-white/10"
                  aria-hidden="true"
                />

                <ol className="space-y-8">
                  {TIMELINE.map((item, i) => (
                    <li
                      key={item.year}
                      className="relative flex items-start gap-8"
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      {/* Year bubble */}
                      <div
                        className="shrink-0 relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gold/15 border border-gold/30 text-gold font-heading text-xs font-semibold"
                        aria-label={`Year ${item.year}`}
                      >
                        <Calendar size={16} />
                      </div>

                      {/* Content */}
                      <div className="pt-3">
                        <span className="font-body text-gold text-xs font-medium uppercase tracking-wider">
                          {item.year}
                        </span>
                        <h3 className="font-heading text-white text-lg mt-0.5 mb-1">
                          {item.title}
                        </h3>
                        <p className="font-body text-neutral-400 text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Awards ─────────────────────────────────────────────────────── */}
        <section className="section-padding bg-surface" aria-labelledby="awards-heading">
          <div className="container-custom">
            <div
              ref={awardsRef}
              className={`transition-all duration-700 ease-smooth ${
                awardsIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <SectionHeader
                eyebrow="Recognition"
                title="Awards & Recognition"
                subtitle="We're proud to have been recognized by the communities we serve."
                id="awards-heading"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                {AWARDS.map((award, i) => (
                  <div
                    key={award.title}
                    className="flex flex-col items-center text-center p-6 rounded-2xl border border-neutral-100 hover:border-gold/30 hover:shadow-warm-sm transition-all duration-300"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <Trophy size={28} className="text-gold mb-3" strokeWidth={1.5} aria-hidden="true" />
                    <span className="font-body text-neutral-400 text-xs uppercase tracking-wider mb-1">
                      {award.year}
                    </span>
                    <h3 className="font-heading text-primary text-base font-medium mb-1">
                      {award.title}
                    </h3>
                    <p className="font-body text-neutral-400 text-xs">{award.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. CTA ────────────────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50 border-t border-neutral-100" ref={ctaRef}>
          <div
            className={`container-custom text-center transition-all duration-700 ease-smooth ${
              ctaIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="section-eyebrow">Work With Us</p>
            <h2 className="section-title mb-4">Ready to book your session?</h2>
            <p className="section-subtitle mx-auto text-center mb-8">
              We'd love to work with you. Browse our services and book your session online today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={siteConfig.routes.services} className="btn-primary inline-flex items-center gap-2">
                View Services <ArrowRight size={16} />
              </Link>
              <Link to={siteConfig.routes.contact} className="btn-outline">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
