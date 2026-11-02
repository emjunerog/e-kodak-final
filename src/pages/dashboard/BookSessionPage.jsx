import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Camera, Calendar, Clock, MapPin, ArrowRight, ArrowLeft, Loader2,
  CheckCircle, Package, PlusCircle, Check, Sparkles, GraduationCap,
  Building, User, Users, Mail, Phone, Info, HelpCircle, Layers, Image as ImageIcon,
  ExternalLink, ChevronRight, X, QrCode, Heart, Briefcase, Search,
  ChevronDown, ChevronUp, Eye, Trash2, ShieldCheck, AlertCircle, FileText,
  Video, Edit3, Lock, Palette, UploadCloud, MessageSquare, Plus,
  Timer, BellRing, CreditCard, Copy, Printer, Download, CheckCircle2, UserCheck, Wifi, WifiOff, Signal
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { createBooking, SERVICE_SLUG_TO_UUID } from "../../services/bookingService";
import { getServices, getAddOns } from "../../services/contentService";
import { SERVICES } from "../../data/servicesData";
import { assignPhotographer } from "../../services/aiAssignmentService";
import { recordCustomerAction } from "../../services/customerAuditService";
import ReferenceImageUploader from "../../components/booking/ReferenceImageUploader";
import InteractiveCalendar from "../../components/booking/InteractiveCalendar";
import QRPass from "../../components/booking/QRPass";
import { QRCodeSVG, generateQRDataURL } from "../../lib/qr.tsx";
import SchoolLogo from "../../components/booking/SchoolLogo";
import {
  CEBU_UNIVERSITIES,
  ALL_CEBU_CAMPUSES,
  POPULAR_COLLEGE_PROGRAMS,
  SHS_STRANDS
} from "../../lib/cebuAcademicData";
import StudioDropdown from "../../components/ui/StudioDropdown";
import LiveClock from "../../components/dashboard/LiveClock";
import DashboardHero from "../../components/dashboard/DashboardHero";
import ClientHeroBanner from "../../components/dashboard/ClientHeroBanner";
import SchoolMasterlistUploader from "../../components/dashboard/SchoolMasterlistUploader";
import { motion, AnimatePresence } from "framer-motion";

// ── Studio Operating Hours & Discrete Time Slots (8:00 AM – 5:00 PM) ───────────
const STUDIO_TIME_SLOTS = [
  { time: "08:00", label: "8:00 AM – 9:00 AM", period: "Morning" },
  { time: "09:00", label: "9:00 AM – 10:00 AM", period: "Morning" },
  { time: "10:00", label: "10:00 AM – 11:00 AM", period: "Morning" },
  { time: "11:00", label: "11:00 AM – 12:00 PM", period: "Morning" },
  { time: "13:00", label: "1:00 PM – 2:00 PM", period: "Afternoon" },
  { time: "14:00", label: "2:00 PM – 3:00 PM", period: "Afternoon" },
  { time: "15:00", label: "3:00 PM – 4:00 PM", period: "Afternoon" },
  { time: "16:00", label: "4:00 PM – 5:00 PM", period: "Afternoon" },
];

// ── Special Request Pre-template suggestions (Clean, no emojis) ───────────────
const SPECIAL_REQUEST_TEMPLATES = {
  graduation: [
    { label: "Honors & Academic Sash", text: "Please prepare academic honor sash and medals setup." },
    { label: "Include Family / Parents", text: "Parents / family members will join for commemorative portraits." },
    { label: "Eyeglasses Anti-Glare", text: "Requesting anti-glare studio lighting angle for eyeglasses." },
    { label: "Cap Toss Action", text: "Please capture an energetic graduation cap toss sequence." },
    { label: "Diploma Solo Shot", text: "Focus on solo poses holding the official diploma tube." },
    { label: "Charcoal Dark Backdrop", text: "Preference for rich dark charcoal / black backdrop." },
    { label: "Crisp White Backdrop", text: "Preference for clean high-key white backdrop." },
  ],
  wedding: [
    { label: "Veil Portraits", text: "Backlit sweeping veil portraits." },
    { label: "Candid Couple", text: "Unposed candid moments between couple." },
    { label: "Family Formals", text: "Immediate family and entourage group shots." },
    { label: "Black & White", text: "Include high-contrast monochrome edits." }
  ],
  corporate: [
    { label: "Gray Backdrop", text: "Neutral executive gray gradient backdrop." },
    { label: "Clean White", text: "Crisp white studio portrait." },
    { label: "Approachable Tone", text: "Warm lighting for professional profiles." }
  ],
  general: [
    { label: "Soft Lighting", text: "Soft diffuse studio lighting." },
    { label: "High-Key White", text: "Bright clean white backdrop." },
    { label: "Moody Contrast", text: "Artistic shadows and rich contrast." }
  ]
};

// ── Service Name & Icon Helpers ──────────────────────────────────────────────
const getServiceDisplayName = (svc) => {
  const s = (svc?.slug || svc?.name || "").toLowerCase();
  if (s.includes("college")) return "College";
  if (s.includes("senior") || s.includes("shs")) return "Senior High";
  if (s.includes("video")) return "Wedding Video";
  if (s.includes("wedding") || s.includes("photo")) return "Wedding Photo";
  return svc?.category || svc?.name || "Service";
};

const getServiceIcon = (svc) => {
  const s = (svc?.slug || svc?.name || "").toLowerCase();
  if (s.includes("college") || s.includes("senior")) return <GraduationCap size={15} className="text-gold shrink-0" />;
  if (s.includes("video")) return <Sparkles size={15} className="text-gold shrink-0" />;
  if (s.includes("wedding") || s.includes("photo")) return <Camera size={15} className="text-gold shrink-0" />;
  return <Package size={15} className="text-gold shrink-0" />;
};

