/**
 * Navbar.jsx
 * ==========
 * RESPONSIVE NAVIGATION BAR
 *
 * Behavior:
 *  - Transparent over the hero section (top of page)
 *  - Transitions to solid white background when scrolled past 60px
 *  - Desktop: logo + nav links + Login button + "Book a Session" CTA
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

import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Camera, LayoutDashboard } from "lucide-react";
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

export default function Navbar() {
  const { user, profile } = useAuth();

  // Landing page displays "My Dashboard" ONLY for customer accounts
  const isCustomer = user && (!profile || profile.role === 'customer');
  const [scrolled,     setScrolled]     = useState(typeof window !== 'undefined' && window.scrollY > 60);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [menuVisible,  setMenuVisible]  = useState(false);

  // ── Scroll Detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Mobile Menu: lock body scroll when open ─────────────────────────────────
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      // Tiny delay so the drawer animation triggers after mount
      requestAnimationFrame(() => setMenuVisible(true));
    } else {
      const timer = setTimeout(() => {
        document.body.style.overflow = "";
        setMenuVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  // ── Navbar class — transparent at top, solid white on scroll ───────────────
  const navClass = scrolled
    ? "bg-white/95 backdrop-blur-md shadow-warm-sm border-b border-neutral-100"
    : "bg-transparent";

  // ── Text color — white on transparent hero, dark on solid background ────────
  const textColor = scrolled ? "text-primary" : "text-white";
  const linkHover = scrolled
    ? "hover:text-gold"
    : "hover:text-gold-light";

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────────────────────────────── */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 flex flex-col
          transition-all duration-400 ease-smooth
          ${navClass}
        `}
        role="banner"
      >
        <AnnouncementBar />
        <nav
          className="container-custom flex items-center justify-between h-16 md:h-20"
          aria-label="Main navigation"
        >
          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <Link
            to={siteConfig.routes.home}
            className={`flex items-center gap-2.5 font-heading font-semibold text-xl tracking-tight ${textColor} transition-colors duration-300`}
            aria-label={`${siteConfig.name} — Home`}
          >
            <span
              className={`
                flex items-center justify-center w-8 h-8 rounded-lg
                ${scrolled ? "bg-primary text-white" : "bg-white/20 text-white backdrop-blur-sm"}
                transition-all duration-300
              `}
            >
              <Camera size={16} strokeWidth={2} />
            </span>
            {siteConfig.name}
          </Link>

          {/* ── Desktop Navigation ────────────────────────────────────────── */}
          <ul className="hidden md:flex items-center gap-1" role="list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `
                    relative px-4 py-2 rounded-lg
                    font-body text-sm font-medium
                    transition-all duration-200
                    ${textColor} ${linkHover}
                    ${isActive
                      ? scrolled
                        ? "text-gold bg-gold/8"
                        : "text-gold-light"
                      : ""
                    }
                  `}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* ── Desktop Auth CTA ──────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {isCustomer ? (
              /* Customer logged in: show My Dashboard */
              <Link
                to="/dashboard"
                className={`
                  flex items-center gap-2 font-body text-sm font-medium px-4 py-2 rounded-lg
                  transition-all duration-300
                  ${scrolled
                    ? "bg-primary text-white hover:bg-primary-light hover:shadow-warm-md"
                    : "bg-white text-primary hover:bg-gold hover:text-white"}
                `}
              >
                <LayoutDashboard size={16} />
                My Dashboard
              </Link>
            ) : (
              /* Guests & Administrative users: Login + Book a Session */
              <>
                <Link
                  to={siteConfig.routes.login}
                  className={`
                    font-body text-sm font-medium px-4 py-2 rounded-lg
                    transition-all duration-200
                    ${textColor} ${linkHover}
                  `}
                >
                  {siteConfig.nav.login}
                </Link>
                <Link
                  to={siteConfig.routes.register}
                  className={`
                    font-body text-sm font-medium px-5 py-2.5 rounded-lg
                    transition-all duration-300
                    ${scrolled
                      ? "bg-primary text-white hover:bg-primary-light hover:shadow-warm-md"
                      : "bg-white text-primary hover:bg-gold hover:text-white hover:shadow-gold"
                    }
                  `}
                >
                  {siteConfig.nav.bookCta}
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Menu Button ────────────────────────────────────────── */}
          <button
            className={`
              md:hidden flex items-center justify-center w-10 h-10 rounded-lg
              ${textColor}
              ${scrolled ? "hover:bg-neutral-100" : "hover:bg-white/20"}
              transition-all duration-200
            `}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen
              ? <X size={22} strokeWidth={2} />
              : <Menu size={22} strokeWidth={2} />
            }
          </button>
        </nav>
      </header>

      {/* ── Mobile Menu Overlay ──────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`
              fixed inset-0 z-40 bg-primary/60 backdrop-blur-sm
              transition-opacity duration-300
              ${menuVisible ? "opacity-100" : "opacity-0"}
            `}
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className={`
              fixed top-0 right-0 bottom-0 z-50
              w-4/5 max-w-xs
              bg-white shadow-warm-xl
              flex flex-col
              transition-transform duration-300 ease-smooth
              ${menuVisible ? "translate-x-0" : "translate-x-full"}
            `}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <Link
                to={siteConfig.routes.home}
                className="flex items-center gap-2 font-heading font-semibold text-lg text-primary"
                onClick={closeMenu}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-white">
                  <Camera size={14} strokeWidth={2} />
                </span>
                {siteConfig.name}
              </Link>
              <button
                onClick={closeMenu}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <ul className="space-y-1" role="list">
                {navLinks.map((link) => (
                  <li key={link.to}>
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
                  </li>
                ))}
              </ul>
            </nav>

            {/* Drawer Footer CTAs */}
            <div className="px-6 py-6 border-t border-neutral-100 space-y-3">
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
            </div>
          </div>
        </>
      )}
    </>
  );
}
