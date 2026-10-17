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
import { motion } from "framer-motion";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import SectionHeader from "../components/ui/SectionHeader";
import TeamCard from "../components/about/TeamCard";
import { Counter, TiltCard } from "../components/ui/Interactive";

import {
  STUDIO_STORY,
  MISSION_VISION,
  CORE_VALUES,
  TIMELINE,
  AWARDS,
  STUDIO_STATS,
} from "../data/aboutData";
import { siteConfig } from "../config/siteConfig";
import {
  viewport,
  stagger,
  staggerChild,
  fadeUp,
  lineReveal,
  scalePop,
  ease,
} from "../lib/motion";
import { getTeamMembers } from "../services/contentService";

// Map icon names from data to lucide components
const VALUE_ICONS = { Heart, Award, Shield, Sparkles };

export default function About() {
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
          image="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=85&auto=format&fit=crop"
          imageAlt="Newlyweds holding hands with wedding rings and bouquet"
        />

        {/* ── 2. Studio Story ───────────────────────────────────────────────── */}
        <section className="section-padding bg-surface" aria-labelledby="story-heading">
          <div className="container-custom">
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center"
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              {/* Text */}
              <motion.div variants={stagger(0.09)}>
                <motion.p
                  variants={staggerChild}
                  className="font-body text-gold text-xs uppercase tracking-[0.2em] font-medium mb-3"
                >
                  The Beginning
                </motion.p>
                <div className="overflow-hidden mb-6">
                  <motion.h2
                    id="story-heading"
                    variants={lineReveal}
                    className="font-heading text-primary text-3xl sm:text-4xl leading-tight"
                  >
                    {STUDIO_STORY.headline}
                  </motion.h2>
                </div>
                <motion.div className="space-y-4" variants={stagger(0.08)}>
                  {STUDIO_STORY.paragraphs.map((para, i) => (
                    <motion.p
                      key={i}
                      variants={staggerChild}
                      className="font-body text-neutral-500 text-base leading-relaxed"
                    >
                      {para}
                    </motion.p>
                  ))}
                </motion.div>
                <motion.div
                  className="flex gap-6 mt-8 pt-6 border-t border-neutral-100"
                  variants={stagger(0.12)}
                >
                  <motion.div variants={staggerChild}>
                    <p className="font-heading text-primary text-2xl font-semibold">{STUDIO_STORY.founded}</p>
                    <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mt-0.5">Founded</p>
                  </motion.div>
                  <motion.div
                    className="w-px bg-neutral-100"
                    variants={{
                      hidden: { scaleY: 0 },
                      show: { scaleY: 1, transition: { duration: 0.7, ease: ease.expo } },
                    }}
                    aria-hidden="true"
                  />
                  <motion.div variants={staggerChild}>
                    <p className="font-heading text-primary text-base font-medium">{STUDIO_STORY.location}</p>
                    <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mt-0.5">Location</p>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Image */}
              <motion.div
                className="relative"
                variants={{
                  hidden: { opacity: 0, x: 48, scale: 0.94, rotate: 1.5 },
                  show: {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    rotate: 0,
                    transition: { duration: 1, ease: ease.spring },
                  },
                }}
              >
                <motion.div
                  className="absolute -inset-4 bg-gold/5 rounded-3xl"
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    show: {
                      opacity: 1,
                      scale: 1,
                      transition: { duration: 1.1, delay: 0.3, ease: ease.smooth },
                    },
                  }}
                  aria-hidden="true"
                />
                <div
                  className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-gold/10 blur-3xl animate-halo"
                  aria-hidden="true"
                />
                <img
                  src={STUDIO_STORY.image}
                  alt={STUDIO_STORY.imageAlt}
                  className="relative z-10 w-full h-96 object-cover rounded-2xl shadow-warm-xl no-drag animate-ken-burns"
                  loading="lazy"
                />
                {/* Gold corner accent */}
                <motion.div
                  className="absolute -bottom-3 -right-3 w-24 h-24 border-r-2 border-b-2 border-gold/40 rounded-br-2xl z-20"
                  variants={{
                    hidden: { opacity: 0, x: -12, y: -12 },
                    show: {
                      opacity: 1,
                      x: 0,
                      y: 0,
                      transition: { duration: 0.7, delay: 0.55, ease: ease.spring },
                    },
                  }}
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 3. Stats Bar ──────────────────────────────────────────────────── */}
        <motion.div
          className="relative overflow-hidden bg-primary py-12"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          aria-label="Studio statistics"
        >
          <div
            className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl animate-halo"
            aria-hidden="true"
          />
          <div
            className="absolute -right-10 -bottom-20 w-64 h-64 rounded-full bg-gold/[0.07] blur-3xl animate-halo"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          <div className="container-custom relative">
            <motion.dl
              className="grid grid-cols-2 lg:grid-cols-4 gap-8"
              variants={stagger(0.12, 0.1)}
            >
              {STUDIO_STATS.map((stat) => {
                // Split "500+", "4.9★" … into prefix / number / suffix so it can count up
                const m = String(stat.value).match(/^(\D*)(\d[\d,.]*)(.*)$/);
                const num = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
                const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
                return (
                  <motion.div
                    key={stat.label}
                    variants={scalePop}
                    whileHover={{ y: -6 }}
                    className="text-center"
                  >
                    <dt className="font-body text-neutral-400 text-xs uppercase tracking-[0.15em] mb-1">
                      {stat.label}
                    </dt>
                    <dd className="font-heading text-white text-3xl sm:text-4xl font-semibold">
                      {Number.isFinite(num) ? (
                        <Counter
                          value={num}
                          prefix={m[1]}
                          suffix={m[3]}
                          decimals={decimals}
                          duration={1.8}
                        />
                      ) : (
                        stat.value
                      )}
                    </dd>
                  </motion.div>
                );
              })}
            </motion.dl>
          </div>
        </motion.div>

        {/* ── 4. Mission & Vision ───────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-labelledby="mv-heading">
          <div className="container-custom">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              {[MISSION_VISION.mission, MISSION_VISION.vision].map((item) => (
                <motion.div
                  key={item.title}
                  variants={staggerChild}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="p-8 rounded-2xl border border-neutral-200 bg-surface hover:border-gold/40 hover:shadow-warm-sm transition-[border-color,box-shadow] duration-300 group"
                >
                  <motion.div
                    className="w-10 h-1 bg-gold rounded-full mb-5 origin-left"
                    variants={{
                      hidden: { scaleX: 0 },
                      show: { scaleX: 1, transition: { duration: 0.8, delay: 0.35, ease: ease.expo } },
                    }}
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-primary text-2xl mb-4">{item.title}</h3>
                  <p className="font-body text-neutral-500 text-base leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── 5. Core Values ────────────────────────────────────────────────── */}
        <section className="section-padding bg-white" aria-labelledby="values-heading">
          <div className="container-custom">
            <SectionHeader
              eyebrow="What We Stand For"
              title="Our Core Values"
              subtitle="These principles guide every session, every edit, and every interaction we have with our clients."
              id="values-heading"
            />
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              {CORE_VALUES.map((value) => {
                const Icon = VALUE_ICONS[value.icon] || Heart;
                return (
                  <motion.div
                    key={value.id}
                    variants={staggerChild}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="text-center p-6 rounded-2xl border border-neutral-100 hover:border-gold/30 hover:shadow-warm-sm transition-[border-color,box-shadow] duration-300 group"
                  >
                    <motion.div
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 text-gold group-hover:bg-gold/20 transition-colors duration-300 mb-4"
                      whileHover={{ rotate: 8, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 340, damping: 16 }}
                    >
                      <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                    </motion.div>
                    <h3 className="font-heading text-primary text-lg mb-2">{value.title}</h3>
                    <p className="font-body text-neutral-500 text-sm leading-relaxed">{value.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── 6. Meet the Team ──────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-labelledby="team-heading">
          <div className="container-custom">
            <SectionHeader
              eyebrow="The People Behind the Lens"
              title="Meet Our Team"
              subtitle="Passionate professionals dedicated to making every session an experience worth remembering."
              id="team-heading"
            />
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
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
                  <motion.div key={member.id} variants={staggerChild}>
                    <TiltCard className="w-full h-full" max={8} pull={1.02} glareColor="rgba(212,175,55,0.16)">
                      <TeamCard member={member} />
                    </TiltCard>
                  </motion.div>
                ))
              )}
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewport}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-body text-neutral-300 text-xs text-center mt-8 italic"
            >
              * Team photos are placeholder images — will be replaced with real team photos before launch.
            </motion.p>
          </div>
        </section>

        {/* ── 7. Timeline ───────────────────────────────────────────────────── */}
        <section className="section-padding bg-primary" aria-labelledby="timeline-heading">
          <div className="container-custom max-w-3xl">
            <SectionHeader
              eyebrow="Our Journey"
              title="Studio Timeline"
              light
              id="timeline-heading"
            />

            {/* Timeline items */}
            <motion.div
              className="relative"
              variants={stagger(0.16, 0.1)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              {/* Vertical line */}
              <motion.div
                className="absolute left-6 top-0 bottom-0 w-px bg-white/10 origin-top"
                variants={{
                  hidden: { scaleY: 0 },
                  show: { scaleY: 1, transition: { duration: 1.4, ease: ease.expo } },
                }}
                aria-hidden="true"
              />

              {/* Travelling gold pulse */}
              <motion.span
                className="absolute left-[19px] w-2.5 h-2.5 rounded-full bg-gold z-10"
                aria-hidden="true"
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                style={{ marginLeft: -2 }}
              />

              <ol className="space-y-8">
                {TIMELINE.map((item) => (
                  <motion.li
                    key={item.year}
                    variants={staggerChild}
                    className="relative flex items-start gap-8"
                  >
                    {/* Year bubble */}
                    <motion.div
                      variants={scalePop}
                      whileHover={{ scale: 1.12, rotate: -6 }}
                      transition={{ type: "spring", stiffness: 340, damping: 16 }}
                      className="shrink-0 relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gold/15 border border-gold/30 text-gold font-heading text-xs font-semibold"
                      aria-label={`Year ${item.year}`}
                    >
                      <Calendar size={16} />
                    </motion.div>

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
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          </div>
        </section>

        {/* ── 8. Awards ─────────────────────────────────────────────────────── */}
        <section className="section-padding bg-surface" aria-labelledby="awards-heading">
          <div className="container-custom">
            <SectionHeader
              eyebrow="Recognition"
              title="Awards & Recognition"
              subtitle="We're proud to have been recognized by the communities we serve."
              id="awards-heading"
            />
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
              variants={stagger(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              {AWARDS.map((award) => (
                <motion.div
                  key={award.title}
                  variants={staggerChild}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border border-neutral-100 hover:border-gold/30 hover:shadow-warm-sm transition-[border-color,box-shadow] duration-300"
                >
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Trophy size={28} className="text-gold mb-3" strokeWidth={1.5} aria-hidden="true" />
                  </motion.div>
                  <span className="font-body text-neutral-400 text-xs uppercase tracking-wider mb-1">
                    {award.year}
                  </span>
                  <h3 className="font-heading text-primary text-base font-medium mb-1">
                    {award.title}
                  </h3>
                  <p className="font-body text-neutral-400 text-xs">{award.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── 9. CTA ────────────────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50 border-t border-neutral-100">
          <motion.div
            className="container-custom text-center"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
          >
            <motion.p variants={staggerChild} className="section-eyebrow">
              Work With Us
            </motion.p>
            <div className="overflow-hidden">
              <motion.h2 variants={lineReveal} className="section-title mb-4">
                Ready to book your session?
              </motion.h2>
            </div>
            <motion.p variants={staggerChild} className="section-subtitle mx-auto text-center mb-8">
              We'd love to work with you. Browse our services and book your session online today.
            </motion.p>
            <motion.div
              variants={staggerChild}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link to={siteConfig.routes.services} className="btn-primary inline-flex items-center gap-2">
                  View Services <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link to={siteConfig.routes.contact} className="btn-outline">
                  Contact Us
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  );
}
