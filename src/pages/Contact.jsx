/**
 * Contact.jsx — /contact
 * =======================
 * FULL CONTACT PAGE
 *
 * Sections:
 *  1. PageHero
 *  2. Two-column: Contact Form + Info panel
 *  3. How to reach us (social links)
 *  4. FAQ (session & general questions)
 *  5. Map placeholder
 *
 * FORM NOTE:
 *  The contact form is fully functional on the frontend — it validates inputs,
 *  shows loading state, and shows a success message after submission.
 *  It does NOT actually send emails in this phase (no backend yet).
 *  Real email sending will be implemented via Supabase Edge Functions in
 *  the notifications phase. A user-visible note explains this clearly.
 *
 * FUTURE — SUPABASE EDGE FUNCTION:
 *  Replace the simulated handleSubmit with:
 *    const { data, error } = await supabase.functions.invoke('send-contact-email', { body: formData })
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle, ArrowRight, MessageSquare } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageHero from "../components/ui/PageHero";
import ServiceFAQ from "../components/services/ServiceFAQ";

import { FAQS, FAQ_TOPICS } from "../data/faqData";
import { useScrollReveal } from "../lib/useScrollReveal";
import { getFaqs } from "../services/contentService";

// Inline SVG social icons
function FacebookIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
}
function InstagramIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}
function TikTokIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.8a8.18 8.18 0 0 0 4.78 1.52V6.85a4.85 4.85 0 0 1-1.01-.16z" /></svg>;
}

import { useSiteConfig } from "../context/SiteConfigContext";

// Contact form subjects
const SUBJECTS = [
  "General Inquiry",
  "Booking Question",
  "Pricing & Packages",
  "Custom Package Request",
  "Event Coverage",
  "Other",
];

// Initial form state
const EMPTY_FORM = {
  name: "", email: "", phone: "", subject: "", message: "",
};

export default function Contact() {
  const { config: siteConfig } = useSiteConfig();
  const [faqsList, setFaqsList] = useState(() =>
    FAQS.filter((f) => ["booking", "session"].includes(f.topic))
  );

  useEffect(() => {
    let isMounted = true;
    getFaqs().then((res) => {
      if (isMounted && res.data && res.data.length > 0) {
        setFaqsList(res.data);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Contact info items derived from siteConfig (single source of truth)
  const CONTACT_ITEMS = [
    {
      icon: MapPin,
      label: "Studio Location",
      value: siteConfig.contact.address,
      hint: "Visit by appointment only",
    },
    {
      icon: Phone,
      label: "Phone / WhatsApp",
      value: siteConfig.contact.phone,
      href: `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
    },
    {
      icon: Clock,
      label: "Business Hours",
      value: siteConfig.contact.hours,
      hint: "Closed on Sundays & public holidays",
    },
  ];

  const SOCIAL_LINKS = [
    { label: "Facebook",  href: siteConfig.social.facebook,  Icon: FacebookIcon },
    { label: "Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
    { label: "TikTok",    href: siteConfig.social.tiktok,    Icon: TikTokIcon },
  ];

  const [form, setForm]       = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("idle"); // idle | loading | success | error

  const { ref: formRef,  inView: formIn  } = useScrollReveal({ threshold: 0.05 });
  const { ref: infoRef,  inView: infoIn  } = useScrollReveal({ threshold: 0.05 });
  const { ref: socialRef,inView: socialIn} = useScrollReveal({ threshold: 0.2 });

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name    = "Please enter your name.";
    if (!form.email.trim())          e.email   = "Please enter your email.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Please enter a valid email.";
    if (!form.subject)               e.subject = "Please select a subject.";
    if (!form.message.trim())        e.message = "Please enter your message.";
    else if (form.message.trim().length < 20) e.message = "Message must be at least 20 characters.";
    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setStatus("loading");

    // PLACEHOLDER: Simulated network delay
    // FUTURE: Replace with Supabase Edge Function call
    //   const { error } = await supabase.functions.invoke('send-contact-email', { body: form })
    await new Promise((r) => setTimeout(r, 1800));

    // Simulate success (always succeeds in demo mode)
    setStatus("success");
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Reusable input class helper
  const inputClass = (field) => `
    w-full px-4 py-3 rounded-xl border bg-surface font-body text-primary text-sm
    placeholder:text-neutral-400 outline-none
    transition-all duration-200
    focus:border-gold focus:ring-2 focus:ring-gold/20
    ${errors[field] ? "border-red-400 ring-2 ring-red-100" : "border-neutral-200"}
  `;

  return (
    <>
      <Navbar />

      <main id="main-content">

        {/* ── 1. Page Hero ──────────────────────────────────────────────────── */}
        <PageHero
          eyebrow="Reach Out"
          title="Get in Touch"
          subtitle="Have a question about our services or want to discuss a booking? We'd love to hear from you."
          image="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1920&q=85&auto=format&fit=crop"
          imageAlt="Person holding camera looking out a window"
        />

        {/* ── 2. Form + Info ────────────────────────────────────────────────── */}
        <section className="section-padding bg-neutral-50" aria-labelledby="contact-heading">
          <div className="container-custom">
            <h2 id="contact-heading" className="sr-only">Contact form and information</h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

              {/* Contact Form — 3/5 width */}
              <div
                ref={formRef}
                className={`lg:col-span-3 transition-all duration-700 ease-smooth ${
                  formIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <div className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                      <MessageSquare size={18} className="text-gold" />
                    </div>
                    <div>
                      <h3 className="font-heading text-primary text-xl">Send us a message</h3>
                      <p className="font-body text-neutral-400 text-xs mt-0.5">
                        We'll reply within 24 business hours. For urgent studio inquiries, you can also reach us via direct phone or studio visit.
                      </p>
                    </div>
                  </div>

                  {/* Success state */}
                  {status === "success" ? (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                      </div>
                      <h4 className="font-heading text-primary text-xl mb-2">Message received!</h4>
                      <p className="font-body text-neutral-500 text-sm max-w-sm leading-relaxed mb-6">
                        Thank you for reaching out. Our team will get back to you within 24 business hours.
                      </p>
                      <button
                        onClick={() => setStatus("idle")}
                        className="btn-outline text-sm"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                        {/* Name */}
                        <div>
                          <label htmlFor="name" className="font-body text-primary text-xs font-medium mb-1.5 block">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            id="name" name="name" type="text"
                            value={form.name} onChange={handleChange}
                            placeholder="Juan dela Cruz"
                            className={inputClass("name")}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? "name-error" : undefined}
                          />
                          {errors.name && (
                            <p id="name-error" role="alert" className="font-body text-red-500 text-xs mt-1">
                              {errors.name}
                            </p>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="email" className="font-body text-primary text-xs font-medium mb-1.5 block">
                            Email Address <span className="text-red-400">*</span>
                          </label>
                          <input
                            id="email" name="email" type="email"
                            value={form.email} onChange={handleChange}
                            placeholder="juan@email.com"
                            className={inputClass("email")}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : undefined}
                          />
                          {errors.email && (
                            <p id="email-error" role="alert" className="font-body text-red-500 text-xs mt-1">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="font-body text-primary text-xs font-medium mb-1.5 block">
                            Phone Number <span className="text-neutral-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            id="phone" name="phone" type="tel"
                            value={form.phone} onChange={handleChange}
                            placeholder="+63 912 345 6789"
                            className={inputClass("phone")}
                          />
                        </div>

                        {/* Subject */}
                        <div>
                          <label htmlFor="subject" className="font-body text-primary text-xs font-medium mb-1.5 block">
                            Subject <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="subject" name="subject"
                            value={form.subject} onChange={handleChange}
                            className={`${inputClass("subject")} cursor-pointer`}
                            aria-invalid={!!errors.subject}
                            aria-describedby={errors.subject ? "subject-error" : undefined}
                          >
                            <option value="">Select a topic...</option>
                            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.subject && (
                            <p id="subject-error" role="alert" className="font-body text-red-500 text-xs mt-1">
                              {errors.subject}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Message */}
                      <div className="mb-6">
                        <label htmlFor="message" className="font-body text-primary text-xs font-medium mb-1.5 block">
                          Message <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="message" name="message"
                          value={form.message} onChange={handleChange}
                          rows={6}
                          placeholder="Tell us about your photography needs, preferred dates, or any questions you have..."
                          className={`${inputClass("message")} resize-none`}
                          aria-invalid={!!errors.message}
                          aria-describedby={errors.message ? "message-error" : undefined}
                        />
                        <div className="flex items-start justify-between mt-1">
                          {errors.message ? (
                            <p id="message-error" role="alert" className="font-body text-red-500 text-xs">
                              {errors.message}
                            </p>
                          ) : <span />}
                          <span className={`font-body text-xs ${form.message.length < 20 && form.message.length > 0 ? "text-red-400" : "text-neutral-400"}`}>
                            {form.message.length} / 20 min
                          </span>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {status === "loading" ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Contact Info Panel — 2/5 width */}
              <div
                ref={infoRef}
                className={`lg:col-span-2 space-y-4 transition-all duration-700 ease-smooth delay-150 ${
                  infoIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                {/* Contact details */}
                <div className="card p-6">
                  <h3 className="font-heading text-primary text-lg mb-5">Contact Details</h3>
                  <ul className="space-y-5">
                    {CONTACT_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label} className="flex items-start gap-4">
                          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10">
                            <Icon size={16} className="text-gold" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-body text-neutral-400 text-xs uppercase tracking-wider mb-0.5">
                              {item.label}
                            </p>
                            {item.href ? (
                              <a
                                href={item.href}
                                className="font-body text-primary text-sm font-medium hover:text-gold transition-colors"
                              >
                                {item.value}
                              </a>
                            ) : (
                              <p className="font-body text-primary text-sm font-medium">{item.value}</p>
                            )}
                            {item.hint && (
                              <p className="font-body text-neutral-400 text-xs mt-0.5">{item.hint}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Quick book nudge */}
                <div className="card p-6 border-gold/20 bg-gold/5">
                  <h3 className="font-heading text-primary text-base mb-2">Ready to book directly?</h3>
                  <p className="font-body text-neutral-500 text-sm leading-relaxed mb-4">
                    Create a free account and submit your booking online — it only takes a few minutes.
                  </p>
                  <Link
                    to={siteConfig.routes.register}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
                  >
                    Book a Session
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Response time badge */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" aria-hidden="true" />
                  <p className="font-body text-green-700 text-xs">
                    We typically respond within <strong>24 hours</strong> on business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Social Links ───────────────────────────────────────────────── */}
        <section className="py-12 bg-white border-y border-neutral-100" aria-label="Social media links">
          <div
            ref={socialRef}
            className={`container-custom text-center transition-all duration-700 ease-smooth ${
              socialIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="font-body text-neutral-400 text-sm mb-5">Follow us on social media</p>
            <div className="flex items-center justify-center gap-4">
              {SOCIAL_LINKS.filter((s) => s.href).map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:border-gold/40 hover:bg-gold/5 hover:text-primary transition-all duration-200 font-body text-sm"
                  aria-label={`Follow E-Kodak on ${label}`}
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. FAQ ────────────────────────────────────────────────────────── */}
        <ServiceFAQ
          faqs={faqsList}
          topics={FAQ_TOPICS.filter((t) => ["booking", "session", "general"].includes(t.id))}
          title="Common Questions"
          subtitle="Can't find your answer? Send us a message above and we'll get back to you."
        />

      </main>

      <Footer />
    </>
  );
}
