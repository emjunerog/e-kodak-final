/**
 * Navbar.jsx
 * ==========
 * RESPONSIVE NAVIGATION BAR — dark luxury glass look
 *
 * Behavior:
 *  - Transparent over the hero section (top of page)
 *  - Transitions to a dark frosted-glass bar (neutral-950 + blur) when
 *    scrolled past 60px, with gold accents and pill-shaped controls
 *  - Desktop: logo + pill nav links (gold pill on active) + auth CTAs
 *  - Mobile: logo + hamburger → full-width slide-down menu drawer
 *
 * All labels and routes come from siteConfig.js — no hardcoding.
 *
 * Accessibility:
 *  - aria-label on nav landmark
 *  - aria-expanded on mobile menu button
 *  - aria-label on mobile menu button
 *  - keyboard-navigable links
 */

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { useAuth } from "../../context/AuthContext";
import AnnouncementBar from "../landing/AnnouncementBar";

// Desktop nav links (excludes Login and CTA which are styled separately)
const navLinks = [
  { label: siteConfig.nav.home,     to: siteConfig.routes.home },
  { label: siteConfig.nav.services, to: siteConfig.routes.services },
  { label: siteConfig.nav.gallery,  to: siteConfig.routes.gallery },
  { label: siteConfig.nav.about,    to: siteConfig.routes.about },
  { label: siteConfig.nav.contact,  to: siteConfig.routes.contact },
];

// Header choreography: `enter` = page-load drop-in, `show` = visible,
// `hide` = slid off-screen while scrolling down
const headerVariants = {
  enter: { y: -48, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  hide: { y: "-110%", opacity: 1, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } },
};