// ── Clean & normalize class section inputs: strip redundant school/strand/grade/course prefixes and "Section" words ──
const normalizeSectionOnly = (input, strandOrCourse = "") => {
  if (!input || typeof input !== "string") return "";
  let clean = input;

  // 1. Remove redundant Grade levels (e.g. "Grade 12", "Grade 11", "G12", "G11", "12-", "11-")
  clean = clean.replace(/^(?:Grade\s*\d+|G\d+|(?:11|12))\s*[-–—/:]*\s*/i, "");

  // 2. Remove selected strand/course if user typed it at start (e.g. "STEM", "ABM", "BSIT", "BSCS", "BEED")
  if (strandOrCourse && typeof strandOrCourse === "string" && strandOrCourse.trim()) {
    const escaped = strandOrCourse.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`^${escaped}\\s*[-–—/:]*\\s*`, 'i'), '');
  }
  // Also common academic abbreviations
  clean = clean.replace(/^(?:STEM|ABM|HUMSS|GAS|TVL|ICT|HE|BSIT|BSCS|BSCE|BSED|BEED|BSBA|BSHM|BSA|BSN)\s*[-–—/:]*\s*/i, "");

  // 3. Remove "Class Section", "Section", "Sec.", "Sec", "Block" from beginning
  clean = clean.replace(/^(?:Class\s*Section|Section|Sec\.?|Block)\s*[-–—/:]*\s*/i, "");

  // 4. Remove leftover leading punctuation or dashes
  clean = clean.replace(/^[-–—/:\s]+/, "").trim();

  if (!clean) return "";

  // 5. Intelligent capitalization:
  // Short code (letters/numbers, e.g. "A", "B", "1", "4-1", "4A")
  const isShortCode = /^[A-Za-z0-9]{1,3}(?:[-–—/][A-Za-z0-9]{1,3})?$/.test(clean);
  if (isShortCode) {
    return clean.toUpperCase();
  }

  // Named sections (e.g. "alcala", "duterte", "rizal", "st. thomas", "maria clara")
  // Format in proper Title Case
  return clean
    .split(/\s+/)
    .map(word => {
      if (word.length <= 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// ── Visual Helper for Add-On Mini Cards (Dark Obsidian Theme) ────────────────
const getAddOnVisuals = (name = "", category = "") => {
  const text = (name + " " + (category || "")).toLowerCase();

  // Extract specs in parentheses like (8x10), (5 Photos), (3 days)
  const specMatch = name.match(/\(([^)]+)\)/);
  const specBadge = specMatch ? specMatch[1] : null;
  const cleanName = name.replace(/\s*\([^)]+\)/, "").trim();

  if (text.includes("canvas") || text.includes("print") || text.includes("frame") || text.includes("album") || text.includes("portrait")) {
    return {
      icon: <Layers size={13} className="stroke-[2.2]" />,
      iconBg: "bg-amber-500/20 text-gold border-gold/40",
      lightIconBg: "bg-[#FAF5EB] text-[#B5883F] border-[#EFE4D2]",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("drone") || text.includes("aerial")) {
    return {
      icon: <Camera size={13} className="stroke-[2.2]" />,
      iconBg: "bg-sky-500/20 text-sky-400 border-sky-400/40",
      lightIconBg: "bg-sky-50 text-sky-700 border-sky-200",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("same-day") || text.includes("preview") || text.includes("rush") || text.includes("digital") || text.includes("usb") || text.includes("drive")) {
    return {
      icon: <ExternalLink size={13} className="stroke-[2.2]" />,
      iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      lightIconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("video") || text.includes("slideshow") || text.includes("film") || text.includes("movie") || text.includes("mtv")) {
    return {
      icon: <Video size={13} className="stroke-[2.2]" />,
      iconBg: "bg-purple-500/20 text-purple-400 border-purple-400/40",
      lightIconBg: "bg-purple-50 text-purple-700 border-purple-200",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("location") || text.includes("campus") || text.includes("church") || text.includes("venue")) {
    return {
      icon: <MapPin size={13} className="stroke-[2.2]" />,
      iconBg: "bg-orange-500/20 text-orange-400 border-orange-400/40",
      lightIconBg: "bg-orange-50 text-orange-700 border-orange-200",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("hair") || text.includes("makeup") || text.includes("styling") || text.includes("gown") || text.includes("attire")) {
    return {
      icon: <Heart size={13} className="stroke-[2.2]" />,
      iconBg: "bg-rose-500/25 text-rose-400 border-rose-400/40",
      lightIconBg: "bg-rose-50 text-rose-700 border-rose-200",
      specBadge,
      cleanName,
    };
  }
  return {
    icon: <Check size={13} className="stroke-[2.5]" />,
    iconBg: "bg-amber-500/20 text-gold border-gold/40",
    specBadge,
    cleanName,
  };
};
// ── Helper to Parse Verbose Inclusions into Clean, Balanced Cards (Photo Format) ──
const formatPieceQuantity = (qty = "") => {
  if (!qty) return "";
  return qty
    .replace(/\b1\s*pieces?\b/gi, "1 pc")
    .replace(/\b([0-9]+)\s*pieces?\b/gi, "$1 pcs");
};

const parseInclusionDetails = (rawText = "", allTiers = []) => {
  const text = (rawText || "").trim();
  const lower = text.toLowerCase();
  const isExclusion = lower.includes("no free") || lower.includes("not included");
  const isComplimentary = lower.includes("free ") || lower.startsWith("free") || lower.includes("complimentary");

  const qtyMatch = text.match(/^([0-9]+\s*(?:pieces?|units?|copies|pages|photographers|shoots?|sets?)|[0-9]+-[0-9]+x[0-9]+|[0-9]+x[0-9]+|[0-9]+pcs\.?|[0-9]+pc\.?)\s*(.*)/i);
  let quantity = qtyMatch ? qtyMatch[1].trim() : (isComplimentary ? "FREE" : "Included");
  let coreText = qtyMatch ? qtyMatch[2].trim() : text;

  if (/^([0-9]+)\s*pieces?$/i.test(quantity)) {
    const n = quantity.match(/([0-9]+)/)[1];
    quantity = `${n} ${n === "1" ? "pc" : "pcs"}`;
  } else if (/^([0-9]+)\s*units?$/i.test(quantity)) {
    const n = quantity.match(/([0-9]+)/)[1];
    quantity = `${n} ${n === "1" ? "Unit" : "Units"}`;
  } else if (/^([0-9]+)\s*photographers?/i.test(quantity) || lower.includes("photographers on site")) {
    const nMatch = text.match(/([0-9]+)\s*(?:professional\s*)?photographers/i);
    const n = nMatch ? nMatch[1] : "Pro";
    quantity = `${n} Photographers`;
  }

  let title = "Studio Inclusion";
  let specBadge = null;
  let subtitle = "Studio quality print";
  let icon = <Check size={13} className="stroke-[2.5]" />;
  let iconBg = "bg-amber-100/90 text-amber-800 border-amber-200/90";
  let image = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&q=80&auto=format&fit=crop";

  const dimMatch = text.match(/(\d+\s*[×x]\s*\d+\s*(?:\"|inch(?:es)?)?|\b2R\b|\b4R\b|\b5×7\"|\b8×10\"|\b10×12\"|\b11×14\"|\b12×16\"|\b12×18\"|\b24×30\")/i);
  if (dimMatch) {
    specBadge = dimMatch[1].replace(/\s+/g, "").toUpperCase();
    if (!specBadge.includes('"') && !specBadge.includes('R')) {
      specBadge += '"';
    }
  }

  if (lower.includes("family")) {
    title = "Family Portrait";
    subtitle = "Studio family pictorial with parents/guardians";
    image = "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=80&auto=format&fit=crop";
    icon = <Users size={13} className="stroke-[2.2]" />;
    specBadge = specBadge || "8×10\"";
  } else if (lower.includes("filipiniana") || lower.includes("barong") || lower.includes("pilipiñ")) {
    if (lower.includes("wallet")) {
      title = "Wallet Prints (Attire)";
      subtitle = "Pocket prints in Barong / Filipiniana";
      image = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop";
      icon = <ImageIcon size={13} className="stroke-[2.2]" />;
      specBadge = "2R (2.5×3.5\")";
    } else {
      title = "Filipiniana / Barong";
      subtitle = lower.includes("crystal") ? "Crystal wood frame" : "Traditional national attire portrait";
      image = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80&auto=format&fit=crop";
      icon = <Sparkles size={13} className="stroke-[2.2]" />;
      specBadge = specBadge || "8×10\"";
    }
  } else if (lower.includes("crystal") || (lower.includes("portrait") && (lower.includes("frame") || lower.includes("mount") || lower.includes("wood")))) {
    title = "Framed Portrait";
    subtitle = lower.includes("mount") ? "Crystal wood mount" : "Crystal wood frame with glass";
    image = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&q=80&auto=format&fit=crop";
    icon = <Layers size={13} className="stroke-[2.2]" />;
    specBadge = specBadge || "10×12\"";
  } else if (lower.includes("wallet")) {
    icon = <ImageIcon size={13} className="stroke-[2.2]" />;
    specBadge = specBadge || "2R (2.5×3.5\")";
    if (lower.includes("cap") || lower.includes("toga")) {
      title = "Wallet Prints (Cap)";
      subtitle = "Wallet photos with academic cap & gown";
      image = "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&q=80&auto=format&fit=crop";
    } else if (lower.includes("attire") || lower.includes("barong") || lower.includes("filipiniana")) {
      title = "Wallet Prints (Attire)";
      subtitle = "Filipiniana or Barong prints";
      image = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop";
    } else {
      title = "Wallet Prints";
      subtitle = "Pocket-sized glossy prints on Fuji paper";
      image = "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&q=80&auto=format&fit=crop";
    }
  } else if (lower.includes("passport") || lower.includes("tesda")) {
    icon = <CreditCard size={13} className="stroke-[2.2]" />;
    title = "Passport ID Prints";
    specBadge = "TESDA (35×45mm)";
    subtitle = "Standard passport & official ID specification";
    image = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80&auto=format&fit=crop";
  } else if (lower.includes("2x2") || lower.includes("2×2")) {
    icon = <CreditCard size={13} className="stroke-[2.2]" />;
    specBadge = "2×2\" (51×51mm)";
    title = lower.includes("casual") ? "2×2\" Casual IDs" : "2×2\" Formal IDs";
    subtitle = lower.includes("casual") ? "Casual attire ID photos" : "Formal attire application photos";
    image = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80&auto=format&fit=crop";
  } else if (lower.includes("1x1") || lower.includes("1×1")) {
    icon = <CreditCard size={13} className="stroke-[2.2]" />;
    specBadge = "1×1\" (25×25mm)";
    title = "1×1\" ID Prints";
    subtitle = "School records & official form photos";
    image = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80&auto=format&fit=crop";
  } else if (lower.includes("desk") || lower.includes("5x7") || lower.includes("5×7")) {
    icon = <ImageIcon size={13} className="stroke-[2.2]" />;
    specBadge = "5×7\"";
    title = "Desk Photo Print";
    subtitle = "Desktop tabletop colored print";
    image = "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300&q=80&auto=format&fit=crop";
  } else if (lower.includes("makeup") || lower.includes("make-up") || lower.includes("hair")) {
    icon = <Heart size={13} className="stroke-[2.2]" />;
    iconBg = "bg-rose-100 text-rose-700 border-rose-200";
    title = "Studio Hair & Makeup";
    specBadge = "Complimentary";
    subtitle = "Professional styling & cosmetics";
    quantity = "FREE";
    image = "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&q=80&auto=format&fit=crop";
  } else if (lower.includes("toga") || lower.includes("cap")) {
    icon = <GraduationCap size={13} className="stroke-[2.2]" />;
    title = "Graduation Toga";
    specBadge = "Regalia";
    subtitle = "Toga, cap & hood use";
    quantity = "FREE";
    image = "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=300&q=80&auto=format&fit=crop";
  } else {
    title = coreText.length > 25 ? coreText.slice(0, 23) + "..." : coreText;
  }

  // Cross-tier comparison for all sets
  const comparisons = (allTiers || []).map(t => {
    const found = (t.highlights || []).find(h => {
      const hLow = h.toLowerCase();
      if (title === 'Framed Portrait' && (hLow.includes('framed') || (hLow.includes('portrait') && (hLow.includes('wood') || hLow.includes('mount') || hLow.includes('frame'))))) return true;
      if (title === 'Filipiniana / Barong' && (hLow.includes('filipiniana') || hLow.includes('barong')) && !hLow.includes('wallet')) return true;
      if (title === 'Family Portrait' && hLow.includes('family')) return true;
      if (title === 'Wallet Prints (Cap)' && hLow.includes('wallet') && hLow.includes('cap')) return true;
      if (title === 'Wallet Prints (Attire)' && hLow.includes('wallet') && (hLow.includes('attire') || hLow.includes('barong') || hLow.includes('filipiniana'))) return true;
      if (title === 'Wallet Prints' && hLow.includes('wallet') && !hLow.includes('cap') && !hLow.includes('attire') && !hLow.includes('barong')) return true;
      if (title === 'Passport ID Prints' && hLow.includes('passport')) return true;
      if (title.includes('2×2') && (hLow.includes('2×2') || hLow.includes('2x2'))) {
        if (title.includes('Casual') && hLow.includes('casual')) return true;
        if (!title.includes('Casual') && !hLow.includes('casual')) return true;
      }
      if (title.includes('1×1') && (hLow.includes('1×1') || hLow.includes('1x1'))) return true;
      if (title === 'Desk Photo Print' && hLow.includes('desk')) return true;
      if (title === 'Studio Hair & Makeup' && (hLow.includes('makeup') || hLow.includes('hair'))) return true;
      return false;
    });

    let details = 'Not in this set';
    let hasIt = false;
    if (found) {
      hasIt = true;
      const q = found.match(/^(\d+)\s*(?:pieces?|pcs?|pc)/i);
      const d = found.match(/(\d+\s*[×x]\s*\d+\s*(?:\"|inch(?:es)?)?|\b2R\b|\b5×7\"|\b8×10\"|\b10×12\"|\b12×16\"|\b12×18\")/i);
      const isFree = found.toLowerCase().includes('free') || found.toLowerCase().includes('complimentary');
      const qText = q ? (q[1] + (parseInt(q[1], 10) === 1 ? ' pc' : ' pcs')) : (isFree ? 'FREE' : '');
      const sText = d ? d[1].trim() : '';
      const finishText = found.toLowerCase().includes('crystal wood frame') ? 'Crystal Frame' : (found.toLowerCase().includes('mount') ? 'Mount' : (found.toLowerCase().includes('unframed') ? 'Unframed' : ''));
      details = [qText, sText, finishText].filter(Boolean).join(' · ');
    }
    return {
      tierName: t.name,
      hasIt,
      details,
    };
  });

  return {
    title,
    specBadge,
    size: specBadge,
    subtitle,
    quantity,
    icon,
    iconBg,
    isComplimentary,
    isExclusion,
    image,
    comparisons,
    raw: rawText,
  };
};

// ── Helper to Consolidate Redundant Inclusions (e.g. 3 duplicate Wallet Print items or duplicate 2x2 IDs) ──
const consolidateInclusions = (rawInclusions = [], allTiers = []) => {
  if (!rawInclusions || !rawInclusions.length) return [];

  const parsed = rawInclusions.map(h => parseInclusionDetails(h, allTiers));
  const consolidated = [];
  let walletGroup = null;
  let id2x2Group = null;

  parsed.forEach(item => {
    const raw = (item.raw || item.title || "").toLowerCase();
    const isWallet = item.title.toLowerCase().includes("wallet") || raw.includes("wallet");
    const is2x2 = item.title.includes("2×2") || item.title.includes("2x2") || raw.includes("2×2") || raw.includes("2x2");

    if (isWallet) {
      const qtyMatch = (item.raw || "").match(/^(\d+)/);
      const qtyNum = qtyMatch ? parseInt(qtyMatch[1], 10) : (parseInt(item.quantity) || 6);

      let variant = "Standard";
      if (raw.includes("cap") || raw.includes("toga")) variant = "Cap & Gown";
      else if (raw.includes("filipiniana") || raw.includes("barong") || raw.includes("attire")) variant = "Filipiniana / Barong";

      if (!walletGroup) {
        walletGroup = {
          ...item,
          title: "Wallet Prints",
          specBadge: "2R (2.5×3.5\")",
          totalQty: qtyNum,
          variants: [variant],
          quantity: `${qtyNum} ${qtyNum === 1 ? "pc" : "pcs"}`,
          subtitle: variant,
        };
        consolidated.push(walletGroup);
      } else {
        walletGroup.totalQty += qtyNum;
        walletGroup.quantity = `${walletGroup.totalQty} ${walletGroup.totalQty === 1 ? "pc" : "pcs"}`;
        if (!walletGroup.variants.includes(variant)) {
          walletGroup.variants.push(variant);
        }
        walletGroup.subtitle = walletGroup.variants.join(" · ");
      }
    } else if (is2x2) {
      const qtyMatch = (item.raw || "").match(/^(\d+)/);
      const qtyNum = qtyMatch ? parseInt(qtyMatch[1], 10) : (parseInt(item.quantity) || 6);
      let variant = raw.includes("casual") ? "Casual" : "Formal";

      if (!id2x2Group) {
        id2x2Group = {
          ...item,
          title: "2×2\" ID Prints",
          specBadge: "51×51mm",
          totalQty: qtyNum,
          variants: [variant],
          quantity: `${qtyNum} ${qtyNum === 1 ? "pc" : "pcs"}`,
          subtitle: variant,
        };
        consolidated.push(id2x2Group);
      } else {
        id2x2Group.totalQty += qtyNum;
        id2x2Group.quantity = `${id2x2Group.totalQty} ${id2x2Group.totalQty === 1 ? "pc" : "pcs"}`;
        if (!id2x2Group.variants.includes(variant)) {
          id2x2Group.variants.push(variant);
        }
        id2x2Group.subtitle = id2x2Group.variants.join(" & ");
      }
    } else {
      consolidated.push(item);
    }
  });

  return consolidated;
};

// ── Visual Helper for Inclusion Chips (Matching Photo 1 Inclusions Card) ─────
const getInclusionConfig = (text = "") => {
  const t = text.toLowerCase();
  const isExclusion = t.includes("no free");
  const isComplimentary = t.includes("free ") || t.startsWith("free") || t.includes("complimentary");

  const specMatch = text.match(/^([0-9]+\s*(?:pieces?|units?|copies|pages)|[0-9]+-[0-9]+x[0-9]+|[0-9]+x[0-9]+|[0-9]+pcs\.?|[0-9]+pc\.?)\s*(.*)/i);
  const specBadge = specMatch ? specMatch[1] : null;
  const mainText = specMatch ? specMatch[2] : text;

  let icon = <Check size={12} className="stroke-[2.5]" />;
  let iconBg = "bg-amber-100/80 text-amber-800 border-amber-200/90";
  let cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
  let textColor = "text-neutral-800";
  let badge = null;

  if (t.includes("passport") || t.includes("2x2") || t.includes("wallet") || t.includes("8x10") || t.includes("10x12") || t.includes("1x1") || t.includes("print") || t.includes("picture") || t.includes("colored")) {
    icon = <ImageIcon size={12} className="stroke-[2.2]" />;
    iconBg = "bg-amber-100/80 text-amber-800 border-amber-200/90";
    cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
    textColor = "text-neutral-800";
  } else if (t.includes("frame") || t.includes("album") || t.includes("crystal") || t.includes("wood")) {
    icon = <Layers size={12} className="stroke-[2.2]" />;
    iconBg = "bg-stone-100 text-stone-700 border-stone-200";
    cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
    textColor = "text-neutral-800";
  } else if (t.includes("digital") || t.includes("file") || t.includes("usb") || t.includes("soft copy") || t.includes("drive")) {
    icon = <ExternalLink size={12} className="stroke-[2.2]" />;
    iconBg = "bg-emerald-100/80 text-emerald-800 border-emerald-200";
    cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
    textColor = "text-neutral-800";
  } else if (t.includes("make") || t.includes("hair") || t.includes("gown") || t.includes("wardrobe") || t.includes("attire") || t.includes("pilipiña") || t.includes("styling") || t.includes("toga")) {
    icon = <Heart size={12} className="stroke-[2.2]" />;
    iconBg = "bg-rose-100 text-rose-700 border-rose-200";
    cardBg = "bg-gradient-to-r from-rose-50/95 via-amber-50/60 to-white border-rose-200/90 shadow-2xs hover:shadow-xs";
    textColor = "text-rose-950 font-bold";
    badge = "Complimentary Perk";
  } else if (t.includes("studio") || t.includes("session") || t.includes("hour") || t.includes("minute")) {
    icon = <Clock size={12} className="stroke-[2.2]" />;
    iconBg = "bg-amber-100/80 text-amber-800 border-amber-200/90";
    cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
    textColor = "text-neutral-800";
  } else if (t.includes("photo") || t.includes("shot") || t.includes("pose") || t.includes("candid") || t.includes("portrait") || t.includes("photographer")) {
    icon = <Camera size={12} className="stroke-[2.2]" />;
    iconBg = "bg-amber-100/80 text-amber-800 border-amber-200/90";
    cardBg = "bg-white/95 hover:bg-white border-amber-200/70 hover:border-amber-400/80 shadow-2xs hover:shadow-xs";
    textColor = "text-neutral-800";
  }

  if (isExclusion) {
    icon = <X size={12} className="stroke-[2.5]" />;
    iconBg = "bg-neutral-100 text-neutral-400 border-neutral-200";
    cardBg = "bg-neutral-50/60 border-neutral-200/70";
    textColor = "text-neutral-400 line-through";
    badge = null;
  }

  return {
    icon,
    iconBg,
    cardBg,
    textColor,
    badge,
    specBadge,
    mainText,
    isExclusion,
    isComplimentary,
    isFullWidth: isComplimentary,
  };
};

// ── Fallback Photography Cover Images ─────────────────────────────────────────
const SERVICE_COVER_MAP = {
  "college-packages": "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop",
  "senior-high-packages": "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop",
  "wedding-video": "https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop",
  "wedding-photo": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop",
};

// ── Currency Parser ───────────────────────────────────────────────────────────
function parsePrice(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

// ── Motion-Detecting Review Accordion Dropdown Component ───────────────────────
function ReviewAccordionItem({
  id,
  isOpen,
  isPinned,
  icon,
  title,
  subtitle,
  onEdit,
  children,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onTogglePin
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`border rounded-2xl overflow-hidden bg-white shadow-xs transition-all duration-300 ${
        isOpen
          ? "border-amber-300/90 ring-2 ring-amber-400/20 shadow-sm"
          : "border-neutral-200/90 hover:border-amber-300/60 hover:shadow-xs"
      }`}
    >
      <div
        onClick={onTogglePin}
        className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
            {icon}
          </div>
          <div className="min-w-0">
            <span className="font-heading text-sm font-bold text-primary block leading-tight truncate">
              {title}
            </span>
            <span className="text-[11px] text-neutral-500 font-body block truncate">
              {subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isPinned && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
              <Lock size={10} /> Locked
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
            >
              Edit
            </button>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="text-neutral-400"
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`accordion-content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.26, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, delay: 0.04 }
              }
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.12 }
              }
            }}
            className="overflow-hidden border-t border-neutral-100"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const initialServiceSlug = searchParams.get("service");
  const initialTierName = searchParams.get("tier");
  
  const { user, profile, loading: authLoading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Customer Profile DB State & Editing
  const [customerProfile, setCustomerProfile] = useState(null);
  const activeProfile = customerProfile || profile;
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [yearbookMotto, setYearbookMotto] = useState("");

  // Who is this booking for? ("myself" | "someone_else" | "school_section")
  const [bookingFor, setBookingFor] = useState("myself");
  const [masterlistData, setMasterlistData] = useState(null);
  const [showBookingForModal, setShowBookingForModal] = useState(false);
  const [pendingTierToConfirm, setPendingTierToConfirm] = useState(null);
  const [submissionTimeElapsed, setSubmissionTimeElapsed] = useState(0);
  const [networkQuality, setNetworkQuality] = useState({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isLowSignal: false,
    effectiveType: "4g",
    rtt: 0
  });

  // Participant / Beneficiary details (for whom this specific booking is actually for)
  const [participantFirstName, setParticipantFirstName] = useState("");
  const [participantMiddleName, setParticipantMiddleName] = useState("");
  const [participantLastName, setParticipantLastName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantRelationship, setParticipantRelationship] = useState("Friend");

  // Student / Graduate specific name (separate from Account Profile so booking for another student never overwrites account profile)
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentMiddleName, setStudentMiddleName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");

  const handleSelectBookingFor = useCallback((choice) => {
    setBookingFor(choice);
    if (choice === "myself") {
      const activeP = customerProfile || profile;
      const fn = activeP?.first_name || user?.user_metadata?.first_name || "";
      const mn = activeP?.middle_name || user?.user_metadata?.middle_name || "";
      const ln = activeP?.last_name || user?.user_metadata?.last_name || "";
      const ph = activeP?.phone || user?.user_metadata?.phone || "";
      const em = activeP?.email || user?.email || "";
      setParticipantFirstName(fn);
      setParticipantMiddleName(mn);
      setParticipantLastName(ln);
      setParticipantPhone(ph);
      setParticipantEmail(em);
      setParticipantRelationship("Self");
      setStudentFirstName(fn);
      setStudentMiddleName(mn);
      setStudentLastName(ln);
    } else if (choice === "school_section") {
      setAcademicBookingMode("SCHOOL_PARTNER");
      setLocationType("CAMPUS");
      setParticipantRelationship("School Section Representative");
    } else {
      const activeP = customerProfile || profile;
      const accountFn = activeP?.first_name || user?.user_metadata?.first_name || "";
      const accountLn = activeP?.last_name || user?.user_metadata?.last_name || "";
      if (participantFirstName === accountFn && participantLastName === accountLn) {
        setParticipantFirstName("");
        setParticipantMiddleName("");
        setParticipantLastName("");
        setParticipantPhone("");
        setParticipantEmail("");
        setParticipantRelationship("Friend");
        setStudentFirstName("");
        setStudentMiddleName("");
        setStudentLastName("");
      }
    }
  }, [customerProfile, profile, user, participantFirstName, participantLastName]);

  // Actively fetch customer profile from database if available
  const fetchCustomerProfile = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingProfile(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          setCustomerProfile(data);
          setEditFirstName(data.first_name || "");
          setEditMiddleName(data.middle_name || "");
          setEditLastName(data.last_name || "");
          setEditPhone(data.phone || "");
          setYearbookMotto(data.bio || data.motto || (data.custom_data && data.custom_data.bio) || "");
          setStudentFirstName(prev => prev || data.first_name || "");
          setStudentMiddleName(prev => prev || data.middle_name || "");
          setStudentLastName(prev => prev || data.last_name || "");
          setParticipantFirstName(prev => prev || data.first_name || "");
          setParticipantMiddleName(prev => prev || data.middle_name || "");
          setParticipantLastName(prev => prev || data.last_name || "");
          setParticipantPhone(prev => prev || data.phone || "");
          setParticipantEmail(prev => prev || data.email || user.email || "");
          return;
        }
      }
    } catch (err) {
      console.warn("Direct profile fetch error:", err);
    } finally {
      setIsLoadingProfile(false);
    }

    // Fallback to auth profile context or user metadata
    if (profile) {
      setCustomerProfile(profile);
      setEditFirstName(profile.first_name || "");
      setEditMiddleName(profile.middle_name || "");
      setEditLastName(profile.last_name || "");
      setEditPhone(profile.phone || "");
      setYearbookMotto(profile.bio || profile.motto || (profile.custom_data && profile.custom_data.bio) || "");
      setStudentFirstName(prev => prev || profile.first_name || "");
      setStudentMiddleName(prev => prev || profile.middle_name || "");
      setStudentLastName(prev => prev || profile.last_name || "");
      setParticipantFirstName(prev => prev || profile.first_name || "");
      setParticipantMiddleName(prev => prev || profile.middle_name || "");
      setParticipantLastName(prev => prev || profile.last_name || "");
      setParticipantPhone(prev => prev || profile.phone || "");
      setParticipantEmail(prev => prev || profile.email || user.email || "");
    } else if (user) {
      const meta = user.user_metadata || {};
      const fallback = {
        first_name: meta.first_name || "",
        middle_name: meta.middle_name || "",
        last_name: meta.last_name || "",
        phone: meta.phone || "",
        email: user.email || "",
        bio: meta.bio || meta.motto || "",
        role: meta.role || "customer",
      };
      setCustomerProfile(fallback);
      setEditFirstName(fallback.first_name);
      setEditMiddleName(fallback.middle_name);
      setEditLastName(fallback.last_name);
      setEditPhone(fallback.phone);
      setYearbookMotto(fallback.bio);
      setStudentFirstName(prev => prev || fallback.first_name || "");
      setStudentMiddleName(prev => prev || fallback.middle_name || "");
      setStudentLastName(prev => prev || fallback.last_name || "");
      setParticipantFirstName(prev => prev || fallback.first_name || "");
      setParticipantMiddleName(prev => prev || fallback.middle_name || "");
      setParticipantLastName(prev => prev || fallback.last_name || "");
      setParticipantPhone(prev => prev || fallback.phone || "");
      setParticipantEmail(prev => prev || fallback.email || user.email || "");
    }
  }, [user, profile]);

  useEffect(() => {
    fetchCustomerProfile();
  }, [fetchCustomerProfile]);

  // Keep fields synced when profile or user changes
  useEffect(() => {
    if (profile && !customerProfile) {
      setCustomerProfile(profile);
      setEditFirstName(profile.first_name || "");
      setEditMiddleName(profile.middle_name || "");
      setEditLastName(profile.last_name || "");
      setEditPhone(profile.phone || "");
      setYearbookMotto(profile.bio || profile.motto || (profile.custom_data && profile.custom_data.bio) || "");
      setStudentFirstName(prev => prev || profile.first_name || "");
      setStudentMiddleName(prev => prev || profile.middle_name || "");
      setStudentLastName(prev => prev || profile.last_name || "");
    }
  }, [profile, customerProfile]);

  // Handle saving edited profile to Supabase database
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileError("");

    if (!editFirstName.trim()) {
      setProfileError("First name is required.");
      return;
    }

    setProfileSaving(true);
    try {
      const updates = {
        first_name: editFirstName.trim(),
        middle_name: editMiddleName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim(),
        bio: customerProfile?.bio || "",
        updated_at: new Date().toISOString()
      };

      // 1. Update in AuthContext (updates session cache & state)
      if (updateProfile) {
        await updateProfile(updates);
      }

      // 2. Direct supabase update to ensure immediate DB reflection
      if (user?.id && isSupabaseConfigured && supabase) {
        const { error: dbErr } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (dbErr) {
          console.warn("Supabase profile update warning:", dbErr.message);
          // If row doesn't exist yet, upsert it
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            role: customerProfile?.role || 'customer',
            ...updates
          });
        }
      }

      // 3. Update local state
      setCustomerProfile(prev => ({
        ...(prev || {}),
        ...updates
      }));

      if (refreshProfile) {
        refreshProfile();
      }

      // 4. Audit trail
      if (user?.id) {
        try {
          recordCustomerAction({
            userId: user.id,
            category: 'PROFILE',
            title: 'Client Profile Updated in Booking Flow',
            description: `Updated name to ${editFirstName} ${editLastName} and phone to ${editPhone}`
          });
        } catch {}
      }

      setProfileSaveSuccess(true);
      setTimeout(() => {
        setProfileSaveSuccess(false);
        setIsEditingProfile(false);
      }, 1200);

    } catch (err) {
      console.error("Failed to save profile:", err);
      setProfileError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Booking Data State
  const [services, setServices] = useState([]);
  const [addOnsList, setAddOnsList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Form Step State (1-7)
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [hoveredServiceId, setHoveredServiceId] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [addonSearch, setAddonSearch] = useState("");
  const [addonCategoryFilter, setAddonCategoryFilter] = useState("ALL");
  
  // Dynamic Service Detections
  const isCollegeService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("college") || s.includes("university") || (!s.includes("senior") && !s.includes("shs") && (s.includes("graduation") || s.includes("academic") || s.includes("grad")));
  }, [selectedService]);

  const isSeniorHighService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("senior") || s.includes("shs") || (s.includes("high") && !s.includes("highlight"));
  }, [selectedService]);

  const isAcademicService = useMemo(() => {
    return isCollegeService || isSeniorHighService;
  }, [isCollegeService, isSeniorHighService]);

  const isWeddingService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("wedding") || s.includes("nuptial") || s.includes("bridal") || s.includes("prenup");
  }, [selectedService]);

  const isCorporateService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("corporate") || s.includes("headshot") || s.includes("business") || s.includes("commercial");
  }, [selectedService]);

  // Academic Information State
  const [studentType, setStudentType] = useState("COLLEGE"); // "COLLEGE" | "SENIOR_HIGH"
  const [academicBookingMode, setAcademicBookingMode] = useState("SCHOOL_PARTNER"); // "SCHOOL_PARTNER" | "INDIVIDUAL"
  const [schoolScheduleNote, setSchoolScheduleNote] = useState("");
  const [selectedUnivId, setSelectedUnivId] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [studentSchoolAddress, setStudentSchoolAddress] = useState("");
  const [studentCourse, setStudentCourse] = useState("");
  const [selectedShsStrand, setSelectedShsStrand] = useState("STEM");
  const [studentBatch, setStudentBatch] = useState("Batch 2026");
  const [studentSection, setStudentSection] = useState("");
  const normalizedStudentSection = useMemo(() => {
    if (!studentSection || !studentSection.trim()) return "";
    const currentStrand = isSeniorHighService ? selectedShsStrand : studentCourse;
    return normalizeSectionOnly(studentSection, currentStrand) || studentSection.trim();
  }, [studentSection, isSeniorHighService, selectedShsStrand, studentCourse]);
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [univDropdownOpen, setUnivDropdownOpen] = useState(false);
  const [degreeDropdownOpen, setDegreeDropdownOpen] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
  const [proceedingSvcSlug, setProceedingSvcSlug] = useState(null);
  const [hoveredTierName, setHoveredTierName] = useState(null);
  const [hoveredInclusionIndex, setHoveredInclusionIndex] = useState(null);
  const [hoveredInclusion, setHoveredInclusion] = useState(null);
  const [hoveredInclusionIndexReview, setHoveredInclusionIndexReview] = useState(null);
  const [isAddonCardHovered, setIsAddonCardHovered] = useState(false);
  const [isAddonPanelHovered, setIsAddonPanelHovered] = useState(false);
  const [isAddonCardPinned, setIsAddonCardPinned] = useState(false);
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [showReservationSuccessModal, setShowReservationSuccessModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPassUrl, setCopiedPassUrl] = useState(false);
  const qrPassRef = useRef(null);
  const tierScrollRef = useRef(null);
  const tierHoverTimeoutRef = useRef(null);
  const addonHoverTimeoutRef = useRef(null);

  const handleAddonCardEnter = () => {
    if (addonHoverTimeoutRef.current) clearTimeout(addonHoverTimeoutRef.current);
    setIsAddonCardHovered(true);
  };
  const handleAddonCardLeave = () => {
    if (addonHoverTimeoutRef.current) clearTimeout(addonHoverTimeoutRef.current);
    addonHoverTimeoutRef.current = setTimeout(() => {
      setIsAddonCardHovered(false);
    }, 90);
  };
  const handleAddonPanelEnter = () => {
    if (addonHoverTimeoutRef.current) clearTimeout(addonHoverTimeoutRef.current);
    setIsAddonPanelHovered(true);
  };
  const handleAddonPanelLeave = () => {
    if (addonHoverTimeoutRef.current) clearTimeout(addonHoverTimeoutRef.current);
    addonHoverTimeoutRef.current = setTimeout(() => {
      setIsAddonPanelHovered(false);
    }, 90);
  };

  // Dropdown container refs for outside-click dismissal
  const univContainerRef = useRef(null);
  const degreeContainerRef = useRef(null);

  // Outside click listener to dismiss floating dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (univContainerRef.current && !univContainerRef.current.contains(e.target)) {
        setUnivDropdownOpen(false);
      }
      if (degreeContainerRef.current && !degreeContainerRef.current.contains(e.target)) {
        setDegreeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Automatically scroll to top and ensure scroll is unlocked whenever booking step changes
  useEffect(() => {
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  // Body scroll lock and Escape key listener for lightbox/peg/confirmation modals
  useEffect(() => {
    if (step === 7) {
      document.body.style.overflow = "";
      return;
    }
    if (!lightboxImg && !showBookingForModal && !showOrderConfirmModal && !showReservationSuccessModal) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
                setLightboxImg(null);
          setShowBookingForModal(false);
        setShowOrderConfirmModal(false);
        setShowReservationSuccessModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, lightboxImg, showBookingForModal, showOrderConfirmModal, showReservationSuccessModal]);

  // Auto-sync studentType based on selected service
  useEffect(() => {
    if (isCollegeService) {
      setStudentType("COLLEGE");
    } else if (isSeniorHighService) {
      setStudentType("SENIOR_HIGH");
    }
  }, [isCollegeService, isSeniorHighService]);

  // Autocomplete filtering across every major and extension campus in Cebu
  const filteredCampuses = useMemo(() => {
    if (!studentSchool || !studentSchool.trim()) {
      return ALL_CEBU_CAMPUSES.slice(0, 20);
    }
    const q = studentSchool.toLowerCase().trim();
    return ALL_CEBU_CAMPUSES.filter(c => 
      c.schoolDisplay.toLowerCase().includes(q) || 
      c.univName.toLowerCase().includes(q) || 
      (c.shortName && c.shortName.toLowerCase().includes(q)) ||
      c.campusName.toLowerCase().includes(q) ||
      c.fullAddress.toLowerCase().includes(q)
    );
  }, [studentSchool]);

  // Currently selected university object (from ID or matching name)
  const currentSelectedUniv = useMemo(() => {
    if (selectedUnivId) {
      return CEBU_UNIVERSITIES.find(u => u.id === selectedUnivId) || null;
    }
    if (studentSchool && studentSchool.trim()) {
      const q = studentSchool.toLowerCase().trim();
      return CEBU_UNIVERSITIES.find(u => 
        u.name.toLowerCase() === q || 
        (u.shortName && u.shortName.toLowerCase() === q) ||
        (studentSchool.toLowerCase().includes(u.name.toLowerCase()))
      ) || null;
    }
    return null;
  }, [selectedUnivId, studentSchool]);

  // Derived active institution ID for displaying official university logos
  const activeUnivId = selectedUnivId || currentSelectedUniv?.id || "";

  // Handle direct 1-click selection of an institution & specific campus
  const handleSelectCampus = (campusItem) => {
    setStudentSchool(campusItem.schoolDisplay);
    setStudentSchoolAddress(campusItem.fullAddress);
    setSelectedUnivId(campusItem.univId);
    setUnivDropdownOpen(false);
  };

  // Handle clearing university & campus fields
  const handleClearSchool = () => {
    setStudentSchool("");
    setStudentSchoolAddress("");
    setSelectedUnivId("");
    setUnivDropdownOpen(false);
  };

  // Autocomplete filtering for college programs
  const filteredPrograms = useMemo(() => {
    if (!studentCourse || !studentCourse.trim()) return POPULAR_COLLEGE_PROGRAMS.slice(0, 10);
    const q = studentCourse.toLowerCase().trim();
    return POPULAR_COLLEGE_PROGRAMS.filter(p => p.toLowerCase().includes(q));
  }, [studentCourse]);

  // Wedding Information State
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [weddingTheme, setWeddingTheme] = useState("");
  const [ceremonyVenue, setCeremonyVenue] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorContact, setCoordinatorContact] = useState("");

  // Corporate Information State
  const [companyName, setCompanyName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [photoUsage, setPhotoUsage] = useState("LinkedIn & Executive Profile");

  // Schedule & Location State
  const [eventDate, setEventDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [locationType, setLocationType] = useState("CAMPUS"); // "CAMPUS" | "STUDIO" | "CUSTOM"
  const [customVenue, setCustomVenue] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customBarangayCity, setCustomBarangayCity] = useState("");
  const [customLandmark, setCustomLandmark] = useState("");

  // Automatically keep locationType consistent with academic booking mode
  useEffect(() => {
    if (isAcademicService) {
      if (academicBookingMode === "SCHOOL_PARTNER") {
        setLocationType("CAMPUS");
      } else if (academicBookingMode === "INDIVIDUAL") {
        setLocationType("STUDIO");
      }
    } else {
      if (locationType === "CAMPUS") {
        setLocationType("STUDIO");
      }
    }
  }, [isAcademicService, academicBookingMode]);
  // Visual Reference Pegs & Files
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [notes, setNotes] = useState("");

  // Review Accordion Motion & Lock State (Auto-show & auto-hide on motion)
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [hoveredAccordion, setHoveredAccordion] = useState(null);
  const [pinnedAccordions, setPinnedAccordions] = useState({
    pkg: false,
    client: false,
    schedule: false,
    pegs: false
  });
  const motionTimeoutRef = useRef(null);

  const handleAccordionMouseEnter = useCallback((key) => {
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
      motionTimeoutRef.current = null;
    }
    setHoveredAccordion(key);
  }, []);

  const handleAccordionMouseLeave = useCallback((key) => {
    if (motionTimeoutRef.current) {
      clearTimeout(motionTimeoutRef.current);
    }
    motionTimeoutRef.current = setTimeout(() => {
      setHoveredAccordion((current) => (current === key ? null : current));
    }, 180);
  }, []);

  const toggleAccordionPin = useCallback((key) => {
    setPinnedAccordions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const isAccordionOpen = useCallback((key) => {
    if (pinnedAccordions[key]) return true;
    if (motionEnabled && hoveredAccordion === key) return true;
    return false;
  }, [pinnedAccordions, motionEnabled, hoveredAccordion]);

  // Submission State
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBatchOrderMode, setIsBatchOrderMode] = useState(false);

  // Smart Session & Venue Detector (Detects customer selection whether in studio or school or custom venue)
  const detectedSessionInfo = useMemo(() => {
    const isSchoolCampus = isAcademicService && (academicBookingMode === "SCHOOL_PARTNER" || locationType === "CAMPUS");
    const isCustomVenue = locationType === "CUSTOM";
    const isStudio = locationType === "STUDIO" || (!isSchoolCampus && !isCustomVenue);

    if (isSchoolCampus) {
      return {
        type: "SCHOOL",
        badge: "School Campus Pictorial",
        venue: studentSchool ? `${studentSchool} (On-Campus)` : "Official Partner School Campus",
        venueAddress: studentSchoolAddress || "Campus grounds / designated school pictorial hall",
        scheduleTitle: "Official School Batch Schedule",
        scheduleSubtitle: normalizedStudentSection ? `Arranged with Section ${normalizedStudentSection} (${studentBatch || 'Batch 2026'})` : "Timetable arranged directly with school administration",
        duration: "15–20 Mins / Student (Organized Batch Flow)",
        isStudio: false,
        isSchool: true,
      };
    }

    if (isCustomVenue) {
      return {
        type: "CUSTOM",
        badge: "On-Location Session",
        venue: customVenue || customAddress || "Client-Designated Venue",
        venueAddress: customAddress ? `${customAddress}${customBarangayCity ? `, ${customBarangayCity}` : ''}` : "On-location mobile studio deployment",
        scheduleTitle: eventDate ? `${eventDate} • ${preferredTime || 'Time TBD'}` : "Scheduled Event Time",
        scheduleSubtitle: "Designated private or event venue",
        duration: selectedTier?.duration && !selectedTier.duration.toLowerCase().includes("studio session")
          ? selectedTier.duration
          : "1–2 Hours (On-Location Session)",
        isStudio: false,
        isSchool: false,
      };
    }

    return {
      type: "STUDIO",
      badge: "In-Studio Session",
      venue: "E-Kodak Studio Cebu (Main Studio Bay)",
      venueAddress: "Studio Bay 1 & 2 • 311 Rizal Street, City of Naga, Cebu",
      scheduleTitle: eventDate ? `${eventDate} • ${preferredTime || 'Time TBD'}` : "Reserved Studio Slot",
      scheduleSubtitle: "Fully equipped air-conditioned studio with dressing & styling bays",
      duration: selectedTier?.duration && !selectedTier.duration.toLowerCase().includes("studio session")
        ? selectedTier.duration
        : "45–60 Mins (Dedicated Studio Slot)",
      isStudio: true,
      isSchool: false,
    };
  }, [isAcademicService, academicBookingMode, locationType, studentSchool, studentSchoolAddress, customVenue, customAddress, customBarangayCity, eventDate, preferredTime, selectedTier, studentSection, studentBatch]);

  // Fast-Track Campus Batch Review (Shortens process from 7 steps to 3 steps for school partners)
  const handleFastTrackBatchReview = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setValidationError("");
    if (!participantFirstName.trim()) {
      setValidationError("Please enter your First Name to continue.");
      return;
    }
    if (!studentSchool.trim()) {
      setValidationError("Please select or enter your School / Campus name.");
      return;
    }
    if (!studentSection.trim()) {
      setValidationError("Please enter your Class Section for batch ordering.");
      return;
    }
    setAcademicBookingMode("SCHOOL_PARTNER");
    setLocationType("CAMPUS");
    setStep(6); // Jump straight to Review & Confirm!
  };
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch Services & Add-ons
  useEffect(() => {
    async function fetchData() {
      try {
        const [servicesRes, addOnsRes] = await Promise.all([
          getServices(),
          getAddOns()
        ]);

        const loadedServices = (servicesRes?.data && servicesRes.data.length > 0)
          ? servicesRes.data
          : (SERVICES || []);

        setServices(loadedServices);

        // Auto-select if passed in URL
        if (initialServiceSlug && loadedServices.length > 0) {
          const srv = loadedServices.find(s => 
            s.slug === initialServiceSlug || 
            s.id === initialServiceSlug || 
            s.category === initialServiceSlug ||
            (initialServiceSlug === 'studio-packages' && s.slug === 'senior-high-packages') ||
            (initialServiceSlug === 'senior-high' && s.slug === 'senior-high-packages') ||
            (initialServiceSlug === 'college' && s.slug === 'college-packages')
          );
          if (srv) {
            setSelectedService(srv);
            if (initialTierName) {
              const tier = srv.tiers?.find(t => t.name === initialTierName || t.name?.toLowerCase() === initialTierName.toLowerCase());
              if (tier) setSelectedTier(tier);
            }
            if (initialTierName) setStep(3);
            else setStep(2);
          }
        }

        if (addOnsRes?.data && Array.isArray(addOnsRes.data)) {
          // Enforce deduplication by normalized name
          const seen = new Set();
          const uniqueAddOns = [];
          for (const item of addOnsRes.data) {
            const norm = (item.name || '').trim().toLowerCase();
            if (norm && !seen.has(norm)) {
              seen.add(norm);
              uniqueAddOns.push(item);
            }
          }
          setAddOnsList(uniqueAddOns);
        }
      } catch (fetchErr) {
        console.error("Failed to load services data, using fallback:", fetchErr);
        setServices(SERVICES || []);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [initialServiceSlug, initialTierName]);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/dashboard/book`);
    }
  }, [user, authLoading, navigate]);

  // Calculations for Pricing
  const basePrice = parsePrice(selectedTier?.price || selectedService?.base_price || 0);
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + parsePrice(a.price), 0);
  const totalAmount = basePrice + addOnsTotal;
  const downPaymentAmount = selectedTier?.down_payment ? parsePrice(selectedTier.down_payment) : Math.round(totalAmount * 0.5);
  const remainingBalance = Math.max(0, totalAmount - downPaymentAmount);

  const formattedTotal = `₱${totalAmount.toLocaleString()}`;
  const formattedDownPayment = `₱${downPaymentAmount.toLocaleString()}`;
  const formattedRemaining = `₱${remainingBalance.toLocaleString()}`;

  // Package inclusions derived from selected tier or base service
  const tierInclusions = useMemo(() => {
    return selectedTier?.highlights || selectedTier?.inclusions || selectedService?.inclusions || selectedService?.highlights || [];
  }, [selectedTier, selectedService]);

  // Categorized Add-ons filtering with strict deduplication
  const filteredAddOns = useMemo(() => {
    const seen = new Set();
    const uniqueList = [];
    for (const item of addOnsList) {
      const norm = (item.name || '').trim().toLowerCase();
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        uniqueList.push(item);
      }
    }
    let result = uniqueList;
    if (addonCategoryFilter !== "ALL") {
      result = result.filter(a => {
        const cat = (a.category || "").toLowerCase();
        const text = (a.name + " " + (a.description || "")).toLowerCase();
        if (addonCategoryFilter === "PRINT") {
          return cat.includes("print") || cat.includes("album") || cat.includes("keepsake") ||
                 text.includes("print") || text.includes("canvas") || text.includes("frame") || text.includes("album") || text.includes("portrait");
        }
        if (addonCategoryFilter === "DIGITAL") {
          return cat.includes("digital") || cat.includes("turnaround") || cat.includes("rush") ||
                 text.includes("rush") || text.includes("same-day") || text.includes("preview") || text.includes("digital") || text.includes("sneak");
        }
        if (addonCategoryFilter === "MAKEUP") {
          return cat.includes("makeup") || cat.includes("hair") || cat.includes("styling") ||
                 text.includes("makeup") || text.includes("hair") || text.includes("styling") || text.includes("gown") || text.includes("attire");
        }
        if (addonCategoryFilter === "PRODUCTION") {
          return cat.includes("production") || cat.includes("video") || cat.includes("aerial") || cat.includes("drone") ||
                 text.includes("video") || text.includes("drone") || text.includes("aerial") || text.includes("slideshow") || text.includes("location") || text.includes("photographer");
        }
        return cat.includes(addonCategoryFilter.toLowerCase());
      });
    }
    if (addonSearch.trim()) {
      const q = addonSearch.toLowerCase().trim();
      result = result.filter(a => a.name.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q));
    }
    return result;
  }, [addOnsList, addonCategoryFilter, addonSearch]);

  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev => {
      const exists = prev.some(a => a.name === addon.name);
      if (exists) {
        return prev.filter(a => a.name !== addon.name);
      } else {
        return [...prev, addon];
      }
    });
  };

  const togglePresetPeg = (peg) => {
    setSelectedPresetPegs(prev => {
      const exists = prev.includes(peg.title);
      if (exists) return prev.filter(p => p !== peg.title);
      return [...prev, peg.title];
    });
  };

  // Open Studio Concierge with context
  const triggerAIAssistant = (customPrompt = "") => {
    let prompt = customPrompt;
    if (!prompt) {
      prompt = `I am booking the ${selectedService?.name || 'Studio'} package. Can you give me advice on package tiers, shoot day styling, and studio preparation?`;
    }
    window.dispatchEvent(
      new CustomEvent("open-ai-assistant", {
        detail: { screen: "chat", prompt }
      })
    );
  };

  // Resolved Location String
  const isSchoolPartnerBatch = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";

  const resolvedLocation = isSchoolPartnerBatch
    ? (locationType === "STUDIO"
        ? "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu, https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
        : `School Campus: ${studentSchool || "School Campus"}${studentSchoolAddress ? ` (${studentSchoolAddress})` : ""}`)
    : locationType === "STUDIO"
    ? "E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu, https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
    : [customVenue, customAddress, customBarangayCity, customLandmark ? `(Landmark: ${customLandmark})` : ""].filter(Boolean).join(", ") || "Custom Venue";

  // Service-tailored special request template suggestions (Zero emojis)
  const activeSpecialTemplates = useMemo(() => {
    if (isCollegeService) return SPECIAL_REQUEST_TEMPLATES.graduation || [];
    if (isWeddingService) return SPECIAL_REQUEST_TEMPLATES.wedding || [];
    if (isCorporateService) return SPECIAL_REQUEST_TEMPLATES.corporate || [];
    return SPECIAL_REQUEST_TEMPLATES.general || [];
  }, [isCollegeService, isWeddingService, isCorporateService]);

  // Step Validation & Progression
  const handleNext = (e) => {
    e.preventDefault();
    setValidationError("");

    if (step === 1) {
      if (!selectedService) {
        setValidationError("Please select a photography service to continue.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedTier && selectedService.tiers?.length > 0) {
        setValidationError("Please choose a package tier to proceed.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (bookingFor === "school_section") {
        if (!masterlistData || !masterlistData.students || masterlistData.students.length === 0) {
          setValidationError("Please upload and scan your class masterlist PDF before proceeding.");
          return;
        }
        setStep(4);
        return;
      }
      // Validate participant personal information
      if (!participantFirstName.trim()) {
        setValidationError(
          bookingFor === "someone_else"
            ? "Please enter the First Name of the participant this booking is for."
            : "Please verify your First Name to continue."
        );
        return;
      }
      if (bookingFor === "someone_else" && !participantLastName.trim()) {
        setValidationError("Please enter the Last Name of the participant.");
        return;
      }

      // Validate dynamic fields based on service
      if (isCollegeService || isSeniorHighService) {
        if (!studentSchool.trim()) {
          setValidationError(`Please select or enter your ${isCollegeService ? "University / College" : "High School"}.`);
          return;
        }
        if (!studentBatch.trim()) {
          setValidationError("Please enter your Graduating Batch (e.g., Batch 2026).");
          return;
        }
        if (!studentSection.trim()) {
          setValidationError("Class Section is required for graduation records.");
          return;
        }
        if (!studentIdNumber.trim()) {
          setValidationError("Please provide your Student ID Number.");
          return;
        }
      } else if (isWeddingService) {
        if (!brideName.trim() || !groomName.trim()) {
          setValidationError("Please enter both the Bride and Groom names.");
          return;
        }
      }
      setStep(4);
    } else if (step === 4) {
      // Formerly Step 5: Schedule & Studio
      const isSchoolPartnerBatch = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";
      if (!isSchoolPartnerBatch) {
        if (!eventDate) {
          setValidationError("Please choose a target photoshoot date.");
          return;
        }
      }
      if (locationType === "CUSTOM" && !customAddress.trim() && !isSchoolPartnerBatch) {
        setValidationError("Please provide the street address for your on-location session.");
        return;
      }
      setStep(5);
    } else if (step === 5) {
      // Formerly Step 6: Pegs are optional
      setStep(6);
    } else if (step === 6) {
      // Formerly Step 7: Review & Confirm
      setShowOrderConfirmModal(true);
    }
  };

  // Direct package selection and immediate progression to Step 2 with smooth transition
  const handleSelectPackage = (svc) => {
    setProceedingSvcSlug(svc.slug);
    setSelectedService(svc);
    setSelectedTier(null);
    setSelectedAddOns([]);
    setValidationError("");
    if (svc.slug === "senior-high-packages") {
      setStudentType("SENIOR_HIGH");
      setSelectedUnivId("");
    } else if (svc.slug === "college-packages") {
      setStudentType("COLLEGE");
    }
    setTimeout(() => {
      setStep(2);
      setProceedingSvcSlug(null);
    }, 40);
  };

  // Submit Booking
  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    setValidationError("");

    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";

    const activeP = customerProfile || profile;
    const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
    const participantFullName = [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || (bookingFor === "myself" ? accountOwnerFullName : "Participant");

    let activeCustomerId = user?.id || activeP?.id;
    if (!activeCustomerId && isSupabaseConfigured && supabase) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session?.user?.id) {
          activeCustomerId = sessData.session.user.id;
        } else {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            activeCustomerId = authData.user.id;
          }
        }
      } catch (authErr) {
        console.warn("[Auth Check]", authErr);
      }
    }

    if (!activeCustomerId) {
      try {
        const cached = sessionStorage.getItem('ekodak_user_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) activeCustomerId = parsed.id;
        }
      } catch {}
    }

    if (!activeCustomerId) {
      setIsSubmitting(false);
      setValidationError("You must be logged in to reserve a photoshoot slot. Please sign in or refresh your session.");
      return;
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolvedServiceId = (
      (selectedService?.id && UUID_REGEX.test(selectedService.id))
        ? selectedService.id
        : (SERVICE_SLUG_TO_UUID?.[selectedService?.slug] || SERVICE_SLUG_TO_UUID?.[selectedService?.id] || "1471388e-b74f-41ec-96c8-1d220d557a89")
    );

    // Build consolidated notes with metadata
    let consolidatedNotes = notes || "";
    
    // 1. Participant / Beneficiary Block (Clearly defines who the session is for vs account owner)
    const beneficiaryBlock = `[BOOKING BENEFICIARY & PARTICIPANT]\n• Booking For: ${bookingFor === "someone_else" ? "Someone Else" : "Myself"}\n• Participant Name: ${participantFullName}\n• Participant Phone: ${participantPhone || 'N/A'}\n• Participant Email: ${participantEmail || 'N/A'}\n• Relationship to Account Owner: ${bookingFor === "someone_else" ? (participantRelationship || 'Beneficiary') : 'Self (Account Owner)'}\n• Account Owner: ${accountOwnerFullName} (${activeP?.email || user?.email || 'N/A'})`;
    consolidatedNotes = consolidatedNotes ? `${beneficiaryBlock}\n\n${consolidatedNotes}` : beneficiaryBlock;

    if (isAcademicService) {
      const studentBlock = `[STUDENT DETAILS]\n• Type: ${studentType === "COLLEGE" ? "College / University" : "Senior High School"}\n• Booking Mode: ${isSchoolPartner ? "School Campus (Date set by school) [SCHOOL_PARTNER]" : "Individual Booking"}\n• Student Name: ${participantFullName || 'N/A'}\n• Middle Name: ${participantMiddleName || 'N/A'}\n• School: ${studentSchool}\n• Campus / Address: ${studentSchoolAddress || 'N/A'}\n• Degree / Strand: ${studentType === "COLLEGE" ? (studentCourse || 'N/A') : (selectedShsStrand || 'N/A')}\n• Batch: ${studentBatch || 'N/A'}\n• Section: ${normalizedStudentSection || studentSection}\n• Student ID: ${studentIdNumber}\n• Yearbook Motto: ${yearbookMotto || 'N/A'}${schoolScheduleNote ? `\n• Note: ${schoolScheduleNote}` : ''}`;
      consolidatedNotes = `${consolidatedNotes}\n\n${studentBlock}`;
    } else if (isWeddingService) {
      const weddingBlock = `[WEDDING DETAILS]\n• Couple: ${brideName} & ${groomName}\n• Theme / Palette: ${weddingTheme || 'N/A'}\n• Ceremony Venue: ${ceremonyVenue || 'N/A'}\n• Coordinator: ${coordinatorName || 'N/A'} (${coordinatorContact || 'N/A'})`;
      consolidatedNotes = `${consolidatedNotes}\n\n${weddingBlock}`;
    } else if (isCorporateService) {
      const corpBlock = `[CORPORATE DETAILS]\n• Company: ${companyName || 'N/A'}\n• Role: ${clientRole || 'N/A'}\n• Intended Photo Usage: ${photoUsage || 'N/A'}`;
      consolidatedNotes = `${consolidatedNotes}\n\n${corpBlock}`;
    }

    const payload = {
      customer_id: activeCustomerId,
      service_id: resolvedServiceId,
      service_slug: selectedService?.slug || null,
      tier_name: selectedTier?.name || null,
      selected_add_ons: selectedAddOns.map(a => ({ name: a.name, price: parsePrice(a.price) })),
      participant_details: {
        booking_for: bookingFor,
        full_name: participantFullName,
        first_name: participantFirstName,
        middle_name: participantMiddleName,
        last_name: participantLastName,
        phone: participantPhone,
        email: participantEmail,
        relationship: bookingFor === "someone_else" ? participantRelationship : "Self",
        account_owner_name: accountOwnerFullName,
        account_owner_email: activeP?.email || user?.email
      },
      student_details: isAcademicService ? {
        type: studentType,
        booking_mode: academicBookingMode,
        student_name: participantFullName,
        middle_name: participantMiddleName || null,
        school: studentSchool,
        school_address: studentSchoolAddress,
        course: studentType === "COLLEGE" ? studentCourse : selectedShsStrand,
        batch: studentBatch,
        section: normalizedStudentSection || studentSection,
        student_id: studentIdNumber,
        yearbook_motto: yearbookMotto || null,
        schedule_note: schoolScheduleNote || null,
        schedule_agreement: isSchoolPartner ? "PENDING_STUDIO_SCHOOL_AGREEMENT" : "SELF_SCHEDULED"
      } : null,
      total_amount: totalAmount,
      down_payment_amount: downPaymentAmount,
      event_date: isSchoolPartner ? null : (eventDate || null),
      preferred_time: isSchoolPartner ? null : (preferredTime || null),
      location: isSchoolPartner && locationType === "CUSTOM"
        ? `On-Campus Pictorial Venue (${studentSchool || 'School Grounds'})`
        : resolvedLocation,
      notes: consolidatedNotes || null
    };

    const { data, error: submitError } = await createBooking(payload, referenceFiles);
    
    setIsSubmitting(false);

    if (submitError) {
      console.error("Booking creation error:", submitError);
      setValidationError("Failed to create booking: " + submitError.message);
    } else {
      setShowOrderConfirmModal(false);
      setShowReservationSuccessModal(false);
      setBookingResult(data);
      setStep(7);
      document.body.style.overflow = "";
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      
      // Record customer booking creation in audit trail safely
      if (activeCustomerId) {
        try {
          recordCustomerAction({
            userId: activeCustomerId,
            category: 'BOOKING',
            title: `Session Reserved (#${data.booking_number || 'New'})`,
            description: `Customer submitted photoshoot reservation for ${selectedService?.name || 'Studio Session'}${selectedTier ? ` (${selectedTier.name})` : ''}.`,
            changes: [
              `Service: ${selectedService?.name}`,
              selectedTier ? `Tier: ${selectedTier.name}` : null,
              eventDate ? `Date: ${eventDate}` : null,
              preferredTime ? `Time: ${preferredTime}` : null,
              resolvedLocation ? `Location: ${resolvedLocation}` : null,
              selectedAddOns.length > 0 ? `Add-ons: ${selectedAddOns.map(a => a.name).join(', ')}` : null
            ].filter(Boolean),
            bookingId: data.id,
            bookingNumber: data.booking_number
          });
        } catch (auditErr) {
          console.warn("[Customer Action Audit Warning]", auditErr);
        }
      }

      // Background studio photographer allocation attempt
      try {
        assignPhotographer({
          id: data.id,
          service_name: selectedService?.name || 'Studio Session',
          booking_date: isSchoolPartner ? null : eventDate,
          booking_time: isSchoolPartner ? null : preferredTime,
        }).catch(err => {
          console.warn("[Photographer Allocation]", err);
        });
      } catch (allocErr) {
        console.warn("[Photographer Allocation Sync Warning]", allocErr);
      }
    }
  };

  // Helper actions for Step 8 QR Pass & Receipt
  const handleDownloadPassSVG = () => {
    const svgEl = qrPassRef.current?.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = svgUrl;
      a.download = `${bookingResult?.booking_number || 'booking'}-studio-pass.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleCopyPassToken = () => {
    const token = bookingResult?.booking_token || bookingResult?.id;
    if (token && navigator.clipboard) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleCopyPassURL = () => {
    const token = bookingResult?.booking_token || bookingResult?.id;
    if (token && navigator.clipboard) {
      const passUrl = `${window.location.origin}/pass?token=${encodeURIComponent(token)}`;
      navigator.clipboard.writeText(passUrl);
      setCopiedPassUrl(true);
      setTimeout(() => setCopiedPassUrl(false), 2000);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // ── STEP 7: RESERVATION SUCCESS & CAMERA-READY QR PASS ────────────────────
  if (step === 7) {
    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";
    const activeBooking = bookingResult || {
      id: "pending",
      booking_number: "BK-2026-00002",
      booking_token: "pending",
      total_amount: totalAmount,
      down_payment_amount: downPaymentAmount,
      remaining_balance: remainingBalance,
      location: resolvedLocation,
      status: "PENDING"
    };
    const effectiveToken = activeBooking.booking_token || activeBooking.id;
    const passUrl = typeof window !== 'undefined' ? `${window.location.origin}/pass?token=${encodeURIComponent(effectiveToken)}` : `/pass?token=${encodeURIComponent(effectiveToken)}`;

    const progressMilestones = [
      {
        step: 1,
        title: "Reserved",
        badge: "Completed",
        isCurrent: false,
        isCompleted: true,
        icon: CheckCircle2,
        timing: "Completed",
        tooltip: "Your photoshoot reservation is logged in our studio queue with your selected package and schedule parameters.",
        avatarClass: "bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-xs",
        chipClass: "text-emerald-700 bg-emerald-50 border-emerald-200"
      },
      {
        step: 2,
        title: "Downpayment",
        badge: "Action Required",
        isCurrent: true,
        isCompleted: false,
        icon: CreditCard,
        timing: "Direct payment once confirmed",
        tooltip: "Once studio administrators review and confirm your booking request, you can directly settle your 50% deposit in Billing & Payments.",
        avatarClass: "bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-950 ring-4 ring-amber-300/60 shadow-md animate-pulse",
        chipClass: "text-amber-950 bg-amber-100 border-amber-300"
      },
      {
        step: 3,
        title: "Confirmed",
        badge: "Upcoming",
        isCurrent: false,
        isCompleted: false,
        icon: ShieldCheck,
        timing: "Direct after verification",
        tooltip: "Studio administrators verify your deposit and issue official confirmation with your assigned photographer credentials.",
        avatarClass: "bg-neutral-100 text-neutral-500 ring-2 ring-neutral-200/80 group-hover:bg-amber-100 group-hover:text-amber-900 group-hover:ring-gold/40 transition-all",
        chipClass: "text-neutral-500 bg-neutral-100 border-neutral-200"
      },
      {
        step: 4,
        title: "Photoshoot",
        badge: "Session Day",
        isCurrent: false,
        isCompleted: false,
        icon: Camera,
        timing: "On scheduled date",
        tooltip: "Arrive at the studio or on-campus venue. Present your digital QR pass at the front desk for instant camera check-in.",
        avatarClass: "bg-neutral-100 text-neutral-500 ring-2 ring-neutral-200/80 group-hover:bg-amber-100 group-hover:text-amber-900 group-hover:ring-gold/40 transition-all",
        chipClass: "text-neutral-500 bg-neutral-100 border-neutral-200"
      },
      {
        step: 5,
        title: "Photo Delivery",
        badge: "Final Gallery",
        isCurrent: false,
        isCompleted: false,
        icon: Sparkles,
        timing: "3–5 days post-session",
        tooltip: "Receive your color-graded high-resolution portrait gallery, downloadable digital proofs, and print fulfillment.",
        avatarClass: "bg-neutral-100 text-neutral-500 ring-2 ring-neutral-200/80 group-hover:bg-amber-100 group-hover:text-amber-900 group-hover:ring-gold/40 transition-all",
        chipClass: "text-neutral-500 bg-neutral-100 border-neutral-200"
      }
    ];

    return (
      <div className="animate-fade-in w-full max-w-[1440px] mx-auto px-2 sm:px-4 py-2 sm:py-4 font-body relative">
        {/* Subtle Ambient Studio Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-300/5 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        </div>

        {/* ── THE SIGNATURE E-KODAK WARM CREAM / CHAMPAGNE STUDIO FOLIO CONTAINER ── */}
        <div className="rounded-3xl sm:rounded-[32px] p-5 sm:p-7 lg:p-8 shadow-2xl relative z-10 bg-[#faf7f2] border border-amber-200/70 overflow-hidden space-y-5">
          
          {/* ── Clean, Non-Repetitive Top Header ── */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-heading text-lg sm:text-xl font-bold text-neutral-950">
                    Booking Reserved Successfully!
                  </h1>
                  <span className="font-mono text-xs font-bold bg-amber-500/10 text-amber-900 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                    #{activeBooking.booking_number}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Tentatively Held
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Slot secured in studio schedule queue. Once admin confirms your reservation, you can pay your downpayment directly.
                </p>
              </div>
            </div>

            {/* Hold Window Capsule */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shrink-0 font-medium self-start sm:self-auto">
              <Timer size={14} className="text-amber-700 shrink-0" />
              <span>50% Downpayment: <strong className="font-bold text-neutral-950">{formattedDownPayment}</strong></span>
              <span className="text-neutral-300">·</span>
              <span className="text-[11px] text-amber-800 font-semibold">Direct Payment Once Confirmed</span>
            </div>
          </div>

          {/* ── 3-Column Balanced Layout: Left (QR Pass) · Center (Details & Payment) · Right (Progress Sidebar) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* ── 1. LEFT COLUMN: PROMINENT LARGE QR STUDIO PASS (lg:col-span-4) ── */}
            <div className="lg:col-span-4 bg-gradient-to-b from-[#121115] via-[#16151c] to-[#0f0e13] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-gold/30 flex flex-col justify-between h-full relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-44 h-44 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

              {/* Pass Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10 text-xs relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono font-bold text-gold text-xs uppercase tracking-wider">
                    Camera-Ready Pass
                  </span>
                </div>
                <span className="font-mono text-neutral-400 text-xs">
                  #{activeBooking.booking_number}
                </span>
              </div>

              {/* Prominent Large QR Code Canvas */}
              <div className="relative text-center my-auto py-1 z-10 flex flex-col items-center justify-center">
                <div className="relative inline-block">
                  {/* Precision Gold Camera Viewfinder Reticle Brackets */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-gold rounded-tl-xs pointer-events-none z-20" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-gold rounded-tr-xs pointer-events-none z-20" />
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-gold rounded-bl-xs pointer-events-none z-20" />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-gold rounded-br-xs pointer-events-none z-20" />
                  
                  <div 
                    ref={qrPassRef}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-2xl inline-block border border-gold/60 cursor-pointer hover:scale-[1.02] transition-transform group relative overflow-hidden"
                    onClick={handleCopyPassURL}
                    title="Click to copy public pass URL"
                  >
                    <QRCodeSVG
                      bookingToken={effectiveToken}
                      size={220}
                      level="Q"
                      foregroundColor="#0a0a0f"
                      backgroundColor="#ffffff"
                      includeMargin={false}
                    />
                    <div className="absolute inset-0 bg-neutral-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-neutral-950/90 text-gold text-xs font-bold px-2.5 py-1 rounded-md border border-gold/30 flex items-center gap-1.5 font-mono shadow-lg">
                        <QrCode size={11} /> Scan Pass
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Token & Copy Strip */}
              <div className="bg-white/[0.06] border border-white/10 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-mono text-neutral-300 relative z-10">
                <div className="min-w-0 pr-2">
                  <span className="text-[11.5px] text-neutral-400 block uppercase font-sans font-medium">Digital Token:</span>
                  <span className="truncate block max-w-[170px] text-white font-semibold text-xs">{effectiveToken}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPassToken}
                  className="text-xs font-bold text-gold hover:text-white bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedToken ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedToken ? "Copied" : "Copy"}
                </button>
              </div>

              {/* 2x2 Action Buttons Grid (Clean, equal heights) */}
              <div className="grid grid-cols-2 gap-2 text-xs relative z-10">
                <a
                  href={passUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-gold/50 text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-all font-medium text-xs text-center"
                >
                  <ExternalLink size={12} className="text-gold shrink-0" /> Open Pass
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPassSVG}
                  className="h-10 px-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-gold/50 text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium text-xs text-center"
                >
                  <Download size={12} className="text-gold shrink-0" /> Download
                </button>

                <button
                  type="button"
                  onClick={handleCopyPassURL}
                  className="h-10 px-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-gold/50 text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium text-xs text-center"
                >
                  {copiedPassUrl ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="text-gold shrink-0" />}
                  {copiedPassUrl ? "Copied" : "Copy Link"}
                </button>

                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="h-10 px-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-gold/50 text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium text-xs text-center"
                >
                  <Printer size={12} className="text-gold shrink-0" /> Print
                </button>
              </div>

              {/* Clean Micro Sync Footer */}
              <div className="pt-2 border-t border-white/10 text-center text-xs text-neutral-400 relative z-10">
                <span className="text-gold font-medium">📱 Live Studio Pass:</span> Present at reception for instant check-in.
              </div>
            </div>

            {/* ── 2. CENTER COLUMN: RESERVATION DETAILS & PAYMENT SUMMARY (lg:col-span-5) ── */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-4">
              
              {/* Top: Photoshoot Details Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 shadow-xs border border-neutral-200/80 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                      <Camera size={14} />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-neutral-950">
                      Photoshoot Details
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Studio Confirmed
                  </span>
                </div>

                {/* 2-Column Grid: Package & Schedule */}
                <div className="grid sm:grid-cols-2 gap-2.5 text-xs items-stretch">
                  {/* Package Card */}
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/70 flex flex-col justify-between space-y-1">
                    <div>
                      <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-amber-900/70 block">
                        Package &amp; Tier
                      </span>
                      <p className="font-heading font-bold text-neutral-950 text-xs sm:text-sm mt-0.5 truncate">
                        {selectedService?.name}
                      </p>
                      <p className="text-[11.5px] text-neutral-700 font-medium">
                        Tier: <span className="font-semibold text-amber-950">{selectedTier?.name || "Standard"}</span>
                      </p>
                    </div>
                    <p className="text-xs text-neutral-600 flex items-center gap-1 pt-1 border-t border-amber-200/40">
                      <Clock size={11} className="text-gold shrink-0" />
                      <span>{detectedSessionInfo.duration}</span>
                    </p>
                  </div>

                  {/* Schedule Card */}
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 flex flex-col justify-between space-y-1">
                    <div>
                      <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                        {detectedSessionInfo.isSchool ? "Date & School Venue" : "Date & Studio Venue"}
                      </span>
                      <p className="font-heading font-bold text-neutral-950 text-xs sm:text-sm mt-0.5 flex items-center gap-1 truncate">
                        <Calendar size={12} className="text-gold shrink-0" />
                        <span className="truncate">
                          {isSchoolPartner
                            ? "Official School Batch Schedule"
                            : (eventDate ? eventDate : "Date TBD")}
                        </span>
                      </p>
                      <p className="text-[11.5px] text-neutral-700 font-medium">
                        {!isSchoolPartner && preferredTime 
                          ? (STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime) 
                          : (isSchoolPartner ? "School Batch Hours" : "Time Slot TBD")}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-600 flex items-center gap-1 pt-1 border-t border-neutral-200/40 truncate">
                      <MapPin size={11} className="text-gold shrink-0" />
                      <span className="truncate">{resolvedLocation}</span>
                    </p>
                  </div>
                </div>

                {/* Graduate & Participant Strip */}
                <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                      {isAcademicService ? "Graduate / Student" : "Client"}
                    </span>
                    <p className="font-heading font-bold text-neutral-950 text-xs mt-0.5">
                      {isAcademicService 
                        ? ([studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || "Student")
                        : ([editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") || "Client")}
                      {editPhone && <span className="text-neutral-500 font-normal ml-1 text-[11px]">({editPhone})</span>}
                    </p>
                  </div>

                  {isAcademicService && studentSchool && (
                    <div className="text-left sm:text-right">
                      <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                        Academic Campus
                      </span>
                      <p className="font-semibold text-neutral-900 text-xs truncate max-w-[200px]">
                        {studentSchool}
                      </p>
                      <p className="text-xs text-gold font-medium truncate max-w-[200px]">
                        {studentCourse || selectedShsStrand} {studentBatch ? `• ${studentBatch}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Add-ons mini strip (if any) */}
                {selectedAddOns.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50/30 border border-amber-200/60 flex items-center justify-between text-xs">
                    <span className="text-neutral-700 text-[11px] truncate max-w-[240px]">
                      Add-ons: <strong className="text-neutral-900">{selectedAddOns.map(a => a.name).join(', ')}</strong>
                    </span>
                    <span className="font-bold text-gold text-xs shrink-0">+₱{addOnsTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Bottom: Payment Breakdown & CTAs */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 shadow-xs border border-neutral-200/80 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-amber-700" />
                    <h3 className="font-heading text-sm font-bold text-neutral-950">
                      Payment Breakdown
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Guaranteed Rate
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-neutral-600 text-[11.5px]">
                    <span>Base Package</span>
                    <span className="font-medium text-neutral-900">₱{basePrice.toLocaleString()}</span>
                  </div>

                  {selectedAddOns.length > 0 && (
                    <div className="flex justify-between items-center text-neutral-600 text-[11.5px]">
                      <span>Selected Add-ons</span>
                      <span className="font-medium text-gold">+₱{addOnsTotal.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 text-xs font-bold text-neutral-950">
                    <span>Total Package Value</span>
                    <span className="font-heading text-base font-bold text-neutral-950">{formattedTotal}</span>
                  </div>
                </div>

                {/* Highlighted 50% Downpayment Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border border-gold/60 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 border border-gold/40">
                      <Timer size={16} className="text-amber-800" />
                    </div>
                    <div>
                      <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-amber-900/80 block">
                        50% Downpayment Due
                      </span>
                      <p className="text-[11px] text-amber-950">
                        Payable Upon Admin Confirmation
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 block">
                      {formattedDownPayment}
                    </span>
                    <span className="text-[11.5px] text-amber-800 font-medium">Due Now</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-neutral-500 px-0.5">
                  <span>Balance payable at studio:</span>
                  <span className="font-semibold text-neutral-800">{formattedRemaining}</span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <Link
                    to="/dashboard/payments"
                    className="btn-primary w-full h-11 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 shadow-md shadow-gold/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer rounded-xl"
                  >
                    <CreditCard size={16} /> Pay Downpayment in Billing &amp; Payments <ArrowRight size={15} />
                  </Link>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link
                      to={`/dashboard/bookings/${activeBooking.id}`}
                      className="h-9 flex items-center justify-center gap-1.5 font-medium rounded-lg border border-neutral-200 hover:border-gold hover:text-neutral-950 text-neutral-700 bg-neutral-50/50 hover:bg-neutral-100 transition-colors text-xs text-center"
                    >
                      <FileText size={12} className="text-gold shrink-0" /> Order Details
                    </Link>
                    <Link
                      to="/dashboard/bookings"
                      className="h-9 flex items-center justify-center gap-1.5 font-medium rounded-lg border border-neutral-200 hover:border-gold hover:text-neutral-950 text-neutral-700 bg-neutral-50/50 hover:bg-neutral-100 transition-colors text-xs text-center"
                    >
                      My Bookings
                    </Link>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 3. RIGHT VERTICAL SIDEBAR: ANIMATED BOOKING PROGRESS & WHAT HAPPENS NEXT (lg:col-span-3) ── */}
            <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 flex flex-col justify-between h-full space-y-3 relative">
              
              {/* Header */}
              <div className="pb-2.5 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-neutral-950 leading-tight">
                      Booking Progress
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Hover steps for full details
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertical Animated Progress Stepper */}
              <div className="relative flex-1 flex flex-col justify-between py-1 space-y-2.5">
                {/* Connecting Vertical Track Line */}
                <div className="absolute top-4 bottom-4 left-5 w-0.5 bg-neutral-200 z-0" />
                <div className="absolute top-4 left-5 w-0.5 h-[25%] bg-gradient-to-b from-emerald-500 to-amber-500 z-0" />

                {progressMilestones.map((item) => {
                  const StepIcon = item.icon;
                  return (
                    <div 
                      key={item.step}
                      className="group relative z-10 flex items-start gap-3 p-2 rounded-xl transition-all duration-200 hover:bg-amber-50/60 border border-transparent hover:border-amber-200/70 cursor-pointer"
                    >
                      {/* Animated Icon Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ${item.avatarClass}`}>
                        <StepIcon size={18} />
                      </div>

                      {/* Step Text Summary */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                            Step {item.step}
                          </span>
                          <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${item.chipClass}`}>
                            {item.badge}
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-xs text-neutral-950 mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {item.timing}
                        </p>
                      </div>

                      {/* ── Interactive Hoverable Text Display Popover / Floating Tooltip ── */}
                      <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 w-64 p-3.5 bg-neutral-950/95 text-white rounded-2xl shadow-2xl border border-gold/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 backdrop-blur-md hidden lg:block">
                        <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/10 mb-2">
                          <span className="text-xs font-mono font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Step {item.step}: {item.title}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {item.timing}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 leading-snug">
                          {item.tooltip}
                        </p>
                        {/* Caret / Pointer Arrow */}
                        <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-neutral-950 border-r border-t border-gold/40 rotate-45" />
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Help Tip */}
              <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-400 flex items-center gap-1.5">
                <Info size={12} className="text-gold shrink-0" />
                <span>Next: Settle 50% deposit in Payments</span>
              </div>

            </div>

          </div>

        </div>
      </div>
    );
  }

      const stepTitles = [
    "Service", "Package Tier", "Client Details", "Schedule & Studio", "Style Pegs", "Review"
  ];

  const stepSubtitles = [
    "Choose your photography service",
    "Select your package tier",
    "Provide identification details",
    "Pick date, time & location",
    "Set your style inspiration",
    "Review & confirm your booking"
  ];

  return (
    <div className="w-full flex-1 flex flex-col font-body pb-12 pt-0 px-3 sm:px-5 lg:px-6 relative animate-fade-in">
      {/* ── Ambient Motion Graphics ── floating shapes on the page bg */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft amber/gold halos */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full bg-amber-300/6 blur-[140px] animate-float-slow-1" />
        <div className="absolute top-1/3 right-0 w-[700px] h-[700px] rounded-full bg-gold/5 blur-[130px] animate-float-slow-2" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-amber-400/5 blur-[120px] animate-float-slow-1" />
        {/* Aperture ring accents */}
        <svg className="absolute top-16 right-[12%] opacity-[0.04] animate-spin-slow w-64 h-64" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="#c9a96e" strokeWidth="1.2" strokeDasharray="6 10" />
          <circle cx="100" cy="100" r="70" stroke="#c9a96e" strokeWidth="0.8" strokeDasharray="4 14" />
          <circle cx="100" cy="100" r="50" stroke="#c9a96e" strokeWidth="0.5" />
        </svg>
        <svg className="absolute bottom-32 left-[8%] opacity-[0.035] animate-spin-reverse-slow w-48 h-48" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="#c9a96e" strokeWidth="1" strokeDasharray="8 12" />
          <circle cx="100" cy="100" r="60" stroke="#c9a96e" strokeWidth="0.6" strokeDasharray="5 15" />
        </svg>
        {/* Floating dots */}
        <div className="absolute top-1/4 left-[20%] w-1 h-1 rounded-full bg-gold/20 animate-float-slow-2" />
        <div className="absolute top-2/3 right-[25%] w-1.5 h-1.5 rounded-full bg-amber-400/15 animate-float-slow-1" />
        <div className="absolute top-1/2 left-[65%] w-1 h-1 rounded-full bg-gold/15 animate-float-slow-2" />
        <div className="absolute top-[15%] left-[45%] w-0.5 h-0.5 rounded-full bg-gold/25 animate-float-slow-1" />
      </div>
      
      {/* Sticky Mobile Total Bar (visible only on mobile/tablet below lg) */}
      {totalAmount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-primary text-white px-4 py-3 flex items-center justify-between shadow-warm-md border-t border-primary-light/20">
          <div>
            <p className="text-xs text-neutral-300 uppercase tracking-wider font-medium">Total Balance</p>
            <p className="font-heading font-bold text-xl text-white">{formattedTotal}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gold font-bold">{formattedDownPayment}</p>
              <p className="text-xs text-neutral-400">50% down</p>
            </div>
            <span className="text-[11px] font-bold bg-gold text-primary px-3 py-1.5 rounded-full">
              Step {step}/7
            </span>
          </div>
        </div>
      )}

      {/* Lightbox for uploaded / custom preview images */}
      {lightboxImg && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X size={24} />
            </button>
            <img src={lightboxImg} alt="Preview" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>,
        document.body
      )}

      
      {/* ── Order Confirmation Modal Before Step 8 (QR Pass) (Luxury White Theme) ────────── */}
      {showOrderConfirmModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-2xl sm:max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-amber-300/80 my-auto animate-scale-up"
            style={{
              background: "linear-gradient(165deg, #FFFFFF 0%, #FAF8F5 50%, #F5F0E8 100%)",
              boxShadow: "0 25px 60px -15px rgba(44, 34, 22, 0.22), 0 0 35px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Golden top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500" />

            {/* Header */}
            <div 
              className="p-6 sm:p-7 pb-4 border-b border-amber-200/60 flex items-start justify-between gap-4"
              style={{
                background: "linear-gradient(90deg, rgba(212,175,55,0.12) 0%, rgba(255,255,255,0.85) 100%)",
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-900 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs font-mono">
                    <Sparkles size={11} className="text-amber-700" /> Pre-Submission Verification
                  </span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mt-1">
                  Confirm Your Reservation
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
                  Please review your photoshoot session details before we generate your digital QR pass.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-500 hover:text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
                disabled={isSubmitting}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Price banner */}
            <div className="px-6 sm:px-7 py-3.5 bg-gradient-to-r from-amber-50/90 via-[#FAF7F2] to-amber-50/60 border-b border-amber-200/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-heading font-bold text-neutral-800 text-xs sm:text-sm tracking-tight">
                  Total Package : <span className="text-neutral-950 font-extrabold">{formattedTotal}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-neutral-600 font-medium">
                  Down Payment (50%): <span className="text-[#B5883F] font-bold">{formattedDownPayment}</span>
                </span>
                <span className="text-neutral-300 hidden sm:inline">•</span>
                <span className="text-neutral-600 font-medium">
                  At Studio: <span className="text-neutral-900 font-bold">{formattedRemaining}</span>
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar font-body">
              {/* Top Validation & Reservation Error Alert */}
              {validationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3 text-xs text-rose-900 shadow-md animate-shake">
                  <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-sm text-rose-950">Unable to Reserve Photoshoot Slot</strong>
                    <p className="mt-1 text-xs text-rose-800 leading-relaxed font-medium">{validationError}</p>
                  </div>
                </div>
              )}

              {/* Package & Inclusions Card */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-amber-700" />
                    <span className="font-heading font-bold text-sm sm:text-base text-neutral-950">
                      {selectedService?.name} — <span className="text-amber-800">{selectedTier?.name || "Standard"}</span>
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#B5883F]">₱{basePrice.toLocaleString()}</span>
                </div>

                {/* Inclusions List */}
                {tierInclusions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">
                        Package Inclusions ({tierInclusions.length} items)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tierInclusions.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-50/30 via-white to-white border border-neutral-200/80 text-xs text-neutral-800 shadow-2xs">
                          <Check size={13} className="text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Client / Student Information */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    {isAcademicService ? <GraduationCap size={16} className="text-amber-700" /> : <User size={16} className="text-amber-700" />}
                    <span className="font-heading font-bold text-sm sm:text-base text-neutral-950">
                      Participant &amp; Account Details
                    </span>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-mono ${
                    bookingFor === "someone_else"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300"
                  }`}>
                    {bookingFor === "someone_else" ? "Someone Else" : "Personal (Self)"}
                  </span>
                </div>

                {/* Account Owner vs Participant Distinction Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Account Owner */}
                  <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
                    <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">Account Owner (Payer)</span>
                    <span className="font-bold text-neutral-900 text-sm block mt-0.5">
                      {activeProfile?.first_name || user?.user_metadata?.first_name || "Mark June"} {activeProfile?.last_name || user?.user_metadata?.last_name || "Repunte"}
                    </span>
                    <span className="text-[11px] text-neutral-500 block truncate mt-0.5">{activeProfile?.email || user?.email}</span>
                  </div>

                  {/* Booking Participant */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300/80">
                    <span className="text-xs uppercase text-amber-900 block font-bold font-mono">
                      {isAcademicService ? "Graduate / Student" : "Photoshoot Participant"}
                    </span>
                    <span className="font-bold text-neutral-950 text-sm block mt-0.5">
                      {[participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || "Participant"}
                    </span>
                    {bookingFor === "someone_else" && participantRelationship && (
                      <span className="text-xs text-amber-800 font-medium block mt-0.5">
                        Relationship: <strong>{participantRelationship}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Contact for Participant if Someone Else */}
                {bookingFor === "someone_else" && (participantPhone || participantEmail) && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-700 pt-1 border-t border-neutral-100">
                    {participantPhone && <span>Direct Mobile: <strong className="text-neutral-900">{participantPhone}</strong></span>}
                    {participantEmail && <span>Participant Email: <strong className="text-neutral-900">{participantEmail}</strong></span>}
                  </div>
                )}

                {isAcademicService && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-2.5 border-t border-neutral-100">
                    <div>
                      <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">School / Campus</span>
                      <span className="font-medium text-neutral-900 truncate block mt-0.5" title={studentSchool}>
                        {studentSchool || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">
                        {studentType === "COLLEGE" ? "Degree / Course" : "Academic Strand"}
                      </span>
                      <span className="font-medium text-neutral-900 block mt-0.5">
                        {studentType === "COLLEGE" ? (studentCourse || "N/A") : (selectedShsStrand || "N/A")}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">Section &amp; Batch</span>
                      <span className="font-bold text-amber-900 block mt-0.5">
                        {studentSection ? (studentSection.toLowerCase().startsWith('section') ? studentSection : `Section ${studentSection}`) : "N/A"} • <span className="text-neutral-500 font-normal">{studentBatch || "Batch 2026"}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">Student ID</span>
                      <span className="font-mono text-neutral-900 font-semibold block mt-0.5">{studentIdNumber || "N/A"}</span>
                    </div>
                    {yearbookMotto && (
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/80">
                        <span className="text-xs uppercase text-amber-900 block font-bold font-mono">Yearbook Motto</span>
                        <p className="italic text-neutral-800 mt-0.5">&quot;{yearbookMotto}&quot;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photoshoot Schedule & Location */}
              <div className="rounded-2xl border border-amber-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2.5 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                  <Calendar size={16} className="text-amber-700" />
                  <span className="font-heading font-bold text-sm text-neutral-950">Schedule &amp; Location</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">Date &amp; Time</span>
                    <span className="font-bold text-neutral-900 block mt-0.5">
                      {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                        ? "Official School Batch Schedule (Agreed with School)"
                        : `${eventDate || "Date TBD"} at ${STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime || "TBD"}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-neutral-500 block font-bold font-mono">Pictorial Venue</span>
                    <span className="font-bold text-neutral-900 block mt-0.5 truncate" title={resolvedLocation}>
                      {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS"
                        ? `On-Campus (${studentSchool || "School Campus"})`
                        : resolvedLocation}
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot Reservation Hold Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs">
                <Timer size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Confirming will place your photoshoot slot on <strong className="text-amber-900 font-bold">Reserved</strong> status. Once our studio admin reviews and confirms your reservation, you can settle your 50% reservation downpayment of <strong>₱{downPaymentAmount.toLocaleString()}</strong> directly in Billing &amp; Payments without any expiration timer.
                </span>
              </div>

              {/* In-Modal Validation & Reservation Error Alert */}
              {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs animate-shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-rose-950">Unable to Reserve Photoshoot Slot</strong>
                    <p className="mt-0.5 text-rose-800 leading-relaxed">{validationError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 px-6 sm:px-7 bg-white/95 border-t border-amber-200/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 hover:border-amber-400 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                disabled={isSubmitting}
              >
                <ArrowLeft size={14} /> Back to Review
              </button>

              <button
                type="button"
                onClick={handleSubmitBooking}
                disabled={isSubmitting}
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-heading font-black text-xs sm:text-sm h-11 px-6 sm:px-7 rounded-xl shadow-md shadow-gold/25 hover:shadow-gold/45 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Reserving Slot...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="stroke-[2.5]" /> Confirm &amp; Reserve Slot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {/* ── Set Selection Beneficiary Confirmation Modal (Step 2) ── */}
      <AnimatePresence>
        {showBookingForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowBookingForModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-white rounded-3xl shadow-2xl border border-gold/30 p-5 sm:p-6 max-w-lg w-full relative overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Golden luxury top bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3 mb-3.5 pt-0.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-900 flex items-center justify-center font-bold text-sm border border-amber-500/30">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase font-bold tracking-widest text-gold block">
                      Booking Confirmation
                    </span>
                    <h3 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-950 leading-tight">
                      Who is this booking for?
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingForModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Package size={16} className="text-gold shrink-0" />
                  <span className="text-xs font-bold text-neutral-900">
                    Selected: {(pendingTierToConfirm || selectedTier)?.name || "Session Package"}
                  </span>
                </div>
                <span className="font-heading font-black text-gold text-sm">
                  {(pendingTierToConfirm || selectedTier)?.price || ""}
                </span>
              </div>

              <p className="text-xs text-neutral-600 font-body mb-3 leading-snug">
                Please confirm whether this photography session is for yourself or another participant before proceeding:
              </p>

              {/* Interactive Choice Cards */}
              <div className="space-y-2.5 mb-5">
                {/* Option A: For Myself */}
                <div
                  onClick={() => handleSelectBookingFor("myself")}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    bookingFor === "myself"
                      ? "border-gold bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white shadow-md shadow-gold/5 ring-1 ring-gold/40"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    bookingFor === "myself" ? "border-gold bg-gold text-neutral-950" : "border-neutral-300 bg-white"
                  }`}>
                    {bookingFor === "myself" && <div className="w-2 h-2 rounded-full bg-neutral-950" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-heading font-bold text-sm text-neutral-950">
                        For Myself
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-body mt-1 leading-snug">
                      Photoshoot session, graduation regalia sizing, and official studio outputs will be issued in your own name.
                    </p>
                  </div>
                </div>

                {/* Option B: For Someone Else */}
                <div
                  onClick={() => handleSelectBookingFor("someone_else")}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    bookingFor === "someone_else"
                      ? "border-gold bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white shadow-md shadow-gold/5 ring-1 ring-gold/40"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    bookingFor === "someone_else" ? "border-gold bg-gold text-neutral-950" : "border-neutral-300 bg-white"
                  }`}>
                    {bookingFor === "someone_else" && <div className="w-2 h-2 rounded-full bg-neutral-950" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-heading font-bold text-sm text-neutral-950">
                        For Someone Else / Others
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-body mt-1 leading-snug">
                      Booking for your son, daughter, friend, relative, or client. You will enter their name and details in Step 4.
                    </p>
                  </div>
                </div>

                {/* Option C: School Section */}
                <div
                  onClick={() => handleSelectBookingFor("school_section")}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    bookingFor === "school_section"
                      ? "border-gold bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white shadow-md shadow-gold/5 ring-1 ring-gold/40"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                    bookingFor === "school_section" ? "border-gold bg-gold text-neutral-950" : "border-neutral-300 bg-white"
                  }`}>
                    {bookingFor === "school_section" && <div className="w-2 h-2 rounded-full bg-neutral-950" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-heading font-bold text-sm text-neutral-950">
                        School Section
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-body mt-1 leading-snug">
                      Every student's order will be listed into a PDF file and then scanned to detect their orders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowBookingForModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingTierToConfirm) {
                      setSelectedTier(pendingTierToConfirm);
                      setPendingTierToConfirm(null);
                      setStep(3);
                    }
                    setShowBookingForModal(false);
                    setValidationError(""); // smoothly advance to Step 3
                  }}
                  className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <span>Confirm &amp; Proceed</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Low Network Signal Safeguard & Safe Transaction Processing Overlay ── */}
      <AnimatePresence>
        {isSubmitting && (networkQuality.isLowSignal || submissionTimeElapsed >= 1) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99999] bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -10 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-neutral-900 border border-gold/40 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Animated Radar/Signal Pulsing Circles */}
              <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-gold/15 animate-ping" />
                <span className="absolute inset-2 rounded-full bg-amber-400/20 animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-gold flex items-center justify-center text-neutral-950 shadow-lg relative z-10">
                  <Wifi size={28} className="animate-pulse" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Low Signal Safe-Lock Active</span>
              </div>

              <h3 className="font-heading font-extrabold text-xl text-white tracking-tight mb-2">
                Securing Studio Booking
              </h3>

              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mb-5">
                Low network signal detected. We are holding your transaction state safely in the studio gateway to prevent duplicate payments or unissued booking records.
              </p>

              {/* Smooth Animated Shimmer Progress Bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden mb-3 border border-neutral-700/60 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 via-gold to-amber-300 rounded-full"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  style={{ width: "65%" }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck size={14} className="text-gold" />
                <span>Please do not close or refresh this page.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

{/* ── Reservation Success Modal with 2h-12h Payment Window & Auto-Reminders ───────────────────────────────── */}
      {showReservationSuccessModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-left font-body"
          onClick={() => setShowReservationSuccessModal(false)}
        >
          <div
            className="bg-neutral-900 border border-gold/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-neutral-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glow */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <button
              type="button"
              onClick={() => setShowReservationSuccessModal(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div className="text-center relative z-10 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 via-gold/20 to-amber-600/20 border border-gold/40 text-gold flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-gold/10">
                <CheckCircle size={36} className="text-gold" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-3 py-1 rounded-full inline-block mb-2">
                Booking Reserved • Hold Active
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Your Slot is Reserved!
              </h2>
              <p className="text-xs text-neutral-300 font-body mt-1.5 leading-relaxed">
                Booking Reference: <strong className="text-gold font-mono">{bookingResult?.booking_number || 'New'}</strong>
              </p>

              {/* Distinction: Booking Recipient vs Account Owner */}
              <div className="mt-3.5 p-3 rounded-2xl bg-white/[0.05] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                    <User size={14} />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-neutral-400 block leading-none">
                      Session Participant
                    </span>
                    <span className="font-heading font-bold text-white text-xs sm:text-sm mt-0.5 block">
                      {[participantFirstName, participantLastName].filter(Boolean).join(" ") || "Self"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    bookingFor === "someone_else"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}>
                    {bookingFor === "someone_else" ? `Someone Else · ${participantRelationship || 'Participant'}` : "Myself (Account Owner)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Crucial Reservation Information Box */}
            <div className="space-y-3 relative z-10 mb-6 text-xs">
              
              {/* 2h-12h Payment Window Card */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300 mt-0.5">
                    <Timer size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                      Direct Payment Upon Admin Confirmation
                    </h4>
                    <p className="text-neutral-300 leading-relaxed">
                      Your photoshoot reservation has been submitted for studio review. Once the studio administrator confirms your order, you can settle your 50% downpayment of <strong className="text-gold font-bold">₱{downPaymentAmount.toLocaleString()}</strong> directly in <strong className="text-white">Billing &amp; Payments</strong> without any expiration timer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automated Reminder Notification System Active Card */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-300 mt-0.5">
                    <BellRing size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-300 text-sm mb-1 flex items-center gap-1.5">
                      Instant Order Confirmation Alert
                    </h4>
                    <p className="text-neutral-300 leading-relaxed">
                      You will receive an instant notification as soon as the studio administrator confirms your booking request, allowing you to settle your downpayment directly to lock in your date.
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Pass Information */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-neutral-300 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold">
                  <QrCode size={18} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  Your <strong className="text-white">Unique Studio QR Pass</strong> has been generated with live database synchronization. Any downpayment or order updates will reflect instantly without changing the QR code.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowReservationSuccessModal(false);
                  navigate('/dashboard/payments');
                }}
                className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 font-bold py-3 text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold/25 hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <CreditCard size={15} /> Pay in Billing &amp; Payments
              </button>

              <button
                type="button"
                onClick={() => setShowReservationSuccessModal(false)}
                className="btn-outline !border-white/20 !text-neutral-200 hover:!text-white hover:!bg-white/10 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                View QR Pass &amp; Receipt <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ── Top Editorial Hero Banner with Studio Philippine Time (Consistent with Payments & Soft-copies) ── */}
      <div className="mt-1 mb-4 sm:mb-5">
        <ClientHeroBanner
          title={
            <span className="inline-flex items-baseline gap-2">
              <span>Book a</span>
              <span className="font-heading italic font-light bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
                Studio Session
              </span>
            </span>
          }
          subtitle="Select your photography collection, choose your package sets, and secure your schedule."
          badgeLabel="STUDIO BOOKING SUITE"
          showBookCta={false}
          extraActions={
            <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1 backdrop-blur-md shadow-xs">
              <button
                type="button"
                onClick={() => triggerAIAssistant()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Studio Concierge"
                aria-label="Studio Concierge"
              >
                <Sparkles size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/bookings')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="My Bookings"
                aria-label="My Bookings"
              >
                <CheckCircle size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/progress')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Session Milestones"
                aria-label="Session Milestones"
              >
                <Clock size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/gallery')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Photo Deliverables"
                aria-label="Photo Deliverables"
              >
                <ImageIcon size={14} />
              </button>
            </div>
          }
        />
      </div>

      {/* Main Layout: Full-width horizontal space matching steps 1 to 7 */}
      <div className="flex flex-col w-full flex-1">
        
        {/* Active Step Form Area */}
        <div className="w-full min-w-0 flex-1 flex flex-col">
          <div className="rounded-3xl p-5 sm:p-7 lg:p-8 shadow-2xl transition-all duration-500 relative white-animated-gradient-bg border border-white/80 ring-1 ring-gold/25 w-full flex-1 flex flex-col justify-between min-h-[calc(100vh-200px)]">
            
            {/* Luminous Animated Moving Gradient Orbs within the White Canvas */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-300/35 via-gold/30 to-transparent blur-[90px] animate-float-slow-1" />
              <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-gold/40 via-amber-400/25 to-transparent blur-[100px] animate-float-slow-2" />
              <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-yellow-300/35 via-amber-300/25 to-transparent blur-[95px] animate-float-slow-1" />
            </div>

            {/* ── Modern Studio Segmented Steps Tracker ── */}
            <div className="relative mb-3 sm:mb-4 px-2 sm:px-4 z-10 w-full max-w-4xl mx-auto">
              {/* Mobile Active Step Subhead */}
              <div className="md:hidden flex items-center justify-between text-xs mb-2.5 px-1 font-body">
                <span className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-950 text-gold font-mono text-[10px] font-black flex items-center justify-center shadow-xs">
                    0{step}
                  </span>
                  <span>{stepTitles[step - 1]}</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono font-medium">
                  {step} / 6
                </span>
              </div>

              {/* 6-Segment Progress Track */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 mb-2 sm:mb-3">
                {[1, 2, 3, 4, 5, 6].map((s) => {
                  const isActive = step === s;
                  const isCompleted = step > s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={s > step}
                      onClick={() => {
                        if (s < step) {
                          setStep(s);
                        }
                      }}
                      className={`group flex flex-col gap-1.5 text-left transition-all ${
                        s < step ? 'cursor-pointer' : s === step ? 'cursor-default' : 'cursor-not-allowed'
                      }`}
                      title={s < step ? `Return to Step ${s}: ${stepTitles[s - 1]}` : `Step ${s}: ${stepTitles[s - 1]}`}
                    >
                      {/* Segment Progress Bar */}
                      <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-neutral-200/90 dark:bg-neutral-800/90">
                        {isCompleted && (
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-gold rounded-full transition-all duration-300" />
                        )}
                        {isActive && (
                          <motion.div 
                            layoutId="active-step-bar"
                            className="absolute inset-0 bg-gradient-to-r from-gold via-amber-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(201,169,110,0.8)]"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                      </div>

                      {/* Step Metadata (Desktop & Tablet) */}
                      <div className="hidden md:flex items-center gap-1.5 select-none pt-0.5">
                        <span 
                          className={`text-[10px] font-mono font-bold leading-none transition-colors ${
                            isActive 
                              ? 'text-amber-900 dark:text-gold' 
                              : isCompleted 
                              ? 'text-gold group-hover:text-amber-500' 
                              : 'text-neutral-400 dark:text-neutral-600'
                          }`}
                        >
                          {isCompleted ? '✓' : `0${s}`}
                        </span>
                        <span 
                          className={`text-[11px] truncate tracking-tight transition-colors ${
                            isActive 
                              ? 'font-bold text-neutral-950 dark:text-white' 
                              : isCompleted 
                              ? 'font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-gold' 
                              : 'font-normal text-neutral-400 dark:text-neutral-600'
                          }`}
                        >
                          {stepTitles[s - 1]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-body border border-red-200 flex items-start gap-2.5 animate-shake relative z-10">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleNext} className="flex-1 flex flex-col justify-center w-full">
              
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: SELECT PHOTOGRAPHY SERVICE (HORIZONTAL STACKED CARDS)
              ───────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full flex flex-col justify-center py-2 sm:py-4 overflow-visible"
                >
                  {loadingData ? (
                    <div className="py-24 text-center text-neutral-400">
                      <Loader2 className="animate-spin mx-auto mb-3 text-gold" size={28} />
                      <p className="text-xs font-medium tracking-wide">Loading photography packages...</p>
                    </div>
                  ) : (
                    <div className="relative overflow-visible flex flex-col justify-center">
                      {/* Section Title */}
                      <div className="text-center mb-4 sm:mb-5 relative z-10">
                        <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                          Select a package
                        </h2>
                        <p className="text-xs text-neutral-600 font-body mt-1">
                          Hover over any photography package to reveal details and proceed
                        </p>
                      </div>

                      {/* Curated Package Cards: Close & Compact, Perfectly Upright (No Text Clipping, No Shape Distortion) */}
                      <div 
                        onMouseLeave={() => setHoveredServiceId(null)}
                        className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4 w-full max-w-[1140px] mx-auto pt-2 pb-2 px-2"
                      >
                        {services.map((svc) => {
                          const isSelected = selectedService?.id === svc.id;
                          const isHovered = hoveredServiceId === svc.id;

                          const coverImg = svc.coverImage || svc.cover_image || SERVICE_COVER_MAP[svc.slug] || "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=80&auto=format&fit=crop";

                          const minPrice = svc.tiers?.length 
                            ? Math.min(...svc.tiers.map(t => parsePrice(t.price)).filter(Boolean)) 
                            : parsePrice(svc.base_price);

                          return (
                            <motion.div 
                              key={svc.id || svc.slug}
                              onMouseEnter={() => setHoveredServiceId(svc.id)}
                              onClick={() => handleSelectPackage(svc)}
                              whileHover={{ y: -8 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 28,
                              }}
                              className="relative w-full cursor-pointer flex flex-col"
                            >
                              {/* Ambient Backlight Glow behind hovered card */}
                              {isHovered && (
                                <motion.div 
                                  layoutId="card-hover-glow"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute -inset-2 rounded-[28px] bg-gradient-to-r from-gold/30 via-amber-400/20 to-gold/30 blur-xl -z-10 pointer-events-none"
                                />
                              )}

                              {/* Inner Card (clipped for imagery and gradients) */}
                              <div 
                                className={`relative w-full h-[515px] sm:h-[535px] lg:h-[555px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 border-2 ${
                                  isSelected 
                                    ? 'border-gold ring-4 ring-gold/40' 
                                    : isHovered 
                                    ? 'border-gold shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7),0_0_24px_rgba(201,169,110,0.35)]' 
                                    : 'border-white/10 hover:border-gold/40'
                                }`}
                              >
                                {/* Background Image */}
                                <img 
                                  src={coverImg} 
                                  alt={svc.name}
                                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                                    isHovered ? 'scale-110' : 'scale-100'
                                  }`} 
                                />

                                {/* Multi-layer Gradients */}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/65 to-neutral-950/30 z-10 pointer-events-none" />
                                <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
                                  isHovered ? 'opacity-90' : 'opacity-70'
                                }`} />
                                 {/* Card Header: Clean Unobstructed Imagery (Selected Indicator Only) */}
                                 <div className="relative z-20 p-5 flex items-center justify-end min-h-[44px]">
                                   {isSelected && (
                                     <motion.div
                                       initial={{ scale: 0, opacity: 0 }}
                                       animate={{ scale: 1, opacity: 1 }}
                                       className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shadow-md border border-white/50"
                                       title="Selected Package"
                                     >
                                       <Check size={14} className="stroke-[3.5]" />
                                     </motion.div>
                                   )}
                                 </div>

                                {/* Card Bottom Details (Description removed) */}
                                <div className="relative z-20 p-6 flex flex-col justify-end">
                                  <div>
                                    <h3 className="font-heading text-2xl font-bold text-white tracking-wide leading-tight drop-shadow-md">
                                      {svc.name}
                                    </h3>
                                  </div>

                                  {/* Starting Price & Proceed Action (Icon-only by default, expands on hover) */}
                                  <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between gap-3">
                                    <div>
                                      <span className="text-xs uppercase font-bold tracking-widest text-neutral-400 block">
                                        Starting at
                                      </span>
                                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-gold drop-shadow-sm">
                                        ₱{minPrice.toLocaleString()}
                                      </span>
                                    </div>

                                    <motion.button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectPackage(svc);
                                      }}
                                      whileHover={{ scale: 1.06 }}
                                      whileTap={{ scale: 0.95 }}
                                      layout
                                      className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-gold text-neutral-950 font-bold p-2 hover:px-4 rounded-full text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer border border-white/40 shrink-0 shadow-md group"
                                      title="Proceed to Sets Selection"
                                    >
                                      <AnimatePresence>
                                        {(isHovered || proceedingSvcSlug === svc.slug) && (
                                          <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="whitespace-nowrap overflow-hidden pl-1 font-bold text-[11px]"
                                          >
                                            {proceedingSvcSlug === svc.slug ? "Opening Sets..." : "Proceed"}
                                          </motion.span>
                                        )}
                                      </AnimatePresence>
                                      <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-xs shrink-0">
                                        {proceedingSvcSlug === svc.slug ? (
                                          <Loader2 size={12} className="animate-spin text-gold" />
                                        ) : isSelected ? (
                                          <Check size={12} className="stroke-[3] text-gold" />
                                        ) : (
                                          <ArrowRight size={12} className="stroke-[2.5]" />
                                        )}
                                      </div>
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: HORIZONTAL SET CARDS (STEP 1 HOVER EXPERIENCE)
              ───────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col justify-center py-2 sm:py-3 overflow-visible"
                >
                  {/* Section Title - Balanced Spacing to Move Cards Down & Center */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Choose your package sets
                    </h2>
                    <p className="text-xs text-neutral-600 font-body mt-1.5">
                      Hover over any set to reveal its full inclusions and select your preferred package
                    </p>
                  </div>

                  {!selectedService?.tiers || selectedService.tiers.length === 0 ? (
                    <div className="p-8 bg-neutral-50 rounded-2xl text-center border border-neutral-100">
                      <Package size={32} className="mx-auto text-gold mb-2" />
                      <h3 className="font-heading text-lg text-primary">Standard Package</h3>
                      <p className="text-xs text-neutral-500 font-body mt-1 max-w-md mx-auto">
                        This service has a fixed comprehensive package.
                      </p>
                      <p className="font-bold text-2xl text-primary mt-3">
                        &#8369;{parsePrice(selectedService?.base_price).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="relative overflow-visible">
                      {/* Curated Set Cards: Same Size & Grid as Step 1 (No Inner Card Enclosure) */}
                      <div
                        ref={tierScrollRef}
                        onMouseLeave={() => setHoveredTierName(null)}
                        className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4 w-full max-w-[1140px] mx-auto pt-2 pb-2 px-2"
                      >
                        {selectedService.tiers.map((tier, idx) => {
                          const isTierSelected = selectedTier?._idx !== undefined
                            ? selectedTier._idx === idx
                            : (selectedTier?.name === tier.name && (selectedTier?.price ? selectedTier.price === tier.price : true));

                          const isHovered = hoveredTierName === tier.name;
                          const coverImg =
                            selectedService?.galleryImages?.[idx % (selectedService.galleryImages?.length || 1)] ||
                            selectedService?.coverImage ||
                            "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=80&auto=format&fit=crop";

                          const total = selectedService.tiers.length;
                          const showPanelLeft = total > 2 ? idx >= Math.ceil(total / 2) : (idx === total - 1 && total > 1);

                          return (
                            <motion.div
                              key={tier.name || idx}
                              onMouseEnter={() => {
                                if (tierHoverTimeoutRef.current) clearTimeout(tierHoverTimeoutRef.current);
                                setHoveredTierName(tier.name);
                              }}
                              onMouseLeave={() => {
                                if (tierHoverTimeoutRef.current) clearTimeout(tierHoverTimeoutRef.current);
                                tierHoverTimeoutRef.current = setTimeout(() => {
                                  setHoveredTierName(null);
                                }, 90);
                              }}
                              onClick={() => {
                                setPendingTierToConfirm({ ...tier, _idx: idx });
                                setShowBookingForModal(true);
                                setValidationError("");
                              }}
                              whileHover={{ y: -8 }}
                              transition={{ type: "spring", stiffness: 400, damping: 28 }}
                              style={{ zIndex: isHovered ? 100 : 1 }}
                              className={`relative w-full cursor-pointer flex flex-col ${isHovered ? 'z-50' : 'z-1'}`}
                            >
                              {/* Ambient Backlight Glow behind hovered card */}
                              {isHovered && (
                                <motion.div 
                                  layoutId="tier-card-hover-glow"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute -inset-2 rounded-[28px] bg-gradient-to-r from-gold/30 via-amber-400/20 to-gold/30 blur-xl -z-10 pointer-events-none"
                                />
                              )}

                              {/* ── CARD SHELL (Same Size as Step 1 Package Cards) ── */}
                              <div
                                className={`relative w-full h-[515px] sm:h-[535px] lg:h-[555px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 border-2 ${
                                  isTierSelected
                                    ? "border-gold ring-4 ring-gold/40 shadow-[0_0_40px_rgba(201,169,110,0.55),0_20px_45px_rgba(0,0,0,0.75)]"
                                    : isHovered
                                    ? "border-gold shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7),0_0_24px_rgba(201,169,110,0.35)]"
                                    : "border-white/10 hover:border-gold/40"
                                }`}
                              >
                                <img
                                  src={coverImg}
                                  alt={tier.name}
                                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                                    isHovered ? 'scale-105' : 'scale-100'
                                  }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/65 to-neutral-950/30 z-10 pointer-events-none" />
                                <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
                                  isHovered ? 'opacity-90' : 'opacity-70'
                                }`} />

                                {/* TOP: Clean Unobstructed Imagery (No Roman Numerals, No Collection Top Text) */}
                                <div className="relative z-20 p-5 flex items-center justify-end min-h-[44px]">
                                  {isTierSelected && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shadow-md border border-white/50"
                                      title="Selected Set"
                                    >
                                      <Check size={14} className="stroke-[3.5]" />
                                    </motion.div>
                                  )}
                                </div>

                                {/* BOTTOM: Name + Rate + Select Action (Right-aligned action button) */}
                                <div className="relative z-20 p-6 flex flex-col justify-end">
                                  <div>
                                    <h3 className="font-heading text-2xl font-bold text-white tracking-wide leading-tight drop-shadow-md">
                                      {tier.name}
                                    </h3>
                                  </div>

                                  {/* Rate & Select Button (Right Aligned Direct Access) */}
                                  <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between gap-3">
                                    <div>
                                      <span className="text-xs uppercase font-bold tracking-widest text-neutral-400 block">
                                        Rate
                                      </span>
                                      <span
                                        className="font-heading font-black text-gold text-xl sm:text-2xl leading-none block drop-shadow-sm mt-0.5"
                                        style={{ textShadow: isHovered || isTierSelected ? "0 0 16px rgba(201,169,110,0.9)" : "none" }}
                                      >
                                        {tier.price}
                                      </span>
                                    </div>

                                    {/* Action Button on Right Side */}
                                    <motion.button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingTierToConfirm({ ...tier, _idx: idx });
                                        setShowBookingForModal(true);
                                        setValidationError("");
                                      }}
                                      whileHover={{ scale: 1.08 }}
                                      whileTap={{ scale: 0.95 }}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md ${
                                        isTierSelected
                                          ? "bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 ring-2 ring-gold/50 shadow-[0_0_18px_rgba(201,169,110,0.85)]"
                                          : "border-2 border-white/35 hover:border-gold text-white/70 hover:text-gold bg-black/40 hover:bg-gold/20 backdrop-blur-md"
                                      }`}
                                      title={isTierSelected ? "Selected Set" : "Select this set"}
                                    >
                                      <Check size={isTierSelected ? 20 : 17} className={isTierSelected ? "stroke-[3.5]" : "stroke-[2.5]"} />
                                    </motion.button>
                                  </div>
                                </div>
                              </div>

                              {/* ────── RIGHT-SIDE INCLUSIONS PANEL (NO ROMAN NUMERALS) ────── */}
                              <AnimatePresence>
                                {isHovered && tier.highlights && tier.highlights.length > 0 && (() => {
                                  const popoverWidth = 540;

                                  return (
                                    <motion.div
                                      key="inclusions-panel"
                                      initial={{ opacity: 0, x: showPanelLeft ? 16 : -16, scale: 0.96 }}
                                      animate={{ opacity: 1, x: 0, scale: 1 }}
                                      exit={{ opacity: 0, x: showPanelLeft ? 16 : -16, scale: 0.96 }}
                                      transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.65 }}
                                      className="absolute top-0 pointer-events-auto z-[150]"
                                      onMouseEnter={() => {
                                        if (tierHoverTimeoutRef.current) clearTimeout(tierHoverTimeoutRef.current);
                                      }}
                                      onMouseLeave={() => {
                                        if (tierHoverTimeoutRef.current) clearTimeout(tierHoverTimeoutRef.current);
                                        tierHoverTimeoutRef.current = setTimeout(() => {
                                          setHoveredTierName(null);
                                          setHoveredInclusionIndex(null);
                                        }, 90);
                                      }}
                                      style={{
                                        [showPanelLeft ? "right" : "left"]: "calc(100% + 12px)",
                                        width: popoverWidth,
                                        maxWidth: "min(540px, calc(100vw - 320px))",
                                        zIndex: 150,
                                      }}
                                    >
                                      {/* Invisible bridge over the 12px gap to prevent cursor loss */}
                                      <div
                                        className="absolute top-0 bottom-0 pointer-events-auto"
                                        style={{
                                          [showPanelLeft ? "right" : "left"]: -24,
                                          width: 30,
                                        }}
                                      />

                                      {/* Luxury Compact Card */}
                                      <div
                                        className="rounded-2xl pointer-events-auto transition-all duration-300 relative shadow-2xl"
                                        style={{
                                          background: "linear-gradient(170deg, #FFFFFF 0%, #FCFAF7 50%, #F8F3EB 100%)",
                                          border: "1px solid rgba(212, 175, 55, 0.4)",
                                          boxShadow: "0 20px 45px -10px rgba(44, 34, 22, 0.16), 0 0 24px rgba(212,175,55,0.08)",
                                          backdropFilter: "blur(16px)",
                                        }}
                                      >
                                        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500 rounded-t-2xl" />

                                        {/* Direct Editorial Header (No Roman Numerals, No Icon) */}
                                        <div
                                          className="px-4 py-3 flex items-center justify-between gap-2 border-b border-[#EFE5D6]"
                                          style={{
                                            background: "linear-gradient(90deg, rgba(212,175,55,0.06) 0%, rgba(255,255,255,0.98) 100%)",
                                          }}
                                        >
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9A6A38] leading-none font-mono">
                                              What's Included
                                            </p>
                                            <h3 className="text-base font-heading font-black text-neutral-900 leading-tight mt-1 truncate">
                                              {tier.name}
                                            </h3>
                                          </div>
                                        </div>

                                        {/* Inclusions List */}
                                        <div className="p-3">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {tier.highlights.map((h, i) => {
                                              const p = parseInclusionDetails(h, selectedService.tiers);
                                              const isLastOdd = !p.isComplimentary && tier.highlights.length % 2 === 1 && i === tier.highlights.length - 1;
                                              const shouldSpanFull = p.isComplimentary || isLastOdd;
                                              const isTopRow = i < 2;
                                              const isItemHovered = hoveredInclusionIndex === i;

                                              return (
                                                <div
                                                  key={i}
                                                  onMouseEnter={() => setHoveredInclusionIndex(i)}
                                                  onMouseLeave={() => setHoveredInclusionIndex(null)}
                                                  className={`relative ${shouldSpanFull ? "col-span-full" : ""}`}
                                                >
                                                  <motion.div
                                                    whileHover={{ scale: 1.02, x: 2 }}
                                                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                                                    className={`group relative px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2.5 shadow-2xs select-none cursor-pointer ${
                                                      isItemHovered
                                                        ? "bg-[#FFFDF7] border-amber-500/90 ring-1 ring-amber-400/40 shadow-md"
                                                        : p.isComplimentary
                                                        ? "bg-[#FCF5F6] hover:bg-[#FFF0F3] border-[#F6DCE2] hover:border-[#F2B5C3] shadow-xs"
                                                        : "bg-white hover:bg-[#FFFDF9] border-[#E7DFD3] hover:border-amber-400/80 hover:shadow-xs"
                                                    }`}
                                                  >
                                                    <div className="flex items-center min-w-0 flex-1">
                                                      <span className="font-heading font-bold text-xs sm:text-[12.5px] text-neutral-900 leading-snug whitespace-nowrap group-hover:text-amber-950 transition-colors truncate">
                                                        {p.title}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center shrink-0 pl-2">
                                                      {p.isComplimentary ? (
                                                        <span className="font-heading font-bold text-[11px] text-[#C23B60] bg-[#FDEEF2] px-2.5 py-0.5 rounded-full border border-[#F7CCD7]">
                                                          FREE
                                                        </span>
                                                      ) : (
                                                        <span className="font-heading font-bold text-xs sm:text-[12px] text-amber-950 bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#EFE4D2] whitespace-nowrap">
                                                          {formatPieceQuantity(p.quantity)}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </motion.div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Seamless Connector Nub */}
                                      <div
                                        className="absolute top-7 w-3 h-3 pointer-events-none"
                                        style={{
                                          [showPanelLeft ? "right" : "left"]: -6,
                                          transform: "rotate(45deg)",
                                          background: "#FCFAF7",
                                          borderTop: showPanelLeft ? "none" : "1px solid rgba(212,175,55,0.4)",
                                          borderLeft: showPanelLeft ? "none" : "1px solid rgba(212,175,55,0.4)",
                                          borderBottom: showPanelLeft ? "1px solid rgba(212,175,55,0.4)" : "none",
                                          borderRight: showPanelLeft ? "1px solid rgba(212,175,55,0.4)" : "none",
                                          boxShadow: showPanelLeft ? "2px 2px 4px rgba(44,34,22,0.05)" : "-2px -2px 4px rgba(44,34,22,0.05)",
                                        }}
                                      />
                                    </motion.div>
                                  );
                                })()}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

                            {/* ─────────────────────────────────────────────────────────────
                  STEP 3: DYNAMIC CUSTOMER & VERIFICATION DETAILS
              ───────────────────────────────────────────────────────────── */}
              {step === 3 && (() => {
                const activeProfile = customerProfile || profile;
                const clientInitials = `${(activeProfile?.first_name || user?.email || "C")[0] || ""}${activeProfile?.last_name ? activeProfile.last_name[0] : ""}`.toUpperCase() || "CL";

                return (
                  <div className="space-y-8 animate-fade-in overflow-visible">
                    {/* Section Title Header */}
                    <div className="text-center mb-6 sm:mb-8 relative z-10 pt-6 sm:pt-10">
                      <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                        {bookingFor === "school_section"
                          ? "School Section Masterlist"
                          : bookingFor === "someone_else"
                          ? "Participant & session details"
                          : "Identification & session details"}
                      </h2>
                      <p className="text-xs text-neutral-600 font-body mt-1 max-w-md mx-auto">
                        {bookingFor === "school_section"
                          ? "Upload your class masterlist PDF to automatically detect student orders and package sets"
                          : bookingFor === "someone_else"
                          ? "Provide the details of the student or participant this session is being booked for"
                          : isAcademicService
                          ? "Review your package orders and verify your university, program, and section for graduation records"
                          : isWeddingService
                          ? "Review your package orders and provide couple details, venue, and styling notes"
                          : "Review your package orders and verify your contact profile and photoshoot requirements"}
                      </p>
                    </div>

                    {/* Recipient Mode Indicator / Switcher */}
                    <div className="flex items-center justify-between px-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-medium">Recipient Mode:</span>
                        <span className="font-bold text-neutral-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60 font-mono text-[11px]">
                          {bookingFor === "school_section"
                            ? "School Section"
                            : bookingFor === "someone_else"
                            ? "For Someone Else"
                            : "For Myself"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBookingForModal(true)}
                        className="text-gold hover:text-amber-700 font-bold underline cursor-pointer text-xs"
                      >
                        Change Mode
                      </button>
                    </div>

                    {/* ── CASE 1: SCHOOL SECTION (ONLY PDF UPLOAD & AUTOMATED SCANNER) ── */}
                    {bookingFor === "school_section" && (
                      <SchoolMasterlistUploader
                        masterlistData={masterlistData}
                        onMasterlistChange={(data) => {
                          setMasterlistData(data);
                          if (data?.school) setStudentSchool(data.school);
                          if (data?.section) setStudentSection(data.section);
                          if (data?.batch) setStudentBatch(data.batch);
                        }}
                        availableTiers={(selectedService?.tiers || []).map((t) => t.name)}
                        schoolName={studentSchool}
                        onSchoolNameChange={setStudentSchool}
                        sectionName={studentSection}
                        onSectionNameChange={setStudentSection}
                      />
                    )}

                    {/* ── CASE 2: FOR MYSELF (WHAT'S INCLUDED CARD) ── */}
                    {bookingFor === "myself" && (
                      <div
                        className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-amber-300/60 flex flex-col justify-between"
                        style={{
                          background: "linear-gradient(165deg, #FFFFFF 0%, #FAF8F5 50%, #F5F0E8 100%)",
                          boxShadow: "0 25px 50px -12px rgba(44, 34, 22, 0.16), 0 0 30px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,1)"
                        }}
                      >
                        {/* Golden luxury top accent line */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500" />

                        {/* Header: What's Included + Set Name (Clean: No Roman crest, No Inclusions pill) */}
                        <div
                          className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-amber-200/60"
                          style={{
                            background: "linear-gradient(90deg, rgba(212,175,55,0.12) 0%, rgba(255,255,255,0.7) 100%)",
                          }}
                        >
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-800/80 leading-none font-mono">
                              What's Included
                            </p>
                            <h3 className="text-lg font-heading font-bold text-neutral-900 leading-tight mt-0.5">
                              {selectedTier?.name || "Selected Set"}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200 transition-colors cursor-pointer"
                            title="Change set"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>

                        {/* Inclusions 2-Column Grid */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(selectedTier?.highlights || selectedTier?.inclusions || []).map((h, i) => {
                              const p = parseInclusionDetails(h, selectedService?.tiers);
                              const totalCount = (selectedTier?.highlights || []).length;
                              const isLastOdd = !p.isComplimentary && totalCount % 2 === 1 && i === totalCount - 1;
                              const shouldSpanFull = p.isComplimentary || isLastOdd;

                              return (
                                <div
                                  key={i}
                                  onMouseEnter={() => { setHoveredInclusion(i); setHoveredInclusionIndex(i); }}
                                  onMouseLeave={() => { setHoveredInclusion(null); setHoveredInclusionIndex(null); }}
                                  className={`relative px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                                    shouldSpanFull ? "sm:col-span-2" : ""
                                  } ${
                                    p.isComplimentary
                                      ? "bg-gradient-to-r from-rose-50/70 via-amber-50/50 to-white border border-rose-200/80 shadow-xs"
                                      : "bg-white/95 border border-amber-200/70 shadow-2xs hover:border-amber-400/80 hover:shadow-xs"
                                  }`}
                                >
                                  <span className="font-heading font-semibold text-neutral-900 text-xs truncate">
                                    {p.title}
                                  </span>

                                  {p.isComplimentary ? (
                                    <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                                      FREE
                                    </span>
                                  ) : p.quantity ? (
                                    <span className="text-[11px] font-heading font-medium text-amber-950/80 px-2.5 py-0.5 rounded-full bg-amber-50/80 border border-amber-200/60 shrink-0">
                                      {p.quantity} {p.quantity === 1 ? "pc" : "pcs"}
                                    </span>
                                  ) : null}

                                  {/* Tooltip on hover */}
                                  <AnimatePresence>
                                    {(hoveredInclusion === i || hoveredInclusionIndex === i) && (() => {
                                      const isTopRow = i < 2;
                                      const displaySize = (() => {
                                        if (p.size) {
                                          if (p.size === '2R') return '2R (2.5×3.5\")';
                                          return p.size.replace(/X/g, '×');
                                        }
                                        return p.isComplimentary ? 'Complimentary' : 'Standard';
                                      })();

                                      return (
                                        <motion.div
                                          initial={{ opacity: 0, y: isTopRow ? 6 : -6, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: isTopRow ? 4 : -4, scale: 0.95 }}
                                          transition={{ duration: 0.15, ease: "easeOut" }}
                                          className="absolute z-[120] rounded-xl p-1 shadow-2xl pointer-events-none whitespace-nowrap w-max max-w-[calc(100vw-32px)]"
                                          style={{
                                            [isTopRow ? "top" : "bottom"]: "calc(100% + 6px)",
                                            [shouldSpanFull ? "left" : i % 2 === 0 ? "left" : "right"]: 0,
                                            background: "linear-gradient(160deg, #1C1917 0%, #0F0E0C 100%)",
                                            border: "1.5px solid rgba(212, 175, 55, 0.65)",
                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.85), 0 0 14px rgba(212, 175, 55, 0.2)",
                                          }}
                                        >
                                          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/35 text-white">
                                            <span className="font-heading font-black text-amber-300 text-xs tracking-tight">
                                              {p.title}
                                            </span>
                                            <div className="w-[1px] h-3.5 bg-amber-400/30 shrink-0" />
                                            <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                                              <span className="text-[11px] uppercase tracking-wider text-amber-400/90 font-bold">
                                                SIZE:
                                              </span>
                                              <span className="text-white font-black">
                                                {displaySize}
                                              </span>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })()}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── CASE 3: FOR SOMEONE ELSE (PARTICIPANT FORM DIRECTLY) ── */}
                    {bookingFor === "someone_else" && (
                      <div className="p-5 sm:p-7 rounded-3xl bg-white border border-amber-300/80 shadow-2xs space-y-4 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                          <div>
                            <h5 className="font-heading font-bold text-base text-amber-950 flex items-center gap-2">
                              <User size={16} className="text-gold" /> Participant Personal Information
                            </h5>
                            <p className="text-xs text-neutral-600 font-body mt-0.5">
                              Enter the information of the person who will be attending this photoshoot.
                            </p>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300/80 font-mono">
                            Participant Record
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Participant First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={participantFirstName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParticipantFirstName(val);
                                if (isAcademicService) setStudentFirstName(val);
                              }}
                              placeholder="e.g. Jude Lawrence"
                              required
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-semibold text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Middle Name
                            </label>
                            <input
                              type="text"
                              value={participantMiddleName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParticipantMiddleName(val);
                                if (isAcademicService) setStudentMiddleName(val);
                              }}
                              placeholder="e.g. Marie"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Participant Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={participantLastName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParticipantLastName(val);
                                if (isAcademicService) setStudentLastName(val);
                              }}
                              placeholder="e.g. Sinugbuhan"
                              required
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-semibold text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Relationship to You
                            </label>
                            <select
                              value={participantRelationship}
                              onChange={(e) => setParticipantRelationship(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="Friend">Friend</option>
                              <option value="Classmate">Classmate</option>
                              <option value="Sibling">Sibling (Brother / Sister)</option>
                              <option value="Child">Child (Son / Daughter)</option>
                              <option value="Spouse / Partner">Spouse / Partner</option>
                              <option value="Parent">Parent (Mother / Father)</option>
                              <option value="Colleague">Colleague / Workmate</option>
                              <option value="Client">Client</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Participant Phone
                            </label>
                            <input
                              type="tel"
                              value={participantPhone}
                              onChange={(e) => setParticipantPhone(e.target.value)}
                              placeholder="e.g. 09123456789"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Participant Email
                            </label>
                            <input
                              type="email"
                              value={participantEmail}
                              onChange={(e) => setParticipantEmail(e.target.value)}
                              placeholder="e.g. participant@gmail.com"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>

                        {/* Distinction Context Bar */}
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-[11px] text-neutral-600 flex items-start gap-2.5">
                          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-bold text-primary">Account Owner Protection:</span> You are currently logged in as <strong className="text-primary font-semibold">{activeProfile?.first_name || user?.user_metadata?.first_name || "Mark June"} {activeProfile?.last_name || user?.user_metadata?.last_name || "Repunte"}</strong>. You will hold ownership of the billing and order tracking, but this session will be recorded and personalized for <strong className="text-gold font-bold">{participantFirstName || "the participant"} {participantLastName || ""}</strong>.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── FORMS FOR MYSELF & SOMEONE ELSE (HIDDEN FOR SCHOOL SECTION) ── */}
                    {bookingFor !== "school_section" && (
                      <>
                    {/* ─────────────────────────────────────────────────────────────
                        CLIENT PROFILE MINI CARDS & INLINE EDITING UI (WEDDING / CORPORATE)
                    ───────────────────────────────────────────────────────────── */}
                    {!isAcademicService && (
                      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-4 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-3">
                          {activeProfile?.avatar_url ? (
                            <img
                              src={activeProfile.avatar_url}
                              alt="Client Avatar"
                              className="w-10 h-10 rounded-2xl object-cover border border-gold/40 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-gold font-heading font-black text-sm flex items-center justify-center border border-gold/40 shadow-xs tracking-wider">
                              {clientInitials}
                            </div>
                          )}
                          <div>
                            <span className="text-xs uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Client Profile
                            </span>
                            <h4 className="font-heading font-bold text-primary text-sm sm:text-base leading-tight mt-0.5">
                              {activeProfile?.first_name || activeProfile?.last_name
                                ? `${activeProfile?.first_name || ""} ${activeProfile?.last_name || ""}`.trim()
                                : user?.email || "Valued Customer"}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full shadow-2xs">
                            <ShieldCheck size={12} className="text-emerald-600" /> Verified Account
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProfile(!isEditingProfile);
                              setProfileError("");
                              setProfileSaveSuccess(false);
                            }}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shadow-2xs ${
                              isEditingProfile
                                ? "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200"
                                : "bg-neutral-900 text-gold border-neutral-800 hover:border-gold/50 hover:bg-neutral-800"
                            }`}
                          >
                            {isEditingProfile ? (
                              <>
                                <X size={12} /> Cancel
                              </>
                            ) : (
                              <>
                                <Edit3 size={12} /> Edit Details
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Display Mode: 4 Interactive Mini Info Cards */}
                      {!isEditingProfile ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-body">
                          {/* Card 1: Client Name (Clickable to Edit) */}
                          <div
                            onClick={() => setIsEditingProfile(true)}
                            title="Click to edit name"
                            className="p-3 rounded-2xl bg-neutral-50/80 hover:bg-amber-50/20 border border-neutral-200/70 hover:border-gold/60 cursor-pointer transition-all flex flex-col justify-between group shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-neutral-400 mb-1">
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-gold" />
                                <span className="text-xs uppercase font-bold tracking-wider">Client Name</span>
                              </div>
                              <Edit3 size={11} className="opacity-0 group-hover:opacity-100 text-gold transition-opacity" />
                            </div>
                            <span className="font-semibold text-primary truncate text-xs">
                              {activeProfile?.first_name || activeProfile?.last_name
                                ? `${activeProfile?.first_name || ""} ${activeProfile?.last_name || ""}`.trim()
                                : <span className="text-neutral-400 italic">Click to set</span>}
                            </span>
                            <span className="text-[11px] text-neutral-400 mt-1">Full legal name</span>
                          </div>

                          {/* Card 2: Email */}
                          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between text-neutral-400 mb-1">
                              <div className="flex items-center gap-1.5">
                                <Mail size={13} className="text-gold" />
                                <span className="text-xs uppercase font-bold tracking-wider">Email</span>
                              </div>
                              <Lock size={10} className="text-neutral-400" title="Account login email" />
                            </div>
                            <span className="font-medium text-neutral-700 truncate text-xs" title={activeProfile?.email || user?.email}>
                              {activeProfile?.email || user?.email || "No email on file"}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
                              <Check size={9} /> Verified email
                            </span>
                          </div>

                          {/* Card 3: Phone (Clickable to Edit) */}
                          <div
                            onClick={() => setIsEditingProfile(true)}
                            title="Click to edit phone"
                            className="p-3 rounded-2xl bg-neutral-50/80 hover:bg-amber-50/20 border border-neutral-200/70 hover:border-gold/60 cursor-pointer transition-all flex flex-col justify-between group shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-neutral-400 mb-1">
                              <div className="flex items-center gap-1.5">
                                <Phone size={13} className="text-gold" />
                                <span className="text-xs uppercase font-bold tracking-wider">Phone</span>
                              </div>
                              <Edit3 size={11} className="opacity-0 group-hover:opacity-100 text-gold transition-opacity" />
                            </div>
                            <span className="font-semibold text-primary truncate text-xs">
                              {activeProfile?.phone ? (
                                activeProfile.phone
                              ) : (
                                <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-xs font-bold inline-block">
                                  + Add Phone
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-neutral-400 mt-1">SMS & Studio Alerts</span>
                          </div>

                          {/* Card 4: Account Role */}
                          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                              <Sparkles size={13} className="text-gold" />
                              <span className="text-xs uppercase font-bold tracking-wider">Account Role</span>
                            </div>
                            <span className="font-semibold text-gold capitalize truncate text-xs">
                              {activeProfile?.role || "Customer"}
                            </span>
                            <span className="text-[11px] text-neutral-400 mt-1">Member Account</span>
                          </div>
                        </div>
                      ) : (
                        /* Edit Mode: Inline Responsive Form Panel with Database Sync */
                        <form onSubmit={handleSaveProfile} className="p-4 sm:p-5 rounded-2xl bg-neutral-50/90 border-2 border-gold/40 shadow-xs space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2.5">
                            <div>
                              <h5 className="font-heading font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
                                <Edit3 size={13} className="text-gold" /> Edit Client Profile
                              </h5>
                              <p className="text-[11px] text-neutral-500 font-body">
                                Changes are saved directly to your account in the database.
                              </p>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">Live DB Sync</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                placeholder="First Name"
                                required
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-medium outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                placeholder="Last Name"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-medium outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="e.g. 09102949414"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-medium outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </div>

                          {profileError && (
                            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>{profileError}</span>
                            </div>
                          )}

                          {profileSaveSuccess && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                              <span>Profile updated and successfully saved to database!</span>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200/70">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingProfile(false);
                                setEditFirstName(activeProfile?.first_name || "");
                                setEditLastName(activeProfile?.last_name || "");
                                setEditPhone(activeProfile?.phone || "");
                                setProfileError("");
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 text-xs font-medium transition-all shadow-2xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={profileSaving}
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-gold border border-gold/40 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {profileSaving ? (
                                <>
                                  <Loader2 size={13} className="animate-spin text-gold" />
                                  <span>Saving to DB...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} className="text-gold" />
                                  <span>Save Changes</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASE A: UNIFIED ACADEMIC & CLIENT PROFILE FORM
                      (Client Profile, Name of the School, Address, Academic Strand & Batching)
                  ───────────────────────────────────────────────────────────── */}
                  {isAcademicService && (
                    <div className="p-5 sm:p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
                      {/* Form Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30 shadow-xs">
                            <GraduationCap size={20} />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-primary text-base sm:text-lg leading-tight">
                              {isSeniorHighService ? "Senior High Academic Registration" : "College & University Registration"}
                            </h4>
                            <p className="text-xs text-neutral-500 font-body">
                              Verify your contact profile, institution, campus address, and batching records
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full shadow-2xs">
                            <ShieldCheck size={12} className="text-emerald-600" /> Active Student Profile
                          </span>
                        </div>
                      </div>

                      {/* ── 1. STUDENT / GRADUATE DETAILS ─────────────────────────────────── */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                              <User size={13} />
                            </div>
                            <span className="font-heading text-xs sm:text-sm font-bold text-primary">
                              1. Student / Graduate Information
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-body">
                            Account Holder: <strong className="text-primary font-semibold">{activeProfile?.first_name || user?.user_metadata?.first_name || "Client"} {activeProfile?.last_name || user?.user_metadata?.last_name || ""}</strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-body">
                          Enter the full name of the student or graduate appearing in this photoshoot. Booking on behalf of another person will not change your account profile.
                        </p>

                        {/* Name Fields (Row 1): Student First Name, Middle Name, Last Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Student First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentFirstName}
                              onChange={(e) => setStudentFirstName(e.target.value)}
                              placeholder="First Name"
                              className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-semibold outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Middle Name
                            </label>
                            <input
                              type="text"
                              value={studentMiddleName}
                              onChange={(e) => setStudentMiddleName(e.target.value)}
                              placeholder="Middle Name / Initial"
                              className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-semibold outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Student Last Name
                            </label>
                            <input
                              type="text"
                              value={studentLastName}
                              onChange={(e) => setStudentLastName(e.target.value)}
                              placeholder="Last Name"
                              className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-semibold outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>

                        {/* Contact Fields (Row 2): Phone Number & Verified Account Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="e.g., 09102949414"
                              className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-medium outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1 flex items-center justify-between">
                              <span>Email Address</span>
                              <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5"><Check size={10} /> Verified</span>
                            </label>
                            <div className="relative flex items-center">
                              <Mail size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                              <input
                                type="email"
                                value={activeProfile?.email || user?.email || ""}
                                readOnly
                                disabled
                                className="w-full h-11 pl-10 pr-8 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm text-neutral-600 font-medium outline-none shadow-2xs cursor-not-allowed"
                              />
                              <Lock size={12} className="absolute right-3 text-neutral-400" title="Account Email" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Divider */}
                      <div className="border-t border-neutral-100" />

                      {/* ── 2. NAME OF THE SCHOOL & ADDRESS ─────────────────────────── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                            <Building size={13} />
                          </div>
                          <span className="font-heading text-xs sm:text-sm font-bold text-primary">
                            2. Name of the School &amp; Campus Address
                          </span>
                        </div>

                        {isSeniorHighService ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                High School Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={studentSchool}
                                onChange={e => setStudentSchool(e.target.value)}
                                placeholder="e.g., Cebu City National Science High School"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                School Campus / Address
                              </label>
                              <div className="relative flex items-center">
                                <MapPin size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={studentSchoolAddress}
                                  onChange={e => setStudentSchoolAddress(e.target.value)}
                                  placeholder="e.g., Salvador St, Labangon, Cebu City"
                                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* College / University */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div ref={univContainerRef} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-primary">
                                  University / College Name <span className="text-red-500">*</span>
                                </label>
                                {univDropdownOpen && (
                                  <button
                                    type="button"
                                    onClick={() => setUnivDropdownOpen(false)}
                                    className="text-xs text-neutral-400 hover:text-primary font-semibold"
                                  >
                                    Hide ✕
                                  </button>
                                )}
                              </div>

                              <div className="relative flex items-center">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                  {activeUnivId ? (
                                    <SchoolLogo univId={activeUnivId} name={studentSchool} size="sm" />
                                  ) : (
                                    <GraduationCap size={18} className="text-neutral-400" />
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={studentSchool}
                                  onFocus={() => {
                                    setUnivDropdownOpen(true);
                                    setDegreeDropdownOpen(false);
                                  }}
                                  onChange={e => {
                                    setStudentSchool(e.target.value);
                                    setSelectedUnivId("");
                                    setUnivDropdownOpen(true);
                                    setDegreeDropdownOpen(false);
                                  }}
                                  placeholder="Type university (e.g., CTU Naga, USC, CIT-U, UC)..."
                                  className={`w-full h-11 ${activeUnivId ? "pl-11" : "pl-10"} pr-9 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-semibold text-primary shadow-2xs transition-all`}
                                />

                                {studentSchool && (
                                  <button
                                    type="button"
                                    onClick={handleClearSchool}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500 p-1 text-xs rounded-full hover:bg-neutral-100 transition-colors"
                                    title="Clear university selection"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Predictive Campus Menu */}
                              {univDropdownOpen && filteredCampuses.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-neutral-200 shadow-2xl max-h-64 overflow-y-auto divide-y divide-neutral-100 animate-fade-in">
                                  <div className="p-2.5 text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 sticky top-0 flex items-center justify-between border-b border-neutral-100 z-10 backdrop-blur-sm">
                                    <span>Campuses &amp; Branches ({filteredCampuses.length})</span>
                                    <button
                                      type="button"
                                      onClick={() => setUnivDropdownOpen(false)}
                                      className="text-neutral-400 hover:text-primary font-bold px-1.5 py-0.5 rounded hover:bg-neutral-200 text-xs"
                                    >
                                      Close ✕
                                    </button>
                                  </div>
                                  {filteredCampuses.map((item) => (
                                    <div
                                      key={item.id}
                                      onClick={() => handleSelectCampus(item)}
                                      className="p-2.5 hover:bg-gold/10 cursor-pointer transition-colors text-xs flex items-center gap-3"
                                    >
                                      <SchoolLogo univId={item.univId} name={item.univName} size="md" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-primary text-xs">{item.univName}</span>
                                          {item.isExtension ? (
                                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                              Extension
                                            </span>
                                          ) : (
                                            <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                                              Main / Branch
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-neutral-500 font-body line-clamp-1 mt-0.5 flex items-center gap-1">
                                          <MapPin size={11} className="shrink-0 text-gold" />
                                          <span className="font-medium text-neutral-700">{item.campusName}</span>
                                          <span className="text-neutral-400">· {item.campusLocation}</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Campus / Branch Address
                              </label>
                              <div className="relative flex items-center">
                                <MapPin size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={studentSchoolAddress}
                                  onChange={e => setStudentSchoolAddress(e.target.value)}
                                  placeholder="e.g., Main Campus, Gorordo Ave, Lahug, Cebu City"
                                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section Divider */}
                      <div className="border-t border-neutral-100" />

                      {/* ── 3. ACADEMIC STRAND & BATCHING SECTION ───────────────────── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                            <GraduationCap size={13} />
                          </div>
                          <span className="font-heading text-xs sm:text-sm font-bold text-primary">
                            {isSeniorHighService ? "3. Academic Strand & Batching" : "3. Degree Program & Batching"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Strand or Degree Program */}
                          {isSeniorHighService ? (
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Senior High Academic Strand <span className="text-red-500">*</span>
                              </label>
                              <StudioDropdown
                                className="w-full block"
                                triggerClassName="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none shadow-2xs"
                                value={selectedShsStrand}
                                onChange={val => setSelectedShsStrand(val)}
                                options={SHS_STRANDS.map(s => ({
                                  value: s.code,
                                  label: s.name,
                                  badge: s.code,
                                }))}
                                placeholder="Select Academic Strand"
                              />
                            </div>
                          ) : (
                            <div ref={degreeContainerRef} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-primary">
                                  Degree Program / Course <span className="text-red-500">*</span>
                                </label>
                                {degreeDropdownOpen && (
                                  <button
                                    type="button"
                                    onClick={() => setDegreeDropdownOpen(false)}
                                    className="text-xs text-neutral-400 hover:text-primary font-semibold"
                                  >
                                    Hide ✕
                                  </button>
                                )}
                              </div>

                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={studentCourse}
                                  onFocus={() => {
                                    setDegreeDropdownOpen(true);
                                    setUnivDropdownOpen(false);
                                  }}
                                  onChange={e => {
                                    setStudentCourse(e.target.value);
                                    setDegreeDropdownOpen(true);
                                    setUnivDropdownOpen(false);
                                  }}
                                  placeholder="e.g., BS Information Technology"
                                  className="w-full h-11 pl-3.5 pr-8 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none shadow-2xs font-semibold"
                                />
                                {studentCourse && (
                                  <button
                                    type="button"
                                    onClick={() => setStudentCourse("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary text-xs"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Floating Suggestions */}
                              {degreeDropdownOpen && filteredPrograms.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-xl border border-neutral-200 shadow-xl max-h-48 overflow-y-auto divide-y divide-neutral-100">
                                  <div className="p-2 text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 sticky top-0 flex items-center justify-between border-b border-neutral-100 z-10">
                                    <span>Popular Academic Programs</span>
                                    <button
                                      type="button"
                                      onClick={() => setDegreeDropdownOpen(false)}
                                      className="text-neutral-400 hover:text-primary font-bold px-1.5 py-0.5 rounded hover:bg-neutral-200 text-xs"
                                    >
                                      Close ✕
                                    </button>
                                  </div>
                                  {filteredPrograms.map((prog, i) => (
                                    <div
                                      key={i}
                                      onClick={() => {
                                        setStudentCourse(prog);
                                        setDegreeDropdownOpen(false);
                                      }}
                                      className="p-2.5 hover:bg-gold/10 cursor-pointer transition-colors text-xs text-primary font-medium"
                                    >
                                      {prog}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Graduating Batch */}
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Graduating Batch <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentBatch}
                              onChange={e => setStudentBatch(e.target.value)}
                              placeholder="e.g., Batch 2026"
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs font-semibold"
                            />
                          </div>

                          {/* Class Section */}
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Class Section <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentSection}
                              onChange={e => setStudentSection(e.target.value)}
                              placeholder={isSeniorHighService ? "e.g., Alcala, Duterte, A, or 1" : "e.g., A, B, 1, or 4-1"}
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs font-semibold"
                            />
                          </div>

                          {/* Student ID */}
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Student ID Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentIdNumber}
                              onChange={e => setStudentIdNumber(e.target.value)}
                              placeholder={isSeniorHighService ? "e.g., 2026-SHS-0192" : "e.g., 22104582 / 2022-01452"}
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* Motto for Yearbook */}
                          <div className="sm:col-span-2 pt-1">
                            <label className="block text-xs font-bold text-primary mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={13} className="text-gold" />
                                Motto for Yearbook
                              </span>
                              <span className="text-xs text-neutral-400 font-normal">Official graduation album print</span>
                            </label>
                            <div className="relative flex items-center">
                              <Edit3 size={15} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                              <input
                                type="text"
                                value={yearbookMotto}
                                onChange={e => setYearbookMotto(e.target.value)}
                                placeholder='e.g., "The future belongs to those who believe in the beauty of their dreams."'
                                className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs italic font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                    {/* ─────────────────────────────────────────────────────────────
                        CASE B: WEDDING MINI CARDS UI
                    ───────────────────────────────────────────────────────────── */}
                    {isWeddingService && (
                      <div className="space-y-4">
                        {/* Mini Card 1: The Couple */}
                        <div className="p-5 rounded-3xl border border-rose-200 bg-white shadow-2xs space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                              <Heart size={16} />
                            </div>
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">The Wedding Couple</h4>
                              <p className="text-xs text-neutral-500 font-body">Enter full names for photographic titles &amp; album embossing</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Bride's Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={brideName}
                                onChange={e => setBrideName(e.target.value)}
                                placeholder="e.g., Maria Santos"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Groom's Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={groomName}
                                onChange={e => setGroomName(e.target.value)}
                                placeholder="e.g., Juan Dela Cruz"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Mini Card 2: Ceremony Venue & Theme */}
                        <div className="p-5 sm:p-6 rounded-3xl border border-neutral-200/90 bg-white shadow-2xs space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                            <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                              <MapPin size={16} />
                            </div>
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Venue &amp; Color Palette</h4>
                              <p className="text-xs text-neutral-500 font-body">Used by lighting directors and lead cinematographers</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Wedding Theme / Color Palette</label>
                              <input
                                type="text"
                                value={weddingTheme}
                                onChange={e => setWeddingTheme(e.target.value)}
                                placeholder="e.g., Sage Green & Champagne Gold / Rustic Earth"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Ceremony Church / Venue
                              </label>
                              <div className="relative flex items-center">
                                <MapPin size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={ceremonyVenue}
                                  onChange={e => setCeremonyVenue(e.target.value)}
                                  placeholder="e.g., Cebu Metropolitan Cathedral / Chateau de Busay"
                                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mini Card 3: Wedding Coordination */}
                        <div className="p-5 sm:p-6 rounded-3xl border border-neutral-200/90 bg-white shadow-2xs space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                            <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                              <Phone size={16} />
                            </div>
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Wedding Day Coordinator</h4>
                              <p className="text-xs text-neutral-500 font-body">Direct contact for production timeline alignment</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Coordinator Name / Team</label>
                              <input
                                type="text"
                                value={coordinatorName}
                                onChange={e => setCoordinatorName(e.target.value)}
                                placeholder="e.g., Signature Events Management"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Coordinator Contact Phone</label>
                              <input
                                type="tel"
                                value={coordinatorContact}
                                onChange={e => setCoordinatorContact(e.target.value)}
                                placeholder="e.g., 0917 123 4567"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        CASE C: CORPORATE MINI CARDS UI
                    ───────────────────────────────────────────────────────────── */}
                    {isCorporateService && (
                      <div className="space-y-4">
                        <div className="p-5 sm:p-6 rounded-3xl border border-neutral-200/90 bg-white shadow-2xs space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                            <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                              <Briefcase size={16} />
                            </div>
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Corporate &amp; Professional Profile</h4>
                              <p className="text-xs text-neutral-500 font-body">Company organization and designation for business deliverables</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">
                                Company / Organization <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="e.g., Tech Solutions Cebu / Freelance"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none font-semibold text-primary shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Designation / Role</label>
                              <input
                                type="text"
                                value={clientRole}
                                onChange={e => setClientRole(e.target.value)}
                                placeholder="e.g., Managing Director / Partner / Engineer"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none shadow-2xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-primary mb-1">Primary Photo Usage</label>
                              <StudioDropdown
                                value={photoUsage}
                                onChange={val => setPhotoUsage(val)}
                                options={[
                                  { value: "LinkedIn & Executive Profile", label: "LinkedIn & Executive Social Profile" },
                                  { value: "Company Website & Press Kit", label: "Company Official Website & Press Kit" },
                                  { value: "Book / Publication Author Photo", label: "Book / Academic Publication Author Photo" },
                                  { value: "Marketing Collateral & Keynote Speaker", label: "Marketing Collateral & Keynote Speaker Feature" },
                                ]}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: SCHEDULE & STUDIO LOCATION (8AM-5PM, BATCH SCHEDULING)
              ───────────────────────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Section Title Header matching Steps 1 to 4 */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-4 sm:pt-6">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                      {isAcademicService
                        ? "Graduation Pictorial Arrangement"
                        : "Schedule & Studio Location"}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      {isAcademicService
                        ? "Photoshoot Scheduling Arrangement"
                        : "Session date, time & studio location"}
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-body mt-1 max-w-md mx-auto">
                      {isAcademicService
                        ? "Choose whether your graduation pictorial will be held at school or at the studio."
                        : "Studio operating hours: strictly 8:00 AM – 5:00 PM. Pick your preferred camera bay date."}
                    </p>
                  </div>

                  {/* ── ACADEMIC SCHEDULING ARRANGEMENT SELECTOR ── */}
                  {isAcademicService && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
                            <Calendar size={15} />
                          </div>
                          <span className="font-heading text-xs sm:text-sm font-bold text-primary">
                            Photoshoot Venue Arrangement Option
                          </span>
                        </div>
                      </div>

                      {/* 2-Card Arrangement Selector: AT SCHOOL and AT STUDIO */}
                      <div className="grid sm:grid-cols-2 gap-3.5 pt-1">
                        {/* Option 1: AT SCHOOL */}
                        <div
                          onClick={() => {
                            setAcademicBookingMode("SCHOOL_PARTNER");
                            setLocationType("CAMPUS");
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            academicBookingMode === "SCHOOL_PARTNER"
                              ? "border-primary bg-neutral-900 text-white shadow-md ring-2 ring-gold/40"
                              : "border-neutral-200 bg-neutral-50/70 hover:border-gold/60 hover:bg-white text-neutral-900"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${academicBookingMode === "SCHOOL_PARTNER" ? "text-white" : "text-primary"}`}>
                                <GraduationCap size={16} className={academicBookingMode === "SCHOOL_PARTNER" ? "text-gold" : "text-amber-700"} />
                                AT SCHOOL
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="step5AcademicBookingMode"
                                  checked={academicBookingMode === "SCHOOL_PARTNER"}
                                  onChange={() => {
                                    setAcademicBookingMode("SCHOOL_PARTNER");
                                    setLocationType("CAMPUS");
                                  }}
                                  className="accent-gold w-4 h-4 cursor-pointer"
                                />
                              </div>
                            </div>
                            <p className={`text-xs font-body leading-relaxed ${academicBookingMode === "SCHOOL_PARTNER" ? "text-neutral-300" : "text-neutral-600"}`}>
                              Your graduation pictorial will be held at your school, following the official school batch schedule.
                            </p>
                          </div>
                          <div className={`mt-3 pt-2.5 border-t flex items-center gap-1.5 text-[11px] font-semibold ${
                            academicBookingMode === "SCHOOL_PARTNER"
                              ? "border-white/10 text-gold"
                              : "border-neutral-200 text-amber-800"
                          }`}>
                            <Clock size={12} className="shrink-0" />
                            <span>Date and time are set by the school</span>
                          </div>
                        </div>

                        {/* Option 2: AT STUDIO */}
                        <div
                          onClick={() => {
                            setAcademicBookingMode("INDIVIDUAL");
                            setLocationType("STUDIO");
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            academicBookingMode === "INDIVIDUAL"
                              ? "border-primary bg-neutral-900 text-white shadow-md ring-2 ring-gold/40"
                              : "border-neutral-200 bg-neutral-50/70 hover:border-gold/60 hover:bg-white text-neutral-900"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${academicBookingMode === "INDIVIDUAL" ? "text-white" : "text-primary"}`}>
                                <Building size={16} className={academicBookingMode === "INDIVIDUAL" ? "text-gold" : "text-emerald-700"} />
                                AT STUDIO
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="step5AcademicBookingMode"
                                  checked={academicBookingMode === "INDIVIDUAL"}
                                  onChange={() => {
                                    setAcademicBookingMode("INDIVIDUAL");
                                    setLocationType("STUDIO");
                                  }}
                                  className="accent-gold w-4 h-4 cursor-pointer"
                                />
                              </div>
                            </div>
                            <p className={`text-xs font-body leading-relaxed ${academicBookingMode === "INDIVIDUAL" ? "text-neutral-300" : "text-neutral-600"}`}>
                              Your graduation pictorial will be held at the studio. Choose your preferred date and time below.
                            </p>
                          </div>
                          <div className={`mt-3 pt-2.5 border-t flex items-center gap-1.5 text-[11px] font-semibold ${
                            academicBookingMode === "INDIVIDUAL"
                              ? "border-white/10 text-emerald-400"
                              : "border-neutral-200 text-emerald-800"
                          }`}>
                            <Calendar size={12} className="shrink-0" />
                            <span>Select your preferred studio photoshoot date on the calendar below.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CALENDAR & TIME SLOTS: ONLY FOR AT STUDIO OR NON-ACADEMIC BOOKINGS ── */}
                  {(!isAcademicService || academicBookingMode === "INDIVIDUAL") && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Notice for Individual Student Booking */}
                      {isAcademicService && academicBookingMode === "INDIVIDUAL" && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-300/60 flex items-start gap-2.5 text-xs text-primary font-body animate-fade-in">
                          <CheckCircle size={18} className="text-gold shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-xs text-primary">
                              In-Studio Graduation Pictorial
                            </span>
                            <span className="text-[11px] text-neutral-600">
                              Please select your preferred photoshoot date and studio time slot from the calendar below.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Target Date Picker with Interactive Calendar */}
                      <div>
                        <label className="block text-xs font-bold text-primary mb-2 flex items-center justify-between">
                          <span>Preferred Photoshoot Date <span className="text-red-500">*</span></span>
                          <span className="text-xs text-neutral-400 font-normal">Interactive Calendar View</span>
                        </label>

                        <div className="grid md:grid-cols-2 gap-4 items-start">
                          <InteractiveCalendar 
                            value={eventDate}
                            onChange={d => setEventDate(d)}
                            minDate={new Date().toISOString().split('T')[0]}
                          />
                          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-3">
                            <div className="flex items-center gap-2 text-primary font-heading font-semibold text-sm border-b border-neutral-200/60 pb-2">
                              <Calendar size={16} className="text-gold" />
                              <span>Selected Session Date</span>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-neutral-200/80 font-body text-sm font-bold text-primary flex items-center justify-between">
                              <span>{eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Please pick a date on calendar'}</span>
                              {eventDate && <CheckCircle size={16} className="text-emerald-500" />}
                            </div>
                            <p className="text-[11px] text-neutral-500 font-body leading-relaxed">
                              Studio operating hours are strictly 8:00 AM to 5:00 PM. Weekend sessions fill quickly, so selecting your preferred date early secures your camera bay.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Discrete Time Slots (8AM - 5PM) */}
                      <div>
                        <label className="block text-xs font-bold text-primary mb-2 flex items-center justify-between">
                          <span>Select Appointment Time Slot <span className="text-red-500">*</span></span>
                          <span className="text-xs text-neutral-400 font-normal">8:00 AM – 5:00 PM Operating Hours</span>
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {STUDIO_TIME_SLOTS.map((slot) => {
                            const isSlotSelected = preferredTime === slot.time;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => setPreferredTime(slot.time)}
                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                                  isSlotSelected
                                    ? "border-primary bg-primary text-white shadow-md ring-2 ring-primary/10"
                                    : "border-neutral-200 bg-white hover:border-gold/50 text-neutral-700"
                                }`}
                              >
                                <span className="text-xs uppercase font-bold opacity-75">{slot.period}</span>
                                <span className="text-xs font-bold font-body mt-0.5">{slot.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PICTORIAL LOCATION / VENUE: ACADEMIC FLOW ── */}
                  {isAcademicService ? (
                    <div className="space-y-4 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-primary">
                            Pictorial Location / Venue
                          </label>
                          <p className="text-[11px] text-neutral-500 font-body">
                            {academicBookingMode === "SCHOOL_PARTNER"
                              ? "Official on-campus photoshoot at your school"
                              : "In-studio portrait session at E-Kodak Studio"}
                          </p>
                        </div>
                      </div>

                      {locationType === "CAMPUS" ? (
                        /* Only School Campus (On-site) when school campus is selected */
                        <div className="p-4 sm:p-5 rounded-2xl border-2 border-neutral-900 bg-gradient-to-br from-[#f8eddc] via-[#f5e6c8] to-[#eedabb] shadow-md ring-2 ring-gold/50 text-neutral-950">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 font-heading font-bold text-sm sm:text-base text-neutral-950">
                                <GraduationCap size={18} className="text-amber-800" /> School Campus (On-site)
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-gold border border-gold/40 shadow-2xs">
                                Selected
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-950 font-bold font-body truncate mt-1">
                              {studentSchool || "Alpaco Senior High School"}
                            </p>
                            <p className="text-[11px] text-neutral-600 font-body truncate mt-0.5">
                              {studentSchoolAddress || "Alpaco Barangay Hall, City of Naga, Cebu"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Only E-Kodak Studio when studio is selected */
                        <div className="p-4 sm:p-5 rounded-2xl border-2 border-neutral-900 bg-gradient-to-br from-[#f8eddc] via-[#f5e6c8] to-[#eedabb] shadow-md ring-2 ring-gold/50 text-neutral-950">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 font-heading font-bold text-sm sm:text-base text-neutral-950">
                                <Building size={17} className="text-amber-800" /> E-Kodak Studio
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-gold border border-gold/40 shadow-2xs">
                                Selected
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-950 font-bold font-body truncate mt-1">
                              311 Rizal Street, City of Naga, Cebu
                            </p>
                            <p className="text-[11px] text-neutral-600 font-body truncate mt-0.5">
                              For individual scheduled in-studio portrait sessions
                            </p>
                          </div>
                        </div>
                      )}

                      {/* On-Campus Information Card: User will be informed on scheduled time once set by studio and school */}
                      {locationType === "CAMPUS" && (
                        <div className="p-5 sm:p-7 rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-white via-neutral-50/70 to-amber-50/30 space-y-5 animate-fade-in shadow-warm-md">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold/25 pb-3">
                            <div>
                              <h4 className="font-heading text-base sm:text-lg text-neutral-950 font-extrabold tracking-tight">
                                On-Campus Photoshoot Venue
                              </h4>
                              <p className="text-xs sm:text-sm text-neutral-800 font-semibold font-body mt-0.5 flex items-center gap-1.5">
                                <MapPin size={13} className="text-gold shrink-0" />
                                <span>{studentSchool || "Alpaco Senior High School"} — {studentSchoolAddress || "Alpaco Barangay Hall, City of Naga, Cebu"}</span>
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-950 bg-gradient-to-r from-amber-200 via-gold/30 to-amber-100 border border-gold/60 px-3.5 py-1 rounded-full shadow-2xs self-start sm:self-center">
                              <GraduationCap size={15} className="text-amber-800" /> Official School Campus
                            </span>
                          </div>

                          {/* Information Notice Replaces the old backdrop/equipment description */}
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-transparent border border-gold/50 shadow-2xs flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/30 via-gold/25 to-amber-500/10 border border-gold/50 text-amber-950 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                              <Clock size={19} />
                            </div>
                            <div className="space-y-1">
                              <h5 className="font-heading text-xs sm:text-sm text-neutral-950 font-extrabold leading-snug">
                                You will be informed on the scheduled time once set by studio and school.
                              </h5>
                              <p className="text-xs text-neutral-700 font-body leading-relaxed">
                                The studio team and your school administration are finalizing the official batch timetable. Call slips and notifications will be sent directly to your registered contact phone ({editPhone || "on file"}) and email once the schedule is confirmed.
                              </p>
                            </div>
                          </div>

                          {/* ── ACADEMIC BATCH & VENUE VERIFICATION TABLE (MATCHING EXISTING COLORS) ── */}
                          <div className="rounded-2xl border border-gold/40 overflow-hidden shadow-warm-xs bg-white">
                            <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-2.5 flex items-center justify-between border-b border-gold/30 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <GraduationCap size={15} className="text-gold" />
                                <span className="font-heading font-bold text-xs sm:text-sm text-gold tracking-wide">
                                  Official Academic Batch &amp; Venue Verification Record
                                </span>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-body divide-y divide-neutral-200/80">
                                <thead>
                                  <tr className="bg-neutral-50/80 text-xs uppercase font-bold text-neutral-500 tracking-wider">
                                    <th className="py-2.5 px-4 w-1/3">Record Parameter</th>
                                    <th className="py-2.5 px-4">Verified Details</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  <tr className="hover:bg-amber-50/20 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                      <Building size={14} className="text-gold shrink-0" />
                                      <span>School Institution</span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-neutral-950">
                                      <div>{studentSchool || "Alpaco Senior High School"}</div>
                                      <div className="text-[11px] text-neutral-500 font-normal mt-0.5">{studentSchoolAddress || "Alpaco Barangay Hall, City of Naga, Cebu"}</div>
                                    </td>
                                  </tr>

                                  <tr className="bg-neutral-50/40 hover:bg-amber-50/20 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                      <GraduationCap size={14} className="text-gold shrink-0" />
                                      <span>{isSeniorHighService ? "Senior High Strand" : "Degree Program"}</span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-neutral-950">
                                      {studentCourse || selectedShsStrand || "STEM"}
                                    </td>
                                  </tr>

                                  <tr className="hover:bg-amber-50/20 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                      <Calendar size={14} className="text-gold shrink-0" />
                                      <span>Graduating Batch</span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-neutral-950">
                                      {studentBatch || "Batch 2026"}
                                    </td>
                                  </tr>

                                  <tr className="bg-neutral-50/40 hover:bg-amber-50/20 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                      <Layers size={14} className="text-gold shrink-0" />
                                      <span>Class Section</span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-neutral-950">
                                      <span className="bg-gold/20 text-neutral-950 px-2 py-0.5 rounded-md border border-gold/40">
                                        {normalizedStudentSection ? (normalizedStudentSection.toLowerCase().startsWith('section') ? normalizedStudentSection : `Section ${normalizedStudentSection}`) : "Section A"}
                                      </span>
                                    </td>
                                  </tr>

                                  {studentIdNumber && (
                                    <tr className="hover:bg-amber-50/20 transition-colors">
                                      <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                        <FileText size={14} className="text-gold shrink-0" />
                                        <span>Student ID Number</span>
                                      </td>
                                      <td className="py-3 px-4 font-bold text-neutral-950 font-mono">
                                        {studentIdNumber}
                                      </td>
                                    </tr>
                                  )}

                                  {yearbookMotto && (
                                    <tr className="bg-neutral-50/40 hover:bg-amber-50/20 transition-colors">
                                      <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                        <Sparkles size={14} className="text-gold shrink-0" />
                                        <span>Yearbook Motto</span>
                                      </td>
                                      <td className="py-3 px-4 font-medium italic text-neutral-800">
                                        "{yearbookMotto}"
                                      </td>
                                    </tr>
                                  )}

                                  <tr className="hover:bg-amber-50/20 transition-colors">
                                    <td className="py-3 px-4 font-semibold text-neutral-600 flex items-center gap-2">
                                      <Clock size={14} className="text-gold shrink-0" />
                                      <span>Photoshoot Timetable</span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-neutral-800">
                                      Official schedule set by studio and school administration
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="pt-2">
                            <label className="block text-xs font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5">
                              <Edit3 size={13} className="text-gold" />
                              <span>Scheduling Note / Special Request (Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={schoolScheduleNote}
                              onChange={e => setSchoolScheduleNote(e.target.value)}
                              placeholder="e.g., preferred call time window, special assistance, or questions"
                              className="w-full h-11 px-4 bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 rounded-xl text-xs sm:text-sm font-body text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Studio Information Card for Academic Studio Session */}
                      {locationType === "STUDIO" && (
                        <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 space-y-3 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Studio Location</h4>
                              <p className="text-xs text-neutral-600 font-body mt-0.5">
                                311 Rizal Street, City of Naga, Cebu
                              </p>
                            </div>
                            <a 
                              href="https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-outline text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 shrink-0 bg-white shadow-xs"
                            >
                              <MapPin size={13} className="text-gold" /> Open in Google Maps <ExternalLink size={12} />
                            </a>
                          </div>

                          <div className="w-full h-40 rounded-xl overflow-hidden border border-neutral-200 shadow-inner bg-neutral-100">
                            <iframe
                              title="E-Kodak Studio Location"
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src="https://maps.google.com/maps?q=311+Rizal+Street,+City+of+Naga,+Cebu&z=16&output=embed"
                            />
                          </div>

                          <div className="grid sm:grid-cols-2 gap-2 text-xs font-body text-neutral-600">
                            <div>
                              <span className="font-bold text-primary block">Business Hours:</span>
                              <span>Mon – Sat: 8:00 AM – 6:00 PM</span>
                            </div>
                            <div>
                              <span className="font-bold text-primary block">Contact:</span>
                              <span>+63 917 123 4567 · contact@e-kodak.com</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Location Selector for Independent & Other Services */
                    <>
                      <div className="space-y-3 pt-3 border-t border-neutral-100">
                        <label className="block text-xs font-bold text-primary">Session Location</label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div 
                            onClick={() => setLocationType("STUDIO")}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              locationType === "STUDIO"
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-neutral-100 hover:border-neutral-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-heading font-bold text-primary text-sm">
                              <Building size={16} className="text-gold" /> E-Kodak Studio
                            </div>
                            <p className="text-xs text-neutral-500 font-body mt-1">
                              311 Rizal Street, City of Naga, Cebu
                            </p>
                          </div>

                          <div 
                            onClick={() => setLocationType("CUSTOM")}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              locationType === "CUSTOM"
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-neutral-100 hover:border-neutral-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-heading font-bold text-primary text-sm">
                              <MapPin size={16} className="text-gold" /> On-Location / Venue
                            </div>
                            <p className="text-xs text-neutral-500 font-body mt-1">
                              Photoshoot at your school, church, home, or event venue.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STUDIO ADDRESS & INTERACTIVE GOOGLE MAPS EMBED */}
                      {locationType === "STUDIO" ? (
                        <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 space-y-3 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                            <div>
                              <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Studio Location</h4>
                              <p className="text-xs text-neutral-600 font-body mt-0.5">
                                311 Rizal Street, City of Naga, Cebu
                              </p>
                            </div>
                            <a 
                              href="https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu"
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-outline text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 shrink-0 bg-white shadow-xs"
                            >
                              <MapPin size={13} className="text-gold" /> Open in Google Maps <ExternalLink size={12} />
                            </a>
                          </div>

                          <div className="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 shadow-inner bg-neutral-100">
                            <iframe
                              title="E-Kodak Studio Location"
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src="https://maps.google.com/maps?q=311+Rizal+Street,+City+of+Naga,+Cebu&z=16&output=embed"
                            />
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3 text-xs font-body text-neutral-600">
                            <div>
                              <span className="font-bold text-primary block">Business Hours:</span>
                              <span>Monday – Saturday: 8:00 AM – 6:00 PM | Sunday: By Appointment</span>
                            </div>
                            <div>
                              <span className="font-bold text-primary block">Contact:</span>
                              <span>+63 917 123 4567 · contact@e-kodak.com</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* CUSTOM ON-LOCATION ADDRESS */
                        <div className="p-5 sm:p-6 rounded-3xl border border-neutral-200/90 bg-white space-y-4 animate-fade-in shadow-2xs">
                          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                            <MapPin size={16} className="text-gold" />
                            <h4 className="font-heading text-sm sm:text-base text-primary font-bold">On-Location Address Details</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-primary mb-1">
                                Venue / Hotel / Campus Name
                              </label>
                              <input 
                                type="text" 
                                value={customVenue}
                                onChange={e => setCustomVenue(e.target.value)}
                                placeholder="e.g., USC Talamban Campus / Waterfront Cebu / Private Residence"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-body text-xs sm:text-sm shadow-2xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-primary mb-1">
                                Street Address &amp; Barangay <span className="text-red-500">*</span>
                              </label>
                              <div className="relative flex items-center">
                                <MapPin size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                                <input 
                                  type="text" 
                                  required={locationType === "CUSTOM"}
                                  value={customAddress}
                                  onChange={e => setCustomAddress(e.target.value)}
                                  placeholder="e.g., Gov. M. Cuenco Ave, Brgy. Talamban"
                                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-body text-xs sm:text-sm shadow-2xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">City / Municipality</label>
                              <input 
                                type="text" 
                                value={customBarangayCity}
                                onChange={e => setCustomBarangayCity(e.target.value)}
                                placeholder="e.g., Cebu City / Mandaue City"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-body text-xs sm:text-sm shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Landmark / Directions</label>
                              <input 
                                type="text" 
                                value={customLandmark}
                                onChange={e => setCustomLandmark(e.target.value)}
                                placeholder="e.g., Near Main Entrance gate, Building B"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-body text-xs sm:text-sm shadow-2xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 5: PHOTO STYLE & REFERENCES (Clean, Readable UI)
              ───────────────────────────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Section Title Header matching Steps 1 to 4 */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-4 sm:pt-6">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                      Creative Direction &amp; Moodboard
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Photo style &amp; creative references
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-body mt-1 max-w-md mx-auto">
                      Upload sample reference photos or provide special instructions for our studio lighting and camera team.
                    </p>
                  </div>

                  {/* ── CARD 1: UPLOAD REFERENCE PHOTOS & VISUAL PEGS ── */}
                  <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                          <UploadCloud size={16} />
                        </div>
                        <div>
                          <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                            Upload Visual Pegs &amp; Sample Poses
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-body">
                            Attach sample poses, moodboards, or styles you'd like our photographer to reference
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/70">
                        Max 3 Photos · 3MB each
                      </span>
                    </div>

                    <ReferenceImageUploader 
                      files={referenceFiles} 
                      setFiles={setReferenceFiles}
                      maxFiles={3}
                      maxSizeMB={3}
                    />
                  </div>

                  {/* ── CARD 3: SPECIAL REQUESTS & INSTRUCTIONS ── */}
                  <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                          <MessageSquare size={16} />
                        </div>
                        <div>
                          <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                            Special Instructions &amp; Requests
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-body">
                            Pose requests, backdrop nuances, family inclusions, or styling preferences
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notes && (
                          <button
                            type="button"
                            onClick={() => setNotes("")}
                            className="text-[11px] font-semibold text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Clear notes"
                          >
                            <Trash2 size={12} /> Clear text
                          </button>
                        )}
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/70">
                          Optional
                        </span>
                      </div>
                    </div>

                    {/* Pre-template suggestions with high-contrast chips */}
                    {activeSpecialTemplates.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-700 block">
                            Quick Add Suggestions:
                          </span>
                          <span className="text-xs text-neutral-400 font-body">Click to insert note</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {activeSpecialTemplates.map((tmpl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setNotes(prev => prev ? `${prev}\n• ${tmpl.text}` : `• ${tmpl.text}`)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-gold/15 text-neutral-800 hover:text-primary border border-neutral-200/80 hover:border-gold/50 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer active:scale-95"
                            >
                              <Plus size={12} className="text-gold group-hover:rotate-90 transition-transform" />
                              <span>{tmpl.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modern Textarea with Helper and character tip */}
                    <div className="relative">
                      <textarea 
                        id="notes"
                        rows={4}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="e.g., Requesting anti-glare lighting for eyeglasses, parents joining for 2 formal shots, preference for soft diffused backdrop..."
                        className="w-full p-4 bg-neutral-50/80 hover:bg-white focus:bg-white border border-neutral-200 focus:border-gold rounded-2xl focus:ring-3 focus:ring-gold/20 outline-none font-body text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 transition-all resize-none shadow-inner"
                      />
                      <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle size={12} className="text-emerald-500" /> Photographers review your notes before the shoot
                        </span>
                        <span>{notes.length} characters</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 6: SMART COLLAPSIBLE REVIEW & CONFIRM
              ───────────────────────────────────────────────────────────── */}
              {step === 6 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Section Title Header matching Steps 1 to 4 */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-4 sm:pt-6">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                      Final Verification &amp; Confirmation
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Review &amp; confirm your reservation
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-body mt-1 max-w-md mx-auto">
                      Review all session data below. Move cursor over any section to auto-inspect, click to lock open, or click &quot;Edit&quot; to change details.
                    </p>
                  </div>

                  {/* Quick Action: Expand All */}
                  <div className="flex justify-end px-1 pb-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedAccordions({ pkg: true, client: true, schedule: true, pegs: true });
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100/90 hover:bg-neutral-200/90 transition-colors border border-neutral-200/80 shadow-2xs"
                    >
                      Expand All
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    
                    {/* Accordion A: Service & Package */}
                    <ReviewAccordionItem
                      id="pkg"
                      isOpen={isAccordionOpen("pkg")}
                      isPinned={pinnedAccordions.pkg}
                      icon={<Package size={16} />}
                      title="Service & Package Tier"
                      subtitle={
                        <>
                          {selectedService?.name} • <span className="font-semibold text-gold">{selectedTier?.name || "Standard"}</span>
                        </>
                      }
                      onEdit={() => setStep(2)}
                      onMouseEnter={() => handleAccordionMouseEnter("pkg")}
                      onMouseMove={() => handleAccordionMouseEnter("pkg")}
                      onMouseLeave={() => handleAccordionMouseLeave("pkg")}
                      onTogglePin={() => toggleAccordionPin("pkg")}
                    >
                      <div className="p-4 pt-3 text-xs font-body space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                            <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Service</span>
                            <span className="font-bold text-primary text-xs mt-0.5 block truncate" title={selectedService?.name}>{selectedService?.name}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                            <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Package Tier</span>
                            <span className="font-bold text-gold text-xs mt-0.5 block">{selectedTier?.name || "Standard"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60 col-span-2 sm:col-span-1">
                            <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Base Price</span>
                            <span className="font-extrabold text-primary text-xs mt-0.5 block">₱{basePrice.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Detected Session Arrangement & Estimated Duration (School vs Studio) */}
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-neutral-50/80 border border-amber-200/80 shadow-2xs">
                          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-amber-200/50 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                                detectedSessionInfo.isSchool
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : detectedSessionInfo.isStudio
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                  : "bg-blue-50 text-blue-900 border-blue-300"
                              }`}>
                                {detectedSessionInfo.isSchool ? (
                                  <GraduationCap size={12} className="text-amber-800" />
                                ) : detectedSessionInfo.isStudio ? (
                                  <Building size={12} className="text-emerald-800" />
                                ) : (
                                  <MapPin size={12} className="text-blue-800" />
                                )}
                                <span>{detectedSessionInfo.badge}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-neutral-600">
                                {detectedSessionInfo.isSchool ? "At School Campus" : detectedSessionInfo.isStudio ? "At Studio Bay" : "At Custom Venue"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setStep(5)}
                              className="text-[11px] font-bold text-gold hover:underline flex items-center gap-1 cursor-pointer"
                              title="Change between Studio and School session in Step 5"
                            >
                              <Edit3 size={11} /> Change Venue
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {/* Venue / Location Details */}
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                {detectedSessionInfo.isSchool ? <GraduationCap size={15} /> : detectedSessionInfo.isStudio ? <Building size={15} /> : <MapPin size={15} />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                                  Session Location / Venue:
                                </span>
                                <span className="font-bold text-neutral-900 block truncate">
                                  {detectedSessionInfo.venue}
                                </span>
                                <span className="text-[11px] text-neutral-500 line-clamp-1">
                                  {detectedSessionInfo.venueAddress}
                                </span>
                              </div>
                            </div>

                            {/* Estimated Duration & Schedule Mode */}
                            <div className="flex items-start gap-2.5 sm:border-l sm:border-neutral-200 sm:pl-3">
                              <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock size={15} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                                  Estimated Session Duration:
                                </span>
                                <span className="font-bold text-primary block">
                                  {detectedSessionInfo.duration}
                                </span>
                                <span className="text-[11px] text-amber-800 font-medium line-clamp-1">
                                  {detectedSessionInfo.scheduleTitle}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Complete Inclusions List */}
                        {tierInclusions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={12} className="text-gold" /> Included in This Package
                              </span>
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                {tierInclusions.length} Inclusions Included
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {tierInclusions.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60 text-xs text-neutral-800">
                                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                                  <span className="font-medium leading-relaxed">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ReviewAccordionItem>

                    {/* Accordion B: Client & Institutional Information */}
                    <ReviewAccordionItem
                      id="client"
                      isOpen={isAccordionOpen("client")}
                      isPinned={pinnedAccordions.client}
                      icon={isAcademicService ? <GraduationCap size={16} /> : isWeddingService ? <Heart size={16} className="text-rose-500" /> : <User size={16} className="text-blue-500" />}
                      title={
                        bookingFor === "someone_else" 
                          ? "Participant & Account Owner Details"
                          : (isAcademicService ? "Student Details" : isWeddingService ? "Wedding Information" : "Client Details")
                      }
                      subtitle={
                        bookingFor === "someone_else"
                          ? `For: ${[participantFirstName, participantLastName].filter(Boolean).join(" ") || "Participant"} · By: ${activeProfile?.first_name || "Account Owner"}`
                          : isAcademicService 
                          ? ([studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || "Student Profile")
                          : isWeddingService ? `${brideName || 'Bride'} & ${groomName || 'Groom'}`
                          : [editFirstName, editLastName].filter(Boolean).join(" ") || "Client Profile"
                      }
                      onEdit={() => setStep(4)}
                      onMouseEnter={() => handleAccordionMouseEnter("client")}
                      onMouseMove={() => handleAccordionMouseEnter("client")}
                      onMouseLeave={() => handleAccordionMouseLeave("client")}
                      onTogglePin={() => toggleAccordionPin("client")}
                    >
                      <div className="p-4 pt-3 text-xs font-body space-y-3">
                        {/* Booking Recipient & Account Distinction Card */}
                        <div className="p-3.5 rounded-2xl bg-neutral-50/90 border border-neutral-200/80 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                              Booking Recipient &amp; Account Distinction
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              bookingFor === "someone_else"
                                ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                                : "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold"
                            }`}>
                              {bookingFor === "someone_else" ? `Someone Else · ${participantRelationship || 'Participant'}` : "Myself (Account Owner)"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 rounded-xl bg-white border border-neutral-200/70">
                              <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">
                                Participant / Beneficiary
                              </span>
                              <span className="font-bold text-primary text-xs mt-0.5 block truncate">
                                {[participantFirstName, participantLastName].filter(Boolean).join(" ") || "Valued Participant"}
                              </span>
                              {participantPhone && (
                                <span className="text-xs text-neutral-500 font-mono mt-0.5 block">{participantPhone}</span>
                              )}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-neutral-200/70">
                              <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">
                                Account Owner (Payer)
                              </span>
                              <span className="font-bold text-neutral-700 text-xs mt-0.5 block truncate">
                                {activeProfile?.first_name || user?.user_metadata?.first_name || "Client"} {activeProfile?.last_name || user?.user_metadata?.last_name || ""}
                              </span>
                              <span className="text-xs text-neutral-500 font-mono mt-0.5 block truncate">
                                {activeProfile?.email || user?.email || "Account Holder"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isAcademicService && (
                          <>
                            {/* Student Profile Top Banner */}
                            <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/50 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center shrink-0">
                                  <User size={14} />
                                </div>
                                <div>
                                  <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider leading-none">Student Name</span>
                                  <span className="font-heading font-extrabold text-primary text-sm">
                                    {[studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || "Student Name"}
                                  </span>
                                </div>
                              </div>
                              {studentIdNumber && (
                                <span className="text-[11px] font-mono font-bold text-primary bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs">
                                  ID: {studentIdNumber}
                                </span>
                              )}
                            </div>

                            {/* Core Academic Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Institution / School</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {activeUnivId && <SchoolLogo univId={activeUnivId} name={studentSchool} size="xs" />}
                                  <span className="font-bold text-primary text-xs truncate" title={studentSchool}>{studentSchool || "N/A"}</span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">
                                  {studentType === "COLLEGE" ? "Degree / Course" : "Academic Strand"}
                                </span>
                                <span className="font-semibold text-neutral-800 text-xs mt-0.5 block truncate">
                                  {studentType === "COLLEGE" ? (studentCourse || "N/A") : (selectedShsStrand || "N/A")}
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Class Section &amp; Batch</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-bold text-gold bg-gold/10 px-2 py-0.5 rounded text-[11px]">
                                    {normalizedStudentSection ? (normalizedStudentSection.toLowerCase().startsWith('section') ? normalizedStudentSection : `Section ${normalizedStudentSection}`) : "N/A"}
                                  </span>
                                  <span className="text-neutral-400">•</span>
                                  <span className="font-medium text-neutral-700 text-xs">{studentBatch || "Batch 2026"}</span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Arrangement Protocol</span>
                                <span className={`inline-block font-semibold px-2 py-0.5 rounded text-xs mt-0.5 ${
                                  academicBookingMode === "SCHOOL_PARTNER"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                }`}>
                                  {academicBookingMode === "SCHOOL_PARTNER" ? "School Campus (Date set by school)" : "Individual Booking"}
                                </span>
                              </div>
                            </div>

                            {/* Yearbook Motto Card (if provided) */}
                            {yearbookMotto && (
                              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-2.5">
                                <Sparkles size={14} className="text-gold shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-amber-900/70 uppercase tracking-wider block">Yearbook Motto</span>
                                  <p className="text-xs font-serif italic text-neutral-800 mt-0.5">&quot;{yearbookMotto}&quot;</p>
                                </div>
                              </div>
                            )}

                            {schoolScheduleNote && (
                              <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs">
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Schedule Note:</span>
                                <p className="italic mt-0.5">{schoolScheduleNote}</p>
                              </div>
                            )}
                          </>
                        )}

                        {isWeddingService && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Couple</span>
                              <span className="font-bold text-primary text-xs mt-0.5 block">{brideName} &amp; {groomName}</span>
                            </div>
                            {weddingTheme && (
                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Wedding Theme</span>
                                <span className="font-medium text-neutral-800 text-xs mt-0.5 block">{weddingTheme}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {!isAcademicService && !isWeddingService && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Client Full Name</span>
                              <span className="font-bold text-primary text-xs mt-0.5 block">
                                {[editFirstName, editLastName].filter(Boolean).join(" ") || "Client"}
                              </span>
                            </div>
                            {editPhone && (
                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Contact Phone</span>
                                <span className="font-medium text-neutral-800 text-xs mt-0.5 block">{editPhone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </ReviewAccordionItem>

                    {/* Accordion C: Schedule & Studio Location */}
                    <ReviewAccordionItem
                      id="schedule"
                      isOpen={isAccordionOpen("schedule")}
                      isPinned={pinnedAccordions.schedule}
                      icon={<Calendar size={16} />}
                      title="Schedule & Studio Location"
                      subtitle={
                        isAcademicService && academicBookingMode === "SCHOOL_PARTNER" 
                          ? "Official School Batch Schedule" 
                          : `${eventDate || "Date TBD"} • ${preferredTime || "Time TBD"}`
                      }
                      onEdit={() => setStep(5)}
                      onMouseEnter={() => handleAccordionMouseEnter("schedule")}
                      onMouseMove={() => handleAccordionMouseEnter("schedule")}
                      onMouseLeave={() => handleAccordionMouseLeave("schedule")}
                      onTogglePin={() => toggleAccordionPin("schedule")}
                    >
                      <div className="p-4 pt-3 text-xs font-body space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                            <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Date &amp; Time</span>
                            <span className="font-bold text-primary text-xs mt-0.5 block">
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                                ? "Official School Batch Schedule (Agreed with School)"
                                : `${eventDate || "Date not selected"} at ${STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime || "TBD"}`}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                            <span className="text-xs uppercase font-bold text-neutral-400 block tracking-wider">Designated Venue</span>
                            <span className="font-bold text-primary text-xs mt-0.5 block truncate" title={resolvedLocation}>
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS"
                                ? `On-Campus (${studentSchool || "School Campus"})`
                                : resolvedLocation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </ReviewAccordionItem>

                    {/* Accordion E: Uploaded References & Instructions */}
                    {(referenceFiles.length > 0 || notes) && (
                      <ReviewAccordionItem
                        id="pegs"
                        isOpen={isAccordionOpen("pegs")}
                        isPinned={pinnedAccordions.pegs}
                        icon={<Camera size={16} />}
                        title="Creative References & Instructions"
                        subtitle={`${referenceFiles.length} reference photo(s) ${notes ? '• Special notes included' : ''}`}
                        onEdit={() => setStep(6)}
                        onMouseEnter={() => handleAccordionMouseEnter("pegs")}
                        onMouseMove={() => handleAccordionMouseEnter("pegs")}
                        onMouseLeave={() => handleAccordionMouseLeave("pegs")}
                        onTogglePin={() => toggleAccordionPin("pegs")}
                      >
                        <div className="p-4 pt-3 text-xs font-body space-y-2.5">
                          {referenceFiles.length > 0 && (
                            <div className="text-neutral-700">
                              <span className="text-neutral-400 block mb-0.5 text-xs font-bold uppercase tracking-wider">Uploaded Photos:</span>
                              <span className="font-semibold text-primary">{referenceFiles.length} reference file(s) attached</span>
                            </div>
                          )}
                          {notes && (
                            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                              <span className="text-neutral-400 block mb-0.5 text-xs font-bold uppercase tracking-wider">Special Requests:</span>
                              <p className="text-neutral-700 italic">{notes}</p>
                            </div>
                          )}
                        </div>
                      </ReviewAccordionItem>
                    )}
                  </div>


                  {/* Pricing Breakdown Summary */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-neutral-900 via-primary to-neutral-950 text-white border border-gold/30 shadow-lg space-y-3 font-body">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold uppercase tracking-widest text-gold font-mono flex items-center gap-1.5">
                        <Sparkles size={11} className="text-gold" /> Total Package Breakdown
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 font-semibold">
                        Guaranteed Rate
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300">Base Package ({selectedTier?.name || 'Standard'})</span>
                      <span className="font-semibold text-white">₱{basePrice.toLocaleString()}</span>
                    </div>

                    {selectedAddOns.length > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-300">Selected Add-ons ({selectedAddOns.length})</span>
                        <span className="font-semibold text-gold">+₱{addOnsTotal.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                      <span className="font-bold text-white text-sm">Total Amount</span>
                      <span className="font-heading font-extrabold text-gold text-xl tracking-tight">{formattedTotal}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
                        <p className="text-xs text-neutral-300 uppercase font-medium">50% Down Payment</p>
                        <p className="font-bold text-gold text-base mt-0.5">{formattedDownPayment}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Due upon confirmation</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
                        <p className="text-xs text-neutral-300 uppercase font-medium">Remaining at Studio</p>
                        <p className="font-bold text-white text-base mt-0.5">{formattedRemaining}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Payable on session day</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Guarantee Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950 font-body shadow-2xs">
                    <ShieldCheck size={18} className="text-gold shrink-0 mt-0.5" />
                    <span>
                      Clicking &quot;Confirm &amp; Submit Booking&quot; will open an authorization modal to double check your selections. Once authorized, your booking is securely locked into the studio queue and your official digital QR pass is generated immediately.
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Actions (Steps 2-7) - Direct Access Buttons on Right Side (Aligned & Balanced) */}
              {step > 1 && (
                <div className="w-full max-w-[1140px] mx-auto mt-6 sm:mt-8 pt-4 border-t border-neutral-200/60 flex items-center justify-end gap-3">
                  {/* Right: Direct Access Navigation Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setValidationError("");
                        setStep(step - 1);
                      }}
                      className="btn-outline px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-gold hover:text-gold transition-colors"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn-primary flex items-center gap-2 px-8 py-2.5 text-xs font-bold tracking-wider shadow-warm-sm justify-center cursor-pointer"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Processing Reservation...</>
                      ) : step === 6 ? (
                        <><CheckCircle size={15} /> Confirm & Submit Booking</>
                      ) : (
                        <>Next Step <ArrowRight size={15} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
