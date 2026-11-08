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
  Timer, BellRing, CreditCard, Copy, Printer, Receipt, Download, CheckCircle2, UserCheck, Wifi, WifiOff, Signal,
  Sun, Sunset, Shield, Pencil
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { createBooking, SERVICE_SLUG_TO_UUID, toDatabaseTime } from "../../services/bookingService";
import { customerPaymentService } from "../../services/customerPaymentService";
import { xenditPaymentService } from "../../services/xenditPaymentService";
import { sendBookingConfirmationEmail, sendPaymentVerificationOtpEmail } from "../../services/emailService";
import { getServices, getAddOns } from "../../services/contentService";
import { SERVICES } from "../../data/servicesData";
import { assignPhotographer } from "../../services/aiAssignmentService";
import { recordCustomerAction } from "../../services/customerAuditService";
import ReferenceImageUploader from "../../components/booking/ReferenceImageUploader";
import InteractiveCalendar from "../../components/booking/InteractiveCalendar";
import StudioLocationMapCard from "../../components/booking/StudioLocationMapCard";
import {
  STUDIO_HOURLY_SLOTS,
  fetchDateAvailability,
  fetchMonthBlockoutMap,
  subscribeToAvailabilityUpdates,
  normalizeSlotTime,
  getInitialStudioBookingDate,
} from "../../services/liveAvailabilityService";
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

// ── Format Textual Date Helper (e.g. "November 4, 2026") ───────────────────
function formatTextualDate(dateStr) {
  if (!dateStr) return "Date TBD";
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

// ── Format Session Hourly Time Helper (Strict 1-hour session format) ───────────
function formatSessionTime(timeStr) {
  if (!timeStr) return "8:00 AM – 9:00 AM";
  if (typeof timeStr === "string") {
    const trimmed = timeStr.trim();
    if (trimmed.toLowerCase().includes("school batch")) {
      return trimmed;
    }
    // If it's already an hourly range like "8:00 AM – 9:00 AM" or "3:00 PM – 4:00 PM"
    if (trimmed.includes("–") || trimmed.includes(" - ")) {
      if (trimmed.toLowerCase().includes("morning") || trimmed.toLowerCase().includes("afternoon")) {
        const m = trimmed.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
        if (m) {
          const matchSlot = STUDIO_HOURLY_SLOTS.find(s => s.label.includes(m[1]) || s.display === m[1]);
          if (matchSlot) return matchSlot.label;
        }
      } else {
        return trimmed;
      }
    }
    const matchedSlot = STUDIO_HOURLY_SLOTS.find(
      s => s.time === trimmed || s.display.toLowerCase() === trimmed.toLowerCase() || s.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedSlot) return matchedSlot.label;

    const m = trimmed.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (m) {
      let hour = parseInt(m[1], 10);
      const isPM = /pm/i.test(trimmed);
      const isAM = /am/i.test(trimmed);
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
      const h24 = String(hour).padStart(2, "0") + ":00";
      const slot = STUDIO_HOURLY_SLOTS.find(s => s.time === h24);
      if (slot) return slot.label;
    }
    return trimmed;
  }
  return String(timeStr);
}

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
  return svc?.category || svc?.name || "Service";
};