const navLinkList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const navLinkItem = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Navbar() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();

  // Pages without a dark hero need the glass bar from the very top
  const lightTop = pathname === "/privacy" || pathname === "/terms";

  // Resolve portal route & label strictly from verified profile role (wait for profile before rendering portal link)
  const resolvedRole = profile?.role ? String(profile.role).toLowerCase() : null;
  const portalLink =
    user && resolvedRole
      ? resolvedRole === "admin" || resolvedRole === "staff"
        ? { to: "/admin", label: "Admin Portal" }
        : resolvedRole === "photographer"
        ? { to: "/photographer", label: "Studio Portal" }
        : { to: "/dashboard", label: "My Dashboard" }
      : null;
  const [scrolled,     setScrolled]     = useState(typeof window !== 'undefined' && window.scrollY > 60);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [navHidden,    setNavHidden]    = useState(false);
  const lastY          = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const headerRef      = useRef(null);
  const navHRef        = useRef(100);
  const lastPubNavHRef = useRef("");
  const navHiddenRef   = useRef(false);
  const scrolledRef    = useRef(scrolled);
  const menuOpenRef    = useRef(menuOpen);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  // ── Publish header height → --nav-h (sticky bars below align to it) ────────
  // Only writes the CSS custom property when the resolved value actually changes.
  const publishNavH = () => {
    const nextVal = navHiddenRef.current ? "0px" : `${navHRef.current}px`;
    if (lastPubNavHRef.current !== nextVal) {
      lastPubNavHRef.current = nextVal;
      document.documentElement.style.setProperty("--nav-h", nextVal);
    }
  };

  const applyNavHidden = (value) => {
    if (navHiddenRef.current !== value) {
      navHiddenRef.current = value;
      setNavHidden(value);
      publishNavH();
    }
  };

  // Measure the real header height (announcement bar included) on mount,
  // resize, and whenever the announcement bar shows/hides.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => {
      navHRef.current = el.offsetHeight;
      publishNavH();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reading progress — gold line tracking scroll depth ─────────────────────
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 28, restDelta: 0.002 });

  // ── Scroll Detection + smart hide/show (rAF-throttled) ─────────────────────
  useEffect(() => {
    let rafId = null;

    const updateOnScroll = () => {
      rafId = null;
      const y = window.scrollY;
      const nextScrolled = y > 60;
      if (scrolledRef.current !== nextScrolled) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }

      if (menuOpenRef.current || y <= 60) {
        applyNavHidden(false);
        lastY.current = y;
        return;
      }

      const delta = y - lastY.current;
      if (delta > 40) {
        applyNavHidden(true);
        lastY.current = y;
      } else if (delta < -40) {
        applyNavHidden(false);
        lastY.current = y;
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateOnScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mobile Menu: lock body scroll when open ─────────────────────────────────
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  // ── Navbar class — subtle studio scrim at top, rich frosted glass on scroll ─
  const navClass =
    scrolled || lightTop
      ? "bg-neutral-950/90 backdrop-blur-xl border-b border-white/10 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)]"
      : "bg-gradient-to-b from-neutral-950/70 via-neutral-950/35 to-transparent";

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────────────────────────────── */}
      <motion.header
        ref={headerRef}
        className={`
          fixed top-0 left-0 right-0 z-50 flex flex-col
          transition-[background-color,box-shadow,border-color] duration-300 ease-smooth
          ${navClass}
        `}
        role="banner"
        variants={headerVariants}
        initial="enter"
        animate={navHidden ? "hide" : "show"}
      >
        <AnnouncementBar />
        <nav
          className="w-full max-w-screen-2xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] h-18 md:h-20 gap-4"
          aria-label="Main navigation"
        >
          {/* ── Left: Logo ─────────────────────────────────────────────────── */}
          <motion.div
            variants={navLinkItem}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="shrink-0 justify-self-start"
          >
            <Link
              to={siteConfig.routes.home}
              className="flex items-center gap-2 sm:gap-2.5 font-heading font-semibold text-lg sm:text-xl tracking-tight text-white hover:text-gold-light transition-colors duration-200 whitespace-nowrap"
              aria-label={`${siteConfig.name} — Home`}
            >
              <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-transparent shrink-0">
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain drop-shadow-sm" />
              </span>
              <span className="font-heading font-semibold tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
          </motion.div>

          {/* ── Center: Desktop Navigation Pill Dock ──────────────────────── */}
          <motion.ul
            className="hidden md:inline-flex items-center justify-center gap-1 lg:gap-2 px-2 py-1.5 rounded-full bg-neutral-950/55 border border-white/12 backdrop-blur-md shadow-[0_8px_28px_-8px_rgba(0,0,0,0.45)] justify-self-center"
            role="list"
            variants={navLinkList}
            initial="hidden"
            animate="show"
          >
            {navLinks.map((link) => (
              <motion.li key={link.to} variants={navLinkItem} className="shrink-0">
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `
                    relative block px-3.5 py-1.5 lg:px-4.5 lg:py-2 rounded-full
                    font-body text-xs lg:text-sm font-medium whitespace-nowrap
                    transition-colors duration-200
                    ${isActive
                      ? "text-primary font-semibold"
                      : "text-white/80 hover:text-white hover:bg-white/8"
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-gold to-gold-light shadow-sm"
                          transition={{ type: "spring", stiffness: 460, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{link.label}</span>
                    </>
                  )}
                </NavLink>
              </motion.li>
            ))}
          </motion.ul>

          {/* ── Right: Desktop Auth CTA ───────────────────────────────────── */}
          <motion.div
            className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0 justify-self-end"
            variants={navLinkItem}
            initial="hidden"
            animate="show"
          >
            {portalLink ? (
              /* Authenticated user: role-accurate portal pill */
              <Link
                to={portalLink.to}
                className="inline-flex items-center gap-1.5 font-body text-xs lg:text-sm font-medium px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-full bg-neutral-950/55 border border-white/15 text-white/95 backdrop-blur-md shadow-sm hover:border-gold/60 hover:bg-gold hover:text-primary transition-[background-color,color,border-color] duration-200 whitespace-nowrap group"
              >
                <LayoutDashboard size={14} className="text-gold group-hover:text-primary transition-colors duration-200 shrink-0" />
                {portalLink.label}
              </Link>
            ) : (
              /* Guests & Administrative users: Login + Book a Session */
              <>
                <Link
                  to={siteConfig.routes.login}
                  className="font-body text-xs lg:text-sm font-medium px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-full bg-neutral-950/55 border border-white/15 text-white/90 backdrop-blur-md hover:border-gold hover:text-gold-light transition-[border-color,color,background-color] duration-200 whitespace-nowrap"
                >
                  {siteConfig.nav.login}
                </Link>
                <Link
                  to={siteConfig.routes.register}
                  className="font-body text-xs lg:text-sm font-semibold px-3.5 py-1.5 lg:px-4.5 lg:py-2 rounded-full bg-gradient-to-r from-gold to-gold-light text-primary shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 whitespace-nowrap"
                >
                  {siteConfig.nav.bookCta}
                </Link>
              </>
            )}
          </motion.div>

          {/* ── Mobile Menu Button ────────────────────────────────────────── */}
          <motion.button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-white/25 text-white hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 420, damping: 18 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                {menuOpen
                  ? <X size={22} strokeWidth={2} />
                  : <Menu size={22} strokeWidth={2} />
                }
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </nav>

        {/* Scroll progress line */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-gold via-gold-light to-gold transition-opacity duration-300"
          style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
        />
      </motion.header>

      {/* ── Mobile Menu Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-primary/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              className="
                fixed top-0 right-0 bottom-0 z-50
                w-4/5 max-w-xs
                bg-white shadow-warm-xl
                flex flex-col
              "
              initial={{ x: "110%" }}
              animate={{ x: 0 }}
              exit={{ x: "110%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              {/* Drawer Header — dark cap matching the top bar */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-neutral-950">
                <Link
                  to={siteConfig.routes.home}
                  className="flex items-center gap-2 font-heading font-semibold text-lg text-white"
                  onClick={closeMenu}
                >
                  <motion.span
                    className="flex items-center justify-center w-8 h-8 bg-transparent shrink-0"
                    initial={{ rotate: -25, scale: 0.7 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.18, type: "spring", stiffness: 460, damping: 16 }}
                  >
                    <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
                  </motion.span>
                  {siteConfig.name}
                </Link>
                <motion.button
                  onClick={closeMenu}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-white/25 text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Drawer Navigation */}
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <ul className="space-y-1" role="list">
                  {navLinks.map((link, index) => (
                    <motion.li
                      key={link.to}
                      initial={{ opacity: 0, x: 26 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.14 + index * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <NavLink
                        to={link.to}
                        onClick={closeMenu}
                        className={({ isActive }) => `
                          flex items-center px-4 py-3 rounded-xl
                          font-body text-sm font-medium
                          transition-colors duration-200
                          ${isActive
                            ? "bg-gold/10 text-gold"
                            : "text-neutral-700 hover:bg-neutral-50 hover:text-primary"
                          }
                        `}
                      >
                        {link.label}
                      </NavLink>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Drawer Footer CTAs */}
              <motion.div
                className="px-6 py-6 border-t border-neutral-100 space-y-3"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {portalLink ? (
                  <Link
                    to={portalLink.to}
                    onClick={closeMenu}
                    className="btn-primary w-full text-center flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard size={16} />
                    {portalLink.label}
                  </Link>
                ) : (
                  <>
                    <Link
                      to={siteConfig.routes.login}
                      onClick={closeMenu}
                      className="btn-outline w-full text-center"
                    >
                      {siteConfig.nav.login}
                    </Link>
                    <Link
                      to={siteConfig.routes.register}
                      onClick={closeMenu}
                      className="btn-primary w-full text-center"
                    >
                      {siteConfig.nav.bookCta}
                    </Link>
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
