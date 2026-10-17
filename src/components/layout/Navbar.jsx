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
import { Menu, X, Camera, LayoutDashboard } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { useAuth } from "../../context/AuthContext";
import AnnouncementBar from "../landing/AnnouncementBar";
import { Magnetic } from "../ui/Interactive";

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
  enter: { y: -72, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  hide: { y: "-110%", opacity: 1, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
};

const navLinkList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.32 } },
};

const navLinkItem = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Navbar() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();

  // Pages without a dark hero need the glass bar from the very top
  const lightTop = pathname === "/privacy" || pathname === "/terms";

  // Landing page displays "My Dashboard" ONLY for customer accounts
  const isCustomer = user && (!profile || profile.role === 'customer');
  const [scrolled,     setScrolled]     = useState(typeof window !== 'undefined' && window.scrollY > 60);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [navHidden,    setNavHidden]    = useState(false);
  const lastY          = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const headerRef      = useRef(null);
  const navHRef        = useRef(100);
  const navHiddenRef   = useRef(false);

  // ── Publish header height → --nav-h (sticky bars below align to it) ────────
  // While the bar is hidden the offset collapses to 0 so the sticky category
  // filter rises to the top edge instead of leaving a dead gap.
  const publishNavH = () => {
    document.documentElement.style.setProperty(
      "--nav-h",
      navHiddenRef.current ? "0px" : `${navHRef.current}px`
    );
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
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reading progress — gold line tracking scroll depth ─────────────────────
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 28, restDelta: 0.001 });

  // ── Scroll Detection + smart hide/show ─────────────────────────────────────
  // Scrolling down past the top → bar slides away; scrolling up → returns.
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);

      // Always visible at the top of the page or while the mobile menu is open
      if (menuOpen || y <= 60) {
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

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

  // ── Navbar class — transparent at top, dark frosted glass on scroll ───────
  const navClass =
    scrolled || lightTop
      ? "bg-neutral-950/85 backdrop-blur-xl border-b border-white/10 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.65)]"
      : "bg-transparent";

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────────────────────────────── */}
      <motion.header
        ref={headerRef}
        className={`
          fixed top-0 left-0 right-0 z-50 flex flex-col
          transition-[background-color,box-shadow,border-color,backdrop-filter] duration-400 ease-smooth
          ${navClass}
        `}
        role="banner"
        variants={headerVariants}
        initial="enter"
        animate={navHidden ? "hide" : "show"}
      >
        <AnnouncementBar />
        <nav
          className="container-custom flex items-center justify-between h-16 md:h-20 gap-3 sm:gap-4 lg:gap-8"
          aria-label="Main navigation"
        >
          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <motion.div
            variants={navLinkItem}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="shrink-0 mr-2 sm:mr-4 lg:mr-8"
          >
            <Link
              to={siteConfig.routes.home}
              className="flex items-center gap-2 sm:gap-2.5 font-heading font-semibold text-lg sm:text-xl tracking-tight text-white hover:text-gold transition-colors duration-300 whitespace-nowrap"
              aria-label={`${siteConfig.name} — Home`}
            >
              <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-950 border border-neutral-800 p-1 shadow-md shrink-0">
                <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
              </span>
              <span className="font-heading font-semibold tracking-tight">
                {siteConfig.name}
              </span>
            </Link>
          </motion.div>

          {/* ── Desktop Navigation ────────────────────────────────────────── */}
          <motion.ul
            className="hidden md:flex items-center justify-center gap-0.5 lg:gap-1.5 flex-1 max-w-xl mx-auto"
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
                    relative block px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-full
                    font-body text-xs lg:text-sm font-medium whitespace-nowrap
                    transition-colors duration-200
                    ${isActive ? "text-gold" : "text-neutral-200/90 hover:text-white"}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-full bg-gold/15 border border-gold/40 backdrop-blur-sm"
                          transition={{ type: "spring", stiffness: 480, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">{link.label}</span>
                    </>
                  )}
                </NavLink>
              </motion.li>
            ))}
          </motion.ul>

          {/* ── Desktop Auth CTA ──────────────────────────────────────────── */}
          <motion.div
            className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0 ml-2 sm:ml-4 lg:ml-8"
            variants={navLinkItem}
            initial="hidden"
            animate="show"
          >
            {isCustomer ? (
              /* Customer logged in: show My Dashboard */
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 lg:gap-2 font-body text-xs lg:text-sm font-medium px-3 lg:px-4 py-1.5 rounded-full border border-white/25 bg-white/5 text-white backdrop-blur-sm hover:border-gold hover:text-gold transition-all duration-300 whitespace-nowrap"
                >
                  <LayoutDashboard size={15} />
                  My Dashboard
                </Link>
              </motion.div>
            ) : (
              /* Guests & Administrative users: Login + Book a Session */
              <>
                <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}>
                  <Link
                    to={siteConfig.routes.login}
                    className="font-body text-xs lg:text-sm font-medium px-3 lg:px-4 py-1.5 rounded-full border border-white/25 text-neutral-200 hover:border-gold hover:text-gold transition-all duration-200 whitespace-nowrap"
                  >
                    {siteConfig.nav.login}
                  </Link>
                </motion.div>
                <Magnetic strength={0.3} pull={1.06}>
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  >
                    <Link
                      to={siteConfig.routes.register}
                      className="font-body text-xs lg:text-sm font-semibold px-4 lg:px-5 py-1.5 lg:py-2 rounded-full bg-gradient-to-r from-gold to-gold-light text-primary hover:shadow-gold-lg transition-all duration-300 whitespace-nowrap"
                    >
                      {siteConfig.nav.bookCta}
                    </Link>
                  </motion.div>
                </Magnetic>
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
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 p-1 shadow-md shrink-0"
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
                {isCustomer ? (
                  <Link
                    to="/dashboard"
                    onClick={closeMenu}
                    className="btn-primary w-full text-center flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard size={16} />
                    My Dashboard
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