const getServiceIcon = (svc) => {
  const s = (svc?.slug || svc?.name || "").toLowerCase();
  if (s.includes("college") || s.includes("senior")) return <GraduationCap size={15} className="text-gold shrink-0" />;
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

  // Named sections (e.g. "alcala", "magsaysay", "rizal", "st. thomas", "maria clara")
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
  let clean = qty
    .replace(/\b1\s*pieces?\b/gi, "1 pc")
    .replace(/\b([0-9]+)\s*pieces?\b/gi, "$1 pcs");
  clean = clean.replace(/\b(pc|pcs)\s+(pc|pcs)\b/gi, "$2");
  return clean;
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
  const [searchParams, setSearchParams] = useSearchParams();
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
      setAcademicBookingMode("INDIVIDUAL");
      setLocationType("STUDIO");
    } else if (choice === "school_section") {
      setAcademicBookingMode("SCHOOL_PARTNER");
      setLocationType("CAMPUS");
      setParticipantRelationship("School Section Representative");
    } else {
      setAcademicBookingMode("INDIVIDUAL");
      setLocationType("STUDIO");
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
  const [step, setStep] = useState(() => {
    try {
      const stepParam = searchParams.get("step");
      if (stepParam && !isNaN(Number(stepParam))) return Number(stepParam);
      if (searchParams.get("payment_status") === "success") return 7;
    } catch {}
    return 1;
  });
  const [selectedService, setSelectedService] = useState(null);
  const [hoveredServiceId, setHoveredServiceId] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  // Step 6: Payment Gateway State (50% Downpayment required to reserve slot)
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState("gcash"); // "gcash" | "maya" | "bank_transfer"
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("bdo"); // "bdo" | "bpi" | "maya_bank"
  const [copiedKey, setCopiedKey] = useState(null);

  // ── Interactive Maya Business / PayMongo Test Gateway Sandbox States ───────
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayStep, setGatewayStep] = useState("input"); // "input" | "otp" | "confirm" | "processing" | "success"
  const [gatewayPhone, setGatewayPhone] = useState("");
  const [gatewayOtp, setGatewayOtp] = useState("");
  const [gatewayError, setGatewayError] = useState("");
  const [gatewayTxnRef, setGatewayTxnRef] = useState("");
  const [gatewayOrNumber, setGatewayOrNumber] = useState("");
  const [paymentReceiptData, setPaymentReceiptData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('ekodak_active_receipt_data');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [gatewayClearingStage, setGatewayClearingStage] = useState(0);
  const [showManualRefInput, setShowManualRefInput] = useState(false);
  const [isRedirectingToXendit, setIsRedirectingToXendit] = useState(false);
  const [xenditPermissionNotice, setXenditPermissionNotice] = useState(null);
  const [emailStatus, setEmailStatus] = useState({ state: "idle", message: "" });

  // ── Step 6: Payment Security Verification Code (OTP) State ───────────────
  const [showPaymentOtpModal, setShowPaymentOtpModal] = useState(false);
  const [paymentOtpCode, setPaymentOtpCode] = useState("");
  const [enteredPaymentOtp, setEnteredPaymentOtp] = useState("");
  const [paymentOtpExpiry, setPaymentOtpExpiry] = useState(null);
  const [isSendingPaymentOtp, setIsSendingPaymentOtp] = useState(false);
  const [paymentOtpError, setPaymentOtpError] = useState("");
  const [paymentOtpCountdown, setPaymentOtpCountdown] = useState(0);
  const [pendingPaymentChannel, setPendingPaymentChannel] = useState(null);
  const [targetOtpEmail, setTargetOtpEmail] = useState("");
  const [isEditingTargetOtpEmail, setIsEditingTargetOtpEmail] = useState(false);
  const [editTargetOtpEmailInput, setEditTargetOtpEmailInput] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerifyStage, setOtpVerifyStage] = useState("idle"); // "idle" | "checking" | "verified"
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (paymentOtpCountdown <= 0) return;
    const timer = setInterval(() => {
      setPaymentOtpCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentOtpCountdown]);

  useEffect(() => {
    if (showPaymentOtpModal) {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [showPaymentOtpModal]);

  const handleResendConfirmationEmail = async (overrideTarget = null, activeBookingOverride = null) => {
    const activeBooking = activeBookingOverride || bookingResult;
    const targetEmail = overrideTarget || (
      participantEmail ||
      customerProfile?.email ||
      profile?.email ||
      user?.email ||
      ""
    );
    if (!targetEmail) {
      setEmailStatus({ state: "error", message: "No recipient email address available." });
      return;
    }
    setEmailStatus({ state: "sending", message: "Dispatching email..." });
    try {
      const activeP = customerProfile || profile;
      const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
      const participantFullName = [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || (bookingFor === "myself" ? accountOwnerFullName : "Participant");

      const res = await sendBookingConfirmationEmail({
        recipientEmail: targetEmail,
        recipientName: participantFullName || accountOwnerFullName || "Valued Client",
        bookingNumber: activeBooking?.booking_number || "BK-2026-00001",
        bookingId: activeBooking?.id,
        receiptNumber: gatewayOrNumber || `OR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        packageName: selectedService?.name || "Photoshoot Session",
        tierName: selectedTier?.name || "Standard",
        eventDate: formatTextualDate(eventDate),
        preferredTime: formatSessionTime(preferredTime),
        location: resolvedLocation,
        downpaymentAmount: downPaymentAmount,
        remainingBalance: remainingBalance,
        totalAmount: totalAmount,
        paymentMethod: (selectedPaymentGateway || "gcash").toUpperCase(),
        paymentReference: paymentReferenceNumber || gatewayTxnRef || `REF-${Date.now()}`,
        bookingUrl: typeof window !== "undefined" ? `${window.location.origin}/dashboard/bookings` : "https://e-kodak.ph/dashboard/bookings"
      });
      if (res?.success) {
        setEmailStatus({ state: "sent", message: `Confirmation email sent to ${targetEmail}!` });
      } else {
        setEmailStatus({ state: "error", message: res?.error || "SMTP not configured: please set Gmail App Password in Supabase." });
      }
    } catch (e) {
      setEmailStatus({ state: "error", message: e.message || "Failed to dispatch email." });
    }
  };

  const handleInitiatePaymentWithSecurityOtp = async (targetChannel = null) => {
    const activeChannel = targetChannel || selectedPaymentGateway || "gcash";
    setPendingPaymentChannel(activeChannel);

    const activeP = customerProfile || profile;
    const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
    const participantFullName = [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || (bookingFor === "myself" ? accountOwnerFullName : "Participant");

    const targetEmail = (
      targetOtpEmail ||
      participantEmail ||
      customerProfile?.email ||
      profile?.email ||
      user?.email ||
      ""
    );

    if (!targetEmail) {
      setValidationError("A valid client email address is required to receive the payment authorization verification code.");
      return;
    }

    setTargetOtpEmail(targetEmail);
    setIsEditingTargetOtpEmail(false);
    setValidationError("");
    setPaymentOtpError("");
    setEnteredPaymentOtp("");
    setShowPaymentOtpModal(true);
    setIsSendingPaymentOtp(true);

    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    setPaymentOtpCode(generatedCode);
    setPaymentOtpExpiry(Date.now() + 10 * 60 * 1000); // 10 minutes
    setPaymentOtpCountdown(60);

    console.info(`%c[E-Kodak Security Code]: ${generatedCode}`, 'background: #0d2a1c; color: #f59e0b; font-size: 16px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');

    try {
      const res = await sendPaymentVerificationOtpEmail({
        recipientEmail: targetEmail,
        recipientName: participantFullName || accountOwnerFullName,
        otpCode: generatedCode,
        packageName: selectedService?.name || "Photoshoot Session",
        downpaymentAmount: downPaymentAmount,
        eventDate: formatTextualDate(eventDate),
        preferredTime: formatSessionTime(preferredTime),
        expiryMinutes: 10
      });

      setIsSendingPaymentOtp(false);
      if (!res?.success) {
        setPaymentOtpError(res?.error || "Unable to send verification code. Please check your email configuration.");
      }
    } catch (err) {
      setIsSendingPaymentOtp(false);
      setPaymentOtpError(err.message || "Failed to dispatch email verification code.");
    }
  };

  const handleUpdateOtpEmailAndResend = async () => {
    if (!editTargetOtpEmailInput || !editTargetOtpEmailInput.includes("@")) {
      setPaymentOtpError("Please enter a valid email address.");
      return;
    }
    const cleanEmail = editTargetOtpEmailInput.trim();
    setTargetOtpEmail(cleanEmail);
    setIsEditingTargetOtpEmail(false);
    await handleResendPaymentOtp(cleanEmail);
  };

  const handleResendPaymentOtp = async (customEmailOverride = null) => {
    if ((paymentOtpCountdown > 0 && !customEmailOverride) || isSendingPaymentOtp) return;
    const activeP = customerProfile || profile;
    const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
    const participantFullName = [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || (bookingFor === "myself" ? accountOwnerFullName : "Participant");

    const effectiveEmail = (
      customEmailOverride ||
      targetOtpEmail ||
      participantEmail ||
      customerProfile?.email ||
      profile?.email ||
      user?.email ||
      ""
    );

    if (!effectiveEmail) {
      setPaymentOtpError("No valid email address found.");
      return;
    }

    setIsSendingPaymentOtp(true);
    setPaymentOtpError("");
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    setPaymentOtpCode(generatedCode);
    setPaymentOtpExpiry(Date.now() + 10 * 60 * 1000);
    setPaymentOtpCountdown(60);

    console.info(`%c[E-Kodak Security Code]: ${generatedCode}`, 'background: #0d2a1c; color: #f59e0b; font-size: 16px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');

    try {
      const res = await sendPaymentVerificationOtpEmail({
        recipientEmail: effectiveEmail,
        recipientName: participantFullName || accountOwnerFullName,
        otpCode: generatedCode,
        packageName: selectedService?.name || "Photoshoot Session",
        downpaymentAmount: downPaymentAmount,
        eventDate: formatTextualDate(eventDate),
        preferredTime: formatSessionTime(preferredTime),
        expiryMinutes: 10
      });
      setIsSendingPaymentOtp(false);
      if (!res?.success) {
        setPaymentOtpError(res?.error || "Failed to resend code.");
      }
    } catch (err) {
      setIsSendingPaymentOtp(false);
      setPaymentOtpError(err.message || "Failed to resend code.");
    }
  };

  const handleVerifyOtpAndProceedToPayment = async (codeToVerify = null) => {
    if (isVerifyingOtp) return;
    const code = (codeToVerify != null ? codeToVerify : enteredPaymentOtp).trim();
    if (!code) {
      setPaymentOtpError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    // Smart network check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPaymentOtpError("No internet connection detected. Please check your network and try again.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpVerifyStage("checking");
    setPaymentOtpError("");

    // Step 1: Natural processing time (450ms) to inspect security token
    await new Promise((resolve) => setTimeout(resolve, 450));

    if (paymentOtpExpiry && Date.now() > paymentOtpExpiry) {
      setIsVerifyingOtp(false);
      setOtpVerifyStage("idle");
      setPaymentOtpError("This verification code has expired. Please click 'Resend Code'.");
      return;
    }

    if (code !== paymentOtpCode) {
      setIsVerifyingOtp(false);
      setOtpVerifyStage("idle");
      setPaymentOtpError("Incorrect verification code. Please check your email inbox and try again.");
      return;
    }

    // Step 2: Code matched! Show verified confirmation state (550ms)
    setOtpVerifyStage("verified");
    await new Promise((resolve) => setTimeout(resolve, 550));

    setShowPaymentOtpModal(false);
    setIsVerifyingOtp(false);
    setOtpVerifyStage("idle");
    setPaymentOtpError("");
    handleProceedToXenditCheckout(pendingPaymentChannel || selectedPaymentGateway);
  };

  const handleProceedToXenditCheckout = async (targetChannel = null) => {
    if (isRedirectingToXendit) return;
    const activeChannel = targetChannel || selectedPaymentGateway || "gcash";
    setIsRedirectingToXendit(true);
    setXenditPermissionNotice(null);

    const activeP = customerProfile || profile;
    const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
    const participantFullName = [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") || (bookingFor === "myself" ? accountOwnerFullName : "Participant");

    try {
      const pendingBooking = {
        selectedService,
        selectedTier,
        customerId: activeCustomerId,
        serviceId: selectedService?.id,
        serviceSlug: selectedService?.slug,
        tierName: selectedTier?.name,
        selectedAddOns,
        bookingFor,
        participantFullName,
        participantFirstName,
        participantMiddleName,
        participantLastName,
        participantPhone,
        participantEmail,
        participantRelationship,
        studentType,
        studentSchool,
        studentSchoolAddress,
        studentCourse,
        selectedShsStrand,
        customShsStrand,
        effectiveShsStrand,
        studentBatch,
        studentSection: normalizedStudentSection || studentSection,
        studentIdNumber,
        yearbookMotto,
        schoolScheduleNote,
        academicBookingMode,
        totalAmount,
        downPaymentAmount,
        remainingBalance,
        eventDate,
        preferredTime,
        location: resolvedLocation,
        notes,
        selectedPaymentGateway: activeChannel
      };
      sessionStorage.setItem('ekodak_pending_xendit_booking', JSON.stringify(pendingBooking));
      try { localStorage.setItem('ekodak_pending_xendit_booking', JSON.stringify(pendingBooking)); } catch {}
    } catch (err) {
      console.warn("[SessionStorage pending error]", err);
    }

    const res = await xenditPaymentService.createInvoice({
      amount: downPaymentAmount,
      customerName: participantFullName,
      customerEmail: participantEmail || activeP?.email || user?.email || 'client@e-kodak.ph',
      customerPhone: participantPhone || activeP?.phone || user?.phone || '+639178880123',
      serviceName: selectedService?.name,
      tierName: selectedTier?.name,
      paymentChannel: activeChannel
    });

    setIsRedirectingToXendit(false);

    if (res.success && res.invoiceUrl) {
      window.location.href = res.invoiceUrl;
    } else if (res.errorCode === 'REQUEST_FORBIDDEN_ERROR') {
      setXenditPermissionNotice(res.message);
      handleOpenGatewayCheckout();
    } else {
      setValidationError(res.message || "Failed to connect to Xendit. Please try again.");
      handleOpenGatewayCheckout();
    }
  };

  const handleOpenGatewayCheckout = () => {
    const activeP = customerProfile || profile;
    const defaultPhone = participantPhone || activeP?.phone || user?.phone || user?.user_metadata?.phone || "0917-888-0123";
    setGatewayPhone(defaultPhone);
    setGatewayOtp("");
    setGatewayError("");
    setGatewayStep("input");
    setGatewayClearingStage(0);
    setShowGatewayModal(true);
  };

  const handleCopyPaymentInfo = (text, key) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };
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

  const isWeddingService = false;

  const isCorporateService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("corporate") || s.includes("headshot") || s.includes("business") || s.includes("commercial");
  }, [selectedService]);

  // Academic Information State
  const [studentType, setStudentType] = useState("COLLEGE"); // "COLLEGE" | "SENIOR_HIGH"
  const [academicBookingMode, setAcademicBookingMode] = useState("INDIVIDUAL"); // "SCHOOL_PARTNER" | "INDIVIDUAL"

  const isSchoolSection = useMemo(() => {
    return isAcademicService && (bookingFor === "school_section" || academicBookingMode === "SCHOOL_PARTNER");
  }, [isAcademicService, bookingFor, academicBookingMode]);

  const isIndividualBooking = !isSchoolSection && !isWeddingService;
  const [schoolScheduleNote, setSchoolScheduleNote] = useState("");
  const [selectedUnivId, setSelectedUnivId] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [studentSchoolAddress, setStudentSchoolAddress] = useState("");
  const [studentCourse, setStudentCourse] = useState("");
  const [selectedShsStrand, setSelectedShsStrand] = useState("");
  const [customShsStrand, setCustomShsStrand] = useState("");
  const [additionalCustomFields, setAdditionalCustomFields] = useState([]);
  const effectiveShsStrand = useMemo(() => {
    if (selectedShsStrand === "OTHERS") {
      return customShsStrand.trim() || "Others";
    }
    return selectedShsStrand;
  }, [selectedShsStrand, customShsStrand]);
  const [studentBatch, setStudentBatch] = useState("");
  const [studentSection, setStudentSection] = useState("");
  const normalizedStudentSection = useMemo(() => {
    if (!studentSection || !studentSection.trim()) return "";
    const currentStrand = isSeniorHighService ? effectiveShsStrand : studentCourse;
    return normalizeSectionOnly(studentSection, currentStrand) || studentSection.trim();
  }, [studentSection, isSeniorHighService, effectiveShsStrand, studentCourse]);
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [univDropdownOpen, setUnivDropdownOpen] = useState(false);
  const [degreeDropdownOpen, setDegreeDropdownOpen] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
  const [proceedingSvcSlug, setProceedingSvcSlug] = useState(null);
  const [hoveredTierName, setHoveredTierName] = useState(null);
  const [hoveredInclusionIndex, setHoveredInclusionIndex] = useState(null);
  const [hoveredInclusion, setHoveredInclusion] = useState(null);
  const [hoveredInclusionIndexReview, setHoveredInclusionIndexReview] = useState(null);
  const [isInclusionsOpen, setIsInclusionsOpen] = useState(false);
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

  // Automatically scroll to top or specific section and ensure scroll is unlocked whenever booking step changes
  useEffect(() => {
    document.body.style.overflow = "";
    if (step === 4) {
      setTimeout(() => {
        const schedEl = document.getElementById("studio-photoshoot-scheduling-section");
        if (schedEl) {
          schedEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      }, 60);
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  // Body scroll lock and Escape key listener for lightbox/peg/confirmation modals
  useEffect(() => {
    if (step === 6 || step === 7) {
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
  const [eventDate, setEventDate] = useState(() => getInitialStudioBookingDate());
  const [preferredTime, setPreferredTime] = useState("");
  const [sessionCategory, setSessionCategory] = useState(() => {
    const hr = new Date().getHours();
    return hr >= 12 ? "AFTERNOON" : "MORNING";
  }); // Default to current time of day: Afternoon if >= 12:00 PM, Morning if < 12:00 PM
  const [monthBlockMap, setMonthBlockMap] = useState({});
  const [dateAvailability, setDateAvailability] = useState(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch month blockout map
  const handleMonthChange = useCallback(async (year, month) => {
    try {
      const map = await fetchMonthBlockoutMap(year, month);
      setMonthBlockMap(map || {});
    } catch (err) {
      console.warn("[BookSession] Failed to fetch month blocks:", err);
    }
  }, []);

  // Initial month load
  useEffect(() => {
    const now = new Date();
    handleMonthChange(now.getFullYear(), now.getMonth());
  }, [handleMonthChange]);

  // Fetch date availability whenever eventDate or service context changes
  useEffect(() => {
    if (!eventDate) {
      setDateAvailability(null);
      return;
    }
    let isCancelled = false;
    setIsLoadingAvailability(true);
    fetchDateAvailability(eventDate, {
      isWedding: isWeddingService,
      isSchoolSection: isSchoolSection,
      serviceSlug: selectedService?.slug,
    })
      .then((res) => {
        if (!isCancelled) {
          setDateAvailability(res);
          setIsLoadingAvailability(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("[BookSession] Date availability query error:", err);
          setIsLoadingAvailability(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [eventDate, isWeddingService, isSchoolSection, selectedService?.slug]);

  // Subscribe to live availability broadcast events
  useEffect(() => {
    const unsub = subscribeToAvailabilityUpdates(() => {
      const now = new Date();
      handleMonthChange(now.getFullYear(), now.getMonth());
      if (eventDate) {
        fetchDateAvailability(eventDate, {
          isWedding: isWeddingService,
          isSchoolSection: isSchoolSection,
          serviceSlug: selectedService?.slug,
        }).then((res) => setDateAvailability(res));
      }
    });
    return unsub;
  }, [eventDate, handleMonthChange, isWeddingService, isSchoolSection, selectedService?.slug]);

  // Auto-set preferredTime for school section or wedding, or clear if booked
  useEffect(() => {
    if (isSchoolSection) {
      setPreferredTime("Full-Day School Batch Pictorial (8:00 AM – 5:00 PM)");
    } else if (isWeddingService) {
      setPreferredTime("Full-Day Wedding Production (8:00 AM – 5:00 PM)");
    } else if (isIndividualBooking && dateAvailability && preferredTime) {
      const slotKey = normalizeSlotTime(preferredTime);
      if (slotKey && dateAvailability.bookedSlots?.includes(slotKey)) {
        setPreferredTime("");
      }
    }
  }, [isSchoolSection, isWeddingService, isIndividualBooking, dateAvailability, preferredTime]);
  const [locationType, setLocationType] = useState("STUDIO"); // "CAMPUS" | "STUDIO" | "CUSTOM"
  const [customVenue, setCustomVenue] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customBarangayCity, setCustomBarangayCity] = useState("");
  const [customLandmark, setCustomLandmark] = useState("");

  // Automatically keep locationType and academicBookingMode consistent with bookingFor
  useEffect(() => {
    if (isAcademicService) {
      if (bookingFor === "school_section") {
        setAcademicBookingMode("SCHOOL_PARTNER");
        setLocationType("CAMPUS");
      } else {
        setAcademicBookingMode("INDIVIDUAL");
        setLocationType("STUDIO");
      }
    } else {
      if (locationType === "CAMPUS") {
        setLocationType("STUDIO");
      }
    }
  }, [isAcademicService, bookingFor]);
  // Visual Reference Pegs & Files
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [notes, setNotes] = useState("");

  // Review Accordion Motion & Lock State (Auto-show & auto-hide on motion)
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [hoveredAccordion, setHoveredAccordion] = useState(null);
  const [pinnedAccordions, setPinnedAccordions] = useState({
    summary: false,
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
      venueAddress: "331 Rizal Street, City of Naga, Cebu",
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
    setStep(5); // Jump straight to Review & Confirm!
  };
  const [bookingResult, setBookingResult] = useState(() => {
    try {
      const cached = sessionStorage.getItem('ekodak_active_confirmed_booking');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

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
            } else if (srv.tiers && srv.tiers.length > 0) {
              const defaultTier = srv.tiers.find(t => t.popular) || srv.tiers[0];
              setSelectedTier(defaultTier);
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
  const effectiveBaseTier = selectedTier || selectedService?.tiers?.[0] || null;
  const basePrice = parsePrice(
    selectedTier?.price ||
    selectedService?.tiers?.[0]?.price ||
    selectedService?.base_price ||
    (isAcademicService ? 1750 : 0)
  );
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + parsePrice(a.price), 0);
  const totalAmount = basePrice + addOnsTotal;
  const downPaymentAmount = selectedTier?.down_payment ? parsePrice(selectedTier.down_payment) : Math.round(totalAmount * 0.5);
  const remainingBalance = Math.max(0, totalAmount - downPaymentAmount);

  const formattedTotal = `₱${totalAmount.toLocaleString()}`;
  const formattedDownPayment = `₱${downPaymentAmount.toLocaleString()}`;
  const formattedRemaining = `₱${remainingBalance.toLocaleString()}`;
  const formattedBasePrice = `₱${basePrice.toLocaleString()}`;

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
        ? "E-Kodak Studio, 331 Rizal Street, City of Naga, Cebu"
        : `School Campus: ${studentSchool || "School Campus"}${studentSchoolAddress ? ` (${studentSchoolAddress})` : ""}`)
    : locationType === "STUDIO"
    ? "E-Kodak Studio, 331 Rizal Street, City of Naga, Cebu"
    : [customVenue, customAddress, customBarangayCity, customLandmark ? `(Landmark: ${customLandmark})` : ""].filter(Boolean).join(", ") || "Custom Venue";

  // Unified Review Summary Card Derived Values
  const reviewClientDisplayName = useMemo(() => {
    if (bookingFor === "someone_else") {
      return [participantFirstName, participantLastName].filter(Boolean).join(" ") || "Participant";
    }
    if (isAcademicService) {
      return [studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || "Student Profile";
    }
    if (isWeddingService) {
      return `${brideName || 'Bride'} & ${groomName || 'Groom'}`;
    }
    return [editFirstName, editLastName].filter(Boolean).join(" ") || "Client Profile";
  }, [bookingFor, participantFirstName, participantLastName, isAcademicService, studentFirstName, studentMiddleName, studentLastName, isWeddingService, brideName, groomName, editFirstName, editLastName]);

  const reviewClientSecondaryInfo = useMemo(() => {
    if (bookingFor === "someone_else") {
      return `Ordered by ${activeProfile?.first_name || user?.user_metadata?.first_name || "Account Owner"}`;
    }
    if (isAcademicService) {
      return studentSchool || "School Campus";
    }
    if (isWeddingService) {
      return weddingTheme || "Wedding Session";
    }
    return editPhone || activeProfile?.email || user?.email || "Verified Profile";
  }, [bookingFor, activeProfile, user, isAcademicService, studentSchool, isWeddingService, weddingTheme, editPhone]);

  const reviewScheduleDisplay = useMemo(() => {
    if (isAcademicService && academicBookingMode === "SCHOOL_PARTNER") {
      return "Official School Batch Schedule";
    }
    return `${formatTextualDate(eventDate)} • ${formatSessionTime(preferredTime)}`;
  }, [isAcademicService, academicBookingMode, eventDate, preferredTime]);

  const reviewScheduleSecondaryInfo = useMemo(() => {
    if (isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS") {
      return `On-Campus (${studentSchool || "School Campus"})`;
    }
    return resolvedLocation || "Studio Bay";
  }, [isAcademicService, academicBookingMode, locationType, studentSchool, resolvedLocation]);


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
        setTimeout(() => {
          document.getElementById("studio-photoshoot-scheduling-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
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
          setValidationError(`Please select or enter ${bookingFor === "someone_else" ? "the participant's" : "your"} ${isCollegeService ? "University / College" : "High School"}.`);
          return;
        }
        if (isSeniorHighService && !selectedShsStrand) {
          setValidationError(`Please select ${bookingFor === "someone_else" ? "the participant's" : "your"} Senior High Academic Strand.`);
          return;
        }
        if (isSeniorHighService && selectedShsStrand === "OTHERS" && !customShsStrand.trim()) {
          setValidationError("Please specify the custom Academic Strand.");
          return;
        }
        if (!studentBatch.trim()) {
          setValidationError(`Please enter ${bookingFor === "someone_else" ? "the participant's" : "your"} Graduating Batch.`);
          return;
        }
        if (!studentSection.trim()) {
          setValidationError("Class Section is required for graduation records.");
          return;
        }
        if (!studentIdNumber.trim()) {
          setValidationError(`Please provide ${bookingFor === "someone_else" ? "the participant's" : "your"} Student ID Number.`);
          return;
        }
      }
      setStep(4);
      setTimeout(() => {
        document.getElementById("studio-photoshoot-scheduling-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else if (step === 4) {
      // Step 4: Schedule & Studio Location (Live Booking Validation)
      if (!eventDate) {
        setValidationError(
          isSchoolSection
            ? "Please select a target date for your school batch pictorial."
            : isWeddingService
            ? "Please select your wedding date on the calendar."
            : "Please choose a target photoshoot date."
        );
        return;
      }

      if (dateAvailability?.isFullDayBlocked) {
        setValidationError(
          `The selected date (${eventDate}) is fully booked (${dateAvailability.fullDayReason || "Unavailable"}). Please pick another open date.`
        );
        return;
      }

      if (isIndividualBooking) {
        if (!preferredTime) {
          setValidationError("Please select an available 1-hour photoshoot session slot.");
          return;
        }
        const slotKey = normalizeSlotTime(preferredTime);
        if (slotKey && dateAvailability?.bookedSlots?.includes(slotKey)) {
          setValidationError("The selected time slot is already booked. Please choose an open slot.");
          return;
        }
      }

      if (locationType === "CUSTOM" && !customAddress.trim() && !isSchoolSection) {
        setValidationError("Please provide the street address for your on-location session.");
        return;
      }

      setValidationError("");
      setStep(5);
    } else if (step === 5) {
      // Step 5: Review & Confirm -> open simple yes/no modal
      setShowOrderConfirmModal(true);
    } else if (step === 6) {
      // Step 6: Settle 50% downpayment & finalize reservation via Xendit / Gateway (protected by Security OTP)
      handleInitiatePaymentWithSecurityOtp();
    }
  };

  // Direct package selection: immediately prompts for booking beneficiary (Who is this booking for?)
  const handleSelectPackage = (svc) => {
    setSelectedService(svc);
    const defaultTier = svc?.tiers?.find(t => t.popular) || svc?.tiers?.[0] || null;
    setSelectedTier(defaultTier);
    setSelectedAddOns([]);
    setValidationError("");
    if (svc.slug === "senior-high-packages") {
      setStudentType("SENIOR_HIGH");
      setSelectedUnivId("");
    } else if (svc.slug === "college-packages") {
      setStudentType("COLLEGE");
    }
    setProceedingSvcSlug(null);
    setShowBookingForModal(true);
  };

  // ── Step 6: Complete Booking & Settle 50% Downpayment ───────────────────────
  const isCompletingBookingRef = useRef(false);
  const handleCompleteBookingAndPayment = async (customTxnRef = null, customOrNumber = null, pendingOverride = null) => {
    // If already in-flight, immediately abort duplicate invocation
    if (isCompletingBookingRef.current) {
      console.warn("[Booking] Duplicate handleCompleteBookingAndPayment call rejected (in-flight).");
      return;
    }
    // If already completed in this session, don't re-create
    if (bookingResult?.id) {
      console.warn("[Booking] Session already has a confirmed booking (#" + (bookingResult.booking_number || bookingResult.id) + "). Skipping creation.");
      setStep(7);
      return;
    }

    isCompletingBookingRef.current = true;
    setIsSubmitting(true);
    setValidationError("");

    try {
      // Resolve or generate authentic gateway transaction reference & OR number
      const refNum = (typeof customTxnRef === "string" && customTxnRef.trim())
        ? customTxnRef.trim()
        : paymentReferenceNumber.trim()
        ? paymentReferenceNumber.trim()
        : `PAY-MAYA-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const orNum = (typeof customOrNumber === "string" && customOrNumber.trim())
        ? customOrNumber.trim()
        : gatewayOrNumber.trim()
        ? gatewayOrNumber.trim()
        : `OR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      setPaymentReferenceNumber(refNum);
      setGatewayTxnRef(refNum);
      setGatewayOrNumber(orNum);

      const effectiveService = pendingOverride?.selectedService || selectedService || services?.[0] || SERVICES[1];
      const effectiveTier = pendingOverride?.selectedTier || selectedTier || effectiveService?.tiers?.[0];
      const resolvedTierPrice = parsePrice(effectiveTier?.price || 1750);
      const effectiveTotal = (pendingOverride?.totalAmount && pendingOverride.totalAmount > 0)
        ? pendingOverride.totalAmount
        : (totalAmount && totalAmount > 0)
        ? totalAmount
        : (resolvedTierPrice + (addOnsTotal || 0));
      const effectiveDownPayment = (pendingOverride?.downPaymentAmount && pendingOverride.downPaymentAmount > 0)
        ? pendingOverride.downPaymentAmount
        : (downPaymentAmount && downPaymentAmount > 0)
        ? downPaymentAmount
        : Math.round(effectiveTotal * 0.5);
      const effectiveRemaining = (pendingOverride?.remainingBalance && pendingOverride.remainingBalance > 0)
        ? pendingOverride.remainingBalance
        : Math.max(0, effectiveTotal - effectiveDownPayment);
      const effectiveDate = pendingOverride?.eventDate || eventDate;
      const effectiveTime = pendingOverride?.preferredTime || preferredTime;
      const effectiveLocation = pendingOverride?.location || resolvedLocation;
      const effectiveBookingFor = pendingOverride?.bookingFor || bookingFor || "myself";
      const isAcademic = effectiveService?.category === "ACADEMIC" ||
                         effectiveService?.slug === "college-packages" ||
                         effectiveService?.slug === "senior-high-packages" ||
                         isAcademicService;

      const effectiveParticipantFirst = (pendingOverride?.participantFirstName !== undefined ? pendingOverride.participantFirstName : participantFirstName) || "";
      const effectiveParticipantMiddle = (pendingOverride?.participantMiddleName !== undefined ? pendingOverride.participantMiddleName : participantMiddleName) || "";
      const effectiveParticipantLast = (pendingOverride?.participantLastName !== undefined ? pendingOverride.participantLastName : participantLastName) || "";
      const effectiveParticipantPhone = (pendingOverride?.participantPhone !== undefined ? pendingOverride.participantPhone : participantPhone) || "";
      const effectiveParticipantEmail = (pendingOverride?.participantEmail !== undefined ? pendingOverride.participantEmail : participantEmail) || "";
      const effectiveRelationship = effectiveBookingFor === "someone_else"
        ? (pendingOverride?.participantRelationship || participantRelationship || "Beneficiary")
        : "Self (Account Owner)";

      const effectiveStudentType = pendingOverride?.studentType || studentType || (effectiveService?.slug === "college-packages" ? "COLLEGE" : "SENIOR_HIGH");
      const isSchoolPartner = isAcademic && (pendingOverride?.academicBookingMode === "SCHOOL_PARTNER" || academicBookingMode === "SCHOOL_PARTNER");
      const effectiveStudentSchool = pendingOverride?.studentSchool || studentSchool || "";
      const effectiveStudentSchoolAddress = pendingOverride?.studentSchoolAddress || studentSchoolAddress || "";
      const effectiveStudentCourse = (effectiveStudentType === "COLLEGE"
        ? (pendingOverride?.studentCourse || studentCourse || "")
        : (pendingOverride?.effectiveShsStrand || pendingOverride?.selectedShsStrand || pendingOverride?.studentCourse || effectiveShsStrand || selectedShsStrand || studentCourse || "")
      ) || pendingOverride?.effectiveShsStrand || pendingOverride?.selectedShsStrand || effectiveShsStrand || selectedShsStrand || "";
      const effectiveStudentBatch = pendingOverride?.studentBatch || studentBatch || "";
      const effectiveStudentSection = pendingOverride?.studentSection || normalizedStudentSection || studentSection || "";
      const effectiveStudentId = pendingOverride?.studentIdNumber || studentIdNumber || "";
      const effectiveYearbookMotto = pendingOverride?.yearbookMotto || yearbookMotto || "";
      const effectiveScheduleNote = pendingOverride?.schoolScheduleNote || schoolScheduleNote || "";

      const activeP = customerProfile || profile;
      const accountOwnerFullName = [activeP?.first_name || user?.user_metadata?.first_name || "", activeP?.last_name || user?.user_metadata?.last_name || ""].filter(Boolean).join(" ") || "Client";
      const participantFullName = [effectiveParticipantFirst, effectiveParticipantMiddle, effectiveParticipantLast].filter(Boolean).join(" ") || (effectiveBookingFor === "myself" ? accountOwnerFullName : "Participant");

      let activeCustomerId = user?.id || activeP?.id;
      if (!activeCustomerId && isSupabaseConfigured && supabase) {
        try {
          const { data: sessData } = await supabase.auth.getSession();
          if (sessData?.session?.user?.id) {
            activeCustomerId = sessData.session.user.id;
          } else {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.id) activeCustomerId = authData.user.id;
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
        setValidationError("You must be logged in to reserve a photoshoot slot. Please sign in or refresh your session.");
        return;
      }

      let resolvedServiceId = effectiveService?.id;
      if (!resolvedServiceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedServiceId)) {
        resolvedServiceId = SERVICE_SLUG_TO_UUID[effectiveService?.slug] || "1471388e-b74f-41ec-96c8-1d220d557a89";
      }

      // refNum resolved dynamically above
      const paymentAuditNote = `[50% RESERVATION DOWNPAYMENT]\n• Gateway: ${selectedPaymentGateway.toUpperCase()}\n• Amount Paid: ₱${effectiveDownPayment.toLocaleString()}\n• Reference No: ${refNum}\n• Payment Date: ${new Date().toLocaleString()}\n• Remaining Balance: ₱${effectiveRemaining.toLocaleString()} (Due at studio/carrier)`;

      let fullNotes = notes || "";
      const isSchoolSectionBooking = effectiveBookingFor === "school_section";
      const beneficiaryBlock = [
        '[BOOKING BENEFICIARY & PARTICIPANT]',
        `• Booking For: ${isSchoolSectionBooking ? "School Section" : (effectiveBookingFor === "someone_else" ? "Someone Else" : "Myself")}`,
        `• Participant Name: ${isSchoolSectionBooking ? `${effectiveStudentSchool} - ${effectiveStudentSection}` : participantFullName}`,
        `• Participant Phone: ${isSchoolSectionBooking ? (masterlistData?.adviserPhone || effectiveParticipantPhone || 'N/A') : (effectiveParticipantPhone || 'N/A')}`,
        `• Participant Email: ${isSchoolSectionBooking ? (masterlistData?.adviserEmail || effectiveParticipantEmail || 'N/A') : (effectiveParticipantEmail || 'N/A')}`,
        `• Relationship to Account Owner: ${isSchoolSectionBooking ? "School Section" : effectiveRelationship}`,
        isSchoolSectionBooking && masterlistData?.adviserName ? `• Class Adviser: ${masterlistData.adviserName}` : null,
        isSchoolSectionBooking && masterlistData?.strand ? `• Academic Strand: ${masterlistData.strand}` : null,
        `• Account Owner: ${accountOwnerFullName} (${activeP?.email || user?.email || 'N/A'})`
      ].filter(Boolean).join('\n');

      fullNotes = fullNotes ? `${beneficiaryBlock}\n\n${paymentAuditNote}\n\n${fullNotes}` : `${beneficiaryBlock}\n\n${paymentAuditNote}`;

      if (isAcademic) {
        const studentLines = [
          '[STUDENT & YEARBOOK DETAILS]',
          `• Type: ${effectiveStudentType === "COLLEGE" ? "College / University" : "Senior High School"}`,
          `• Booking Mode: ${isSchoolPartner ? "School Campus (Date set by school) [SCHOOL_PARTNER]" : "Individual Booking"}`,
          `• Student Name: ${isSchoolSectionBooking ? `${effectiveStudentSchool} - ${effectiveStudentSection}` : (participantFullName || 'N/A')}`,
          `• Middle Name: ${effectiveParticipantMiddle || 'N/A'}`,
          `• School: ${effectiveStudentSchool || 'N/A'}`,
          `• Campus / Address: ${effectiveStudentSchoolAddress || 'N/A'}`,
          `• Track / Strand / Program: ${effectiveStudentCourse || masterlistData?.strand || 'N/A'}`,
          `• Batch: ${effectiveStudentBatch || 'N/A'}`,
          `• Section: ${effectiveStudentSection || 'N/A'}`,
          `• Student ID: ${isSchoolSectionBooking ? `SEC-${effectiveStudentSection}` : (effectiveStudentId || 'N/A')}`,
          `• Yearbook Motto: ${effectiveYearbookMotto || 'N/A'}`,
          isSchoolSectionBooking && masterlistData?.adviserName ? `• Class Adviser: ${masterlistData.adviserName}` : null,
          isSchoolSectionBooking && masterlistData?.adviserEmail ? `• Adviser Email: ${masterlistData.adviserEmail}` : null,
          isSchoolSectionBooking && masterlistData?.adviserPhone ? `• Adviser Phone: ${masterlistData.adviserPhone}` : null,
          isSchoolSectionBooking && masterlistData?.students?.length ? `• Total Enrolled Students: ${masterlistData.students.length}` : null,
          effectiveScheduleNote ? `• Note: ${effectiveScheduleNote}` : null
        ].filter(Boolean);

        fullNotes = `${fullNotes}\n\n${studentLines.join('\n')}`;
      }

      if (pendingOverride) {
        if (pendingOverride.selectedService) setSelectedService(pendingOverride.selectedService);
        if (pendingOverride.selectedTier) setSelectedTier(pendingOverride.selectedTier);
        if (pendingOverride.bookingFor) setBookingFor(pendingOverride.bookingFor);
        if (pendingOverride.totalAmount != null) setTotalAmount(pendingOverride.totalAmount);
        if (pendingOverride.downPaymentAmount != null) setDownPaymentAmount(pendingOverride.downPaymentAmount);
        if (pendingOverride.remainingBalance != null) setRemainingBalance(pendingOverride.remainingBalance);
        if (pendingOverride.eventDate) setEventDate(pendingOverride.eventDate);
        if (pendingOverride.preferredTime) setPreferredTime(pendingOverride.preferredTime);
        if (pendingOverride.selectedPaymentGateway) setSelectedPaymentGateway(pendingOverride.selectedPaymentGateway);
        if (pendingOverride.participantFirstName) setParticipantFirstName(pendingOverride.participantFirstName);
        if (pendingOverride.participantMiddleName) setParticipantMiddleName(pendingOverride.participantMiddleName);
        if (pendingOverride.participantLastName) setParticipantLastName(pendingOverride.participantLastName);
        if (pendingOverride.participantEmail) setParticipantEmail(pendingOverride.participantEmail);
        if (pendingOverride.participantPhone) setParticipantPhone(pendingOverride.participantPhone);
        if (pendingOverride.participantRelationship) setParticipantRelationship(pendingOverride.participantRelationship);
        if (pendingOverride.studentSchool) setStudentSchool(pendingOverride.studentSchool);
        if (pendingOverride.studentSchoolAddress) setStudentSchoolAddress(pendingOverride.studentSchoolAddress);
        if (pendingOverride.studentCourse) setStudentCourse(pendingOverride.studentCourse);
        if (pendingOverride.selectedShsStrand) setSelectedShsStrand(pendingOverride.selectedShsStrand);
        if (pendingOverride.customShsStrand) setCustomShsStrand(pendingOverride.customShsStrand);
        if (pendingOverride.effectiveShsStrand && !pendingOverride.selectedShsStrand) setSelectedShsStrand(pendingOverride.effectiveShsStrand);
        if (pendingOverride.studentBatch) setStudentBatch(pendingOverride.studentBatch);
        if (pendingOverride.studentSection) setStudentSection(pendingOverride.studentSection);
        if (pendingOverride.studentIdNumber) setStudentIdNumber(pendingOverride.studentIdNumber);
        if (pendingOverride.yearbookMotto) setYearbookMotto(pendingOverride.yearbookMotto);
      }

      const payload = {
        customer_id: activeCustomerId,
        service_id: resolvedServiceId,
        service_slug: effectiveService?.slug || selectedService?.slug || null,
        tier_name: effectiveTier?.name || selectedTier?.name || null,
        selected_add_ons: (effectiveAddOns || selectedAddOns).map(a => ({ name: a.name, price: parsePrice(a.price) })),
        participant_details: {
          booking_for: effectiveBookingFor,
          full_name: isSchoolSectionBooking ? `${effectiveStudentSchool} - ${effectiveStudentSection}` : participantFullName,
          first_name: isSchoolSectionBooking ? (masterlistData?.adviserName || "Class Adviser") : effectiveParticipantFirst,
          middle_name: isSchoolSectionBooking ? null : effectiveParticipantMiddle,
          last_name: isSchoolSectionBooking ? "(Adviser)" : effectiveParticipantLast,
          phone: isSchoolSectionBooking ? (masterlistData?.adviserPhone || effectiveParticipantPhone) : effectiveParticipantPhone,
          email: isSchoolSectionBooking ? (masterlistData?.adviserEmail || effectiveParticipantEmail) : effectiveParticipantEmail,
          relationship: isSchoolSectionBooking ? "School Section" : effectiveRelationship,
          account_owner_name: accountOwnerFullName,
          account_owner_email: activeP?.email || user?.email
        },
        student_details: isAcademic ? {
          type: effectiveStudentType,
          booking_mode: isSchoolPartner ? "SCHOOL_PARTNER" : (pendingOverride?.academicBookingMode || academicBookingMode),
          student_name: isSchoolSectionBooking ? `${effectiveStudentSchool} - ${effectiveStudentSection}` : participantFullName,
          middle_name: effectiveParticipantMiddle || null,
          school: effectiveStudentSchool || null,
          school_address: effectiveStudentSchoolAddress || null,
          course: effectiveStudentCourse || masterlistData?.strand || null,
          batch: effectiveStudentBatch || null,
          section: effectiveStudentSection || null,
          student_id: isSchoolSectionBooking ? `SEC-${effectiveStudentSection}` : (effectiveStudentId || null),
          yearbook_motto: effectiveYearbookMotto || null,
          adviser_name: masterlistData?.adviserName || null,
          adviser_email: masterlistData?.adviserEmail || null,
          adviser_phone: masterlistData?.adviserPhone || null,
          masterlist_summary: masterlistData?.summary || null,
          masterlist_students: masterlistData?.students || null,
          schedule_note: effectiveScheduleNote || null,
          schedule_agreement: isSchoolPartner ? "PENDING_STUDIO_SCHOOL_AGREEMENT" : "SELF_SCHEDULED"
        } : null,
        total_amount: effectiveTotal,
        down_payment_amount: effectiveDownPayment,
        down_payment_confirmed: true,
        remaining_balance: effectiveRemaining,
        status: 'CONFIRMED',
        payment_status: 'DOWNPAYMENT_PAID',
        event_date: effectiveDate || null,
        preferred_time: toDatabaseTime(
          isSchoolPartner ? (effectiveTime || "08:00:00") : (effectiveTime || null)
        ),
        location: isSchoolPartner && (pendingOverride?.locationType === "CUSTOM" || locationType === "CUSTOM")
          ? `On-Campus Pictorial Venue (${effectiveStudentSchool || 'School Grounds'})`
          : effectiveLocation,
        notes: fullNotes || null
      };

      const { data, error: submitError } = await createBooking(payload, referenceFiles);

      if (submitError) {
        console.error("Booking creation error:", submitError);
        setValidationError("Failed to reserve slot: " + submitError.message);
        return;
      }

      // Record payment directly to payments table and notify admin
      try {
        await customerPaymentService.submitPayment({
          bookingId: data.id,
          amount: effectiveDownPayment,
          paymentType: 'downpayment',
          paymentMethod: selectedPaymentGateway,
          referenceNumber: refNum,
          notes: `Initial 50% reservation deposit settled via ${selectedPaymentGateway.toUpperCase()} during checkout.`,
          recordedBy: activeCustomerId
        });
      } catch (payErr) {
        console.warn("[Payment Service Submission Warning]", payErr);
        try {
          let dbMethod = 'E_WALLET';
          if (selectedPaymentGateway === 'bank_transfer') dbMethod = 'BANK_TRANSFER';
          else if (selectedPaymentGateway === 'maya') dbMethod = 'E_WALLET';
          else dbMethod = 'E_WALLET';

          await supabase.from('payments').insert({
            booking_id: data.id,
            amount: effectiveDownPayment,
            payment_type: 'DOWN_PAYMENT',
            payment_method: dbMethod,
            reference_number: refNum,
            payment_date: new Date().toISOString(),
            recorded_by: activeCustomerId,
            notes: `50% downpayment via ${selectedPaymentGateway.toUpperCase()} (Ref: ${refNum})`
          });
        } catch (dbErr) {
          console.warn("[Direct Payment Insert Warning]", dbErr);
        }
      }

      // Construct high-fidelity official receipt data for instant viewing & printing
      const activeReceiptData = {
        receiptNumber: orNum,
        issuedAt: new Date().toISOString(),
        bookingNumber: data.booking_number || "BK-2026-00001",
        clientName: participantFullName || accountOwnerFullName,
        location: isSchoolPartner && (pendingOverride?.locationType === "CUSTOM" || locationType === "CUSTOM")
          ? `On-Campus Pictorial Venue (${pendingOverride?.studentSchool || studentSchool || 'School Grounds'})`
          : effectiveLocation,
        eventDate: `${formatTextualDate(effectiveDate)} • ${formatSessionTime(effectiveTime)}`,
        packageName: effectiveService?.name || selectedService?.name || "Senior High Packages and Sets",
        tierName: effectiveTier?.name || selectedTier?.name || "Set A",
        total: effectiveTotal,
        downpaymentPrice: effectiveDownPayment,
        downPaid: effectiveDownPayment,
        remaining: effectiveRemaining,
        payments: [
          {
            id: 1,
            payment_method: selectedPaymentGateway.toUpperCase(),
            reference_number: refNum,
            amount: effectiveDownPayment,
            created_at: new Date().toISOString()
          }
        ],
        merchantName: "E-KODAK STUDIOS PH",
        merchantPhone: "0928-888-5632"
      };
      setPaymentReceiptData(activeReceiptData);

      setBookingResult({
        ...data,
        down_payment_confirmed: true,
        down_payment_amount: effectiveDownPayment,
        remaining_balance: effectiveRemaining,
        payment_status: 'DOWNPAYMENT_PAID',
        status: 'CONFIRMED'
      });
      setStep(7);
      document.body.style.overflow = "";
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // Persist completed booking & receipt to sessionStorage so page refresh won't duplicate or lose pass
      try {
        sessionStorage.setItem('ekodak_active_confirmed_booking', JSON.stringify({
          ...data,
          down_payment_confirmed: true,
          down_payment_amount: effectiveDownPayment,
          remaining_balance: effectiveRemaining,
          payment_status: 'DOWNPAYMENT_PAID',
          status: 'CONFIRMED'
        }));
        sessionStorage.setItem('ekodak_active_receipt_data', JSON.stringify(activeReceiptData));
        sessionStorage.setItem(`ekodak_fulfilled_ref_${refNum}`, 'true');
      } catch {}

      // Automatically dispatch booking confirmation notice via SMTP (no manual tagging)
      const detectedEmail = (
        effectiveParticipantEmail ||
        participantEmail ||
        customerProfile?.email ||
        profile?.email ||
        user?.email ||
        ""
      );
      if (detectedEmail) {
        setEmailStatus({ state: "sending", message: "Dispatching email notice..." });
        sendBookingConfirmationEmail({
          recipientEmail: detectedEmail,
          recipientName: participantFullName || accountOwnerFullName,
          bookingNumber: data.booking_number || "BK-2026-00001",
          bookingId: data.id,
          receiptNumber: customOrNumber || gatewayOrNumber || `OR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          packageName: effectiveService?.name || selectedService?.name || "Photoshoot Session",
          tierName: effectiveTier?.name || selectedTier?.name || "Standard",
          eventDate: formatTextualDate(effectiveDate),
          preferredTime: formatSessionTime(effectiveTime),
          location: isSchoolPartner && (pendingOverride?.locationType === "CUSTOM" || locationType === "CUSTOM")
            ? ("On-Campus Pictorial Venue (" + (pendingOverride?.studentSchool || studentSchool || "School Grounds") + ")")
            : effectiveLocation,
          downpaymentAmount: effectiveDownPayment,
          remainingBalance: effectiveRemaining,
          totalAmount: (effectiveDownPayment || 0) + (effectiveRemaining || 0),
          paymentMethod: selectedPaymentGateway.toUpperCase(),
          paymentReference: refNum,
          bookingUrl: typeof window !== "undefined" ? `${window.location.origin}/dashboard/bookings` : "https://e-kodak.ph/dashboard/bookings"
        }).then(res => {
          if (res?.success) {
            setEmailStatus({ state: "sent", message: `Sent to ${detectedEmail}` });
          } else {
            setEmailStatus({ state: "error", message: res?.error || "SMTP not configured" });
          }
        }).catch(emailErr => {
          console.warn("[SMTP Dispatch Warning]", emailErr);
          setEmailStatus({ state: "error", message: emailErr.message || "SMTP Dispatch Failed" });
        });
      }

      if (activeCustomerId) {
        try {
          recordCustomerAction({
            userId: activeCustomerId,
            category: 'BOOKING',
            title: `Slot Reserved & 50% Deposit Paid (#${data.booking_number || 'New'})`,
            description: `Customer settled 50% deposit (₱${effectiveDownPayment.toLocaleString()}) via ${selectedPaymentGateway.toUpperCase()} (Ref: ${refNum}). Dedicated bay locked.`,
            bookingId: data.id,
            bookingNumber: data.booking_number
          });
        } catch (auditErr) {
          console.warn("[Audit warning]", auditErr);
        }
      }
    } catch (err) {
      console.error("[Booking Completion Error]", err);
      setValidationError("Failed to complete booking: " + (err.message || "An unexpected error occurred."));
    } finally {
      setIsSubmitting(false);
      isCompletingBookingRef.current = false;
    }
  };

  // ── Xendit Payment Return Listener ──────────────────────────────────────
  const hasProcessedPaymentReturnRef = useRef(false);
  useEffect(() => {
    const paymentStatusParam = searchParams.get("payment_status");
    const invoiceIdParam = searchParams.get("invoice_id");
    const externalIdParam = searchParams.get("external_id");

    if (paymentStatusParam === "success") {
      // 1. Immediately clean up URL search parameters to prevent duplicate triggers on F5 / reload
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setSearchParams({}, { replace: true });
      } catch (e) {
        console.warn("[URL Cleanup Warning]", e);
      }

      // 2. Persistent idempotency check using invoice / external ID
      const txKey = (invoiceIdParam && invoiceIdParam !== '{invoice_id}')
        ? invoiceIdParam
        : (externalIdParam || 'xendit_last_return');
      const dedupeKey = `ekodak_processed_xendit_tx_${txKey}`;

      if (hasProcessedPaymentReturnRef.current || sessionStorage.getItem(dedupeKey)) {
        console.warn(`[Xendit Return] Transaction ${txKey} has already been processed. Skipping duplicate booking.`);
        setStep(7);
        return;
      }
      hasProcessedPaymentReturnRef.current = true;
      try { sessionStorage.setItem(dedupeKey, 'true'); } catch {}

      try {
        const rawPending = sessionStorage.getItem('ekodak_pending_xendit_booking') || localStorage.getItem('ekodak_pending_xendit_booking');
        let parsedPending = null;
        if (rawPending) {
          try { parsedPending = JSON.parse(rawPending); } catch {}
          sessionStorage.removeItem('ekodak_pending_xendit_booking');
          try { localStorage.removeItem('ekodak_pending_xendit_booking'); } catch {}
        }

        // If no pending booking was found and we already have a confirmed booking, just jump to Step 7
        if (!parsedPending && bookingResult?.id) {
          setStep(7);
          return;
        }

        const channelParam = searchParams.get("channel") || parsedPending?.selectedPaymentGateway || selectedPaymentGateway || "gcash";
        setSelectedPaymentGateway(channelParam);

        const ref = (invoiceIdParam && invoiceIdParam !== '{invoice_id}')
          ? `XND-${invoiceIdParam.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
          : (externalIdParam && externalIdParam.startsWith('EK-INV-'))
          ? `XND-${externalIdParam.slice(-8).toUpperCase()}`
          : `XND-${Date.now().toString().slice(-8).toUpperCase()}`;
        const orNo = `OR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

        handleCompleteBookingAndPayment(ref, orNo, parsedPending);
      } catch (err) {
        console.warn("[Xendit Return Handling Warning]", err);
      }
    }
  }, [searchParams, setSearchParams]);

  // Helper actions for Step 7 QR Pass & Receipt
  const handleDownloadPassSVG = (overrideBookingNumber = null) => {
    const svgEl = qrPassRef.current?.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = svgUrl;
      const bNum = overrideBookingNumber || bookingResult?.booking_number || 'BK-2026-00004';
      a.download = `${bNum}-qr.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleCopyPassToken = (overrideToken = null) => {
    const token = overrideToken || bookingResult?.booking_token || bookingResult?.id;
    if (token && navigator.clipboard) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleCopyPassURL = (overrideToken = null) => {
    const token = overrideToken || bookingResult?.booking_token || bookingResult?.id;
    if (token && navigator.clipboard) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const passUrl = `${origin}/pass?token=${encodeURIComponent(token)}`;
      navigator.clipboard.writeText(passUrl);
      setCopiedPassUrl(true);
      setTimeout(() => setCopiedPassUrl(false), 2000);
    }
  };

  const handlePrintOfficialReceipt = (receiptData) => {
    if (typeof window === "undefined") return;
    const r = receiptData || paymentReceiptData || {};
    const printWindow = window.open("", "_blank", "width=480,height=800");
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Payment Receipt - ${r.receiptNumber || "OR-2026"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Playfair Display', Georgia, serif;
      background: #f7f7f7;
      margin: 0;
      padding: 16px;
      color: #111;
      display: flex;
      justify-content: center;
    }
    .ticket {
      width: 100%;
      max-width: 400px;
      background: #fff;
      border: 1px dashed #666;
      padding: 24px;
      box-sizing: border-box;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-family: 'Playfair Display', Georgia, serif;
    }
    .header { text-align: center; border-bottom: 2px dashed #444; padding-bottom: 16px; margin-bottom: 16px; font-family: 'Playfair Display', Georgia, serif; }
    .title { font-size: 19px; font-weight: 900; letter-spacing: 2px; margin: 6px 0; font-family: 'Playfair Display', Georgia, serif; }
    .sub { font-size: 10.5px; color: #555; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Playfair Display', Georgia, serif; }
    .tin { font-size: 9.5px; color: #777; margin-top: 3px; font-family: 'Playfair Display', Georgia, serif; }
    .meta-row { display: flex; justify-content: space-between; font-size: 11.5px; margin: 8px 0; font-family: 'Playfair Display', Georgia, serif; line-height: 1.4; }
    .meta-label { color: #666; font-family: 'Playfair Display', Georgia, serif; letter-spacing: 0.5px; }
    .meta-val { font-weight: 600; text-align: right; font-family: 'Playfair Display', Georgia, serif; }
    .divider { border-bottom: 1px dashed #ccc; margin: 14px 0; }
    .thick-divider { border-bottom: 2px dashed #444; margin: 14px 0; }
    .item-header { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 6px; font-family: 'Playfair Display', Georgia, serif; letter-spacing: 0.5px; }
    .item-row { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: bold; margin: 12px 0; font-family: 'Playfair Display', Georgia, serif; }
    .stamp {
      border: 2px solid #dc2626;
      color: #dc2626;
      font-weight: 900;
      text-align: center;
      padding: 8px;
      font-size: 11.5px;
      letter-spacing: 2.5px;
      margin: 18px auto;
      transform: rotate(-2deg);
      max-width: 270px;
      font-family: 'Playfair Display', Georgia, serif;
    }
    .barcode {
      text-align: center;
      margin: 16px 0 8px 0;
      letter-spacing: 4px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11px;
    }
    .barcode-bars {
      height: 32px;
      background: repeating-linear-gradient(90deg, #111 0, #111 2px, transparent 2px, transparent 4px, #111 4px, #111 7px, transparent 7px, transparent 9px);
      margin: 6px auto;
      max-width: 240px;
    }
    .btn-bar { margin-top: 16px; text-align: center; font-family: 'Playfair Display', Georgia, serif; }
    .print-btn {
      background: #f59e0b;
      color: #000;
      border: none;
      padding: 10px 20px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      margin-right: 8px;
      font-family: 'Playfair Display', Georgia, serif;
    }
    .close-btn {
      background: #e5e5e5;
      color: #333;
      border: none;
      padding: 10px 16px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-family: 'Playfair Display', Georgia, serif;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="sub">Official Photography Receipt</div>
      <div class="title">E-KODAK STUDIOS</div>
      <div class="tin">TIN: 402-991-824-000-NV</div>
      <div class="tin">331 Rizal Street, City of Naga, Cebu</div>
    </div>

    <div class="meta-row">
      <span class="meta-label">OFFICIAL RECEIPT NO:</span>
      <span class="meta-val" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px;">${r.receiptNumber || "OR-2026-92841"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">TRANSACTION DATE:</span>
      <span class="meta-val">${new Date(r.issuedAt || Date.now()).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">BOOKING REF / ORDER:</span>
      <span class="meta-val" style="color: #b45309;">#${r.bookingNumber || "BK-2026-00004"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">CLIENT NAME:</span>
      <span class="meta-val">${r.clientName || "Customer"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">CLIENT EMAIL:</span>
      <span class="meta-val" style="font-size: 10px;">${r.clientEmail || "client@e-kodak.ph"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">VENUE:</span>
      <span class="meta-val">${r.location || "E-Kodak Studio, 331 Rizal Street, City of Naga, Cebu"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">SESSION DATE:</span>
      <span class="meta-val">${r.eventDate || "Studio Slot"}</span>
    </div>

    <div class="divider"></div>

    <div class="item-header">
      <span>ITEM DESCRIPTION</span>
      <span>AMOUNT</span>
    </div>
    <div class="item-row">
      <div>
        <div>${r.packageName || "Photoshoot Package"}</div>
        <div style="font-size: 10px; color: #666; font-weight: normal;">Tier: ${r.tierName || "Set A"}</div>
      </div>
      <span>₱${Number(r.total || 0).toLocaleString()}</span>
    </div>

    <div class="thick-divider"></div>

    <div class="meta-row">
      <span class="meta-label">TOTAL PACKAGE VALUE:</span>
      <span class="meta-val">₱${Number(r.total || 0).toLocaleString()}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">50% RESERVATION DEPOSIT:</span>
      <span class="meta-val">₱${Number(r.downpaymentPrice || 0).toLocaleString()}</span>
    </div>
    <div class="meta-row" style="color: #047857; font-size: 12px;">
      <span style="font-weight: bold;">AMOUNT PAID (SETTLED):</span>
      <span class="meta-val" style="font-weight: 900; font-size: 13px;">₱${Number(r.downPaid || 0).toLocaleString()}</span>
    </div>
    <div class="meta-row" style="border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;">
      <span style="font-weight: bold;">BALANCE DUE ON DELIVERY:</span>
      <span class="meta-val" style="color: #b45309; font-weight: 900;">₱${Number(r.remaining || 0).toLocaleString()}</span>
    </div>

    <div style="text-align: center; font-size: 10px; color: #555; margin-top: 16px; font-weight: bold;">
      THANK YOU FOR CHOOSING E-KODAK!
    </div>
    <div style="text-align: center; font-size: 9px; color: #777; margin-top: 4px;">
      Retain this official electronic receipt for studio entrance and pictorial verification.
    </div>

    <div class="btn-bar no-print">
      <button class="print-btn" onclick="window.print()">Print Official Receipt / Save PDF</button>
      <button class="close-btn" onclick="window.close()">Close Window</button>
    </div>
  </div>
  <script>
    setTimeout(function() {
      window.print();
    }, 300);
  </script>
</body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ── STEP 7: RESERVATION SUCCESS & CAMERA-READY QR PASS ────────────────────
  if (step === 7) {
    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";
    const activeBooking = bookingResult || {
      id: "pending",
      booking_number: "BK-2026-00004",
      booking_token: "890f9569-1f2e-427e-a06b-e4f8cd9021a4",
      total_amount: totalAmount > 0 ? totalAmount : (parsePrice(selectedTier?.price || selectedService?.tiers?.[0]?.price || 1750) + addOnsTotal),
      down_payment_amount: downPaymentAmount > 0 ? downPaymentAmount : Math.round((totalAmount > 0 ? totalAmount : (parsePrice(selectedTier?.price || selectedService?.tiers?.[0]?.price || 1750) + addOnsTotal)) * 0.5),
      remaining_balance: remainingBalance,
      location: resolvedLocation,
      status: "CONFIRMED"
    };

    const effectiveToken = activeBooking?.booking_token || activeBooking?.id || "890f9569-1f2e-427e-a06b-e4f8cd9021a4";
    const shortToken = effectiveToken.length > 28 ? `${effectiveToken.slice(0, 24)}...` : effectiveToken;
    const passUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/pass?token=${encodeURIComponent(effectiveToken)}`
      : `/pass?token=${encodeURIComponent(effectiveToken)}`;

    const detectedClientEmail = (
      participantEmail ||
      customerProfile?.email ||
      profile?.email ||
      user?.email ||
      "client@e-kodak.ph"
    );

    const channelName = (
      selectedPaymentGateway === 'gcash'
        ? 'GCash'
        : selectedPaymentGateway === 'maya'
        ? 'Maya'
        : 'Online Banking'
    );

    const resolvedClientName = (
      [participantFirstName, participantMiddleName, participantLastName].filter(Boolean).join(" ") ||
      [editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") ||
      activeBooking?.participant_details?.full_name ||
      [customerProfile?.first_name || profile?.first_name, customerProfile?.last_name || profile?.last_name].filter(Boolean).join(" ") ||
      [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") ||
      user?.user_metadata?.full_name ||
      "Client"
    );

    const candidatePackageName = (
      activeBooking?.service?.name ||
      selectedService?.name ||
      "Senior High Packages and Sets"
    );
    const candidateSetName = (
      activeBooking?.tier_name ||
      selectedTier?.name ||
      "Set A"
    );

    // Dynamic resolution from live database services & catalog
    const matchedService = (
      services?.find(s =>
        (activeBooking?.service_id && s.id === activeBooking.service_id) ||
        (selectedService?.id && s.id === selectedService.id) ||
        (activeBooking?.service_slug && s.slug === activeBooking.service_slug) ||
        (selectedService?.slug && s.slug === selectedService.slug) ||
        (s.name && candidatePackageName && s.name.trim().toLowerCase() === candidatePackageName.trim().toLowerCase())
      ) ||
      SERVICES.find(s =>
        (activeBooking?.service_id && s.id === activeBooking.service_id) ||
        (selectedService?.id && s.id === selectedService.id) ||
        (activeBooking?.service_slug && s.slug === activeBooking.service_slug) ||
        (selectedService?.slug && s.slug === selectedService.slug) ||
        (s.name && candidatePackageName && s.name.trim().toLowerCase() === candidatePackageName.trim().toLowerCase())
      ) ||
      selectedService ||
      SERVICES[1] // Senior High Packages and Sets
    );

    const actualPackageName = matchedService?.name || candidatePackageName;

    const matchedTier = (
      matchedService?.tiers?.find(t =>
        (t.name && candidateSetName && t.name.trim().toLowerCase() === candidateSetName.trim().toLowerCase()) ||
        (activeBooking?.tier_name && t.name.trim().toLowerCase() === activeBooking.tier_name.trim().toLowerCase())
      ) ||
      selectedTier ||
      matchedService?.tiers?.[0]
    );

    const actualSetName = matchedTier?.name || candidateSetName;

    const actualTimedSession = (
      matchedTier?.duration ||
      selectedTier?.duration ||
      matchedService?.duration ||
      selectedService?.duration ||
      "45–60 Mins (Dedicated Studio Slot)"
    );
    const actualDate = activeBooking?.event_date || eventDate;
    const actualTime = activeBooking?.preferred_time || preferredTime;
    const actualDateTime = (actualDate && actualTime)
      ? `${formatTextualDate(actualDate)} • ${formatSessionTime(actualTime)}`
      : actualDate
      ? formatTextualDate(actualDate)
      : "November 5, 2026 • 8:00 AM – 9:00 AM";
    const actualVenue = (
      activeBooking?.location ||
      resolvedLocation ||
      "331 Rizal Street, City of Naga, Cebu"
    );

    // Fetch and resolve actual prices with strict positive verification
    const catalogTierPrice = parsePrice(
      matchedTier?.price ||
      selectedTier?.price ||
      activeBooking?.tier?.price ||
      activeBooking?.service?.price ||
      selectedService?.price ||
      1750
    );

    const dbTotal = Number(activeBooking?.total_amount);
    const effectiveTotal = (dbTotal && dbTotal > 0)
      ? dbTotal
      : (totalAmount && totalAmount > 0)
      ? totalAmount
      : (catalogTierPrice + (addOnsTotal || 0));

    const dbDown = Number(activeBooking?.down_payment_amount);
    const effectiveDownpayment = (dbDown && dbDown > 0)
      ? dbDown
      : (downPaymentAmount && downPaymentAmount > 0)
      ? downPaymentAmount
      : (matchedTier?.down_payment ? parsePrice(matchedTier.down_payment) : Math.round(effectiveTotal * 0.5));

    const dbRemaining = Number(activeBooking?.remaining_balance);
    const effectiveRemaining = (dbRemaining !== undefined && !isNaN(dbRemaining) && dbRemaining > 0)
      ? dbRemaining
      : Math.max(0, effectiveTotal - effectiveDownpayment);

    const formattedActualBasePrice = `₱${catalogTierPrice.toLocaleString()}`;
    const formattedActualTotal = `₱${effectiveTotal.toLocaleString()}`;
    const formattedActualDownpayment = `₱${effectiveDownpayment.toLocaleString()}`;
    const formattedActualRemaining = `₱${effectiveRemaining.toLocaleString()}`;

    const effectiveReceipt = {
      receiptNumber: (typeof customOrNumber === "string" && customOrNumber.trim()) || gatewayOrNumber || `OR-2026-${(activeBooking.booking_number || '').replace(/\D/g, '').padStart(5, '0') || '92841'}`,
      issuedAt: activeBooking?.created_at || new Date().toISOString(),
      bookingNumber: activeBooking.booking_number || 'BK-2026-00004',
      clientName: resolvedClientName || 'Client',
      clientEmail: detectedClientEmail || 'client@e-kodak.ph',
      location: actualVenue,
      eventDate: actualDateTime,
      packageName: actualPackageName,
      tierName: actualSetName,
      total: effectiveTotal,
      downpaymentPrice: effectiveDownpayment,
      downPaid: effectiveDownpayment,
      remaining: effectiveRemaining,
      paymentMethod: channelName,
      referenceNumber: gatewayTxnRef || paymentReferenceNumber || activeBooking.booking_token?.slice(0, 16) || `PAY-${channelName.toUpperCase()}-2026`
    };

    return (
      <div className="animate-fade-in w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-3 font-heading relative">
        {/* Subtle Ambient Studio Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-300/5 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        </div>

        {/* ── THE SIGNATURE E-KODAK STUDIO FOLIO CONTAINER ── */}
        <div className="w-full rounded-2xl sm:rounded-3xl lg:rounded-[32px] p-4 sm:p-6 lg:p-7 shadow-xl relative z-10 bg-[#faf7f2] border border-amber-200/70 overflow-hidden space-y-5">

          {/* ── Top Bar: Booking Reserved & Downpayment Confirmation ── */}
          <div className="bg-gradient-to-r from-[#0d2a1c] via-[#091f14] to-[#0d1c15] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
            {/* Luminous emerald ambient accent glow */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Left: Checkmark Icon & Booking Notice */}
            <div className="flex items-center gap-4 sm:gap-5 relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                <Check size={26} strokeWidth={3} className="text-neutral-950" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  Booking Received
                </h1>
                <span className="font-heading text-xs sm:text-sm text-emerald-400 font-semibold tracking-widest uppercase mt-0.5">
                  Confirmed
                </span>
              </div>
            </div>

            {/* Right: Package Price / Downpayment Paid & Open Gmail Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10 justify-between lg:justify-end relative z-10">
              <div className="text-left lg:text-right">
                <span className="text-[10px] font-heading tracking-widest text-emerald-400 font-bold uppercase block">
                  DOWNPAYMENT PAID
                </span>
                <span className="font-heading font-black text-2xl sm:text-3xl text-white block mt-0.5 drop-shadow-sm">
                  {formattedActualDownpayment}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                <a
                  href={detectedClientEmail.includes("@gmail.com") 
                    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(detectedClientEmail)}`
                    : "https://mail.google.com"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs sm:text-sm font-bold shadow-lg shadow-gold/25 hover:scale-[1.02] active:scale-95 transition-all shrink-0 font-heading cursor-pointer w-full sm:w-48 whitespace-nowrap text-center"
                >
                  <Mail size={15} className="text-neutral-950 shrink-0" />
                  <span className="whitespace-nowrap">Open Gmail</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleResendConfirmationEmail(detectedClientEmail, activeBooking)}
                  disabled={emailStatus.state === "sending"}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/35 text-white/90 hover:text-white text-xs font-semibold cursor-pointer transition-all w-full sm:w-48 font-heading whitespace-nowrap text-center"
                  title="Resend confirmation email"
                >
                  <Mail size={12} className={`shrink-0 ${emailStatus.state === "sending" ? "animate-spin" : "text-amber-400"}`} />
                  <span className="whitespace-nowrap">{emailStatus.state === "sending" ? "Sending..." : "Resend Email"}</span>
                </button>

                {emailStatus.state === "error" && (
                  <span className="text-[10px] text-amber-300 font-heading bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 rounded-md text-center max-w-[220px]">
                    {emailStatus.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── 2-Column Responsive Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* ── 1. LEFT COLUMN: ORDER TRACKING QR CODE (lg:col-span-5) ── */}
            <div className="lg:col-span-5 bg-[#141416] rounded-3xl overflow-hidden text-white shadow-xl border border-white/10 flex flex-col justify-between h-full">
              {/* Top Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3.5 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <QrCode size={15} className="text-amber-400" />
                  <span className="font-heading text-sm tracking-wide text-white uppercase font-bold">
                    Order Tracking QR Code
                  </span>
                </div>
                <span className="font-heading text-neutral-400 text-xs">
                  #{activeBooking.booking_number}
                </span>
              </div>

              {/* QR Code Canvas — Elegantly Proportioned Centered White Pass */}
              <div className="flex-1 flex items-center justify-center p-4 sm:p-5 py-4 sm:py-6">
                <div
                  ref={qrPassRef}
                  className="bg-white rounded-[28px] sm:rounded-[32px] p-4 sm:p-5 shadow-2xl flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors relative group select-none"
                  onClick={() => handleCopyPassURL(effectiveToken)}
                  title="Click to copy tracking URL"
                >
                  <div className="w-[260px] sm:w-[310px] md:w-[340px] aspect-square flex items-center justify-center relative">
                    <QRCodeSVG
                      bookingToken={effectiveToken}
                      size={340}
                      level="Q"
                      foregroundColor="#0a0a0f"
                      backgroundColor="#ffffff"
                      includeMargin={false}
                      className="w-full h-full max-w-full max-h-full"
                    />
                    {/* Central App Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#111111] p-1.5 sm:p-2 border-2 border-white shadow-xl flex items-center justify-center overflow-hidden">
                        <img src="/logo-mark.png" alt="E-Kodak" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Scanner Note */}
              <div className="px-5 sm:px-6 pt-2 pb-5 space-y-3 border-t border-white/5">
                {/* Action Buttons: Download QR & Copy Link */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleDownloadPassSVG(activeBooking.booking_number)}
                    className="h-10 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-heading"
                  >
                    <Download size={13} className="text-neutral-400" />
                    <span>Download QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyPassURL(effectiveToken)}
                    className="h-10 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-heading"
                  >
                    {copiedPassUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-neutral-400" />}
                    <span>{copiedPassUrl ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>

                {/* Application Order Scanner Footer */}
                <p className="text-[11px] text-neutral-400 text-center leading-relaxed font-heading">
                  Application Order Scanner: Scan with the app to look up orders and track deliverables.
                </p>
              </div>
            </div>

            {/* ── 2. RIGHT COLUMN: PHOTOSHOOT DETAILS & PAYMENT BREAKDOWN (lg:col-span-7) ── */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-5">

              {/* Card 1: Photoshoot Details Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/50 flex items-center justify-center shrink-0">
                    <Camera size={15} />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-neutral-900">
                    Photoshoot Details
                  </h3>
                </div>

                {/* 2-Column Grid: Package & Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left Column: Package */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-heading font-medium uppercase tracking-wider text-neutral-400 block mb-1">
                        PACKAGE
                      </span>
                      <p className="font-heading font-bold text-base sm:text-lg text-neutral-900 leading-snug">
                        {actualPackageName} — {actualSetName}
                      </p>
                      <p className="font-heading text-xs text-neutral-500 mt-1">
                        {actualTimedSession}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Date & Venue */}
                  <div className="sm:border-l sm:border-neutral-100 sm:pl-6 space-y-3">
                    <div>
                      <span className="text-[11px] font-heading font-medium uppercase tracking-wider text-neutral-400 block mb-1">
                        DATE &amp; STUDIO VENUE
                      </span>
                      <p className="font-heading font-semibold text-sm sm:text-base text-neutral-900 leading-snug">
                        {actualDateTime}
                      </p>
                      <div className="pt-2 space-y-0.5">
                        <p className="font-heading text-sm font-medium text-neutral-800">
                          E-Kodak Studio
                        </p>
                        <p className="font-heading text-xs text-neutral-500 leading-relaxed">
                          {actualVenue}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Client */}
                <div className="pt-3 border-t border-neutral-100">
                  <span className="text-[11px] font-heading font-medium uppercase tracking-wider text-neutral-400 block mb-1">
                    CLIENT
                  </span>
                  <p className="font-heading font-semibold text-base text-neutral-900">
                    {resolvedClientName}
                  </p>
                  <p className="font-heading text-xs text-neutral-500 truncate mt-0.5">
                    {detectedClientEmail}
                  </p>
                </div>
              </div>

              {/* Card 2: Payment Breakdown Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-xs space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2.5 pb-3.5 border-b border-neutral-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/50 flex items-center justify-center shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-neutral-900">
                    Payment Breakdown
                  </h3>
                </div>

                {/* Amount Line Items */}
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="font-heading text-sm text-neutral-700">
                      {actualPackageName} ({actualSetName})
                    </span>
                    <span className="font-heading font-bold text-base text-neutral-900">
                      {formattedActualBasePrice}
                    </span>
                  </div>

                  {selectedAddOns.length > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="font-heading text-sm text-neutral-700">
                        Selected Add-ons ({selectedAddOns.length})
                      </span>
                      <span className="font-heading font-bold text-base text-neutral-900">
                        +₱{addOnsTotal.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1 border-t border-neutral-100 pt-2">
                    <span className="font-heading text-sm font-semibold text-neutral-700">
                      Total Package Value
                    </span>
                    <span className="font-heading font-bold text-base text-neutral-900">
                      {formattedActualTotal}
                    </span>
                  </div>

                  {/* Downpayment Settled Box */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="font-heading font-bold text-sm text-neutral-900 block leading-tight">
                          Downpayment Settled
                        </span>
                        <span className="text-[11px] text-neutral-500 font-heading block mt-0.5">
                          Verified via {channelName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-bold text-base text-neutral-900 block">
                        {formattedActualDownpayment}
                      </span>
                      <span className="text-[11px] font-heading text-emerald-600 font-semibold uppercase block">
                        Confirmed
                      </span>
                    </div>
                  </div>

                  {/* Remaining Balance */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-heading text-sm font-semibold text-neutral-800">
                      Balance payable at studio / on delivery:
                    </span>
                    <span className="font-heading font-bold text-base text-neutral-900">
                      {formattedActualRemaining}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2.5">
                  <Link
                    to="/dashboard/bookings"
                    className="w-full h-11 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer font-heading shadow-xs"
                  >
                    <span>View My Bookings →</span>
                  </Link>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handlePrintOfficialReceipt(effectiveReceipt)}
                      className="w-full sm:flex-1 h-10 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-heading"
                    >
                      <Printer size={13} className="text-neutral-500" />
                      <span>Print Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(true)}
                      className="w-full sm:flex-1 h-10 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-heading"
                    >
                      <Receipt size={14} className="text-gold" />
                      <span>View Official Payment Receipt (OR)</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ── Official Payment Receipt Modal (Rendered via Portal into body) ── */}
        {showReceiptModal && typeof document !== "undefined" && createPortal(
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto font-heading"
            onClick={() => setShowReceiptModal(false)}
          >
            <div 
              className="relative w-full max-w-[420px] sm:max-w-[450px] bg-[#fffdf9] text-neutral-900 border border-neutral-300 shadow-2xl font-heading mx-auto my-auto overflow-hidden text-xs rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Serrated Sawtooth Edge */}
              <div className="w-full h-3.5 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
                <svg className="w-full h-3.5" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" fill="currentColor" />
                </svg>
              </div>

              <div className="p-6 sm:p-8 space-y-4 font-heading">
                {/* Close X (Top Right corner) */}
                <div className="flex justify-end print:hidden -mt-2 -mr-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    aria-label="Close receipt"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer font-heading text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Studio Header & Registration */}
                <div className="text-center pt-1 pb-4 border-b-2 border-dashed border-neutral-300 font-heading space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-1.5 text-amber-700">
                    <Camera size={18} />
                    <span className="font-heading font-black tracking-widest text-base sm:text-lg text-neutral-950">E-KODAK STUDIOS</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold font-heading">Official Photography Receipt</p>
                  <p className="text-[9.5px] text-neutral-500 font-heading">TIN: 402-991-824-000</p>
                  <p className="text-[9.5px] text-neutral-600 font-medium font-heading">331 Rizal Street, City of Naga, Cebu</p>
                </div>

                {/* Receipt Metadata */}
                <div className="py-3 sm:py-3.5 space-y-2.5 sm:space-y-3 text-xs border-b border-dashed border-neutral-300 text-neutral-800 font-heading">
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">RECEIPT NO:</span>
                    <span className="font-bold text-neutral-950 font-heading tracking-wide">
                      {effectiveReceipt.receiptNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">DATE:</span>
                    <span className="font-heading text-neutral-900">
                      {new Date(effectiveReceipt.issuedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">BOOKING REF:</span>
                    <span className="font-bold text-amber-700 font-heading tracking-wide">
                      #{effectiveReceipt.bookingNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">CLIENT:</span>
                    <span className="font-bold truncate max-w-[210px] text-neutral-950 font-heading">
                      {effectiveReceipt.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">EMAIL:</span>
                    <span className="truncate max-w-[210px] text-neutral-700 text-[11px] font-heading">
                      {effectiveReceipt.clientEmail}
                    </span>
                  </div>
                  <div className="flex justify-between items-start py-0.5">
                    <span className="text-neutral-500 shrink-0 font-heading tracking-wider text-[10.5px] uppercase font-semibold pt-0.5">VENUE:</span>
                    <span className="font-medium text-right max-w-[210px] text-neutral-950 leading-relaxed font-heading text-[11.5px]">
                      {effectiveReceipt.location}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">SESSION DATE:</span>
                    <span className="truncate max-w-[210px] font-heading text-neutral-900">
                      {effectiveReceipt.eventDate}
                    </span>
                  </div>
                </div>

                {/* Itemized Line Items */}
                <div className="py-3 sm:py-3.5 space-y-2 border-b border-dashed border-neutral-300 text-xs font-heading">
                  <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-wider pb-2 border-b border-neutral-200 font-heading">
                    <span className="font-heading">ITEM DESCRIPTION</span>
                    <span className="font-heading">AMOUNT (PHP)</span>
                  </div>
                  <div className="flex justify-between items-start pt-2 font-heading">
                    <div className="pr-2 font-heading">
                      <span className="font-bold block text-neutral-950 font-heading text-xs sm:text-sm leading-snug">
                        {effectiveReceipt.packageName}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-heading mt-1 block">
                        Tier: {effectiveReceipt.tierName}
                      </span>
                    </div>
                    <span className="font-bold text-neutral-950 shrink-0 font-heading text-xs sm:text-sm pt-0.5">
                      ₱{Number(effectiveReceipt.total).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Ledger & Balances */}
                <div className="py-3 sm:py-3.5 space-y-2.5 text-xs border-b-2 border-dashed border-neutral-400 font-heading">
                  <div className="flex justify-between items-center text-neutral-800 font-heading py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">PACKAGE TOTAL:</span>
                    <span className="font-bold text-neutral-950 font-heading">
                      ₱{Number(effectiveReceipt.total).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-amber-900 font-heading py-0.5">
                    <span className="text-neutral-500 font-heading tracking-wider text-[10.5px] uppercase font-semibold">50% DOWNPAYMENT:</span>
                    <span className="font-semibold font-heading">
                      ₱{Number(effectiveReceipt.downpaymentPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 font-heading py-0.5">
                    <span className="font-semibold font-heading tracking-wider text-[10.5px] uppercase">AMOUNT PAID:</span>
                    <span className="font-bold font-heading">
                      ₱{Number(effectiveReceipt.downPaid).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-black pt-3 pb-0.5 border-t border-neutral-300 text-neutral-950 font-heading">
                    <span className="font-heading tracking-wide">BALANCE REMAINING:</span>
                    <span className="text-amber-800 font-heading text-sm">
                      ₱{Number(effectiveReceipt.remaining).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Receipt Footnote */}
                <div className="py-3 text-center space-y-1.5 font-heading">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold font-heading">
                    THANK YOU FOR CHOOSING E-KODAK!
                  </p>
                  <p className="text-[9px] text-neutral-400 font-heading leading-relaxed max-w-[280px] mx-auto">
                    Retain this receipt for studio check-in.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 pb-1 flex items-center justify-center gap-2.5 border-t border-dashed border-neutral-300 print:hidden font-heading">
                  <button
                    type="button"
                    onClick={() => handlePrintOfficialReceipt(effectiveReceipt)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 font-heading"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Official Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold transition-all cursor-pointer font-heading"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Bottom Serrated Sawtooth Edge */}
              <div className="w-full h-3.5 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
                <svg className="w-full h-3.5" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const stepTitles = [
    "Service", "Package Tier", "Client Details", "Schedule & Studio", "Review", "Payment", "Confirmation"
  ];

  const stepSubtitles = [
    "Choose your photography service",
    "Select your package tier",
    "Provide identification details",
    "Pick date, time & location",
    "Review & confirm your booking",
    "Settle downpayment to reserve slot",
    "Official receipt, Gmail confirmation & QR pass"
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
              Step {step}/6
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

      
      {/* ── Order Confirmation Modal (Simple Yes/No Dialog) ────────── */}
      {showOrderConfirmModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in font-heading"
          onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-amber-300/80 my-auto animate-scale-up bg-white"
            style={{
              boxShadow: "0 25px 60px -15px rgba(44, 34, 22, 0.22), 0 0 35px rgba(212,175,55,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Golden top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

            {/* Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-neutral-950 tracking-tight">
                  Proceed to Payment?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-heading mt-1">
                  Are you sure you want to confirm your details and proceed to the 50% downpayment step?
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                disabled={isSubmitting}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body: Concise reservation overview */}
            <div className="p-6 space-y-4">
              {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs animate-shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-rose-950">Unable to Reserve Slot</strong>
                    <p className="mt-0.5 text-rose-800 leading-relaxed">{validationError}</p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-heading">Service &amp; Set</span>
                  <span className="font-bold text-neutral-900 font-heading text-right">
                    {selectedService?.name || "Senior High Packages and Sets"} — {selectedTier?.name || "Set A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-heading">Schedule</span>
                  <span className="font-bold text-neutral-900 font-heading text-right">
                    {formatTextualDate(eventDate)} • {formatSessionTime(preferredTime)}
                  </span>
                </div>
                <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center">
                  <span className="text-neutral-600 font-bold font-heading">Total Amount</span>
                  <span className="font-extrabold text-amber-950 text-base font-heading">
                    {formattedTotal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-800 font-bold font-heading">50% Down Payment Due</span>
                  <span className="font-extrabold text-gold text-base font-heading">
                    {formattedDownPayment}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions: Simple Yes or No */}
            <div className="p-4 sm:p-5 px-6 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOrderConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs sm:text-sm font-bold font-heading transition-all shadow-2xs cursor-pointer"
              >
                No, Go Back
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOrderConfirmModal(false);
                  setStep(6);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-heading font-black text-xs sm:text-sm h-10 sm:h-11 px-6 rounded-xl shadow-md shadow-gold/25 hover:shadow-gold/45 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <CheckCircle size={16} className="stroke-[2.5]" /> Yes, Proceed to Payment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Payment Security Verification (OTP) Modal ── */}
      {showPaymentOtpModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-heading"
          onClick={() => !isSendingPaymentOtp && setShowPaymentOtpModal(false)}
        >
          <div
            className="relative w-full max-w-[440px] sm:max-w-[460px] rounded-[32px] bg-[#fffdfa] border border-[#eee7dc] shadow-2xl overflow-hidden font-heading text-[#1a1714] my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setShowPaymentOtpModal(false)}
              disabled={isSendingPaymentOtp}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full border border-[#e8dfd3] bg-[#fbf9f5] hover:bg-[#f2ece2] text-[#8c8275] hover:text-[#1a1714] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 z-10"
              title="Close"
            >
              <X size={15} />
            </button>

            {/* Modal Content */}
            <div className="p-6 sm:p-7 pt-7 sm:pt-8 space-y-4 text-center">
              {/* Golden Center Lock Squircle */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#f2dfbe] via-[#e2be82] to-[#caa061] flex items-center justify-center mx-auto shadow-md shadow-[#caa061]/25">
                <Lock size={22} className="text-[#1a1714]" strokeWidth={2.4} />
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="font-serif text-2xl sm:text-[28px] font-bold text-[#1a1714] tracking-tight">
                  Payment Authorization
                </h2>
                <p className="text-xs text-[#78716c] mt-1">
                  Enter the 6-digit security code sent to
                </p>

                <div className="flex items-center justify-center mt-1.5">
                  {isEditingTargetOtpEmail ? (
                    <div className="flex items-center gap-1.5 max-w-full">
                      <input
                        type="email"
                        value={editTargetOtpEmailInput}
                        onChange={(e) => setEditTargetOtpEmailInput(e.target.value)}
                        className="px-3 py-1 rounded-full bg-white border border-[#c69a53] text-xs text-[#1a1714] outline-none font-sans"
                        placeholder="Enter your email"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleUpdateOtpEmailAndResend}
                        className="px-2.5 py-1 rounded-full bg-[#c69a53] hover:bg-[#b58842] text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTargetOtpEmail(false)}
                        className="text-xs text-[#8c8275] hover:text-[#1a1714] px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setIsEditingTargetOtpEmail(true);
                        setEditTargetOtpEmailInput(targetOtpEmail || participantEmail || customerProfile?.email || profile?.email || user?.email || "");
                      }}
                      title="Click to edit recipient email"
                      className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#fbf8f2] hover:bg-[#f5ede0] border border-[#e8dfd3] hover:border-[#c69a53]/50 text-xs font-semibold text-[#1a1714] shadow-2xs transition-all cursor-pointer group"
                    >
                      <span className="truncate max-w-[280px]">
                        {targetOtpEmail || participantEmail || customerProfile?.email || profile?.email || user?.email || "your email"}
                      </span>
                      <Pencil size={10} className="text-[#a89e90] group-hover:text-[#c69a53] shrink-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Photoshoot Package & Set Details Card */}
              <div className="p-4 sm:p-4.5 rounded-2xl bg-[#faf7f2] border border-[#ece4d6] flex items-center justify-between text-left mt-3 gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-serif font-bold text-base sm:text-lg text-[#1a1714] block leading-snug">
                    {selectedService?.name || "Photoshoot Session"}
                  </span>
                  {selectedTier?.name && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-[#f0e8dc] text-[#78613d] text-xs font-semibold font-heading">
                      {selectedTier.name}
                    </span>
                  )}
                </div>

                <div className="h-10 w-px bg-[#e4dcce] shrink-0" />

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8c8275] block text-right">
                    DOWNPAYMENT
                  </span>
                  <span
                    className="font-serif font-black text-xl sm:text-2xl text-[#b89560] block text-right mt-0.5"
                    style={{ fontVariantNumeric: "lining-nums tabular-nums" }}
                  >
                    ₱{downPaymentAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 6-Digit Individual OTP Input Boxes */}
              <div className="relative mt-5 px-1">
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  disabled={isVerifyingOtp}
                  value={enteredPaymentOtp}
                  onChange={(e) => {
                    if (isVerifyingOtp) return;
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setEnteredPaymentOtp(val);
                    setPaymentOtpError("");

                    // Automatically detect 6-digit code, verify authentically, and transition to gateway
                    if (val.length === 6) {
                      handleVerifyOtpAndProceedToPayment(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && enteredPaymentOtp.length === 6 && !isVerifyingOtp) {
                      handleVerifyOtpAndProceedToPayment(enteredPaymentOtp);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer disabled:cursor-not-allowed"
                  autoFocus
                />

                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const digit = enteredPaymentOtp[idx] || "";
                    const isActive = (enteredPaymentOtp.length === idx || (idx === 5 && enteredPaymentOtp.length === 6)) && !isVerifyingOtp;
                    return (
                      <div
                        key={idx}
                        className={`aspect-square h-12 sm:h-14 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl font-bold font-mono transition-all select-none ${
                          otpVerifyStage === "verified"
                            ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                            : otpVerifyStage === "checking"
                            ? "border-[#c69a53] bg-amber-50/40 text-[#1a1714] ring-2 ring-[#c69a53]/25 animate-pulse"
                            : digit
                            ? "border-[#c69a53] bg-white text-[#1a1714] shadow-xs"
                            : isActive
                            ? "border-[#c69a53] ring-2 ring-[#c69a53]/20 bg-white"
                            : "border-[#e7ded0] bg-[#faf8f5] text-[#b0a79a]"
                        }`}
                      >
                        {digit ? (
                          digit
                        ) : (
                          <span className="text-[#b8af9f] text-sm leading-none">•</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secure Entry Divider */}
              <div className="flex items-center justify-center gap-3 my-3">
                <div className="h-px bg-[#e8dfd3] flex-1 max-w-[70px]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a89e90]">
                  SECURE ENTRY
                </span>
                <div className="h-px bg-[#e8dfd3] flex-1 max-w-[70px]" />
              </div>

              {/* Resend Code Text */}
              <div className="text-xs text-[#78716c] text-center">
                <span>Didn&apos;t receive the email? </span>
                {paymentOtpCountdown > 0 ? (
                  <span className="text-[#a89e90] font-medium font-mono">
                    Resend in {paymentOtpCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResendPaymentOtp()}
                    disabled={isSendingPaymentOtp || isVerifyingOtp}
                    className="text-[#9e763b] hover:text-[#7d5c2a] font-semibold underline cursor-pointer disabled:opacity-40"
                  >
                    {isSendingPaymentOtp ? "Sending..." : "Resend code"}
                  </button>
                )}
              </div>

              {/* Error Message */}
              {paymentOtpError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 text-left animate-shake">
                  <AlertCircle size={15} className="shrink-0 text-amber-600" />
                  <span className="leading-tight">{paymentOtpError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 pb-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleVerifyOtpAndProceedToPayment(enteredPaymentOtp)}
                  disabled={enteredPaymentOtp.length < 6 || isSendingPaymentOtp || isVerifyingOtp}
                  className={`w-full h-12 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    otpVerifyStage === "verified"
                      ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 text-emerald-950 font-bold shadow-md shadow-emerald-500/25 cursor-wait"
                      : otpVerifyStage === "checking"
                      ? "bg-gradient-to-r from-[#d8b06e] via-[#c69a53] to-[#b3863f] text-neutral-950 font-bold opacity-90 cursor-wait"
                      : enteredPaymentOtp.length === 6 && !isSendingPaymentOtp
                      ? "bg-gradient-to-r from-[#d8b06e] via-[#c69a53] to-[#b3863f] hover:from-[#cb9f5a] hover:to-[#a27732] text-neutral-950 font-bold shadow-md shadow-[#c69a53]/25 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      : "bg-[#f2ece2] text-[#9c9489] border border-[#e8dfd3] cursor-not-allowed"
                  }`}
                >
                  {otpVerifyStage === "verified" ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-950 stroke-[2.5]" />
                      <span>Code verified! Initializing gateway...</span>
                    </>
                  ) : otpVerifyStage === "checking" ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-neutral-950" />
                      <span>Verifying security code...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} className="shrink-0" />
                      <span>Proceed to payment</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPaymentOtpModal(false)}
                  disabled={isVerifyingOtp || isSendingPaymentOtp}
                  className={`w-full h-11 rounded-full border border-[#ded5c7] bg-white hover:bg-[#faf7f2] text-xs font-semibold text-[#544e46] hover:text-[#1a1714] flex items-center justify-center transition-colors ${
                    isVerifyingOtp ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Interactive Maya Business & PayMongo Test Gateway Checkout Modal ── */}
      {showGatewayModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-heading"
          onClick={() => !isSubmitting && gatewayStep !== 'processing' && setShowGatewayModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-neutral-700 my-auto animate-scale-up bg-[#0f1117] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Test Sandbox Active Banner */}
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border-b border-amber-500/30 px-5 py-2.5 flex items-center justify-between text-xs text-amber-200">
              <span className="flex items-center gap-2 font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                SANDBOX TEST MODE ACTIVE
              </span>
              <span className="text-[10px] bg-amber-400/20 border border-amber-400/40 text-amber-200 px-2 py-0.5 rounded-full font-bold">
                Maya Business Rail
              </span>
            </div>

            {/* Gateway Top Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 ${
                  selectedPaymentGateway === 'gcash' ? 'bg-blue-600 text-white' :
                  selectedPaymentGateway === 'maya' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {selectedPaymentGateway === 'gcash' ? 'G' : selectedPaymentGateway === 'maya' ? 'm' : <Building size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {selectedPaymentGateway === 'gcash' ? 'GCash via Maya Gateway' :
                       selectedPaymentGateway === 'maya' ? 'Maya Business Direct' : 'Online Banking / InstaPay'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      Secure
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    BSP Supervised • 256-Bit SSL Encrypted Rail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayModal(false)}
                disabled={gatewayStep === 'processing' || isSubmitting}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Destination Merchant Card (PayMongo / Maya Business Standard) */}
            <div className="px-5 sm:px-6 pt-4 pb-2">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 text-[11px] block">PAY TO MERCHANT:</span>
                  <strong className="text-sm font-extrabold text-white">E-KODAK STUDIOS PH</strong>
                  <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
                    Merchant Number: 0928-888-5632
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 text-[11px] block">DOWNPAYMENT DUE:</span>
                  <span className="text-xl font-black text-amber-400">
                    ₱{downPaymentAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400 block">50% Reservation</span>
                </div>
              </div>
            </div>

            {/* Gateway Step 1: Input Payer Mobile/Account */}
            {gatewayStep === 'input' && (
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    {selectedPaymentGateway === 'bank_transfer' ? 'Payer Bank / Mobile Number' : 'Your Mobile Number'}
                  </label>
                  <input
                    type="text"
                    value={gatewayPhone}
                    onChange={(e) => {
                      setGatewayPhone(e.target.value);
                      setGatewayError("");
                    }}
                    placeholder="09XX-XXX-XXXX"
                    className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-base focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                  />
                </div>

                {/* Quick Auto-Fill Test Account Shortcut */}
                <button
                  type="button"
                  onClick={() => {
                    setGatewayPhone("0917-888-0123");
                    setGatewayError("");
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <span>⚡ <strong>Quick Test Account:</strong> 0917-888-0123</span>
                  <span className="text-[10px] font-bold bg-amber-400/30 px-2 py-0.5 rounded-md">Auto-Fill</span>
                </button>

                {gatewayError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                    <AlertCircle size={14} /> {gatewayError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!gatewayPhone.trim()) {
                        setGatewayError("Please enter your mobile or account number to proceed.");
                        return;
                      }
                      setGatewayStep('otp');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    Next: Send Authentication Code →
                  </button>
                </div>
              </div>
            )}

            {/* Gateway Step 2: OTP Verification */}
            {gatewayStep === 'otp' && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold text-white">Enter 6-Digit Authentication Code</h4>
                  <p className="text-xs text-neutral-400">
                    An SMS with an authorization code was sent to <strong className="text-white">{gatewayPhone}</strong> to authorize payment to <strong className="text-amber-400">E-KODAK STUDIOS PH</strong>.
                  </p>
                </div>

                {/* Test Mode OTP Badge & Auto Fill */}
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div>
                    <span className="font-bold block text-white">Sandbox Test OTP:</span>
                    <span className="font-mono text-base font-black text-amber-300 tracking-widest">123456</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayOtp("123456");
                      setGatewayError("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-xs cursor-pointer"
                  >
                    ⚡ Fill 123456
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={gatewayOtp}
                    onChange={(e) => {
                      setGatewayOtp(e.target.value.replace(/[^0-9]/g, ''));
                      setGatewayError("");
                    }}
                    placeholder="123456"
                    className="w-full h-14 text-center tracking-[0.4em] font-mono text-2xl font-black rounded-2xl bg-white/10 border border-white/20 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 outline-none"
                  />
                </div>

                {gatewayError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 font-medium justify-center">
                    <AlertCircle size={14} /> {gatewayError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setGatewayStep('input')}
                    className="px-4 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (gatewayOtp.trim().length < 6) {
                        setGatewayError("Please enter the complete 6-digit test code (123456).");
                        return;
                      }
                      setGatewayStep('confirm');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    Verify Code & Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Gateway Step 3: Authorization & Deduction Confirmation */}
            {gatewayStep === 'confirm' && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Debiting Account:</span>
                    <span className="font-mono font-bold text-white">{gatewayPhone}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Simulated Wallet Balance:</span>
                    <span className="font-mono text-emerald-400 font-bold">₱5,000.00</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400 pt-2 border-t border-white/10">
                    <span>Crediting Merchant:</span>
                    <span className="font-bold text-white">E-KODAK STUDIOS PH</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Merchant Number:</span>
                    <span className="font-mono text-emerald-400 font-bold">0928-888-5632</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Service / Set:</span>
                    <span className="font-semibold text-white">{selectedService?.name || 'Senior High'} — {selectedTier?.name || 'Set A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Gateway Convenience Fee:</span>
                    <span className="font-bold text-emerald-400">₱0.00 (Waived)</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="font-bold text-white text-sm">Total Deducted to Merchant:</span>
                    <span className="font-black text-amber-400 text-lg">₱{downPaymentAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setGatewayStep('otp')}
                    className="px-4 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayStep('processing');
                      setGatewayClearingStage(1);
                      const generatedTxn = `PAY-MAYA-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                      const generatedOr = `OR-2026-${Math.floor(10000 + Math.random() * 90000)}`;
                      setGatewayTxnRef(generatedTxn);
                      setGatewayOrNumber(generatedOr);

                      setTimeout(() => setGatewayClearingStage(2), 500);
                      setTimeout(() => setGatewayClearingStage(3), 1000);
                      setTimeout(() => {
                        setGatewayStep('success');
                      }, 1500);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center gap-2"
                  >
                    <Lock size={15} /> Authorize & Pay ₱{downPaymentAmount.toLocaleString()}
                  </button>
                </div>
              </div>
            )}

            {/* Gateway Step 4: Live Processing Animation */}
            {gatewayStep === 'processing' && (
              <div className="p-8 sm:p-10 text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
                  <Lock size={22} className="text-amber-400 absolute" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-lg font-extrabold text-white">Authorizing with Maya Business Rail</h4>
                  <p className="text-xs text-neutral-400">Please do not refresh or close this window.</p>
                </div>

                <div className="max-w-xs mx-auto space-y-2 text-left text-xs text-neutral-300 font-mono">
                  <div className={`flex items-center gap-2 ${gatewayClearingStage >= 1 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    <CheckCircle2 size={14} className={gatewayClearingStage >= 1 ? 'text-emerald-400' : 'text-neutral-600'} />
                    <span>Verifying payer wallet token...</span>
                  </div>
                  <div className={`flex items-center gap-2 ${gatewayClearingStage >= 2 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    <CheckCircle2 size={14} className={gatewayClearingStage >= 2 ? 'text-emerald-400' : 'text-neutral-600'} />
                    <span>Crediting E-KODAK STUDIOS PH (0928-888-5632)...</span>
                  </div>
                  <div className={`flex items-center gap-2 ${gatewayClearingStage >= 3 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    <CheckCircle2 size={14} className={gatewayClearingStage >= 3 ? 'text-emerald-400' : 'text-neutral-600'} />
                    <span>Generating official receipt & locking schedule...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gateway Step 5: Gateway Success */}
            {gatewayStep === 'success' && (
              <div className="p-6 sm:p-8 text-center space-y-5 animate-scale-up">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/30">
                    Payment Cleared & Confirmed
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    ₱{downPaymentAmount.toLocaleString()} Sent to Merchant
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Recipient: E-KODAK STUDIOS PH (0928-888-5632)
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1 text-xs font-mono text-left max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">TXN REFERENCE:</span>
                    <span className="text-amber-400 font-bold">{gatewayTxnRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">OFFICIAL RECEIPT:</span>
                    <span className="text-white font-bold">{gatewayOrNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">CHANNEL:</span>
                    <span className="text-emerald-400 font-bold">{selectedPaymentGateway.toUpperCase()} via Maya Business</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setShowGatewayModal(false);
                    await handleCompleteBookingAndPayment(gatewayTxnRef, gatewayOrNumber);
                  }}
                  className="w-full max-w-sm mx-auto py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Finalizing Studio Reservation...</>
                  ) : (
                    <><CheckCircle size={16} /> View Camera-Ready Pass &amp; Official Receipt →</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Authentic Thermal Studio Official Receipt Slip Modal ── */}
      {showReceiptModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setShowReceiptModal(false)}
        >
          <div 
            className="relative w-full max-w-[380px] sm:max-w-[410px] bg-[#fffdf9] text-neutral-900 border border-neutral-300 shadow-2xl font-mono mx-auto my-auto overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Serrated Sawtooth Edge */}
            <div className="w-full h-3 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
              <svg className="w-full h-3" preserveAspectRatio="none" viewBox="0 0 100 10">
                <polygon points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" fill="currentColor" />
              </svg>
            </div>

            <div className="p-5 sm:p-7 space-y-3.5">
              {/* Close X (Top Right corner) */}
              <div className="flex justify-end print:hidden -mt-1 -mr-1">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  aria-label="Close receipt"
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Studio Header & Registration */}
              <div className="text-center pt-1 pb-3 border-b-2 border-dashed border-neutral-400">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-amber-700">
                  <Camera size={18} />
                  <span className="font-heading font-black tracking-widest text-base text-neutral-950">E-KODAK STUDIOS</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Official Photography Receipt</p>
                <p className="text-[9px] text-neutral-500 mt-0.5">TIN: 402-991-824-000 • POS STATION 01</p>
                <p className="text-[9px] text-neutral-600 font-medium">311 Rizal Street, City of Naga, Cebu</p>
                <p className="text-[9px] text-emerald-800 font-bold mt-0.5">Maya Business Merchant: 0928-888-5632</p>
              </div>

              {/* Receipt Metadata */}
              <div className="py-1.5 space-y-1 text-[11px] border-b border-dashed border-neutral-300 text-neutral-800">
                <div className="flex justify-between">
                  <span className="text-neutral-500">RECEIPT NO:</span>
                  <span className="font-bold text-neutral-950 font-mono">
                    {paymentReceiptData?.receiptNumber || gatewayOrNumber || 'OR-2026-92841'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">DATE:</span>
                  <span>
                    {new Date(paymentReceiptData?.issuedAt || Date.now()).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">BOOKING REF:</span>
                  <span className="font-bold text-amber-700">
                    #{paymentReceiptData?.bookingNumber || bookingResult?.booking_number || 'BK-2026-00001'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">CLIENT:</span>
                  <span className="font-bold truncate max-w-[200px] text-neutral-950">
                    {paymentReceiptData?.clientName || (participantFirstName ? `${participantFirstName} ${participantLastName}` : 'Customer')}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-500 shrink-0">VENUE / PLACE:</span>
                  <span className="font-semibold text-right max-w-[200px] text-neutral-950 leading-tight">
                    {paymentReceiptData?.location || resolvedLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">SESSION DATE:</span>
                  <span className="truncate max-w-[200px]">
                    {paymentReceiptData?.eventDate || `${formatTextualDate(eventDate)} • ${formatSessionTime(preferredTime)}`}
                  </span>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="py-1.5 space-y-1.5 border-b border-dashed border-neutral-300 text-[11px]">
                <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase pb-1 border-b border-neutral-200">
                  <span>ITEM DESCRIPTION</span>
                  <span>AMOUNT (PHP)</span>
                </div>
                <div className="flex justify-between items-start pt-1">
                  <div className="pr-2">
                    <span className="font-bold block text-neutral-950">
                      {paymentReceiptData?.packageName || selectedService?.name || 'Photoshoot Package'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Tier: {paymentReceiptData?.tierName || selectedTier?.name || 'Set A'}
                    </span>
                  </div>
                  <span className="font-bold text-neutral-950 shrink-0">
                    ₱{(paymentReceiptData?.total || totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Ledger & Balances */}
              <div className="py-1.5 space-y-1.5 text-[11px] border-b-2 border-dashed border-neutral-400">
                <div className="flex justify-between text-neutral-800">
                  <span className="text-neutral-500">PACKAGE TOTAL:</span>
                  <span className="font-bold text-neutral-950">
                    ₱{(paymentReceiptData?.total || totalAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-amber-900">
                  <span className="text-neutral-500">50% DOWNPAYMENT:</span>
                  <span className="font-semibold">
                    ₱{(paymentReceiptData?.downpaymentPrice || downPaymentAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span className="font-semibold">AMOUNT PAID:</span>
                  <span className="font-bold">
                    ₱{(paymentReceiptData?.downPaid || downPaymentAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-black pt-1.5 border-t border-neutral-300 text-neutral-950">
                  <span>BALANCE REMAINING:</span>
                  <span className="text-amber-800">
                    ₱{(paymentReceiptData?.remaining || remainingBalance).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="py-1 space-y-1 border-b border-dashed border-neutral-300 text-[10px]">
                <span className="text-neutral-500 font-bold uppercase block mb-1">TRANSACTION BREAKDOWN:</span>
                <div className="flex justify-between text-neutral-700">
                  <span>
                    {selectedPaymentGateway.toUpperCase()} ({paymentReceiptData?.payments?.[0]?.reference_number || gatewayTxnRef || paymentReferenceNumber || 'PAY-MAYA-2026'})
                  </span>
                  <span className="font-bold text-neutral-950">₱{downPaymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[9px]">
                  <span>Receiver: E-KODAK STUDIOS PH</span>
                  <span>Tel: 0928-888-5632</span>
                </div>
              </div>

              {/* Official Stamp & Simulated Barcode */}
              <div className="py-2 text-center space-y-2.5">
                <div className="inline-block border-2 border-red-600 text-red-600 px-3 py-1 font-black text-[10.5px] uppercase tracking-widest rotate-[-3deg] shadow-2xs">
                  ★ OFFICIAL RECEIPT · VERIFIED ★
                </div>

                <div className="flex flex-col items-center pt-1">
                  <div className="flex items-center gap-[2px] h-8">
                    {[2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2,4,1,3,2,1,4,1,2,3,1,2].map((w, idx) => (
                      <div key={idx} className="h-full bg-neutral-900" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="text-[8.5px] text-neutral-500 tracking-[0.25em] mt-1 font-mono">
                    * {paymentReceiptData?.receiptNumber || gatewayOrNumber || 'OR-2026-92841'} *
                  </span>
                </div>

                <p className="text-[9.5px] text-neutral-500 uppercase tracking-wider font-semibold">
                  THANK YOU FOR CHOOSING E-KODAK!
                </p>
                <p className="text-[8.5px] text-neutral-400">
                  Retain this receipt for studio check-in.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 pb-1 flex items-center justify-center gap-2 border-t border-dashed border-neutral-300 print:hidden font-body">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Bottom Serrated Sawtooth Edge */}
            <div className="w-full h-3 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
              <svg className="w-full h-3" preserveAspectRatio="none" viewBox="0 0 100 10">
                <polygon points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>,
        document.body
      )}

      
      {/* ── Package Beneficiary / Recipient Selection Modal (Triggered After Selecting Package) ── */}
      {showBookingForModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setShowBookingForModal(false)}
        >
          <div
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
                    Booking Beneficiary
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
                    Booking for your son, daughter, friend, relative, or client. You will choose their package set in Step 2 and enter their details in Step 3.
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
                      School Section (Class Adviser)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-body mt-1 leading-snug">
                    As the class adviser, you only select the package. Students will order their own individual package sets (Set A–D) via your uploaded section masterlist.
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
                  setShowBookingForModal(false);
                  setValidationError("");
                  if (bookingFor === "school_section") {
                    // Adviser only chooses package. Multiple students order their own sets in masterlist.
                    setStep(3);
                  } else {
                    // For myself or someone else: proceed to Step 2 to choose their set
                    if (pendingTierToConfirm) {
                      setSelectedTier(pendingTierToConfirm);
                      setPendingTierToConfirm(null);
                      setStep(3);
                    } else {
                      setStep(2);
                    }
                  }
                }}
                className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <span>Confirm &amp; Proceed</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

              {/* 5-Segment Progress Track */}
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

                      {/* Curated Package Cards: Centered & Compact, Perfectly Upright */}
                      <div 
                        onMouseLeave={() => setHoveredServiceId(null)}
                        className={`relative z-10 w-full mx-auto pt-2 pb-2 px-2 ${
                          services.length <= 2
                            ? "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-[420px] sm:max-w-[840px] lg:max-w-[900px] justify-center"
                            : services.length === 3
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[960px] justify-center"
                            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4 max-w-[1140px]"
                        }`}
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
                                className={`relative w-full h-[400px] sm:h-[430px] lg:h-[460px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 border-2 ${
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
                                <div className="relative z-20 p-5 sm:p-6 flex flex-col justify-end">
                                  <div>
                                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-wide leading-snug drop-shadow-md">
                                      {svc.name}
                                    </h3>
                                  </div>

                                  {/* Starting Price & Proceed Action */}
                                  <div className="mt-3.5 pt-3.5 border-t border-white/20 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-neutral-300 block whitespace-nowrap">
                                        Starting at
                                      </span>
                                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-gold drop-shadow-sm whitespace-nowrap">
                                        ₱{minPrice.toLocaleString()}
                                      </span>
                                    </div>

                                    <motion.button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectPackage(svc);
                                      }}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 hover:from-amber-300 hover:to-gold text-neutral-950 font-bold px-3.5 sm:px-4 py-2 rounded-full text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border border-white/40 shrink-0 shadow-md group"
                                      title="Select Package"
                                    >
                                      <span className="font-bold text-[11px] whitespace-nowrap">
                                        {isSelected ? "Selected" : "Select"}
                                      </span>
                                      <div className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-xs shrink-0">
                                        {isSelected ? (
                                          <Check size={11} className="stroke-[3] text-gold" />
                                        ) : (
                                          <ArrowRight size={11} className="stroke-[2.5]" />
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

                  {bookingFor === "school_section" ? (
                    <div className="max-w-lg mx-auto text-center p-8 sm:p-10 rounded-3xl bg-amber-50/70 border border-gold/40 shadow-sm space-y-4 my-auto">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 flex items-center justify-center mx-auto shadow-md ring-4 ring-gold/20">
                        <School size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-heading font-extrabold text-xl text-neutral-950">
                          School Section Masterlist Active
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
                          As the class adviser, you only select the school package. Individual package sets (Set A, Set B, Set C, or Set D) are chosen per-student via your uploaded section masterlist.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:border-gold bg-white text-xs font-bold text-neutral-800 transition-colors cursor-pointer"
                        >
                          Change Package
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider shadow-md shadow-gold/20 flex items-center gap-2 cursor-pointer"
                        >
                          <span>Proceed to Section Masterlist (Step 3)</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : !selectedService?.tiers || selectedService.tiers.length === 0 ? (
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
                      {/* Curated Set Cards: Centered & Balanced Grid */}
                      <div
                        ref={tierScrollRef}
                        onMouseLeave={() => setHoveredTierName(null)}
                        className={`relative z-10 w-full mx-auto pt-2 pb-2 px-2 ${
                          selectedService.tiers.length <= 2
                            ? "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-[420px] sm:max-w-[840px] lg:max-w-[900px] justify-center"
                            : selectedService.tiers.length === 3
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[960px] justify-center"
                            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4 max-w-[1140px]"
                        }`}
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
                                setSelectedTier({ ...tier, _idx: idx });
                                setValidationError("");
                                setStep(3);
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
                                className={`relative w-full h-[400px] sm:h-[430px] lg:h-[460px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 border-2 ${
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
                                        setSelectedTier({ ...tier, _idx: idx });
                                        setValidationError("");
                                        setStep(3);
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
                const step4CoverImg = selectedTier?.cover_image || selectedService?.coverImage || selectedService?.cover_image || SERVICE_COVER_MAP[selectedService?.slug] || "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop";

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
                        packageName={selectedService?.name || "Senior High Packages"}
                        onMasterlistChange={(data) => {
                          setMasterlistData(data);
                          if (data?.school) setStudentSchool(data.school);
                          if (data?.section) setStudentSection(data.section);
                          if (data?.batch) setStudentBatch(data.batch);
                          if (data?.strand) {
                            setSelectedShsStrand(data.strand);
                            setStudentCourse(data.strand);
                          }
                        }}
                        availableTiers={(selectedService?.tiers || []).map((t) => t.name)}
                        schoolName={studentSchool}
                        onSchoolNameChange={setStudentSchool}
                        sectionName={studentSection}
                        onSectionNameChange={setStudentSection}
                      />
                    )}

                    {/* ── CASE 2: FOR MYSELF (50% SELECTED PACKAGE + 50% INCLUSIONS) ── */}
                    {bookingFor === "myself" && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch w-full">
                        {/* ── LEFT HALF: SELECTED PACKAGE CARD (50%) ── */}
                        <div
                          className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold ring-2 ring-gold/40 flex flex-col justify-between min-h-[380px]"
                        >
                          {/* Full Cover Image - Whole Photo */}
                          <img
                            src={step4CoverImg}
                            alt={selectedTier?.name || selectedService?.name || "Selected Package"}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {/* Smooth vignette gradient (photo stays whole without solid black bottom) */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10 pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10 pointer-events-none" />

                          {/* Top: Edit button to change set */}
                          <div className="relative z-20 p-5 sm:p-6 flex items-start justify-end">
                            <button
                              type="button"
                              onClick={() => setStep(2)}
                              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-neutral-300 hover:text-gold backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                              title="Change package set"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>

                          {/* Bottom Area: Package Set and Price Aligned on the Same Row with Generous Breathing Room */}
                          <div className="relative z-20 px-6 sm:px-8 pb-9 sm:pb-11 pt-4 flex items-end justify-between gap-5">
                            <div className="min-w-0">
                              <span className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-amber-300 font-bold font-mono block mb-2 drop-shadow-sm">
                                Package Set
                              </span>
                              <h3 className="font-heading font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight drop-shadow-lg tracking-tight">
                                {selectedTier?.name || "Selected Set"}
                              </h3>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-[0.22em] text-amber-300 block leading-none mb-2 font-mono drop-shadow-sm">
                                Price
                              </span>
                              <span className="font-heading font-black text-gold text-2xl sm:text-3xl lg:text-4xl leading-tight block drop-shadow-lg">
                                {selectedTier?.price || (selectedService?.base_price ? `₱${Number(selectedService.base_price).toLocaleString()}` : "Standard")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ── RIGHT HALF: WHAT'S INCLUDED CARD (50%) ── */}
                        <div
                          className="relative rounded-3xl overflow-hidden shadow-2xl border border-amber-300/60 flex flex-col justify-between min-h-[380px]"
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
                                      {formatPieceQuantity(p.quantity)}
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
                    </div>
                  )}

                    {/* ── CASE 3: FOR SOMEONE ELSE (NON-ACADEMIC STANDALONE FALLBACK) ── */}
                    {!isAcademicService && bookingFor === "someone_else" && (
                      <div className="p-5 sm:p-7 rounded-3xl bg-white border border-amber-300/80 shadow-2xs space-y-4 animate-fade-in font-heading">
                        {/* Form Header: Booking for Someone Else */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300/80 shadow-2xs flex items-start sm:items-center gap-3.5 sm:gap-4 font-heading">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100/90 border border-emerald-300/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                            <ShieldCheck size={22} className="stroke-[2.2]" />
                          </div>
                          <div className="min-w-0 flex-1 leading-relaxed text-xs sm:text-sm text-neutral-700 font-heading">
                            <span className="font-bold text-primary text-sm sm:text-base mr-1.5">
                              Booking for Someone Else:
                            </span>{" "}
                            You are signed in as <strong className="text-primary font-bold">{[activeProfile?.first_name || user?.user_metadata?.first_name, activeProfile?.last_name || user?.user_metadata?.last_name].filter(Boolean).join(" ") || "Account Owner"}</strong>. You will manage the booking and payments, while all photoshoot details and records will be prepared for <strong className="text-gold font-bold">{[participantFirstName, participantLastName].filter(Boolean).join(" ") || "the participant"}</strong>.
                          </div>
                        </div>

                        <div className="border-b border-amber-200/60 pb-3">
                          <h5 className="font-heading font-bold text-base text-amber-950">
                            Participant Personal Information
                          </h5>
                          <p className="text-xs text-neutral-600 font-heading mt-0.5">
                            Enter the information of the person who will be attending this photoshoot.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                              placeholder="Jude Lawrence"
                              required
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-heading text-neutral-900 font-normal placeholder:font-heading outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                              placeholder="Marie"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                              placeholder="Sinugbuhan"
                              required
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-heading text-neutral-900 font-normal placeholder:font-heading outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Participant Phone
                            </label>
                            <input
                              type="tel"
                              value={participantPhone}
                              onChange={(e) => setParticipantPhone(e.target.value)}
                              placeholder="09123456789"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Participant Email
                            </label>
                            <input
                              type="email"
                              value={participantEmail}
                              onChange={(e) => setParticipantEmail(e.target.value)}
                              placeholder="participant@gmail.com"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs font-medium text-primary outline-none transition-all shadow-2xs"
                            />
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
                            <span className="font-heading text-neutral-900 font-normal placeholder:font-heading truncate text-xs">
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
                            <span className="font-heading text-neutral-900 font-normal placeholder:font-heading truncate text-xs">
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
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                placeholder="First Name"
                                required
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-body font-normal outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Last Name
                              </label>
                              <input
                                type="text"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                placeholder="Last Name"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-body font-normal outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder=""
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-body font-normal outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
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
                    <div className="p-6 sm:p-8 lg:p-9 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-8 font-heading">
                      {/* Form Header */}
                      {bookingFor === "someone_else" ? (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300/80 shadow-2xs flex items-start sm:items-center gap-3.5 sm:gap-4 font-heading">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100/90 border border-emerald-300/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                            <ShieldCheck size={22} className="stroke-[2.2]" />
                          </div>
                          <div className="min-w-0 flex-1 leading-relaxed text-xs sm:text-sm text-neutral-700 font-heading">
                            <span className="font-bold text-primary text-sm sm:text-base mr-1.5">
                              Booking for Someone Else:
                            </span>{" "}
                            You are signed in as <strong className="text-primary font-bold">{[activeProfile?.first_name || user?.user_metadata?.first_name, activeProfile?.last_name || user?.user_metadata?.last_name].filter(Boolean).join(" ") || "Account Owner"}</strong>. You will manage the booking and payments, while all photoshoot details and academic records will be prepared for <strong className="text-gold font-bold">{[participantFirstName, participantLastName].filter(Boolean).join(" ") || "the participant"}</strong>.
                          </div>
                        </div>
                      ) : (
                        <div className="border-b border-neutral-100 pb-4">
                          <h4 className="font-heading font-bold text-primary text-base sm:text-lg leading-tight">
                            {isSeniorHighService ? "Senior High Academic Registration" : "College & University Registration"}
                          </h4>
                        </div>
                      )}

                      {/* ── 1. PARTICIPANT OR STUDENT DETAILS ── */}
                      {bookingFor === "someone_else" ? (
                        /* ── 1. PARTICIPANT PERSONAL INFORMATION (FOR SOMEONE ELSE) ── */
                        <div className="space-y-4">
                          <div className="border-b border-amber-200/60 pb-3">
                            <h5 className="font-heading font-bold text-base text-amber-950">
                              1. Participant Personal Information
                            </h5>
                            <p className="text-xs text-neutral-600 font-heading mt-0.5">
                              Enter the information of the person who will be attending this photoshoot.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Participant First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={participantFirstName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParticipantFirstName(val);
                                  setStudentFirstName(val);
                                }}
                                placeholder="Jude Lawrence"
                                required
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-heading text-neutral-900 font-normal placeholder:font-heading outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Middle Name
                              </label>
                              <input
                                type="text"
                                value={participantMiddleName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParticipantMiddleName(val);
                                  setStudentMiddleName(val);
                                }}
                                placeholder="Marie"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-medium text-primary outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Participant Last Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={participantLastName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParticipantLastName(val);
                                  setStudentLastName(val);
                                }}
                                placeholder="Sinugbuhan"
                                required
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-heading text-neutral-900 font-normal placeholder:font-heading outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Relationship to You
                              </label>
                              <select
                                value={participantRelationship}
                                onChange={(e) => setParticipantRelationship(e.target.value)}
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-medium text-primary outline-none transition-all shadow-2xs cursor-pointer"
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
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Participant Phone
                              </label>
                              <input
                                type="tel"
                                value={participantPhone}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParticipantPhone(val);
                                  setEditPhone(val);
                                }}
                                placeholder="09123456789"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-medium text-primary outline-none transition-all shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Participant Email
                              </label>
                              <input
                                type="email"
                                value={participantEmail}
                                onChange={(e) => setParticipantEmail(e.target.value)}
                                placeholder="participant@gmail.com"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm font-medium text-primary outline-none transition-all shadow-2xs"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── 1. STUDENT / GRADUATE DETAILS (FOR MYSELF) ── */
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-heading text-base sm:text-lg font-bold text-primary tracking-tight">
                              1. Student / Graduate Information
                            </h5>
                          </div>

                          {/* Name Fields (Row 1): Student First Name, Middle Name, Last Name */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Student First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={studentFirstName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStudentFirstName(val);
                                  setParticipantFirstName(val);
                                }}
                                placeholder="First Name"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-heading font-normal outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Middle Name
                              </label>
                              <input
                                type="text"
                                value={studentMiddleName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStudentMiddleName(val);
                                  setParticipantMiddleName(val);
                                }}
                                placeholder="Middle Name / Initial"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-heading font-normal outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Student Last Name
                              </label>
                              <input
                                type="text"
                                value={studentLastName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStudentLastName(val);
                                  setParticipantLastName(val);
                                }}
                                placeholder="Last Name"
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-heading font-normal outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                              />
                            </div>
                          </div>

                          {/* Contact Fields (Row 2): Phone Number & Verified Account Email */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditPhone(val);
                                  setParticipantPhone(val);
                                }}
                                placeholder=""
                                className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-neutral-900 font-heading font-normal outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2 flex items-center justify-between">
                                <span>Email Address</span>
                                <span className="text-xs text-emerald-600 font-heading font-medium">Verified</span>
                              </label>
                              <input
                                type="email"
                                value={activeProfile?.email || user?.email || ""}
                                readOnly
                                disabled
                                className="w-full h-11 px-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm font-heading text-neutral-600 outline-none shadow-2xs cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section Divider */}
                      <div className="border-t border-neutral-100/90 my-7 sm:my-8" />

                      {/* ── 2. NAME OF THE SCHOOL & ADDRESS ─────────────────────────── */}
                      <div className="space-y-4">
                        <h5 className="font-heading text-base sm:text-lg font-bold text-primary tracking-tight">
                          2. Name of the School &amp; Campus Address
                        </h5>

                        {isSeniorHighService ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                High School Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={studentSchool}
                                onChange={e => setStudentSchool(e.target.value)}
                                placeholder="Cebu City National Science High School"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                School Campus / Address
                              </label>
                              <input
                                type="text"
                                value={studentSchoolAddress}
                                onChange={e => setStudentSchoolAddress(e.target.value)}
                                placeholder="Osmeña Boulevard, Capitol Site, Cebu City"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:font-heading placeholder:text-neutral-400"
                              />
                            </div>
                          </div>
                        ) : (
                          /* College / University */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div ref={univContainerRef} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                                  placeholder="Type university (CTU Naga, USC, CIT-U, UC)..."
                                  className="w-full h-11 px-3.5 pr-9 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none text-neutral-900 shadow-2xs transition-all placeholder:font-heading placeholder:text-neutral-400"
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
                                        <p className="text-[11px] text-neutral-500 font-heading line-clamp-1 mt-0.5 flex items-center gap-1">
                                          
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
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Campus / Branch Address
                              </label>
                              <input
                                  type="text"
                                  value={studentSchoolAddress}
                                  onChange={e => setStudentSchoolAddress(e.target.value)}
                                  placeholder="Main Campus, Gorordo Avenue, Lahug, Cebu City"
                                  className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400"
                                />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section Divider */}
                      <div className="border-t border-neutral-100/90 my-7 sm:my-8" />

                      {/* ── 3. ACADEMIC STRAND & BATCHING SECTION ───────────────────── */}
                      <div className="space-y-4">
                        <h5 className="font-heading text-base sm:text-lg font-bold text-primary tracking-tight">
                          {isSeniorHighService ? "3. Academic Strand & Batching" : "3. Degree Program & Batching"}
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Strand or Degree Program */}
                          {isSeniorHighService ? (
                            <div>
                              <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                Senior High Academic Strand <span className="text-red-500">*</span>
                              </label>
                              <StudioDropdown
                                className="w-full block"
                                triggerClassName="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none shadow-2xs"
                                value={selectedShsStrand}
                                onChange={val => setSelectedShsStrand(val)}
                                options={[
                                  ...SHS_STRANDS.map(s => ({
                                    value: s.code,
                                    label: s.name,
                                  })),
                                  { value: "OTHERS", label: "Others" }
                                ]}
                                placeholder="Select Academic Strand"
                              />

                              {selectedShsStrand === "OTHERS" && (
                                <div className="mt-3.5 space-y-3 animate-fade-in">
                                  <div>
                                    <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                                      Specify Academic Strand <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={customShsStrand}
                                      onChange={e => setCustomShsStrand(e.target.value)}
                                      className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs"
                                    />
                                  </div>

                                  {/* Dynamic custom fields */}
                                  {additionalCustomFields.map((field, idx) => (
                                    <div key={field.id || idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                                      <div>
                                        <label className="block text-xs font-heading font-bold text-neutral-700 mb-1">
                                          Custom Field Name
                                        </label>
                                        <input
                                          type="text"
                                          value={field.label}
                                          onChange={e => {
                                            const updated = [...additionalCustomFields];
                                            updated[idx].label = e.target.value;
                                            setAdditionalCustomFields(updated);
                                          }}
                                          className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg text-xs font-heading text-neutral-900 focus:border-gold outline-none"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <label className="block text-xs font-heading font-bold text-neutral-700 mb-1">
                                            Field Value
                                          </label>
                                          <input
                                            type="text"
                                            value={field.value}
                                            onChange={e => {
                                              const updated = [...additionalCustomFields];
                                              updated[idx].value = e.target.value;
                                              setAdditionalCustomFields(updated);
                                            }}
                                            className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg text-xs font-heading text-neutral-900 focus:border-gold outline-none"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAdditionalCustomFields(prev => prev.filter((_, i) => i !== idx));
                                          }}
                                          className="h-10 px-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-heading"
                                          title="Remove field"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAdditionalCustomFields(prev => [
                                          ...prev,
                                          { id: Date.now(), label: "", value: "" }
                                        ]);
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-primary hover:text-gold transition-colors py-1"
                                    >
                                      + Add custom field
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div ref={degreeContainerRef} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
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
                                  placeholder="BS Information Technology"
                                  className="w-full h-11 pl-3.5 pr-8 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none shadow-2xs font-heading font-normal text-neutral-900 placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
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
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Graduating Batch <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentBatch}
                              onChange={e => setStudentBatch(e.target.value)}
                              onBlur={() => {
                                const trimmed = studentBatch.trim();
                                if (!trimmed) return;
                                const prefix = isSeniorHighService ? "S.Y. " : "A.Y. ";
                                if (/^\d{4}(?:-\d{4})?$/.test(trimmed)) {
                                  setStudentBatch(`${prefix}${trimmed}`);
                                }
                              }}
                              placeholder={isSeniorHighService ? "S.Y. 2025-2026" : "A.Y. 2025-2026"}
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                            />
                          </div>

                          {/* Class Section */}
                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Class Section <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentSection}
                              onChange={e => setStudentSection(e.target.value)}
                              placeholder={isSeniorHighService ? "Alcala, Magsaysay, A, or 1" : "A, B, 1, or 4-1"}
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                            />
                          </div>

                          {/* Student ID */}
                          <div>
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Student ID Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentIdNumber}
                              onChange={e => setStudentIdNumber(e.target.value)}
                              placeholder=""
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:font-heading placeholder:text-neutral-400 placeholder:font-heading"
                            />
                          </div>

                          {/* Motto for Yearbook */}
                          <div className="sm:col-span-2 pt-1">
                            <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900 mb-2">
                              Motto for Yearbook
                            </label>
                            <input
                              type="text"
                              value={yearbookMotto}
                              onChange={e => setYearbookMotto(e.target.value)}
                              placeholder=""
                              className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-heading text-neutral-900 focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs italic placeholder:font-heading placeholder:font-heading placeholder:text-neutral-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Navigation Actions - Under the Grid of the Form Table on the Right Part */}
                      <div className="pt-6 border-t border-neutral-100/90 flex items-center justify-end gap-3">
                        <button 
                          type="button" 
                          onClick={() => {
                            setValidationError("");
                            if (step === 3 && bookingFor === "school_section") {
                              setStep(1);
                            } else {
                              setStep(step - 1);
                            }
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
                          ) : (
                            <>Next Step <ArrowRight size={15} /></>
                          )}
                        </button>
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
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">
                                Bride's Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={brideName}
                                onChange={e => setBrideName(e.target.value)}
                                placeholder="Maria Santos"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">
                                Groom's Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={groomName}
                                onChange={e => setGroomName(e.target.value)}
                                placeholder="Juan Dela Cruz"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
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
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">Wedding Theme / Color Palette</label>
                              <input
                                type="text"
                                value={weddingTheme}
                                onChange={e => setWeddingTheme(e.target.value)}
                                placeholder="Sage Green & Champagne Gold / Rustic Earth"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">
                                Ceremony Church / Venue
                              </label>
                              <div className="relative flex items-center">
                                <MapPin size={16} className="absolute left-3.5 text-neutral-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={ceremonyVenue}
                                  onChange={e => setCeremonyVenue(e.target.value)}
                                  placeholder="Cebu Metropolitan Cathedral / Chateau de Busay"
                                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
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
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">Coordinator Name / Team</label>
                              <input
                                type="text"
                                value={coordinatorName}
                                onChange={e => setCoordinatorName(e.target.value)}
                                placeholder="Signature Events Management"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">Coordinator Contact Phone</label>
                              <input
                                type="tel"
                                value={coordinatorContact}
                                onChange={e => setCoordinatorContact(e.target.value)}
                                placeholder="0917 123 4567"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-neutral-900 font-normal focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none transition-all shadow-2xs placeholder:text-neutral-400 placeholder:font-normal"
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
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">
                                Company / Organization <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="Tech Solutions Cebu / Freelance"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body text-primary focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none font-semibold text-primary shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">Designation / Role</label>
                              <input
                                type="text"
                                value={clientRole}
                                onChange={e => setClientRole(e.target.value)}
                                placeholder="Managing Director / Partner / Engineer"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs sm:text-sm font-body focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none shadow-2xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-body font-medium text-neutral-600 mb-1.5">Primary Photo Usage</label>
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
                <div id="studio-photoshoot-scheduling-section" className="space-y-6 animate-fade-in scroll-mt-6">
                  {/* Section Title Header matching Steps 1 to 4 */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-4 sm:pt-6">
                    {(!isAcademicService || bookingFor === "school_section") && (
                      <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                        {isAcademicService
                          ? "School Campus Pictorial Schedule"
                          : "Schedule & Studio Location"}
                      </span>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      {isAcademicService
                        ? (bookingFor === "school_section"
                            ? "Campus Batch Pictorial Arrangement"
                            : "Select Photoshoot Schedule")
                        : "Select Photoshoot Schedule"}
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-body mt-1 max-w-md mx-auto">
                      {isAcademicService
                        ? (bookingFor === "school_section"
                            ? "Your graduation pictorial will be conducted on-site at your school campus following your official batch schedule."
                            : "Choose your preferred photoshoot date and time slot.")
                        : "Choose your preferred photoshoot date and time slot."}
                    </p>
                  </div>

                                                      {/* ── LIVE BOOKING CALENDAR & AVAILABILITY ENGINE ── */}
                  <div className="space-y-6 animate-fade-in">
                    {/* Section Top Label */}
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-primary">
                        <span className="font-heading font-bold text-neutral-900 text-xs sm:text-sm">
                          {isSchoolSection
                            ? "Preferred Graduation Pictorial Date"
                            : isWeddingService
                            ? "Preferred Wedding Coverage Date"
                            : "Preferred Photoshoot Date & Call Time"} <span className="text-red-500">*</span>
                        </span>
                      </label>

                    </div>

                    {/* Shared Space 50/50 Split: Calendar on Left, Live Time & Availability on Right */}
                    <div className="grid md:grid-cols-2 gap-4 lg:gap-5 items-stretch">
                      {/* Left Half: Interactive Calendar (Matching Image 1) */}
                      <InteractiveCalendar
                        value={eventDate}
                        onChange={(d) => setEventDate(d)}
                        minDate={new Date().toISOString().split("T")[0]}
                        blockedDates={monthBlockMap}
                        onMonthChange={handleMonthChange}
                      />

                      {/* Right Half: Live Booking Time & Availability (Matching Image 2) */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/90 text-xs shadow-2xs space-y-4 flex flex-col justify-between">
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight">
                                Live Booking Time &amp; Availability
                              </h3>
                            </div>
                            <span className="text-xs text-neutral-500 font-medium block mt-0.5">
                              {eventDate ? (
                                <span className="font-semibold text-neutral-900">
                                  {new Date(eventDate + "T00:00:00").toLocaleDateString("en-PH", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : (
                                "Please select a date on calendar"
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Session Period Switcher (Morning | Afternoon | All) */}
                            {!isSchoolSection && !isWeddingService && (
                              <div className="inline-flex items-center p-0.5 bg-neutral-100 rounded-xl border border-neutral-200/90 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => setSessionCategory("MORNING")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    sessionCategory === "MORNING"
                                      ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/90 font-extrabold"
                                      : "text-neutral-500 hover:text-neutral-900"
                                  }`}
                                >
                                  <span>☀️</span>
                                  <span>Morning</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSessionCategory("AFTERNOON")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    sessionCategory === "AFTERNOON"
                                      ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/90 font-extrabold"
                                      : "text-neutral-500 hover:text-neutral-900"
                                  }`}
                                >
                                  <span>🌤️</span>
                                  <span>Afternoon</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSessionCategory("ALL")}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    sessionCategory === "ALL"
                                      ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/90 font-extrabold"
                                      : "text-neutral-500 hover:text-neutral-900"
                                  }`}
                                >
                                  All
                                </button>
                              </div>
                            )}

                            {eventDate ? (
                              dateAvailability?.isFullDayBlocked ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                  Date Reserved
                                </span>
                              ) : isSchoolSection ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                  Full-Day Lock
                                </span>
                              ) : isWeddingService ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                  Full-Day Wedding
                                </span>
                              ) : null
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
                                Awaiting Date
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex-1 space-y-4">
                          {!eventDate ? (
                            <div className="py-12 px-4 text-center bg-neutral-50/60 rounded-2xl border border-dashed border-neutral-200 space-y-2">
                              <Clock size={32} className="mx-auto text-neutral-300" />
                              <h4 className="font-heading font-bold text-sm text-neutral-700">No Date Selected</h4>
                              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                                Please pick your target photoshoot date on the calendar to view available morning &amp; afternoon session time slots.
                              </p>
                            </div>
                          ) : isSchoolSection ? (
                            /* School Section Full-Day Lock Card */
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-transparent border border-gold/50 shadow-2xs space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/30 text-amber-950 flex items-center justify-center shrink-0">
                                  <GraduationCap size={18} />
                                </div>
                                <h4 className="font-heading text-sm text-neutral-950 font-extrabold">
                                  Full-Day Campus Pictorial Day Reserved
                                </h4>
                              </div>
                              <p className="text-xs text-neutral-700 font-body leading-relaxed">
                                Reserving this date locks out the entire day for your school cohort ({studentSchool || "Partner School"}). No individual customer bookings can take this date.
                              </p>
                              <div className="pt-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-950 text-gold border border-gold/40">
                                  Entire Day Locked (8:00 AM – 5:00 PM)
                                </span>
                              </div>
                            </div>
                          ) : isWeddingService ? (
                            /* Wedding Full-Day Lock Card */
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-transparent border border-gold/50 shadow-2xs space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/30 text-amber-950 flex items-center justify-center shrink-0">
                                  <Sparkles size={18} />
                                </div>
                                <h4 className="font-heading text-sm text-neutral-950 font-extrabold">
                                  Full-Day Wedding Photo &amp; Video Production
                                </h4>
                              </div>
                              <p className="text-xs text-neutral-700 font-body leading-relaxed">
                                Your wedding shoot reserves our entire production and creative crew for the full day. This date is locked exclusively for your wedding.
                              </p>
                              <div className="pt-1 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-950 text-gold border border-gold/40">
                                  Full-Day Exclusive Crew
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Individual / For Others: Morning & Afternoon Slot Cards Matching Image 2 */
                            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                              {/* ☀️ MORNING SECTION */}
                              {(sessionCategory === "MORNING" || sessionCategory === "ALL") && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs font-heading font-extrabold text-neutral-800 tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-500 text-sm">☀️</span>
                                      <span className="uppercase">MORNING</span>
                                    </div>
                                    <span className="text-[11px] text-neutral-400 font-mono font-normal">
                                      8:00 AM – 12:00 PM
                                    </span>
                                  </div>

                                <div className="space-y-2">
                                  {STUDIO_HOURLY_SLOTS.slice(0, 4).map((slot) => {
                                    const isBooked = dateAvailability?.bookedSlots?.includes(slot.time);
                                    const isSelected = preferredTime === slot.label;

                                    // Check if today and slot time has already passed
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const isSelectedToday = eventDate === todayStr;
                                    const slotStartHour = parseInt(slot.time.split(":")[0], 10);
                                    const isPastHourToday = isSelectedToday && (slotStartHour <= now.getHours());

                                    if (isPastHourToday) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200 text-neutral-400 flex items-center justify-between shadow-2xs select-none opacity-50 h-[78px]"
                                        >
                                          <span className="font-mono font-bold text-base sm:text-lg text-neutral-400 shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3">
                                            <div className="font-semibold text-xs text-neutral-500 truncate">
                                              Time Slot Closed
                                            </div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">
                                              Past Studio Operating Hours
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-neutral-100 text-neutral-500 text-xs font-semibold px-3 py-1 rounded-xl border border-neutral-200">
                                              Closed
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (isBooked) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/80 text-neutral-400 flex items-center justify-between shadow-2xs select-none transition-all h-[78px] opacity-75"
                                        >
                                          <span className="font-mono font-bold text-base sm:text-lg text-neutral-400 shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3">
                                            <div className="font-bold text-xs sm:text-sm text-neutral-600 truncate font-heading">
                                              Reserved Slot
                                            </div>
                                            <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                                              Unavailable for booking
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-neutral-200/90 text-neutral-600 text-xs font-semibold px-3.5 py-1 rounded-xl border border-neutral-300/60">
                                              Reserved
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (isSelected) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950 border-2 border-gold text-white flex items-center justify-between shadow-md ring-2 ring-gold/50 select-none transition-all h-[78px]"
                                        >
                                          <span className="font-mono font-extrabold text-base sm:text-lg text-gold shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3 flex flex-col justify-center">
                                            <div className="font-bold text-xs sm:text-sm text-white truncate">
                                              Selected Time Slot
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-gold text-neutral-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1">
                                              <span>Selected</span>
                                              <span>✓</span>
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={slot.time}
                                        className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/30 hover:bg-amber-50/60 border-2 border-amber-300/80 hover:border-gold flex items-center justify-between shadow-2xs transition-all h-[78px]"
                                      >
                                        <span className="font-mono font-extrabold text-base sm:text-lg text-neutral-900 shrink-0 min-w-[5.2rem]">
                                          {slot.display || slot.time}
                                        </span>
                                        <div className="min-w-0 flex-1 px-3">
                                          <div className="font-bold text-xs sm:text-sm text-neutral-950 truncate">
                                            Available
                                          </div>
                                          <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                            Click to book
                                          </div>
                                        </div>
                                        <div className="shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setPreferredTime(slot.label)}
                                            className="bg-neutral-950 hover:bg-black active:scale-95 text-white hover:text-gold border border-gold/30 text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                          >
                                            Book now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                              {/* 🌤️ AFTERNOON SECTION */}
                              {(sessionCategory === "AFTERNOON" || sessionCategory === "ALL") && (
                                <div className="space-y-2 pt-1">
                                  <div className="flex items-center justify-between text-xs font-heading font-extrabold text-neutral-800 tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-500 text-sm">🌤️</span>
                                      <span className="uppercase">AFTERNOON</span>
                                    </div>
                                    <span className="text-[11px] text-neutral-400 font-mono font-normal">
                                      1:00 PM – 5:00 PM
                                    </span>
                                  </div>

                                <div className="space-y-2">
                                  {STUDIO_HOURLY_SLOTS.slice(4).map((slot) => {
                                    const isBooked = dateAvailability?.bookedSlots?.includes(slot.time);
                                    const isSelected = preferredTime === slot.label;

                                    // Check if today and slot time has already passed
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const isSelectedToday = eventDate === todayStr;
                                    const slotStartHour = parseInt(slot.time.split(":")[0], 10);
                                    const isPastHourToday = isSelectedToday && (slotStartHour <= now.getHours());

                                    if (isPastHourToday) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200 text-neutral-400 flex items-center justify-between shadow-2xs select-none opacity-50 h-[78px]"
                                        >
                                          <span className="font-mono font-bold text-base sm:text-lg text-neutral-400 shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3">
                                            <div className="font-semibold text-xs text-neutral-500 truncate">
                                              Time Slot Closed
                                            </div>
                                            <div className="text-[11px] text-neutral-400 mt-0.5">
                                              Past Studio Operating Hours
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-neutral-100 text-neutral-500 text-xs font-semibold px-3 py-1 rounded-xl border border-neutral-200">
                                              Closed
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (isBooked) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/80 text-neutral-400 flex items-center justify-between shadow-2xs select-none transition-all h-[78px] opacity-75"
                                        >
                                          <span className="font-mono font-bold text-base sm:text-lg text-neutral-400 shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3">
                                            <div className="font-bold text-xs sm:text-sm text-neutral-600 truncate font-heading">
                                              Reserved Slot
                                            </div>
                                            <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                                              Unavailable for booking
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-neutral-200/90 text-neutral-600 text-xs font-semibold px-3.5 py-1 rounded-xl border border-neutral-300/60">
                                              Reserved
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (isSelected) {
                                      return (
                                        <div
                                          key={slot.time}
                                          className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950 border-2 border-gold text-white flex items-center justify-between shadow-md ring-2 ring-gold/50 select-none transition-all h-[78px]"
                                        >
                                          <span className="font-mono font-extrabold text-base sm:text-lg text-gold shrink-0 min-w-[5.2rem]">
                                            {slot.display || slot.time}
                                          </span>
                                          <div className="min-w-0 flex-1 px-3 flex flex-col justify-center">
                                            <div className="font-bold text-xs sm:text-sm text-white truncate">
                                              Selected Time Slot
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className="bg-gold text-neutral-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1">
                                              <span>Selected</span>
                                              <span>✓</span>
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={slot.time}
                                        className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/30 hover:bg-amber-50/60 border-2 border-amber-300/80 hover:border-gold flex items-center justify-between shadow-2xs transition-all h-[78px]"
                                      >
                                        <span className="font-mono font-extrabold text-base sm:text-lg text-neutral-900 shrink-0 min-w-[5.2rem]">
                                          {slot.display || slot.time}
                                        </span>
                                        <div className="min-w-0 flex-1 px-3">
                                          <div className="font-bold text-xs sm:text-sm text-neutral-950 truncate">
                                            Available
                                          </div>
                                          <div className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                            Click to book
                                          </div>
                                        </div>
                                        <div className="shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setPreferredTime(slot.label)}
                                            className="bg-neutral-950 hover:bg-black active:scale-95 text-white hover:text-gold border border-gold/30 text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                          >
                                            Book now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Selected Session Time Status */}
                        {preferredTime && (
                          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end text-xs font-body">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-950 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
                              <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                              <span>
                                {isSchoolSection || isWeddingService
                                  ? preferredTime
                                  : `Session Time: ${preferredTime} | 1hr Session`}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

{/* ── PICTORIAL LOCATION / VENUE: ACADEMIC FLOW ── */}
                  {isAcademicService ? (
                    <div className="space-y-4 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-bold text-neutral-900">
                            Pictorial Location / Venue
                          </label>
                          <p className="text-[11px] text-neutral-500 font-body">
                            {bookingFor === "school_section"
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
                        /* Shared Official Studio Location Card (Texts on Left, Map on Right with View Selectors) */
                        <StudioLocationMapCard />
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
                                      {studentCourse || effectiveShsStrand || "N/A"}
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
                              placeholder="Preferred call time window, special assistance, or questions"
                              className="w-full h-11 px-4 bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 rounded-xl text-xs sm:text-sm font-body text-primary outline-none transition-all shadow-2xs"
                            />
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
                              331 Rizal Street, City of Naga, Cebu
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
                        <StudioLocationMapCard />
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
                                placeholder="USC Talamban Campus / Waterfront Cebu / Private Residence"
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
                                  placeholder="Gov. M. Cuenco Ave, Brgy. Talamban"
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
                                placeholder="Cebu City / Mandaue City"
                                className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-gold/25 focus:border-gold outline-none font-body text-xs sm:text-sm shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Landmark / Directions</label>
                              <input 
                                type="text" 
                                value={customLandmark}
                                onChange={e => setCustomLandmark(e.target.value)}
                                placeholder="Near Main Entrance gate, Building B"
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
                  STEP 5: SMART COLLAPSIBLE REVIEW & CONFIRM
              ───────────────────────────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6 animate-fade-in font-heading">
                  {/* Section Title Header matching Steps 1 to 4 */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-4 sm:pt-6">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                      Final Verification &amp; Confirmation
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Review &amp; confirm your reservation
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-heading mt-1 max-w-md mx-auto">
                      Please review your student profile, photoshoot schedule, and package inclusions below before confirming.
                    </p>
                  </div>

                                    {/* ─────────────────────────────────────────────────────────────
                      STEP 5: TWO DIRECT REVIEW CARDS MATCHING DESIGN SYSTEM
                      Card 1: Student / Client & Academic Profile
                      Card 2: Selected Time & Date, Package Price & Inclusions
                  ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-6">
                    
                    {/* CARD 1: STUDENT & ACADEMIC PROFILE */}
                    <div className="border border-neutral-200/90 rounded-3xl bg-white shadow-sm p-6 sm:p-8 transition-all font-heading">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-4 pb-2">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 border border-amber-500/25 mt-0.5">
                            {isAcademicService ? <GraduationCap size={22} /> : <User size={22} />}
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-neutral-400 font-heading block">
                              {isAcademicService ? "STUDENT & ACADEMIC PROFILE" : "CLIENT & PROFILE INFORMATION"}
                            </span>
                            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                              {[studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || [participantFirstName, participantLastName].filter(Boolean).join(" ") || [editFirstName, editLastName].filter(Boolean).join(" ") || "Student Name"}
                            </h3>
                            {studentIdNumber && (
                              <div className="mt-1">
                                <span className="text-[11px] text-neutral-400 font-heading">
                                  ID: {studentIdNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="px-4 py-2 rounded-full border border-amber-300/80 bg-amber-50/60 hover:bg-amber-100/70 text-xs font-bold font-heading text-neutral-800 flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Edit3 size={13} /> Edit Details
                        </button>
                      </div>

                      {/* Section 1: Personal & Contact Details */}
                      <div className="flex items-center gap-3 pt-6 pb-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                          PERSONAL &amp; CONTACT DETAILS
                        </span>
                        <div className="h-px bg-neutral-200/70 flex-1" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200/70">
                        <div className="pb-3 md:pb-0 md:pr-6">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                            COMPLETE NAME
                          </span>
                          <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
                            {[studentFirstName, studentMiddleName, studentLastName].filter(Boolean).join(" ") || [participantFirstName, participantLastName].filter(Boolean).join(" ") || [editFirstName, editLastName].filter(Boolean).join(" ") || "Student Name"}
                          </span>
                        </div>
                        <div className="py-3 md:py-0 md:px-6">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                            PHONE NUMBER
                          </span>
                          <span className={`text-sm sm:text-base block truncate ${
                            (editPhone || participantPhone || activeProfile?.phone || user?.user_metadata?.phone)
                              ? "font-bold text-neutral-900"
                              : "italic text-neutral-400 font-normal"
                          }`}>
                            {editPhone || participantPhone || activeProfile?.phone || user?.user_metadata?.phone || "Not provided"}
                          </span>
                        </div>
                        <div className="pt-3 md:pt-0 md:pl-6">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                            EMAIL ADDRESS
                          </span>
                          <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
                            {user?.email || activeProfile?.email || participantEmail || "Not provided"}
                          </span>
                        </div>
                      </div>

                      {/* Section 2: School & Campus Location (for academic services) */}
                      {isAcademicService && (
                        <>
                          <div className="flex items-center gap-3 pt-6 pb-4">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                              SCHOOL &amp; CAMPUS LOCATION
                            </span>
                            <div className="h-px bg-neutral-200/70 flex-1" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200/70">
                            <div className="pb-3 md:pb-0 md:pr-6">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                NAME OF THE SCHOOL
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {activeUnivId && <SchoolLogo univId={activeUnivId} name={studentSchool} size="xs" />}
                                <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate" title={studentSchool}>
                                  {studentSchool || "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="pt-3 md:pt-0 md:pl-6">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                SCHOOL ADDRESS
                              </span>
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate" title={studentSchoolAddress}>
                                {studentSchoolAddress || (locationType === "STUDIO" ? "Main Studio Partner / Standard Campus" : "Official Campus grounds, Cebu")}
                              </span>
                            </div>
                          </div>

                          {/* Section 3: Academic Year & Section Classification */}
                          <div className="flex items-center gap-3 pt-6 pb-4">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                              ACADEMIC YEAR &amp; SECTION CLASSIFICATION
                            </span>
                            <div className="h-px bg-neutral-200/70 flex-1" />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-200/70">
                            <div className="pr-4">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                {studentType === "COLLEGE" ? "DEGREE / COURSE" : "STRAND"}
                              </span>
                              {/* Direct bold text without circle/pill per user request */}
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
                                {studentType === "COLLEGE" ? (studentCourse || "N/A") : (effectiveShsStrand || "STEM")}
                              </span>
                            </div>
                            <div className="px-4">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                BATCH YEAR
                              </span>
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block">
                                {studentBatch || "Batch 2026"}
                              </span>
                            </div>
                            <div className="px-4">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                CLASS SECTION
                              </span>
                              <div>
                                <span className="font-bold text-amber-800 text-sm sm:text-base block truncate">
                                  {normalizedStudentSection ? (normalizedStudentSection.toLowerCase().startsWith('section') ? normalizedStudentSection : `Section ${normalizedStudentSection}`) : "N/A"}
                                </span>
                                <div className="w-8 h-0.5 bg-amber-400/80 mt-1 rounded-full" />
                              </div>
                            </div>
                            <div className="pl-4">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                ID NUMBER
                              </span>
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block">
                                {studentIdNumber || "N/A"}
                              </span>
                            </div>
                          </div>

                          {/* Section 4: Yearbook Motto */}
                          {yearbookMotto && (
                            <>
                              <div className="flex items-center gap-3 pt-6 pb-4">
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                                  YEARBOOK MOTTO
                                </span>
                                <div className="h-px bg-neutral-200/70 flex-1" />
                              </div>
                              <div className="px-1">
                                <p className="font-heading italic text-neutral-900 text-sm sm:text-base font-medium">
                                  &quot;{yearbookMotto}&quot;
                                </p>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* If wedding service */}
                      {isWeddingService && (
                        <>
                          <div className="flex items-center gap-3 pt-6 pb-4">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                              WEDDING INFORMATION
                            </span>
                            <div className="h-px bg-neutral-200/70 flex-1" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200/70">
                            <div className="pb-3 md:pb-0 md:pr-6">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                COUPLE
                              </span>
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block">
                                {brideName} &amp; {groomName}
                              </span>
                            </div>
                            <div className="pt-3 md:pt-0 md:pl-6">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                                WEDDING THEME
                              </span>
                              <span className="font-bold text-neutral-900 text-sm sm:text-base block">
                                {weddingTheme || "Standard Wedding"}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* If booking for someone else */}
                      {bookingFor === "someone_else" && (
                        <div className="mt-5 text-[11px] text-neutral-600 bg-amber-50/70 border border-amber-200/60 px-3.5 py-2 rounded-xl flex items-center justify-between">
                          <span>
                            Booked by account owner: <span className="font-bold text-neutral-800">{activeProfile?.first_name || user?.user_metadata?.first_name} {activeProfile?.last_name || user?.user_metadata?.last_name}</span> ({activeProfile?.email || user?.email})
                          </span>
                          <span className="text-amber-800 font-semibold">{participantRelationship || "Beneficiary"}</span>
                        </div>
                      )}
                    </div>

                    {/* CARD 2: PHOTOSHOOT SCHEDULE, PACKAGE PRICE & PACKAGE INCLUSIONS */}
                    <div className="border border-neutral-200/90 rounded-3xl bg-white shadow-sm p-6 sm:p-8 transition-all font-heading">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-4 pb-2">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-500/25 mt-0.5">
                            <Calendar size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-neutral-400 font-heading block">
                              SCHEDULE &amp; PACKAGE DELIVERABLES
                            </span>
                            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                              {selectedService?.name || "Photoshoot Service"}
                            </h3>
                            <p className="text-sm sm:text-base font-bold text-amber-900 font-heading mt-0.5">
                              {selectedTier?.name || "Set A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setStep(4)}
                            className="px-4 py-2 rounded-full border border-amber-300/80 bg-amber-50/60 hover:bg-amber-100/70 text-xs font-bold font-heading text-neutral-800 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Edit3 size={13} /> Edit Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="px-4 py-2 rounded-full border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold font-heading text-neutral-800 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            Change Set
                          </button>
                        </div>
                      </div>

                      {/* Section 1: Selected Time, Date & Venue */}
                      <div className="flex items-center gap-3 pt-6 pb-4">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                          DATE, TIME &amp; STUDIO VENUE
                        </span>
                        <div className="h-px bg-neutral-200/70 flex-1" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200/70 items-center">
                        <div className="pb-3 md:pb-0 md:pr-6 md:col-span-2">
                          <div className="flex items-center gap-2.5">
                            <Calendar size={18} className="text-gold shrink-0" />
                            <span className="font-bold text-neutral-900 text-sm sm:text-base font-heading">
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                                ? "Official School Batch Schedule"
                                : `${formatTextualDate(eventDate)} • ${formatSessionTime(preferredTime)}`}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1.5 flex items-center gap-1.5 font-heading">
                            <MapPin size={13} className="text-neutral-400 shrink-0" />
                            <span>{resolvedLocation || "E-Kodak Studio, 331 Rizal Street, City of Naga, Cebu"}</span>
                          </p>
                        </div>

                        <div className="pt-3 md:pt-0 md:pl-6">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider mb-1 font-heading">
                            PACKAGE PRICE
                          </span>
                          <span className="font-heading font-extrabold text-2xl sm:text-3xl text-amber-900 block">
                            ₱{basePrice.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-neutral-500 block mt-0.5 font-heading">
                            {selectedTier?.name || "Set A"} Set Price
                          </span>
                        </div>
                      </div>

                      {/* Section 2: Package Inclusions (Collapsible Dropdown under User Control) */}
                      {tierInclusions.length > 0 && (
                        <div className="pt-6">
                          <button
                            type="button"
                            onClick={() => setIsInclusionsOpen((prev) => !prev)}
                            className="w-full flex items-center justify-between gap-3 group cursor-pointer pb-2 text-left focus:outline-none select-none"
                            aria-expanded={isInclusionsOpen}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-neutral-900 font-heading whitespace-nowrap transition-colors">
                                PACKAGE INCLUSIONS ({tierInclusions.length})
                              </span>
                            </div>
                            <div className="h-px bg-neutral-200/70 flex-1 group-hover:bg-neutral-300 transition-colors" />
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200/90 bg-neutral-50 group-hover:bg-amber-50 group-hover:border-amber-300/80 text-xs font-bold font-heading text-neutral-700 group-hover:text-amber-900 transition-all shadow-2xs shrink-0">
                              <span>{isInclusionsOpen ? "Hide Inclusions" : "Show Inclusions"}</span>
                              <ChevronDown
                                size={14}
                                className={`text-neutral-500 group-hover:text-amber-800 transition-transform duration-200 ${
                                  isInclusionsOpen ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {isInclusionsOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden pt-2"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pb-1">
                                  {tierInclusions.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 text-xs text-neutral-800"
                                    >
                                      <Check size={15} className="text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                                      <span className="font-medium leading-relaxed font-heading">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Selected Add-ons if any */}
                      {selectedAddOns.length > 0 && (
                        <>
                          <div className="flex items-center gap-3 pt-6 pb-4">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                              SELECTED ADD-ONS ({selectedAddOns.length})
                            </span>
                            <div className="h-px bg-neutral-200/70 flex-1" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {selectedAddOns.map((addon, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 text-xs">
                                <span className="font-medium text-neutral-800">{addon.name}</span>
                                <span className="font-bold text-gold">+₱{parsePrice(addon.price).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Special instructions / notes if any */}
                      {notes && (
                        <>
                          <div className="flex items-center gap-3 pt-6 pb-4">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-heading whitespace-nowrap">
                              SPECIAL REQUESTS / INSTRUCTIONS
                            </span>
                            <div className="h-px bg-neutral-200/70 flex-1" />
                          </div>
                          <p className="italic text-neutral-700 text-xs bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60">
                            &quot;{notes}&quot;
                          </p>
                        </>
                      )}

                      {/* Reference photos count if any */}
                      {referenceFiles.length > 0 && (
                        <div className="pt-3 text-[11px] text-neutral-500">
                          {referenceFiles.length} creative reference photo(s) attached
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Pricing Breakdown & Payment Terms Summary (Split 50/50 Card) */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-primary to-neutral-950 text-white border border-gold/30 shadow-lg font-heading">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-white/10">
                      
                      {/* Left Half: Total Package Breakdown */}
                      <div className="space-y-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                            <span className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-1.5 font-heading">
                              <Sparkles size={12} className="text-gold" /> Total Package Breakdown
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center py-3.5 sm:py-5 space-y-3">
                          <div className="flex justify-between items-center font-heading">
                            <div>
                              <span className="text-white text-base sm:text-lg font-bold block font-heading">
                                Base Package ({selectedTier?.name || "Set A"})
                              </span>
                              <span className="text-xs text-neutral-400 mt-0.5 block font-heading">
                                {selectedService?.name || "Senior High Packages and Sets"}
                              </span>
                            </div>
                            <span className="font-heading font-extrabold text-white text-2xl sm:text-3xl tracking-tight">
                              ₱{basePrice.toLocaleString()}
                            </span>
                          </div>

                          {selectedAddOns.length > 0 && (
                            <div className="flex justify-between items-center font-heading pt-3 border-t border-white/10">
                              <div>
                                <span className="text-gold text-sm sm:text-base font-bold block font-heading">
                                  Selected Add-ons ({selectedAddOns.length})
                                </span>
                                <span className="text-xs text-neutral-400 mt-0.5 block font-heading truncate max-w-[200px]">
                                  {selectedAddOns.map((a) => a.name).join(", ")}
                                </span>
                              </div>
                              <span className="font-heading font-extrabold text-gold text-2xl sm:text-3xl tracking-tight">
                                +₱{addOnsTotal.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-white/10 font-heading mt-auto">
                          <div>
                            <span className="text-xs text-neutral-400 block font-heading">Total Package Rate</span>
                            <span className="font-bold text-white text-sm sm:text-base font-heading">Total Amount</span>
                          </div>
                          <span className="font-heading font-extrabold text-gold text-3xl sm:text-4xl tracking-tight">{formattedTotal}</span>
                        </div>
                      </div>

                      {/* Right Half: Payment Terms (Downpayment & Studio/Delivery Carrier) */}
                      <div className="space-y-3.5 md:pl-6 flex flex-col justify-between pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-1.5 font-heading">
                            <CreditCard size={13} className="text-amber-400" /> Payment Terms
                          </span>
                          <span className="text-xs text-neutral-400 font-heading">Balance Split</span>
                        </div>

                        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                          {/* 50% Down Payment */}
                          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-amber-300 uppercase font-bold tracking-wider font-heading">Down Payment</p>
                              <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 font-heading">Due upon confirmation</p>
                            </div>
                            <p className="font-extrabold text-gold text-2xl sm:text-3xl font-heading">{formattedDownPayment}</p>
                          </div>

                          {/* Remaining Payment at Studio or in Delivery Carrier */}
                          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-neutral-200 uppercase font-bold tracking-wider font-heading">Remaining Balance</p>
                              <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 font-heading">Payable at studio or in delivery carrier</p>
                            </div>
                            <p className="font-extrabold text-white text-2xl sm:text-3xl font-heading">{formattedRemaining}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Summary Guarantee Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950 font-heading shadow-2xs">
                    <ShieldCheck size={18} className="text-gold shrink-0 mt-0.5" />
                    <span>
                      Please verify your photoshoot parameters above. Clicking &quot;Confirm &amp; Proceed to Payment&quot; will guide you to Step 6 to settle your reservation downpayment (₱{downPaymentAmount.toLocaleString()}) via payment gateway to guarantee your slot.
                    </span>
                  </div>
                </div>
              )}

              {/* ── STEP 6: PAYMENT PROCESS (PAY 50% DEPOSIT TO RESERVE SLOT) ── */}
              {step === 6 && (
                <div className="space-y-6 animate-fade-in font-heading">
                  {/* Step Header */}
                  <div className="text-center mb-6 sm:mb-8 relative z-10 pt-2 sm:pt-4">
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Pay Downpayment to Reserve Slot
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-600 font-heading mt-1.5 max-w-md mx-auto">
                      A downpayment of ₱{downPaymentAmount.toLocaleString()} is required to guarantee your dedicated studio slot and reserve your booking in the admin ledger.
                    </p>
                  </div>

                  {/* Validation Error Alert */}
                  {validationError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-xs text-rose-900 shadow-2xs animate-shake">
                      <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-rose-950">Payment Verification Required</strong>
                        <p className="mt-0.5 text-rose-800 leading-relaxed font-medium">{validationError}</p>
                      </div>
                    </div>
                  )}

                  {/* Top Order Summary Card */}
                  <div className="border border-gold/30 rounded-3xl bg-gradient-to-br from-neutral-950 via-[#18181b] to-neutral-950 text-white p-6 sm:p-7 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2 flex-1 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gold block font-heading">
                          Reservation Order Summary
                        </span>
                        <h4 className="text-lg sm:text-xl font-bold text-white font-heading">
                          {selectedService?.name || "Senior High Packages and Sets"} — {selectedTier?.name || "Set A"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-300 pt-0.5 font-heading">
                          <span className="inline-flex items-center gap-1.5 text-neutral-200">
                            <Calendar size={13} className="text-gold shrink-0" />
                            {formatTextualDate(eventDate)} • {formatSessionTime(preferredTime)}
                          </span>
                          <span className="hidden sm:inline text-neutral-600">•</span>
                          <span className="inline-flex items-center gap-1.5 text-neutral-300 truncate max-w-md" title={resolvedLocation}>
                            <MapPin size={13} className="text-neutral-400 shrink-0" />
                            {resolvedLocation}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-8 flex flex-col md:items-end justify-center shrink-0 font-heading">
                        <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">
                          Downpayment Due Now
                        </span>
                        <span className="text-3xl sm:text-4xl font-extrabold text-gold tracking-tight mt-1">
                          ₱{downPaymentAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Gateway Selector & Clean Channel Checkout Box */}
                  <div className="border border-neutral-200/90 rounded-3xl bg-white shadow-sm p-6 sm:p-8 space-y-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 font-heading">
                          Choose Payment Channel
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* GCash */}
                        <button
                          type="button"
                          onClick={() => { setSelectedPaymentGateway("gcash"); setValidationError(""); }}
                          className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer font-heading text-left flex flex-col justify-between ${
                            selectedPaymentGateway === "gcash"
                              ? "border-blue-600 bg-gradient-to-br from-blue-50/90 via-white to-blue-100/70 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30"
                              : "border-neutral-200/90 hover:border-blue-400 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 hover:from-white hover:to-blue-100/40 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <div className="h-10 px-3.5 py-1 rounded-xl bg-white shadow-xs border border-blue-100 flex items-center justify-center">
                              <img src="/images/payments/gcash.svg" alt="GCash" className="h-6 w-auto max-w-[100px] object-contain" />
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedPaymentGateway === "gcash" ? "border-blue-600 bg-blue-600" : "border-neutral-300 group-hover:border-blue-400"
                            }`}>
                              {selectedPaymentGateway === "gcash" && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div>
                            <span className="text-base font-extrabold block text-neutral-900 group-hover:text-blue-900 transition-colors">GCash</span>
                            <span className="text-xs text-neutral-500 block font-medium">QR Ph & E-Wallet</span>
                          </div>
                        </button>

                        {/* Maya */}
                        <button
                          type="button"
                          onClick={() => { setSelectedPaymentGateway("maya"); setValidationError(""); }}
                          className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer font-heading text-left flex flex-col justify-between ${
                            selectedPaymentGateway === "maya"
                              ? "border-emerald-600 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-100/70 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/30"
                              : "border-neutral-200/90 hover:border-emerald-400 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 hover:from-white hover:to-emerald-100/40 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <div className="h-10 px-3 py-1 rounded-xl bg-[#0a1b12] shadow-xs border border-emerald-950 flex items-center justify-center">
                              <img src="/images/payments/maya.svg" alt="Maya" className="h-5 w-auto max-w-[85px] object-contain" />
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedPaymentGateway === "maya" ? "border-emerald-600 bg-emerald-600" : "border-neutral-300 group-hover:border-emerald-400"
                            }`}>
                              {selectedPaymentGateway === "maya" && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div>
                            <span className="text-base font-extrabold block text-neutral-900 group-hover:text-emerald-950 transition-colors">Maya</span>
                            <span className="text-xs text-neutral-500 block font-medium">Maya App & QR Ph</span>
                          </div>
                        </button>

                        {/* Bank Transfer */}
                        <button
                          type="button"
                          onClick={() => { setSelectedPaymentGateway("bank_transfer"); setValidationError(""); }}
                          className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer font-heading text-left flex flex-col justify-between ${
                            selectedPaymentGateway === "bank_transfer"
                              ? "border-amber-600 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/70 shadow-lg shadow-amber-600/15 ring-2 ring-amber-600/30"
                              : "border-neutral-200/90 hover:border-amber-400 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 hover:from-white hover:to-amber-100/40 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-3">
                            <div className="h-10 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-amber-200 flex items-center justify-center gap-1.5">
                              <img src="/images/payments/bdo.svg" alt="BDO" className="h-3.5 max-w-[34px] object-contain" />
                              <span className="text-neutral-300 text-xs">|</span>
                              <img src="/images/payments/bpi.svg" alt="BPI" className="h-3.5 max-w-[30px] object-contain" />
                              <span className="text-neutral-300 text-xs">|</span>
                              <img src="/images/payments/unionbank.svg" alt="UnionBank" className="h-3.5 max-w-[34px] object-contain" />
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedPaymentGateway === "bank_transfer" ? "border-amber-600 bg-amber-600" : "border-neutral-300 group-hover:border-amber-400"
                            }`}>
                              {selectedPaymentGateway === "bank_transfer" && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div>
                            <span className="text-base font-extrabold block text-neutral-900 group-hover:text-amber-950 transition-colors">Bank Transfer</span>
                            <span className="text-xs text-neutral-500 block font-medium">BDO • BPI • UnionBank</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Active Channel Action Card (Direct Xendit Integration based on customer's choice) */}
                    <div className={`p-5 sm:p-6 rounded-2xl border transition-all font-heading ${
                      selectedPaymentGateway === "gcash"
                        ? "bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 border-blue-200/90 shadow-xs"
                        : selectedPaymentGateway === "maya"
                        ? "bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 border-emerald-200/90 shadow-xs"
                        : "bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 border-amber-200/90 shadow-xs"
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {selectedPaymentGateway === "gcash" ? (
                            <div className="h-12 px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 shadow-xs flex items-center justify-center shrink-0">
                              <img src="/images/payments/gcash.svg" alt="GCash" className="h-6 w-auto max-w-[100px] object-contain" />
                            </div>
                          ) : selectedPaymentGateway === "maya" ? (
                            <div className="h-12 px-3.5 py-1.5 rounded-xl bg-[#0a1b12] border border-emerald-950 shadow-xs flex items-center justify-center shrink-0">
                              <img src="/images/payments/maya.svg" alt="Maya" className="h-5 w-auto max-w-[85px] object-contain" />
                            </div>
                          ) : (
                            <div className="h-12 px-3 py-1 rounded-xl bg-white border border-amber-200 shadow-xs flex items-center justify-center gap-1.5 shrink-0">
                              <img src="/images/payments/bdo.svg" alt="BDO" className="h-4 max-w-[36px] object-contain" />
                              <span className="text-neutral-300 text-xs">|</span>
                              <img src="/images/payments/bpi.svg" alt="BPI" className="h-4 max-w-[32px] object-contain" />
                              <span className="text-neutral-300 text-xs">|</span>
                              <img src="/images/payments/unionbank.svg" alt="UnionBank" className="h-4 max-w-[36px] object-contain" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-heading font-extrabold text-base sm:text-lg text-neutral-900">
                              {selectedPaymentGateway === "gcash" ? "Pay with GCash" :
                               selectedPaymentGateway === "maya" ? "Pay with Maya" : "Pay via Online Banking"}
                            </h4>
                            <span className="text-xs text-neutral-500 font-medium">
                              {selectedPaymentGateway === "gcash" ? "Direct checkout via GCash / QR Ph" :
                               selectedPaymentGateway === "maya" ? "Direct checkout via Maya app / QR Ph" : "Direct payment via BDO, BPI, UnionBank, RCBC"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isRedirectingToXendit || isSendingPaymentOtp}
                          onClick={() => handleInitiatePaymentWithSecurityOtp(selectedPaymentGateway)}
                          className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-heading font-black text-xs sm:text-sm text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 ${
                            selectedPaymentGateway === "gcash"
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-600/25"
                              : selectedPaymentGateway === "maya"
                              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-600/25"
                              : "bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 shadow-amber-800/25"
                          }`}
                        >
                          {isSendingPaymentOtp ? (
                            <><Loader2 size={16} className="animate-spin" /> Sending Security Code...</>
                          ) : isRedirectingToXendit ? (
                            <><Loader2 size={16} className="animate-spin" /> Connecting to Xendit...</>
                          ) : (
                            <><Lock size={15} /> Pay ₱{downPaymentAmount.toLocaleString()} via {selectedPaymentGateway === "gcash" ? "GCash" : selectedPaymentGateway === "maya" ? "Maya" : "Bank"} →</>
                          )}
                        </button>
                      </div>
                    </div>


                  </div>
                </div>
              )}

              {/* Navigation Actions (Steps 2-7) - Direct Access Buttons on Right Side (Aligned & Balanced) */}
              {step > 1 && !(step === 3 && isAcademicService) && (
                <div className="w-full mt-6 sm:mt-8 pt-4 border-t border-neutral-200/60 flex items-center justify-end gap-3">
                  {/* Right: Direct Access Navigation Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setValidationError("");
                        setStep(step - 1);
                      }}
                      className="btn-outline px-6 py-2.5 text-xs font-bold font-heading flex items-center gap-2 cursor-pointer hover:border-gold hover:text-gold transition-colors"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn-primary flex items-center gap-2 px-8 py-2.5 text-xs font-bold font-heading tracking-wider shadow-warm-sm justify-center cursor-pointer"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Processing Reservation...</>
                      ) : step === 5 ? (
                        <><CheckCircle size={15} /> Confirm &amp; Proceed to Payment</>
                      ) : step === 6 ? (
                        <><Lock size={15} /> Pay ₱{downPaymentAmount.toLocaleString()} &amp; Reserve Slot</>
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
