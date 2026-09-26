import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Camera, Calendar, Clock, MapPin, ArrowRight, ArrowLeft, Loader2,
  CheckCircle, Package, PlusCircle, Check, Sparkles, GraduationCap,
  Building, User, Mail, Phone, Info, HelpCircle, Layers, Image as ImageIcon,
  ExternalLink, ChevronRight, X, QrCode, Heart, Briefcase, Search,
  ChevronDown, ChevronUp, Eye, Trash2, ShieldCheck, AlertCircle, FileText,
  Video, Edit3, Lock, Palette, UploadCloud, MessageSquare, Plus,
  Timer, BellRing, CreditCard, Copy, Printer, Download, CheckCircle2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { getServices, getAddOns } from "../../services/contentService";
import { createBooking } from "../../services/bookingService";
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

// ── Preset Visual Reference Pegs tailored per service ───────────────────────────
const PRESET_STYLE_PEGS = {
  graduation: [
    { 
      id: "creative_candid", 
      title: "Creative & Candid", 
      desc: "Spontaneous, authentic moments and candid expressions celebrating your milestone", 
      tag: "Candid",
      image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "warm_golden_glow", 
      title: "Warm Golden Glow", 
      desc: "Soft amber rim lighting with rich, radiant skin tones and cinematic warmth", 
      tag: "Warm Tone",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "bright_high_key", 
      title: "Bright High-Key Minimalist", 
      desc: "Clean, ultra-crisp all-white illumination for modern, timeless graduation portraits", 
      tag: "High-Key",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "moody_fine_art", 
      title: "Moody Fine-Art Chiaroscuro", 
      desc: "Deep charcoal gradients with dramatic softbox shadows and painterly color grading", 
      tag: "Fine-Art",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&auto=format&fit=crop"
    },
  ],
  wedding: [
    { 
      id: "romantic_veil", 
      title: "Soft Romantic & Veil Drama", 
      desc: "Delicate backlight with sweeping veil movement and sunset glow", 
      tag: "Romantic",
      image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "bridal_editorial", 
      title: "Editorial Bridal Solo", 
      desc: "Magazine-quality lighting emphasizing gown details and bouquet", 
      tag: "Editorial",
      image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "candid_emotive", 
      title: "Unposed Emotive Moments", 
      desc: "Authentic laughter and heartfelt glances between the couple", 
      tag: "Candid",
      image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "monochrome_bw", 
      title: "Cinematic Fine-Art B&W", 
      desc: "High-contrast monochrome for a timeless, artistic memory", 
      tag: "Monochrome",
      image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800&q=80&auto=format&fit=crop"
    },
  ],
  corporate: [
    { 
      id: "executive_gray", 
      title: "Crisp Executive Headshot", 
      desc: "Neutral gray gradient backdrop with sharp, authoritative lighting", 
      tag: "Executive",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "warm_linkedin", 
      title: "Approachable Professional", 
      desc: "Engaging warm lighting tailored for LinkedIn and portfolio bio", 
      tag: "Corporate",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "creative_tech", 
      title: "Creative Industry Smart-Casual", 
      desc: "Contemporary dynamic angle with soft rim accent light", 
      tag: "Creative",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop"
    },
  ],
  general: [
    { 
      id: "signature_studio", 
      title: "Signature Studio Lighting", 
      desc: "Multi-point softbox portrait with authentic, radiant skin tones", 
      tag: "Studio",
      image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "high_key_white", 
      title: "Bright High-Key Backdrop", 
      desc: "Vibrant and clean all-white backdrop for clean portraits", 
      tag: "Bright",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "fine_art_moody", 
      title: "Moody Fine-Art Portrait", 
      desc: "Artistic chiaroscuro shadows with painterly color grading", 
      tag: "Artistic",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&auto=format&fit=crop"
    },
  ]
};

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
      specBadge,
      cleanName,
    };
  }
  if (text.includes("drone") || text.includes("aerial")) {
    return {
      icon: <Camera size={13} className="stroke-[2.2]" />,
      iconBg: "bg-sky-500/20 text-sky-400 border-sky-400/40",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("same-day") || text.includes("preview") || text.includes("rush") || text.includes("digital") || text.includes("usb") || text.includes("drive")) {
    return {
      icon: <ExternalLink size={13} className="stroke-[2.2]" />,
      iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("video") || text.includes("slideshow") || text.includes("film") || text.includes("movie") || text.includes("mtv")) {
    return {
      icon: <Video size={13} className="stroke-[2.2]" />,
      iconBg: "bg-purple-500/20 text-purple-400 border-purple-400/40",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("location") || text.includes("campus") || text.includes("church") || text.includes("venue")) {
    return {
      icon: <MapPin size={13} className="stroke-[2.2]" />,
      iconBg: "bg-orange-500/20 text-orange-400 border-orange-400/40",
      specBadge,
      cleanName,
    };
  }
  if (text.includes("hair") || text.includes("makeup") || text.includes("styling") || text.includes("gown") || text.includes("attire")) {
    return {
      icon: <Heart size={13} className="stroke-[2.2]" />,
      iconBg: "bg-rose-500/25 text-rose-400 border-rose-400/40",
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
// ── Visual Helper for Inclusion Chips (Matching Photo 1 Inclusions Card) ─────
const getInclusionConfig = (text = "") => {
  const t = text.toLowerCase();
  const isExclusion = t.includes("no free");
  const isComplimentary = t.includes("free ") || t.startsWith("free");

  const specMatch = text.match(/^([0-9]+-[0-9]+x[0-9]+|[0-9]+x[0-9]+|[0-9]+pcs\.?|[0-9]+pc\.?)\s*(.*)/i);
  const specBadge = specMatch ? specMatch[1] : null;
  const mainText = specMatch ? specMatch[2] : text;

  let icon = <Check size={11} className="stroke-[2.5]" />;
  let iconBg = "bg-amber-500/15 text-gold border-gold/30";
  let cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50";
  let textColor = "text-neutral-200";
  let badge = null;

  if (t.includes("passport") || t.includes("2x2") || t.includes("wallet") || t.includes("8x10") || t.includes("10x12") || t.includes("1x1") || t.includes("print") || t.includes("picture") || t.includes("colored")) {
    icon = <ImageIcon size={11} className="stroke-[2.2]" />;
    iconBg = "bg-amber-500/15 text-gold border-gold/30";
    cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50";
    textColor = "text-neutral-200";
  } else if (t.includes("frame") || t.includes("album") || t.includes("crystal") || t.includes("wood")) {
    icon = <Layers size={11} className="stroke-[2.2]" />;
    iconBg = "bg-stone-500/20 text-stone-300 border-stone-500/40";
    cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-stone-400/50";
    textColor = "text-neutral-200";
  } else if (t.includes("digital") || t.includes("file") || t.includes("usb") || t.includes("soft copy")) {
    icon = <ExternalLink size={11} className="stroke-[2.2]" />;
    iconBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-emerald-400/50";
    textColor = "text-neutral-200";
  } else if (t.includes("make") || t.includes("hair") || t.includes("gown") || t.includes("wardrobe") || t.includes("attire") || t.includes("pilipiña") || t.includes("styling")) {
    icon = <Heart size={11} className="stroke-[2.2]" />;
    iconBg = "bg-rose-500/25 text-rose-400 border-rose-400/40";
    cardBg = "bg-gradient-to-r from-rose-950/70 via-amber-950/40 to-neutral-900 border-rose-500/50";
    textColor = "text-rose-100 font-bold";
    badge = "Complimentary Perk";
  } else if (t.includes("studio") || t.includes("session") || t.includes("hour") || t.includes("minute")) {
    icon = <Clock size={11} className="stroke-[2.2]" />;
    iconBg = "bg-amber-500/20 text-gold border-gold/30";
    cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50";
    textColor = "text-neutral-200";
  } else if (t.includes("photo") || t.includes("shot") || t.includes("pose") || t.includes("candid") || t.includes("portrait")) {
    icon = <Camera size={11} className="stroke-[2.2]" />;
    iconBg = "bg-amber-500/15 text-gold border-gold/30";
    cardBg = "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50";
    textColor = "text-neutral-200";
  }

  if (isExclusion) {
    icon = <X size={11} className="stroke-[2.5]" />;
    iconBg = "bg-white/10 text-neutral-400 border-white/10";
    cardBg = "bg-white/[0.02] border-white/5";
    textColor = "text-neutral-500";
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

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const initialServiceSlug = searchParams.get("service");
  const initialTierName = searchParams.get("tier");
  
  const { user, profile, loading: authLoading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Customer Profile DB State & Editing
  const [customerProfile, setCustomerProfile] = useState(null);
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
        bio: yearbookMotto.trim(),
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
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [univDropdownOpen, setUnivDropdownOpen] = useState(false);
  const [degreeDropdownOpen, setDegreeDropdownOpen] = useState(false);
  const [activePegModal, setActivePegModal] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [proceedingSvcSlug, setProceedingSvcSlug] = useState(null);
  const [hoveredTierName, setHoveredTierName] = useState(null);
  const [isAddonCardHovered, setIsAddonCardHovered] = useState(false);
  const [isAddonPanelHovered, setIsAddonPanelHovered] = useState(false);
  const [isAddonCardPinned, setIsAddonCardPinned] = useState(false);
  const [showStep4ConfirmModal, setShowStep4ConfirmModal] = useState(false);
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [showReservationSuccessModal, setShowReservationSuccessModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPassUrl, setCopiedPassUrl] = useState(false);
  const qrPassRef = useRef(null);
  const tierScrollRef = useRef(null);

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

  // Body scroll lock and Escape key listener for lightbox/peg/confirmation modals
  useEffect(() => {
    if (!activePegModal && !lightboxImg && !showStep4ConfirmModal && !showOrderConfirmModal && !showReservationSuccessModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActivePegModal(null);
        setLightboxImg(null);
        setShowStep4ConfirmModal(false);
        setShowOrderConfirmModal(false);
        setShowReservationSuccessModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePegModal, lightboxImg, showStep4ConfirmModal, showOrderConfirmModal, showReservationSuccessModal]);

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
  const [selectedPresetPegs, setSelectedPresetPegs] = useState([]);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [notes, setNotes] = useState("");

  // Review Accordion Toggles
  const [reviewAccordions, setReviewAccordions] = useState({
    pkg: true,
    client: true,
    schedule: true,
    addons: true,
    pegs: true
  });

  // Submission State
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch Services & Add-ons
  useEffect(() => {
    async function fetchData() {
      const [servicesRes, addOnsRes] = await Promise.all([
        getServices(),
        getAddOns()
      ]);

      if (servicesRes.error) {
        setError("Failed to load services.");
      } else {
        const loadedServices = servicesRes.data || [];
        setServices(loadedServices);
        
        // Auto-select if passed in URL
        if (initialServiceSlug && loadedServices.length > 0) {
          const srv = loadedServices.find(s => s.slug === initialServiceSlug);
          if (srv) {
            setSelectedService(srv);
            if (initialTierName) {
              const tier = srv.tiers?.find(t => t.name === initialTierName);
              if (tier) setSelectedTier(tier);
            }
            if (initialTierName) setStep(3);
            else setStep(2);
          }
        }
      }

      if (!addOnsRes.error && addOnsRes.data) {
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
      
      setLoadingData(false);
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
      // Add-ons are completely optional - display confirmation modal before proceeding to Step 4
      setShowStep4ConfirmModal(true);
      return;
    } else if (step === 4) {
      // Validate dynamic fields based on service
      if (isCollegeService || isSeniorHighService) {
        if (!editFirstName.trim()) {
          setValidationError("Please enter your First Name for your client profile.");
          return;
        }
        if (!studentSchool.trim()) {
          setValidationError(`Please select or enter your ${isCollegeService ? "University / College" : "High School"}.`);
          return;
        }
        if (!studentBatch.trim()) {
          setValidationError("Please enter your Graduating Batch (e.g., Batch 2026).");
          return;
        }
        if (!studentSection.trim()) {
          setValidationError("Class Section is required for graduation lab batching.");
          return;
        }
        if (!studentIdNumber.trim()) {
          setValidationError("Please provide your Student ID Number.");
          return;
        }

        // Auto-save edited client profile fields directly to database
        const activeProf = customerProfile || profile;
        if (
          editFirstName.trim() !== (activeProf?.first_name || "") ||
          editMiddleName.trim() !== (activeProf?.middle_name || "") ||
          editLastName.trim() !== (activeProf?.last_name || "") ||
          editPhone.trim() !== (activeProf?.phone || "")
        ) {
          handleSaveProfile();
        }
      } else if (isWeddingService) {
        if (!brideName.trim() || !groomName.trim()) {
          setValidationError("Please enter both the Bride and Groom names.");
          return;
        }
      }
      setStep(5);
    } else if (step === 5) {
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
      setStep(6);
    } else if (step === 6) {
      // Pegs are optional
      setStep(7);
    } else if (step === 7) {
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
    }, 240);
  };

  // Submit Booking
  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    setValidationError("");

    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";

    // Build consolidated notes with metadata
    let consolidatedNotes = notes || "";
    
    if (isAcademicService) {
      const studentFullName = [editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ");
      const studentBlock = `[STUDENT DETAILS]\n• Type: ${studentType === "COLLEGE" ? "College / University" : "Senior High School"}\n• Booking Mode: ${isSchoolPartner ? "School Campus (Date set by school) [SCHOOL_PARTNER]" : "Individual Booking"}\n• Student Name: ${studentFullName || 'N/A'}\n• Middle Name: ${editMiddleName || 'N/A'}\n• School: ${studentSchool}\n• Campus / Address: ${studentSchoolAddress || 'N/A'}\n• Degree / Strand: ${studentType === "COLLEGE" ? (studentCourse || 'N/A') : (selectedShsStrand || 'N/A')}\n• Batch: ${studentBatch || 'N/A'}\n• Section: ${studentSection}\n• Student ID: ${studentIdNumber}\n• Yearbook Motto: ${yearbookMotto || 'N/A'}${schoolScheduleNote ? `\n• Note: ${schoolScheduleNote}` : ''}`;
      consolidatedNotes = consolidatedNotes ? `${studentBlock}\n\n${consolidatedNotes}` : studentBlock;
    } else if (isWeddingService) {
      const weddingBlock = `[WEDDING DETAILS]\n• Couple: ${brideName} & ${groomName}\n• Theme / Palette: ${weddingTheme || 'N/A'}\n• Ceremony Venue: ${ceremonyVenue || 'N/A'}\n• Coordinator: ${coordinatorName || 'N/A'} (${coordinatorContact || 'N/A'})`;
      consolidatedNotes = consolidatedNotes ? `${weddingBlock}\n\n${consolidatedNotes}` : weddingBlock;
    } else if (isCorporateService) {
      const corpBlock = `[CORPORATE DETAILS]\n• Company: ${companyName || 'N/A'}\n• Role: ${clientRole || 'N/A'}\n• Intended Photo Usage: ${photoUsage || 'N/A'}`;
      consolidatedNotes = consolidatedNotes ? `${corpBlock}\n\n${consolidatedNotes}` : corpBlock;
    }

    if (selectedPresetPegs.length > 0) {
      const pegsBlock = `[SELECTED STYLE PEGS]\n${selectedPresetPegs.map(p => `• ${p}`).join('\n')}`;
      consolidatedNotes = consolidatedNotes ? `${consolidatedNotes}\n\n${pegsBlock}` : pegsBlock;
    }

    const payload = {
      customer_id: user.id,
      service_id: selectedService.id,
      tier_name: selectedTier?.name || null,
      selected_add_ons: selectedAddOns.map(a => ({ name: a.name, price: parsePrice(a.price) })),
      student_details: isAcademicService ? {
        type: studentType,
        booking_mode: academicBookingMode,
        student_name: [editFirstName, editMiddleName, editLastName].filter(Boolean).join(" "),
        middle_name: editMiddleName || null,
        school: studentSchool,
        school_address: studentSchoolAddress,
        course: studentType === "COLLEGE" ? studentCourse : selectedShsStrand,
        batch: studentBatch,
        section: studentSection,
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
      setBookingResult(data);
      setStep(8);
      setShowReservationSuccessModal(true);
      
      // Record customer booking creation in audit trail
      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
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
      }

      // Background studio photographer allocation attempt
      assignPhotographer({
        id: data.id,
        service_name: selectedService.name,
        booking_date: isSchoolPartner ? null : eventDate,
        booking_time: isSchoolPartner ? null : preferredTime,
      }).catch(err => {
        console.warn("[Photographer Allocation]", err);
      });
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

  // ── STEP 8: RESERVATION SUCCESS & CAMERA-READY QR PASS ────────────────────
  if (step === 8 && bookingResult) {
    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";
    const effectiveToken = bookingResult.booking_token || bookingResult.id;
    const passUrl = typeof window !== 'undefined' ? `${window.location.origin}/pass?token=${encodeURIComponent(effectiveToken)}` : `/pass?token=${encodeURIComponent(effectiveToken)}`;

    return (
      <div className="animate-fade-in max-w-7xl mx-auto pb-24 lg:pb-16 mt-16 px-4 font-body relative">
        {/* Ambient Motion Graphics */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full bg-amber-300/6 blur-[140px] animate-float-slow-1" />
          <div className="absolute top-1/3 right-0 w-[700px] h-[700px] rounded-full bg-gold/5 blur-[130px] animate-float-slow-2" />
          <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-amber-400/5 blur-[120px] animate-float-slow-1" />
        </div>

        <div className="w-full min-w-0 relative z-10">
          <div className="rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-500 relative white-animated-gradient-bg border border-white/80 ring-1 ring-gold/25 overflow-hidden">
            
            {/* Luminous Animated Moving Gradient Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-300/35 via-gold/30 to-transparent blur-[90px] animate-float-slow-1 pointer-events-none" />
              <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-gold/40 via-amber-400/25 to-transparent blur-[100px] animate-float-slow-2 pointer-events-none" />
              <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-yellow-300/35 via-amber-300/25 to-transparent blur-[95px] animate-float-slow-1 pointer-events-none" />
            </div>

            {/* Top Status Header */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={36} className="text-amber-800" />
              </div>
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Slot Reserved • Payment Pending
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl text-neutral-950 font-bold tracking-tight">
                Booking Reserved Successfully!
              </h1>
              <p className="font-body text-neutral-600 text-xs sm:text-sm mt-2 leading-relaxed">
                Your photoshoot slot is secured under reference <strong className="text-gold font-mono">{bookingResult.booking_number}</strong>. Please settle your reservation downpayment in <strong className="text-neutral-900">Billing &amp; Payments</strong> within <span className="font-bold text-amber-900 underline decoration-amber-500">2 to 12 hours</span> to confirm your session.
              </p>
            </div>

            {/* ⏳ Reservation 2h–12h Window & 🔔 Auto-Notification Reminder Banner */}
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-neutral-950 via-[#18140c] to-neutral-950 border border-gold/40 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden z-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 grid sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-8 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-gold border border-gold/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                      <Timer size={12} /> 2h – 12h Hold Window
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                      <BellRing size={12} /> Auto-Reminders Active
                    </span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-amber-200">
                    50% Reservation Downpayment: {formattedDownPayment}
                  </h3>
                  <p className="text-xs text-neutral-300 font-body leading-relaxed">
                    Your reservation is held. Head to <strong className="text-white">Billing &amp; Payments</strong> to complete your downpayment. Automated reminder notifications have been scheduled for <strong className="text-gold">2 hours</strong>, <strong className="text-gold">6 hours</strong>, and <strong className="text-gold">12 hours</strong> so you won't lose your slot.
                  </p>
                </div>

                <div className="sm:col-span-4 flex sm:justify-end">
                  <Link
                    to="/dashboard/payments"
                    className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 font-bold px-5 py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                  >
                    <CreditCard size={15} /> Pay in Billing &amp; Payments
                  </Link>
                </div>
              </div>
            </div>

            {/* 2-Column Responsive Layout: Custom Viewfinder QR Pass (Left) & Reservation Receipt (Right) */}
            <div className="grid lg:grid-cols-12 gap-8 items-start mb-8 relative z-10">
              
              {/* ── COLUMN 1: CUSTOM STUDIO QR PASS (CAMERA VIEWFINDER RETICLE) ── */}
              <div className="lg:col-span-5 bg-gradient-to-b from-neutral-950 via-[#131218] to-neutral-950 rounded-3xl p-6 sm:p-7 text-white shadow-2xl border border-gold/40 relative overflow-hidden flex flex-col justify-between">
                
                {/* Ambient Card Glow */}
                <div className="absolute -top-24 -left-24 w-52 h-52 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 text-center">
                  
                  {/* QR Pass Header */}
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Cloud Synced
                    </span>
                    <span className="text-xs font-mono font-bold text-neutral-300">
                      {bookingResult.booking_number}
                    </span>
                  </div>

                  {/* 📸 CAMERA VIEWFINDER RETICLE FRAME (Tightly framing the QR Code) */}
                  <div className="relative inline-block my-2 mx-auto">
                    {/* 4 Precision Gold Camera Viewfinder Reticle Corners */}
                    <div className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-2 border-l-2 border-gold rounded-tl-sm pointer-events-none z-20 shadow-xs" />
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-2 border-r-2 border-gold rounded-tr-sm pointer-events-none z-20 shadow-xs" />
                    <div className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-2 border-l-2 border-gold rounded-bl-sm pointer-events-none z-20 shadow-xs" />
                    <div className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-2 border-r-2 border-gold rounded-br-sm pointer-events-none z-20 shadow-xs" />
                    
                    {/* Viewfinder Lens Axis Crosshair Markers */}
                    <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-2 h-[1px] bg-gold/70 pointer-events-none z-20" />
                    <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-2 h-[1px] bg-gold/70 pointer-events-none z-20" />
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 h-2 w-[1px] bg-gold/70 pointer-events-none z-20" />
                    <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 h-2 w-[1px] bg-gold/70 pointer-events-none z-20" />

                    {/* High-Contrast White Canvas with QR Code */}
                    <div 
                      ref={qrPassRef}
                      className="bg-white p-4 sm:p-5 rounded-2xl shadow-2xl inline-block border-2 border-gold/70 cursor-pointer hover:scale-[1.02] transition-transform group relative overflow-hidden"
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
                      <div className="absolute inset-0 bg-neutral-950/15 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
                        <span className="bg-neutral-950/90 text-gold text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-gold/30 shadow-md flex items-center gap-1.5 font-mono">
                          <QrCode size={12} /> Ready to Scan
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Token & Copy Button */}
                  <div className="mt-3 bg-white/[0.06] border border-white/10 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-mono text-neutral-300">
                    <span className="truncate max-w-[190px]">{effectiveToken}</span>
                    <button
                      type="button"
                      onClick={handleCopyPassToken}
                      className="text-[11px] font-bold text-gold hover:text-white bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedToken ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copiedToken ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {/* Dynamic Data Guarantee Note */}
                  <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-left text-[11px] text-neutral-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-gold font-semibold font-mono text-[10px] uppercase tracking-wider">
                      <Sparkles size={12} /> Permanent Pass &amp; Auto-Sync
                    </div>
                    <p className="leading-relaxed">
                      This unique QR code never changes. When downpayments are settled or orders are updated, all data automatically syncs in real-time when scanned.
                    </p>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs font-semibold">
                    <a
                      href={passUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline !border-white/20 !text-neutral-200 hover:!text-white hover:!bg-white/10 hover:!border-gold/50 py-2.5 flex items-center justify-center gap-1.5 rounded-xl transition-all"
                    >
                      <ExternalLink size={13} className="text-gold" /> Open Pass
                    </a>

                    <button
                      type="button"
                      onClick={handleDownloadPassSVG}
                      className="btn-outline !border-white/20 !text-neutral-200 hover:!text-white hover:!bg-white/10 hover:!border-gold/50 py-2.5 flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Download size={13} className="text-gold" /> Download
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPassURL}
                      className="btn-outline !border-white/20 !text-neutral-200 hover:!text-white hover:!bg-white/10 hover:!border-gold/50 py-2 flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer col-span-1"
                    >
                      {copiedPassUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gold" />}
                      {copiedPassUrl ? "URL Copied" : "Copy Link"}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="btn-outline !border-white/20 !text-neutral-200 hover:!text-white hover:!bg-white/10 hover:!border-gold/50 py-2 flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer col-span-1"
                    >
                      <Printer size={12} className="text-gold" /> Print Pass
                    </button>
                  </div>

                </div>
              </div>

              {/* ── COLUMN 2: RESERVATION RECEIPT DETAILS & BREAKDOWN ── */}
              <div className="lg:col-span-7 space-y-4">
                <div className="border border-gold/25 rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-md shadow-xl space-y-5">
                  
                  {/* Receipt Title & Reference */}
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
                    <div>
                      <span className="text-[10px] font-bold text-gold uppercase tracking-widest block font-mono">Official Reservation</span>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold text-neutral-950">Photoshoot Summary</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">Booking Number</span>
                      <span className="font-mono font-extrabold text-base sm:text-lg text-primary bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg inline-block text-amber-950">
                        {bookingResult.booking_number}
                      </span>
                    </div>
                  </div>

                  {/* Key Line Items */}
                  <div className="space-y-3 text-xs font-body">
                    
                    {/* Service & Tier */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 border border-amber-200/80 flex items-start justify-between gap-3 shadow-2xs hover:border-gold/60 transition-all">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 block font-mono">
                          Service &amp; Package
                        </span>
                        <span className="font-bold text-sm text-neutral-950 block">
                          {selectedService?.name} {selectedTier && `(${selectedTier.name})`}
                        </span>
                        {selectedTier?.duration && (
                          <span className="text-[11px] text-neutral-600 flex items-center gap-1.5 font-medium">
                            <Clock size={12} className="text-gold" /> Session Duration: {selectedTier.duration}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-neutral-950 text-base shrink-0 font-heading">₱{basePrice.toLocaleString()}</span>
                    </div>

                    {/* Student / Client Profile */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50/70 via-white to-amber-50/15 border border-neutral-200/80 space-y-2 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block font-mono">
                        Client Information
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-medium">Name:</span>
                          <span className="font-semibold text-neutral-900 block truncate">
                            {[editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") || "Client"}
                          </span>
                        </div>
                        {editPhone && (
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase font-medium">Contact:</span>
                            <span className="font-semibold text-neutral-900 block truncate">{editPhone}</span>
                          </div>
                        )}
                        {isAcademicService && studentSchool && (
                          <div className="col-span-2 pt-2 border-t border-neutral-200/60">
                            <span className="text-neutral-400 block text-[10px] uppercase font-medium">Academic Details:</span>
                            <span className="font-semibold text-gold block truncate">
                              {studentSchool} {studentCourse ? `• ${studentCourse}` : (selectedShsStrand ? `• ${selectedShsStrand}` : '')} {studentSection ? `(${studentSection})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Schedule & Location */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50/70 via-white to-amber-50/15 border border-neutral-200/80 space-y-1.5 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block font-mono">
                        Target Schedule &amp; Venue
                      </span>
                      <div className="font-medium text-neutral-900 text-xs sm:text-sm">
                        {isSchoolPartner
                          ? "Coordinated via Official School Agreement (Batch Notification)"
                          : `${eventDate || "Date TBD"} at ${STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime}`}
                      </div>
                      <div className="text-[11px] text-neutral-600 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                        <MapPin size={12} className="text-gold shrink-0" />
                        <span className="truncate">{resolvedLocation}</span>
                      </div>
                    </div>

                    {/* Add-ons List if any */}
                    {selectedAddOns.length > 0 && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-50/70 via-white to-amber-50/15 border border-neutral-200/80 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">
                            Selected Add-ons ({selectedAddOns.length})
                          </span>
                          <span className="font-bold text-gold">+₱{addOnsTotal.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          {selectedAddOns.map((a, i) => (
                            <div key={i} className="flex justify-between text-[11px] text-neutral-600">
                              <span>• {a.name}</span>
                              <span className="font-medium text-neutral-900">+₱{parsePrice(a.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Financial Breakdown Table */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-100/50 via-amber-50/40 to-amber-100/30 border border-amber-300/80 space-y-3 mt-2 shadow-xs">
                      <div className="flex justify-between items-center text-neutral-700">
                        <span className="font-medium">Total Photography Package:</span>
                        <span className="font-heading font-bold text-neutral-950 text-base">{formattedTotal}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-gold/25 to-amber-500/20 border border-gold/60 text-amber-950 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Timer size={15} className="text-amber-900" />
                          <span className="text-xs sm:text-sm">50% Downpayment Due (2h–12h Window):</span>
                        </div>
                        <span className="text-base sm:text-lg text-amber-950 font-extrabold font-heading">{formattedDownPayment}</span>
                      </div>

                      <div className="flex justify-between text-xs text-neutral-600 pt-0.5">
                        <span>Remaining Balance (Due on shoot day):</span>
                        <span className="font-semibold text-neutral-900">{formattedRemaining}</span>
                      </div>
                    </div>

                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 space-y-2.5">
                    <Link
                      to="/dashboard/payments"
                      className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm font-bold !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 shadow-xl shadow-gold/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer rounded-2xl"
                    >
                      <CreditCard size={16} /> Pay Downpayment in Billing &amp; Payments <ArrowRight size={16} />
                    </Link>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        to={`/dashboard/bookings/${bookingResult.id}`}
                        className="btn-outline w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl hover:border-gold transition-colors"
                      >
                        <FileText size={13} className="text-gold" /> Order Details
                      </Link>
                      <Link
                        to="/dashboard/bookings"
                        className="btn-outline w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl hover:border-gold transition-colors"
                      >
                        My Bookings
                      </Link>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* ── Full-Width Companion App & Mobile Scanner Banner ── */}
            <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-neutral-950 via-[#18140e] to-neutral-950 p-5 text-left text-white shadow-xl relative overflow-hidden z-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <h4 className="font-heading text-sm sm:text-base font-bold text-gold">
                      Track Your Booking Live on Mobile
                    </h4>
                    <p className="text-xs text-neutral-300 font-body leading-relaxed max-w-xl mt-0.5">
                      Scan your QR pass with any iPhone or Android camera to view live studio updates. Install the <strong className="text-white">E-Kodak Companion App</strong> for real-time milestone notifications and photo delivery alerts.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1 font-mono">
                    <Check size={13} /> Mobile Camera Ready
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const stepTitles = [
    "Service", "Package Tier", "Add-ons", "Client Details", "Schedule & Studio", "Style Pegs", "Review"
  ];

  const stepSubtitles = [
    "Choose your photography service",
    "Select your package tier",
    "Enhance with optional extras",
    "Provide identification details",
    "Pick date, time & location",
    "Set your style inspiration",
    "Review & confirm your booking"
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-24 lg:pb-16 mt-16 px-4 font-body relative">
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
            <p className="text-[10px] text-neutral-300 uppercase tracking-wider font-medium">Total Balance</p>
            <p className="font-heading font-bold text-xl text-white">{formattedTotal}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-gold font-bold">{formattedDownPayment}</p>
              <p className="text-[10px] text-neutral-400">50% down</p>
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

      {/* Preset Peg Lightbox Preview Modal rendered via Portal outside layout & stepper context */}
      {activePegModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
          onClick={() => setActivePegModal(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
                  {activePegModal.tag} Style Reference
                </span>
                <h3 className="font-heading text-base font-bold text-primary">
                  {activePegModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePegModal(null)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 bg-neutral-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img 
                src={activePegModal.image} 
                alt={activePegModal.title} 
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-600 font-body">
                {activePegModal.desc}
              </p>
              <button
                type="button"
                onClick={() => {
                  togglePresetPeg(activePegModal);
                  setActivePegModal(null);
                }}
                className={`btn-primary text-xs py-2 px-4 shrink-0 font-bold ${
                  selectedPresetPegs.includes(activePegModal.title) ? "!bg-emerald-600 !text-white" : ""
                }`}
              >
                {selectedPresetPegs.includes(activePegModal.title) ? "Selected ✓" : "Select this Peg"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal Before Step 4 */}
      {showStep4ConfirmModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setShowStep4ConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-neutral-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-gold/40 my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Golden top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs font-mono">
                    <Sparkles size={11} className="text-gold" /> Step 3 Confirmation
                  </span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Confirm Selections
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStep4ConfirmModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Price banner strictly on left top-side format */}
            <div className="px-6 py-3 bg-neutral-900/90 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse shrink-0" />
                <span className="font-heading font-bold text-neutral-200 text-xs sm:text-sm tracking-tight">
                  Total Balance : <span className="text-gold font-extrabold">{formattedTotal}</span> | Downpayment: <span className="text-amber-400 font-extrabold">{formattedDownPayment}</span> / 50%
                </span>
              </div>
            </div>

            {/* Modal Body: Photo 1 Hierarchy (NO PRICES INSIDE CARDS) */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid sm:grid-cols-2 gap-3.5">
                {/* Package Main Card (NO PRICE) */}
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-900/90 p-4 flex flex-col justify-between shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gold/30 relative">
                      <img 
                        src={selectedService?.coverImage || selectedService?.cover_image || SERVICE_COVER_MAP[selectedService?.slug] || "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=400&q=80"}
                        alt={selectedService?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-gold/80 block font-mono">
                        Package
                      </span>
                      <h4 className="font-heading font-bold text-white text-sm truncate mt-0.5">
                        {selectedService?.name || "Selected Package"}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Selected Set Mini Card (NO PRICE) */}
                <div className="relative rounded-2xl overflow-hidden border border-gold/45 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/25 p-4 flex flex-col justify-between shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center shrink-0 shadow-inner">
                      <span className="font-heading font-black text-gold text-lg">
                        {selectedTier?._idx !== undefined
                          ? ["I", "II", "III", "IV", "V", "VI"][selectedTier._idx] || "I"
                          : (selectedTier?.name?.match(/set\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() || "I")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-gold block font-mono">
                        Set
                      </span>
                      <h4 className="font-heading font-bold text-white text-sm truncate mt-0.5">
                        {selectedTier?.name || "Standard Set"}
                      </h4>
                      <span className="text-[11px] text-neutral-300 font-mono">
                        {(selectedTier?.highlights || selectedTier?.inclusions || []).length} Inclusions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inclusions Preview */}
              {(selectedTier?.highlights || selectedTier?.inclusions || []).length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-3.5 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold/70 font-mono">
                    What's Included
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {(selectedTier?.highlights || selectedTier?.inclusions || []).slice(0, 6).map((h, i) => {
                      const cfg = getInclusionConfig(h);
                      return (
                        <div key={i} className="flex items-center gap-2 p-1.5 px-2 rounded-lg bg-black/40 border border-white/10">
                          <div className={`w-4 h-4 rounded ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                            {cfg.icon}
                          </div>
                          <span className="text-[11px] text-neutral-200 truncate">
                            {cfg.mainText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Add-ons Mini List (NO PRICE) */}
              {selectedAddOns.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-gold" />
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                      Add-ons ({selectedAddOns.length})
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-1.5 pt-1">
                    {selectedAddOns.map((addon, idx) => {
                      const visuals = getAddOnVisuals(addon.name, addon.category);
                      return (
                        <div 
                          key={idx}
                          className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${visuals.iconBg}`}>
                              {visuals.icon}
                            </div>
                            <span className="text-xs text-neutral-200 font-medium truncate">
                              {visuals.cleanName}
                            </span>
                          </div>
                          {visuals.specBadge && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-mono shrink-0">
                              {visuals.specBadge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-neutral-900/90 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowStep4ConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStep4ConfirmModal(false);
                  setStep(4);
                }}
                className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 font-bold px-6 py-2.5 text-xs tracking-wider shadow-lg shadow-gold/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check size={16} className="stroke-[3]" /> Confirm &amp; Proceed to Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Order Confirmation Modal Before Step 8 (QR Pass) ────────── */}
      {showOrderConfirmModal && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-neutral-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-gold/40 my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Golden top decorative bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs font-mono">
                    <Sparkles size={11} className="text-gold" /> Pre-Submission Verification
                  </span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Confirm Your Reservation
                </h3>
                <p className="text-xs text-neutral-400 font-body mt-1">
                  Please review your photoshoot session details before we generate your digital QR pass.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                disabled={isSubmitting}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Price banner */}
            <div className="px-6 py-3 bg-neutral-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse shrink-0" />
                <span className="font-heading font-bold text-neutral-200 text-xs sm:text-sm tracking-tight">
                  Total Package : <span className="text-gold font-extrabold">{formattedTotal}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-neutral-400">
                  Down Payment (50%): <span className="text-amber-400 font-bold">{formattedDownPayment}</span>
                </span>
                <span className="text-neutral-400 hidden sm:inline">•</span>
                <span className="text-neutral-400">
                  At Studio: <span className="text-white font-bold">{formattedRemaining}</span>
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar font-body">
              
              {/* Package & Inclusions Card */}
              <div className="rounded-2xl border border-white/15 bg-neutral-900/90 p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-gold" />
                    <span className="font-heading font-bold text-sm text-white">
                      {selectedService?.name} — <span className="text-gold">{selectedTier?.name || "Standard"}</span>
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-gold">₱{basePrice.toLocaleString()}</span>
                </div>

                {/* Inclusions List */}
                {tierInclusions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Package Inclusions ({tierInclusions.length} items)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tierInclusions.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-neutral-300">
                          <Check size={13} className="text-emerald-400 mt-0.5 shrink-0 stroke-[2.5]" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Client / Student Information (Important Only) */}
              <div className="rounded-2xl border border-white/15 bg-neutral-900/90 p-4 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    {isAcademicService ? <GraduationCap size={16} className="text-gold" /> : <User size={16} className="text-blue-400" />}
                    <span className="font-heading font-bold text-sm text-white">
                      {isAcademicService ? "Student Details" : "Client Details"}
                    </span>
                  </div>
                  {isAcademicService && studentIdNumber && (
                    <span className="text-[11px] font-mono text-gold bg-gold/15 px-2 py-0.5 rounded border border-gold/30">
                      ID: {studentIdNumber}
                    </span>
                  )}
                </div>

                {isAcademicService ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 block font-medium">Student Name</span>
                      <span className="font-bold text-white text-sm">
                        {[editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") || "Student Name"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 block font-medium">School / Campus</span>
                      <span className="font-medium text-neutral-200 truncate block" title={studentSchool}>
                        {studentSchool || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 block font-medium">
                        {studentType === "COLLEGE" ? "Degree / Course" : "Academic Strand"}
                      </span>
                      <span className="font-medium text-neutral-200">
                        {studentType === "COLLEGE" ? (studentCourse || "N/A") : (selectedShsStrand || "N/A")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 block font-medium">Section &amp; Batch</span>
                      <span className="font-bold text-gold">
                        {studentSection || "N/A"} • <span className="text-neutral-300 font-normal">{studentBatch || "Batch 2026"}</span>
                      </span>
                    </div>
                    {yearbookMotto && (
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] uppercase text-gold block font-semibold">Yearbook Motto</span>
                        <p className="italic text-neutral-300 mt-0.5">&quot;{yearbookMotto}&quot;</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 block font-medium">Client Name</span>
                      <span className="font-bold text-white">
                        {[editFirstName, editLastName].filter(Boolean).join(" ") || "Client"}
                      </span>
                    </div>
                    {editPhone && (
                      <div>
                        <span className="text-[10px] uppercase text-neutral-400 block font-medium">Contact Phone</span>
                        <span className="font-medium text-neutral-200">{editPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photoshoot Schedule & Location */}
              <div className="rounded-2xl border border-white/15 bg-neutral-900/90 p-4 shadow-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Calendar size={16} className="text-gold" />
                  <span className="font-heading font-bold text-sm text-white">Schedule &amp; Location</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-medium">Date &amp; Time</span>
                    <span className="font-bold text-neutral-200 block mt-0.5">
                      {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                        ? "Official School Batch Schedule (Agreed with School)"
                        : `${eventDate || "Date TBD"} at ${STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime || "TBD"}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-medium">Pictorial Venue</span>
                    <span className="font-bold text-neutral-200 block mt-0.5 truncate" title={resolvedLocation}>
                      {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS"
                        ? `On-Campus (${studentSchool || "School Campus"})`
                        : resolvedLocation}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Add-ons (if any) */}
              {selectedAddOns.length > 0 && (
                <div className="rounded-2xl border border-white/15 bg-neutral-900/90 p-4 shadow-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
                      <PlusCircle size={15} className="text-gold" /> Selected Add-ons ({selectedAddOns.length})
                    </span>
                    <span className="font-bold text-gold">+₱{addOnsTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    {selectedAddOns.map((a, i) => (
                      <div key={i} className="flex justify-between text-neutral-300 py-0.5">
                        <span>• {a.name}</span>
                        <span className="font-semibold text-gold">+₱{parsePrice(a.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slot Reservation Hold Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                <Timer size={18} className="text-gold shrink-0 mt-0.5" />
                <span>
                  Confirming will place your photoshoot slot on <strong className="text-amber-100">Reserved</strong> status. You will have a <span className="text-white font-semibold underline decoration-gold">2-hour to 12-hour window</span> to settle your 50% reservation downpayment of <strong>₱{downPaymentAmount.toLocaleString()}</strong> in Billing &amp; Payments.
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-neutral-900/90 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => !isSubmitting && setShowOrderConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                disabled={isSubmitting}
              >
                <ArrowLeft size={14} /> Back to Review
              </button>

              <button
                type="button"
                onClick={handleSubmitBooking}
                disabled={isSubmitting}
                className="btn-primary !bg-gradient-to-r !from-amber-400 !via-gold !to-amber-500 !text-neutral-950 font-bold px-6 py-2.5 text-xs tracking-wider shadow-lg shadow-gold/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                      2-Hour to 12-Hour Payment Window
                    </h4>
                    <p className="text-neutral-300 leading-relaxed">
                      Your schedule slot is temporarily held under <strong className="text-amber-200">Reserved</strong> status. Please settle your 50% reservation downpayment of <strong className="text-gold font-bold">₱{downPaymentAmount.toLocaleString()}</strong> in <strong className="text-white">Billing &amp; Payments</strong> within <span className="underline decoration-gold text-white font-semibold">2 to 12 hours</span> to secure your photographer and session.
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
                      Auto-Notification Reminders Active
                    </h4>
                    <p className="text-neutral-300 leading-relaxed">
                      Our system has automatically scheduled reminder alerts at <strong className="text-blue-200">2 hours</strong>, <strong className="text-blue-200">6 hours</strong>, and <strong className="text-blue-200">12 hours</strong>. You will receive real-time notifications on your client portal and companion app so your reservation stays protected.
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


      {/* ── Top Editorial Hero Banner with Studio Philippine Time ────────── */}
      <div className="mb-8">
        <Link to="/services" className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-gold transition-colors font-body text-xs mb-3">
          <ArrowLeft size={14} /> Back to Services Catalog
        </Link>

        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#121c2d] p-6 sm:p-7 shadow-xl border border-neutral-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-primary/25 rounded-full blur-3xl translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                <Sparkles size={12} className="text-gold" /> E-KODAK STUDIO CLIENT PORTAL
              </span>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white font-bold tracking-tight">
                Welcome back,{' '}
                <span className="text-gold italic font-normal">{customerProfile?.first_name || profile?.first_name || user?.user_metadata?.first_name || 'Client'}</span>
              </h1>

              <p className="text-neutral-300 font-body text-xs sm:text-sm max-w-lg leading-relaxed">
                Review your photo deliverables, schedule your next photoshoot, or track studio order milestones.
              </p>

              {/* Actions + Integrated Quick Tools Dock */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-gold/20 hover:scale-105 transition-all"
                >
                  <Camera size={15} /> Book a Session
                </button>

                <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1 backdrop-blur-md shadow-xs">
                  <button
                    type="button"
                    onClick={() => triggerAIAssistant()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95"
                    title="Studio Concierge"
                  >
                    <Sparkles size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/bookings')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95"
                    title="My Bookings"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/progress')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95"
                    title="Session Milestones"
                  >
                    <Clock size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/gallery')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95"
                    title="Photo Deliverables"
                  >
                    <ImageIcon size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <LiveClock variant="card" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Full-width horizontal space matching steps 1 to 7 */}
      <div className="flex flex-col w-full items-start">
        
        {/* Active Step Form Area */}
        <div className="w-full min-w-0">
          <div className="rounded-3xl p-6 sm:p-9 shadow-2xl transition-all duration-500 relative white-animated-gradient-bg border border-white/80 ring-1 ring-gold/25">
            
            {/* Luminous Animated Moving Gradient Orbs within the White Canvas */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-300/35 via-gold/30 to-transparent blur-[90px] animate-float-slow-1" />
              <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-gold/40 via-amber-400/25 to-transparent blur-[100px] animate-float-slow-2" />
              <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-yellow-300/35 via-amber-300/25 to-transparent blur-[95px] animate-float-slow-1" />
            </div>

            {/* Step Progress Stepper with Animated Focus on Active Numerical Values */}
            <div className="flex items-center justify-between mb-10 relative px-2 z-10">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 rounded-full bg-neutral-200/90" />
              <motion.div 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-gold-dark via-gold to-amber-500 rounded-full" 
                initial={false}
                animate={{ width: `calc(${((step - 1) / 6) * 100}% * ((100% - 32px) / 100))` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              {[1, 2, 3, 4, 5, 6, 7].map((s) => {
                const isActive = step === s;
                const isCompleted = step > s;
                return (
                  <div key={s} className="relative flex flex-col items-center">
                    <motion.div 
                      onClick={() => {
                        if (s < step) {
                          setStep(s);
                        } else if (step === 3 && s === 4) {
                          setShowStep4ConfirmModal(true);
                        }
                      }}
                      animate={{
                        scale: isActive ? 1.25 : 1,
                        y: isActive ? -4 : 0,
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 22 }}
                      className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-body text-xs font-bold transition-all shadow-md ${
                        isActive 
                          ? "bg-neutral-950 text-white font-black ring-4 ring-gold/40 shadow-lg shadow-neutral-950/20" 
                          : isCompleted 
                          ? "bg-gold text-white cursor-pointer hover:scale-110" 
                          : "bg-white/95 border border-neutral-300/90 text-neutral-500 shadow-xs"
                      }`}
                    >
                      {isCompleted ? <Check size={14} className="stroke-[3]" /> : s}
                    </motion.div>
                    <motion.span 
                      animate={{
                        scale: isActive ? 1.05 : 1,
                        color: isActive ? "#1a1a1a" : isCompleted ? "#a8843a" : "#737373"
                      }}
                      className={`hidden sm:block absolute top-12 text-[11px] whitespace-nowrap tracking-tight transition-colors ${
                        isActive ? "font-bold text-neutral-900" : "font-medium text-neutral-500"
                      }`}
                    >
                      {stepTitles[s-1]}
                    </motion.span>
                  </div>
                );
              })}
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-body border border-red-200 flex items-start gap-2.5 animate-shake relative z-10">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleNext}>
              
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: SELECT PHOTOGRAPHY SERVICE (HORIZONTAL STACKED CARDS)
              ───────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="py-2 overflow-visible"
                >
                  {loadingData ? (
                    <div className="py-24 text-center text-neutral-400">
                      <Loader2 className="animate-spin mx-auto mb-3 text-gold" size={28} />
                      <p className="text-xs font-medium tracking-wide">Loading photography packages...</p>
                    </div>
                  ) : (
                    <div className="relative py-2 overflow-visible">
                      {/* Section Title */}
                      <div className="text-center mb-4 sm:mb-6 relative z-10">
                        <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-1.5 shadow-xs">
                          Studio Collections
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                          Select a package
                        </h2>
                        <p className="text-xs text-neutral-600 font-body mt-1">
                          Hover over any photography package to reveal details and proceed
                        </p>
                      </div>

                      {/* Horizontally Stacked Overlapping Cards with Generous Clearance */}
                      <div 
                        onMouseLeave={() => setHoveredServiceId(null)}
                        className="relative z-10 flex flex-row flex-nowrap justify-center items-center -space-x-12 sm:-space-x-20 pt-20 sm:pt-24 pb-16 sm:pb-20 px-6 min-h-[660px] sm:min-h-[700px] overflow-visible no-scrollbar"
                      >
                        {services.map((svc, index) => {
                          const isSelected = selectedService?.id === svc.id;
                          const isHovered = hoveredServiceId === svc.id;
                          const isAnyHovered = hoveredServiceId !== null;
                          const isOtherHovered = isAnyHovered && !isHovered;
                          
                          // Subtle fanned rotation
                          const total = services.length;
                          const centerOffset = index - (total - 1) / 2;
                          const defaultRotate = centerOffset * 3;
                          const defaultY = Math.abs(centerOffset) * 6;

                          const coverImg = svc.coverImage || svc.cover_image || SERVICE_COVER_MAP[svc.slug] || "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=80&auto=format&fit=crop";

                          const minPrice = svc.tiers?.length 
                            ? Math.min(...svc.tiers.map(t => parsePrice(t.price)).filter(Boolean)) 
                            : parsePrice(svc.base_price);

                          return (
                            <motion.div 
                              key={svc.id || svc.slug}
                              onMouseEnter={() => setHoveredServiceId(svc.id)}
                              onClick={() => handleSelectPackage(svc)}
                              animate={{
                                rotate: isHovered ? 0 : defaultRotate,
                                y: isHovered ? -28 : (isOtherHovered ? defaultY + 8 : defaultY),
                                scale: isHovered ? 1.08 : (isOtherHovered ? 0.93 : 1),
                                zIndex: isHovered ? 50 : (isSelected ? 30 : index + 10),
                                filter: isOtherHovered ? "blur(6px) brightness(0.6)" : "blur(0px) brightness(1)",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 26,
                                mass: 0.8
                              }}
                              style={{ transformOrigin: "center center" }}
                              className="relative shrink-0 cursor-pointer"
                            >
                              {/* Ambient Backlight Glow behind hovered card */}
                              {isHovered && (
                                <motion.div 
                                  layoutId="card-hover-glow"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute -inset-4 rounded-[32px] bg-gradient-to-r from-gold/30 via-amber-400/20 to-gold/30 blur-2xl -z-10 pointer-events-none"
                                />
                              )}

                              {/* Inner Card (clipped for imagery and gradients) */}
                              <div 
                                className={`relative w-[300px] sm:w-[350px] h-[500px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 border-2 ${
                                  isSelected 
                                    ? 'border-gold ring-4 ring-gold/40' 
                                    : isHovered 
                                    ? 'border-gold shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_rgba(201,169,110,0.4)]' 
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

                                {/* Card Header: Iconized Badge (Expands on hover) & Sets Badge */}
                                <div className="relative z-20 p-5 flex items-center justify-between">
                                  <motion.div 
                                    layout
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-sm"
                                  >
                                    {getServiceIcon(svc)}
                                    <AnimatePresence>
                                      {isHovered && (
                                        <motion.span 
                                          initial={{ opacity: 0, width: 0 }}
                                          animate={{ opacity: 1, width: "auto" }}
                                          exit={{ opacity: 0, width: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="text-[11px] font-bold uppercase tracking-wider text-neutral-100 whitespace-nowrap overflow-hidden ml-1"
                                        >
                                          {getServiceDisplayName(svc)}
                                        </motion.span>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>

                                  <div className="flex items-center gap-2">
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-gold text-neutral-950 flex items-center justify-center shadow-md border border-white/50"
                                        title="Selected Package"
                                      >
                                        <Check size={13} className="stroke-[3.5]" />
                                      </motion.div>
                                    )}
                                    {svc.tiers && (
                                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gold/20 text-gold-light border border-gold/30 backdrop-blur-md">
                                        {svc.tiers.length} Sets
                                      </span>
                                    )}
                                  </div>
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
                                      <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block">
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
                <div className="space-y-6 animate-fade-in overflow-visible">
                  {/* Section Title matching Step 1 layout */}
                  <div className="text-center mb-4 sm:mb-6 relative z-10">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-1.5 shadow-xs">
                      {selectedService?.name || "Studio Collections"}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                      Choose your package sets
                    </h2>
                    <p className="text-xs text-neutral-600 font-body mt-1">
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
                    <div className="relative -mx-6 sm:-mx-9 overflow-visible">

                      {/* ── WHITE GRADIENT STAGE (matches page bg) ── */}
                      <div
                        className="relative w-full rounded-2xl overflow-visible white-animated-gradient-bg"
                        style={{ border: "1px solid rgba(201,169,110,0.18)" }}
                      >
                        {/* Gold ambient tint orbs */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                          <div className="absolute -top-16 left-1/4 w-[400px] h-[250px] rounded-full bg-amber-300/20 blur-[80px] animate-float-slow-1" />
                          <div className="absolute -top-8 right-1/4 w-[350px] h-[200px] rounded-full bg-gold/15 blur-[70px] animate-float-slow-2" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[120px] rounded-full bg-amber-200/20 blur-[60px]" />
                        </div>

                        {/* Hairline gold border at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent pointer-events-none rounded-b-2xl" />

                        {/* ── CARD TRACK: STACKED HORIZONTALLY (STEP 1 HOVER EXPERIENCE) ── */}
                        <div
                          ref={tierScrollRef}
                          onMouseLeave={() => setHoveredTierName(null)}
                          className="relative z-10 flex flex-row flex-nowrap justify-center items-center -space-x-10 sm:-space-x-16 pt-16 sm:pt-20 pb-16 px-6 overflow-visible no-scrollbar"
                          style={{ scrollBehavior: "smooth", minHeight: 520 }}
                        >
                          {selectedService.tiers.map((tier, idx) => {
                            const isTierSelected = selectedTier?._idx !== undefined
                              ? selectedTier._idx === idx
                              : (selectedTier?.name === tier.name && (selectedTier?.price ? selectedTier.price === tier.price : true));

                            const isHovered = hoveredTierName === tier.name;
                            const isOtherHovered = hoveredTierName !== null && !isHovered;
                            const isBestValue = idx === 0 || tier.popular;
                            const coverImg =
                              selectedService?.galleryImages?.[idx % (selectedService.galleryImages?.length || 1)] ||
                              selectedService?.coverImage ||
                              "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=900&q=80&auto=format&fit=crop";

                            const romanNumerals = ["I", "II", "III", "IV", "V", "VI"];
                            const roman = romanNumerals[idx] || String(idx + 1);
                            const total = selectedService.tiers.length;
                            const centerOffset = idx - (total - 1) / 2;
                            const defaultRotate = centerOffset * 2.8;
                            const defaultY = Math.abs(centerOffset) * 6;
                            const showPanelLeft = total > 2 ? idx >= Math.ceil(total / 2) : (idx === total - 1 && total > 1);

                            return (
                              <motion.div
                                key={tier.name || idx}
                                onMouseEnter={() => setHoveredTierName(tier.name)}
                                onMouseLeave={() => setHoveredTierName(null)}
                                onClick={() => { setSelectedTier({ ...tier, _idx: idx }); setValidationError(""); }}
                                animate={{
                                  rotate: isHovered ? 0 : defaultRotate,
                                  y: isHovered ? -26 : (isOtherHovered ? defaultY + 8 : defaultY),
                                  scale: isHovered ? 1.08 : (isOtherHovered ? 0.93 : 1),
                                  zIndex: isHovered ? 60 : (isTierSelected ? 30 : idx + 10),
                                  filter: isOtherHovered ? "blur(3px) brightness(0.7)" : "blur(0px) brightness(1)",
                                }}
                                transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.8 }}
                                style={{ transformOrigin: "bottom center" }}
                                className="relative shrink-0 cursor-pointer"
                              >
                                {/* Active selected glow ring */}
                                {isTierSelected && (
                                  <motion.div
                                    className="absolute -inset-3 rounded-[36px] pointer-events-none -z-10"
                                    animate={{ opacity: [0.65, 1, 0.65] }}
                                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                                    style={{
                                      background: "radial-gradient(ellipse at 50% 85%, rgba(201,169,110,0.7) 0%, rgba(245,158,11,0.25) 50%, transparent 75%)",
                                      filter: "blur(16px)",
                                    }}
                                  />
                                )}

                                {/* Hover glow */}
                                <AnimatePresence>
                                  {isHovered && !isTierSelected && (
                                    <motion.div
                                      key="tier-glow"
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.85 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute -inset-4 rounded-[36px] pointer-events-none -z-10"
                                      style={{
                                        background: "radial-gradient(ellipse at 50% 80%, rgba(201,169,110,0.5) 0%, transparent 70%)",
                                        filter: "blur(20px)",
                                      }}
                                    />
                                  )}
                                </AnimatePresence>

                                {/* ── CARD SHELL ── */}
                                <div
                                  className={`relative w-[250px] sm:w-[265px] rounded-3xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${
                                    isTierSelected
                                      ? "border-gold ring-2 ring-gold/50 shadow-[0_0_40px_rgba(201,169,110,0.55),0_20px_45px_rgba(0,0,0,0.75)]"
                                      : isHovered
                                      ? "border-gold/70 shadow-[0_25px_50px_-5px_rgba(0,0,0,0.8),0_0_30px_rgba(201,169,110,0.35)]"
                                      : "border-white/20 shadow-xl"
                                  }`}
                                  style={{ height: 400 }}
                                >
                                  <motion.img
                                    src={coverImg}
                                    alt={tier.name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    animate={{ scale: isHovered ? 1.1 : 1.0 }}
                                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent z-10 pointer-events-none" />
                                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent z-10 pointer-events-none" />

                                  {/* TOP: Prominently Highlighted Set Number (Keywords removed) */}
                                  <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-start justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(201,169,110,0.4)]">
                                        <span
                                          className="font-heading font-black text-gold text-2xl leading-none"
                                          style={{ textShadow: "0 0 20px rgba(201,169,110,0.9)" }}
                                        >
                                          {roman}
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-[0.25em] text-gold/70 font-bold leading-none">Collection</span>
                                        <span className="text-[13px] font-heading font-black text-white leading-tight mt-0.5">Set {roman}</span>
                                      </div>
                                    </div>
                                    {/* Best value removed as requested */}
                                  </div>

                                  {/* BOTTOM: Name + Rate + Check Icon Selection */}
                                  <div className="absolute bottom-0 left-0 right-0 z-20">
                                    <div className="px-5 pt-2 pb-1.5">
                                      <h3 className="font-heading font-extrabold text-white leading-tight drop-shadow-md text-lg">
                                        {tier.name}
                                      </h3>
                                      <p className="text-[10px] text-gold/70 font-semibold mt-0.5">
                                        {tier.highlights?.length || 0} inclusions · hover to view
                                      </p>
                                    </div>

                                    {/* Price & Check Button */}
                                    <div className="px-5 pb-4 pt-2.5 border-t border-white/15 bg-black/60 backdrop-blur-md flex items-center justify-between gap-3">
                                      <div>
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 block leading-none mb-1">
                                          Rate
                                        </span>
                                        <span
                                          className="font-heading font-black text-gold text-2xl sm:text-[1.65rem] leading-none block"
                                          style={{ textShadow: isHovered || isTierSelected ? "0 0 16px rgba(201,169,110,0.9)" : "none" }}
                                        >
                                          {tier.price}
                                        </span>
                                      </div>

                                      {/* Select button replaced as Check Icon */}
                                      <motion.button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTier({ ...tier, _idx: idx });
                                          setValidationError("");
                                        }}
                                        whileHover={{ scale: 1.12 }}
                                        whileTap={{ scale: 0.9 }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md ${
                                          isTierSelected
                                            ? "bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 ring-2 ring-gold/50 shadow-[0_0_18px_rgba(201,169,110,0.85)]"
                                            : "border-2 border-white/35 hover:border-gold text-white/40 hover:text-gold bg-white/10 hover:bg-gold/20"
                                        }`}
                                        title={isTierSelected ? "Selected" : "Select this set"}
                                      >
                                        <Check size={isTierSelected ? 20 : 17} className={isTierSelected ? "stroke-[3.5]" : "stroke-[2.5]"} />
                                      </motion.button>
                                    </div>
                                  </div>
                                </div>

                                {/* ────── RIGHT-SIDE INCLUSIONS PANEL (MODERN MINI-CARD MATCHING SETS CARD) ────── */}
                                <AnimatePresence>
                                  {isHovered && tier.highlights && tier.highlights.length > 0 && (
                                    <motion.div
                                      key="inclusions-panel"
                                      initial={{ opacity: 0, x: showPanelLeft ? 18 : -18, scale: 0.95 }}
                                      animate={{ opacity: 1, x: 0, scale: 1 }}
                                      exit={{ opacity: 0, x: showPanelLeft ? 18 : -18, scale: 0.95 }}
                                      transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.65 }}
                                      className="absolute top-0 pointer-events-none z-[75]"
                                      style={{
                                        [showPanelLeft ? "right" : "left"]: "calc(100% + 14px)",
                                        width: tier.highlights.length > 8 ? 470 : 430,
                                      }}
                                    >
                                      {/* Luxury Obsidian Glass Mini-Card Matching the Sets Card */}
                                      <div
                                        className="rounded-3xl overflow-hidden pointer-events-auto transition-all duration-300 relative shadow-2xl"
                                        style={{
                                          background: "linear-gradient(165deg, rgba(24, 22, 20, 0.97) 0%, rgba(12, 11, 10, 0.98) 100%)",
                                          border: "1px solid rgba(201, 169, 110, 0.45)",
                                          boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 30px rgba(201,169,110,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
                                          backdropFilter: "blur(20px)",
                                        }}
                                      >
                                        {/* Golden luxury top accent line */}
                                        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

                                        {/* Editorial Header */}
                                        <div
                                          className="px-4 py-3 flex items-center justify-between gap-3"
                                          style={{
                                            background: "linear-gradient(90deg, rgba(201,169,110,0.14) 0%, rgba(255,255,255,0.02) 100%)",
                                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                                          }}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center shadow-xs text-gold shrink-0">
                                              <span className="font-heading font-black text-gold text-sm leading-none">{roman}</span>
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold/70 leading-none font-mono">
                                                What's Included
                                              </p>
                                              <h3 className="text-lg font-heading font-black text-white leading-tight mt-0.5">
                                                {tier.name}
                                              </h3>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-mono shadow-2xs">
                                              {tier.highlights.length} Inclusions
                                            </span>
                                          </div>
                                        </div>

                                        {/* Inclusions List - Non-scrollable, balanced 2-column or 3-column micro-grid */}
                                        <div className="p-3">
                                          <div className={`grid ${tier.highlights.length > 8 ? "grid-cols-3" : "grid-cols-2"} gap-1.5`}>
                                            {tier.highlights.map((h, i) => {
                                              const isExclusion = h.toLowerCase().includes("no free");
                                              const isComplimentary = h.toLowerCase().includes("free ") || h.toLowerCase().startsWith("free");

                                              // Parse leading specs/quantity if present
                                              const specMatch = h.match(/^([0-9]+-[0-9]+x[0-9]+|[0-9]+x[0-9]+|[0-9]+pcs\.?|[0-9]+pc\.?)\s*(.*)/i);
                                              const specBadge = specMatch ? specMatch[1] : null;
                                              const mainText = specMatch ? specMatch[2] : h;

                                              // Complimentary items span full width across all columns
                                              const isFullWidth = isComplimentary;

                                              const getIconConfig = (text) => {
                                                const t = text.toLowerCase();
                                                if (t.includes("passport") || t.includes("2x2") || t.includes("wallet") || t.includes("8x10") || t.includes("10x12") || t.includes("1x1") || t.includes("print") || t.includes("picture") || t.includes("colored"))
                                                  return {
                                                    icon: <ImageIcon size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-amber-500/15 text-gold border-gold/30",
                                                    cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50",
                                                    textColor: "text-neutral-200",
                                                  };
                                                if (t.includes("frame") || t.includes("album") || t.includes("crystal") || t.includes("wood"))
                                                  return {
                                                    icon: <Layers size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-stone-500/20 text-stone-300 border-stone-500/40",
                                                    cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-stone-400/50",
                                                    textColor: "text-neutral-200",
                                                  };
                                                if (t.includes("digital") || t.includes("file") || t.includes("usb") || t.includes("soft copy"))
                                                  return {
                                                    icon: <ExternalLink size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                                                    cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-emerald-400/50",
                                                    textColor: "text-neutral-200",
                                                  };
                                                if (t.includes("make") || t.includes("hair") || t.includes("gown") || t.includes("wardrobe") || t.includes("attire") || t.includes("pilipiña") || t.includes("styling"))
                                                  return {
                                                    icon: <Heart size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-rose-500/25 text-rose-400 border-rose-400/40",
                                                    cardBg: "bg-gradient-to-r from-rose-950/70 via-amber-950/40 to-neutral-900 border-rose-500/50",
                                                    textColor: "text-rose-100 font-bold",
                                                    badge: "Complimentary Perk",
                                                  };
                                                if (t.includes("studio") || t.includes("session") || t.includes("hour") || t.includes("minute"))
                                                  return {
                                                    icon: <Clock size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-amber-500/20 text-gold border-gold/30",
                                                    cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50",
                                                    textColor: "text-neutral-200",
                                                  };
                                                if (t.includes("photo") || t.includes("shot") || t.includes("pose") || t.includes("candid") || t.includes("portrait"))
                                                  return {
                                                    icon: <Camera size={11} className="stroke-[2.2]" />,
                                                    iconBg: "bg-amber-500/15 text-gold border-gold/30",
                                                    cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50",
                                                    textColor: "text-neutral-200",
                                                  };
                                                return {
                                                  icon: <Check size={11} className="stroke-[2.5]" />,
                                                  iconBg: "bg-amber-500/15 text-gold border-gold/30",
                                                  cardBg: "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 hover:border-gold/50",
                                                  textColor: "text-neutral-200",
                                                };
                                              };

                                              const cfg = isExclusion
                                                ? {
                                                    icon: <X size={11} className="stroke-[2.5]" />,
                                                    iconBg: "bg-white/10 text-neutral-400 border-white/10",
                                                    cardBg: "bg-white/[0.02] border-white/5",
                                                    textColor: "text-neutral-500",
                                                    badge: null,
                                                  }
                                                : getIconConfig(h);

                                              return (
                                                <motion.div
                                                  key={i}
                                                  initial={{ opacity: 0, y: 3 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  transition={{ delay: i * 0.015, type: "spring", stiffness: 450, damping: 30 }}
                                                  className={`flex items-center gap-1.5 p-1.5 px-2 rounded-xl border shadow-2xs transition-all duration-200 ${cfg.cardBg} ${
                                                    isFullWidth ? "col-span-full" : "col-span-1"
                                                  } ${isExclusion ? "opacity-45" : ""}`}
                                                >
                                                  {/* Refined micro icon squircle */}
                                                  <div className={`w-5 h-5 rounded-md ${cfg.iconBg} border flex items-center justify-center shrink-0 shadow-2xs`}>
                                                    {cfg.icon}
                                                  </div>

                                                  {/* Content with Spec Badge and Full Text */}
                                                  <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
                                                    {specBadge && !isExclusion && (
                                                      <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-mono shrink-0">
                                                        {specBadge}
                                                      </span>
                                                    )}
                                                    <p className={`text-[10.5px] font-medium leading-snug break-words ${cfg.textColor} ${isExclusion ? "line-through" : ""}`}>
                                                      {mainText}
                                                    </p>
                                                  </div>

                                                  {/* Complimentary / Special Perk Badge */}
                                                  {cfg.badge && !isExclusion && (
                                                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-2xs shrink-0">
                                                      {cfg.badge}
                                                    </span>
                                                  )}
                                                </motion.div>
                                              );
                                            })}
                                          </div>

                                          {/* Bottom Studio Authenticity Bar */}
                                          <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8.5px] uppercase tracking-wider font-mono text-gold/70 font-bold">
                                            <span className="flex items-center gap-1">
                                              <Sparkles size={8} className="text-gold" />
                                              All Inclusions Guaranteed
                                            </span>
                                            <span className="text-neutral-400">
                                              Studio Quality Prints
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Seamless Connector Nub matching dark luxury background */}
                                      <div
                                        className="absolute top-7 w-3.5 h-3.5 pointer-events-none"
                                        style={{
                                          [showPanelLeft ? "right" : "left"]: -7,
                                          transform: "rotate(45deg)",
                                          background: "#121110",
                                          borderTop: showPanelLeft ? "none" : "1px solid rgba(201,169,110,0.45)",
                                          borderLeft: showPanelLeft ? "none" : "1px solid rgba(201,169,110,0.45)",
                                          borderBottom: showPanelLeft ? "1px solid rgba(201,169,110,0.45)" : "none",
                                          borderRight: showPanelLeft ? "1px solid rgba(201,169,110,0.45)" : "none",
                                          boxShadow: showPanelLeft ? "2px 2px 4px rgba(0,0,0,0.3)" : "-2px -2px 4px rgba(0,0,0,0.3)",
                                        }}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Direct A, B, C Set Selector (replaces arrows to let user select & view directly) */}
                        <div className="relative z-20 flex items-center justify-center gap-2 pb-6 pt-1">
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-gold/35 shadow-md">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-900/80 mr-1 flex items-center gap-1 font-mono">
                              <Sparkles size={11} className="text-gold" />
                              <span>Sets:</span>
                            </span>
                            {selectedService.tiers.map((tier, idx) => {
                              const isTierSelected = selectedTier?._idx !== undefined
                                ? selectedTier._idx === idx
                                : (selectedTier?.name === tier.name && (selectedTier?.price ? selectedTier.price === tier.price : true));

                              const letter = tier.name.replace(/set\s*/i, "").trim() || String.fromCharCode(65 + idx);

                              return (
                                <motion.button
                                  key={tier.name || idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTier({ ...tier, _idx: idx });
                                    setHoveredTierName(tier.name);
                                    setValidationError("");
                                    if (tierScrollRef.current) {
                                      const cardWidth = 265;
                                      const targetScroll = Math.max(0, idx * (cardWidth - 45));
                                      tierScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
                                    }
                                  }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.92 }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-heading font-black transition-all cursor-pointer relative ${
                                    isTierSelected
                                      ? "bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 ring-2 ring-gold/60 shadow-[0_0_12px_rgba(201,169,110,0.7)]"
                                      : "bg-white hover:bg-gold/15 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-gold/50 shadow-2xs"
                                  }`}
                                  title={`Directly view & select ${tier.name}`}
                                >
                                  {letter}
                                  {isTierSelected && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neutral-950 text-gold flex items-center justify-center shadow-xs border border-gold/50">
                                      <Check size={8} className="stroke-[3.5]" />
                                    </span>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Selected set summary bar */}
                      <AnimatePresence>
                        {selectedTier && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            className="mt-3 mx-6 sm:mx-9 flex items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-gold/25 shadow-md"
                            style={{ background: "linear-gradient(90deg, rgba(201,169,110,0.08) 0%, rgba(255,255,255,0.97) 60%, rgba(201,169,110,0.06) 100%)" }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-gold flex items-center justify-center shrink-0 shadow-md">
                                <Check size={14} className="text-neutral-950 stroke-[3]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-gold/80">Selected Set</p>
                                <p className="text-sm font-heading font-bold text-neutral-900 truncate">{selectedTier.name}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">Package Rate</p>
                              <p className="font-heading font-extrabold text-gold text-lg">{selectedTier.price}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
{/* ─────────────────────────────────────────────────────────────
                  STEP 3: HOVER-REVEAL ADD-ONS MINI CARDS
              ───────────────────────────────────────────────────────────── */}
              {step === 3 && (() => {
                const isAddonsRevealed = isAddonCardHovered || isAddonPanelHovered || isAddonCardPinned || selectedAddOns.length > 0;
                const step3CoverImg = selectedTier?.cover_image || selectedService?.cover_image || SERVICE_COVER_MAP[selectedService?.slug] || "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop";
                const tierRoman = selectedTier?._idx !== undefined
                  ? ["I", "II", "III", "IV", "V", "VI"][selectedTier._idx] || "I"
                  : (selectedTier?.name?.match(/set\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() || "I");

                return (
                  <div className="pt-10 sm:pt-14 space-y-6 animate-fade-in overflow-visible">
                    {/* Section Title Header with generous top padding from step indicator */}
                    <div className="text-center mb-6 sm:mb-8 relative z-10">
                      <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                        {selectedService?.name ? `${selectedService.name} · Extras` : "Optional Enhancements"}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                        Choose your add-ons
                      </h2>
                      <p className="text-xs text-neutral-600 font-body mt-1 max-w-md mx-auto">
                        Hover over your selected package card to reveal optional add-on upgrades
                      </p>
                    </div>

                    {/* ── WHITE GRADIENT STAGE ── */}
                    <div
                      className="relative w-full rounded-2xl overflow-visible white-animated-gradient-bg py-10 sm:py-14"
                      style={{ border: "1px solid rgba(201,169,110,0.18)", minHeight: 480 }}
                    >
                      {/* Ambient Tint Orbs */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                        <div className="absolute -top-16 left-1/4 w-[400px] h-[250px] rounded-full bg-amber-300/20 blur-[80px] animate-float-slow-1" />
                        <div className="absolute -top-8 right-1/4 w-[350px] h-[200px] rounded-full bg-gold/15 blur-[70px] animate-float-slow-2" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[120px] rounded-full bg-amber-200/20 blur-[60px]" />
                      </div>

                      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 px-4 sm:px-8 overflow-visible">
                        {/* ── TRIGGER PACKAGE CARD (HOVER TO REVEAL) ── */}
                        <motion.div
                          onMouseEnter={() => setIsAddonCardHovered(true)}
                          onMouseLeave={() => setIsAddonCardHovered(false)}
                          onClick={() => setIsAddonCardPinned(p => !p)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="relative shrink-0 cursor-pointer select-none"
                        >
                          {/* Ambient Glow */}
                          <div
                            className="absolute -inset-3 rounded-[34px] pointer-events-none -z-10 transition-opacity duration-300"
                            style={{
                              background: "radial-gradient(ellipse at 50% 85%, rgba(201,169,110,0.65) 0%, rgba(245,158,11,0.2) 50%, transparent 75%)",
                              filter: "blur(16px)",
                              opacity: isAddonsRevealed ? 1 : 0.5,
                            }}
                          />

                          {/* Card Shell */}
                          <div
                            className={`relative w-[260px] sm:w-[275px] rounded-3xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${
                              isAddonsRevealed
                                ? "border-gold ring-2 ring-gold/50 shadow-[0_0_40px_rgba(201,169,110,0.45),0_20px_45px_rgba(0,0,0,0.6)]"
                                : "border-white/40 hover:border-gold/70 shadow-xl"
                            }`}
                            style={{ height: 380 }}
                          >
                            <img
                              src={step3CoverImg}
                              alt={selectedTier?.name || selectedService?.name || "Package"}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent z-10 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent z-10 pointer-events-none" />

                            {/* Top: Roman Crest */}
                            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(201,169,110,0.4)]">
                                  <span className="font-heading font-black text-gold text-xl leading-none">
                                    {tierRoman}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase tracking-[0.25em] text-gold/80 font-bold leading-none">Package</span>
                                  <span className="text-[13px] font-heading font-black text-white leading-tight mt-0.5">
                                    {selectedTier?.name || selectedService?.name || "Selected Set"}
                                  </span>
                                </div>
                              </div>

                              {selectedAddOns.length > 0 && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold text-neutral-950 font-mono shadow-md">
                                  +{selectedAddOns.length}
                                </span>
                              )}
                            </div>

                            {/* Bottom: Rate + Hover Hint */}
                            <div className="absolute bottom-0 left-0 right-0 z-20">
                              <div className="px-5 pb-2">
                                <span className="text-[9px] uppercase tracking-widest text-gold/80 font-bold block mb-0.5">
                                  Base Package
                                </span>
                                <span className="font-heading font-black text-white text-2xl leading-none block drop-shadow-sm">
                                  {selectedTier?.price || (selectedService?.base_price ? `₱${parsePrice(selectedService.base_price).toLocaleString()}` : "Selected")}
                                </span>
                              </div>

                              <div className="px-5 py-3 border-t border-white/15 bg-black/60 backdrop-blur-md flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-gold tracking-wide">
                                  {isAddonsRevealed ? "Add-ons Revealed" : "Hover to reveal add-ons"}
                                </span>
                                <motion.div
                                  animate={{ x: isAddonsRevealed ? 3 : [0, 4, 0] }}
                                  transition={{ repeat: Infinity, duration: 1.6 }}
                                  className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold"
                                >
                                  <ArrowRight size={13} className="stroke-[2.5]" />
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* ── REVEALED OBSIDIAN MINI CARDS PANEL ── */}
                        <AnimatePresence>
                          {isAddonsRevealed && (
                            <motion.div
                              key="addons-obsidian-panel"
                              initial={{ opacity: 0, x: 24, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 20, scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 420, damping: 28 }}
                              onMouseEnter={() => setIsAddonPanelHovered(true)}
                              onMouseLeave={() => setIsAddonPanelHovered(false)}
                              className="w-full max-w-[520px] rounded-3xl overflow-hidden shadow-2xl relative pointer-events-auto"
                              style={{
                                background: "linear-gradient(165deg, rgba(24, 22, 20, 0.98) 0%, rgba(12, 11, 10, 0.99) 100%)",
                                border: "1px solid rgba(201, 169, 110, 0.45)",
                                boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 30px rgba(201,169,110,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
                                backdropFilter: "blur(20px)",
                              }}
                            >
                              {/* Golden luxury top accent line */}
                              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

                              {/* Header with SKIP BUTTON ON THE MINI CARDS PANEL */}
                              <div
                                className="px-5 py-3.5 flex items-center justify-between gap-3"
                                style={{
                                  background: "linear-gradient(90deg, rgba(201,169,110,0.14) 0%, rgba(255,255,255,0.02) 100%)",
                                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center shadow-xs text-gold shrink-0">
                                    <Sparkles size={15} className="text-gold" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold/70 leading-none font-mono">
                                      OPTIONAL EXTRAS
                                    </p>
                                    <h3 className="text-base font-heading font-black text-white leading-tight mt-0.5">
                                      Add-on Upgrades
                                    </h3>
                                  </div>
                                </div>

                                {/* SKIP BUTTON ON THE MINI CARDS PANEL AS REQUESTED */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {selectedAddOns.length > 0 && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-mono shadow-2xs">
                                      {selectedAddOns.length} Selected
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAddOns([]);
                                      setShowStep4ConfirmModal(true);
                                    }}
                                    className="text-xs font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-gold/50 px-3 py-1 rounded-full transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Skip add-ons and proceed to client details"
                                  >
                                    Skip <ArrowRight size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* ── MINI CARDS GRID MATCHING THE USER'S PHOTO ── */}
                              <div className="p-3.5 sm:p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {addOnsList.length === 0 ? (
                                    <p className="col-span-full py-8 text-center text-neutral-400 text-xs italic">
                                      No add-on extras currently available.
                                    </p>
                                  ) : (
                                    addOnsList.map((addon, idx) => {
                                      const isSelected = selectedAddOns.some(a => a.name === addon.name);
                                      const visuals = getAddOnVisuals(addon.name, addon.category);

                                      return (
                                        <motion.div
                                          key={addon.id || idx}
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleAddOn(addon);
                                          }}
                                          className={`group relative p-2.5 px-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 shadow-md select-none ${
                                            isSelected
                                              ? "bg-gradient-to-r from-amber-500/25 via-gold/15 to-white/[0.08] border-gold ring-1 ring-gold/60 shadow-[0_0_20px_rgba(201,169,110,0.25)]"
                                              : "bg-white/[0.05] hover:bg-white/[0.09] border-white/20 hover:border-gold/50"
                                          }`}
                                        >
                                          {/* Micro Squircle Icon + Title + Spec Badge */}
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 ${
                                              isSelected
                                                ? "bg-gold text-neutral-950 border-amber-300 shadow-sm"
                                                : `${visuals.iconBg} group-hover:scale-105`
                                            }`}>
                                              {isSelected ? <Check size={13} className="stroke-[3]" /> : visuals.icon}
                                            </div>

                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="font-heading font-bold text-xs sm:text-[13px] text-white leading-snug group-hover:text-gold transition-colors">
                                                  {visuals.cleanName}
                                                </h4>
                                                {visuals.specBadge && (
                                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-mono shrink-0">
                                                    {visuals.specBadge}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Right: Rate + Check Toggle */}
                                          <div className="flex items-center gap-2 shrink-0 pl-1">
                                            <span className="font-heading font-black text-gold text-xs whitespace-nowrap">
                                              +₱{parsePrice(addon.price).toLocaleString()}
                                            </span>

                                            <div
                                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                                isSelected
                                                  ? "bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 shadow-xs border border-amber-300 scale-105"
                                                  : "border border-white/30 group-hover:border-gold text-transparent bg-transparent"
                                              }`}
                                            >
                                              <Check size={11} className="stroke-[3]" />
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* ── STEP 3 CONFIRMATION ACTION BAR ── */}
                              <div className="p-3.5 sm:p-4 pt-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-neutral-300 text-xs font-body">
                                  <Sparkles size={14} className="text-gold" />
                                  <span>{selectedAddOns.length > 0 ? `${selectedAddOns.length} upgrade(s) selected` : "Standard inclusions only"}</span>
                                </div>

                                {/* ONLY ICON THAT WHEN HOVERED A CONFIRM TEXT WILL APPEAR (PHOTO 2) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowStep4ConfirmModal(true);
                                  }}
                                  className="group relative flex items-center justify-center bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-neutral-950 font-bold h-11 px-3.5 hover:px-5 rounded-2xl shadow-lg shadow-gold/25 hover:shadow-gold/45 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden shrink-0"
                                  title="Confirm"
                                >
                                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:mr-2 transition-all duration-300 text-xs font-heading font-black tracking-wide">
                                    Confirm
                                  </span>
                                  <ArrowRight size={18} className="shrink-0 stroke-[3] transition-transform duration-300 group-hover:translate-x-0.5" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: DYNAMIC CUSTOMER & VERIFICATION DETAILS
              ───────────────────────────────────────────────────────────── */}
              {step === 4 && (() => {
                const step4CoverImg = selectedTier?.cover_image || selectedService?.cover_image || SERVICE_COVER_MAP[selectedService?.slug] || "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop";
                const tierRoman = selectedTier?._idx !== undefined
                  ? ["I", "II", "III", "IV", "V", "VI"][selectedTier._idx] || "I"
                  : (selectedTier?.name?.match(/set\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() || "I");
                const activeProfile = customerProfile || profile;
                const clientInitials = `${(activeProfile?.first_name || user?.email || "C")[0] || ""}${activeProfile?.last_name ? activeProfile.last_name[0] : ""}`.toUpperCase() || "CL";

                return (
                  <div className="space-y-8 animate-fade-in overflow-visible">
                    {/* Section Title Header with generous top padding from step indicator */}
                    <div className="text-center mb-6 sm:mb-8 relative z-10 pt-6 sm:pt-10">
                      <span className="text-[11px] uppercase font-bold tracking-widest text-amber-900 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/30 inline-block mb-2 shadow-xs">
                        {isAcademicService
                          ? "Academic & Student Verification"
                          : isWeddingService
                          ? "Couple & Wedding Details"
                          : isCorporateService
                          ? "Corporate Profile Verification"
                          : "Client Details & Verification"}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-neutral-950 tracking-tight drop-shadow-xs">
                        Identification &amp; session details
                      </h2>
                      <p className="text-xs text-neutral-600 font-body mt-1 max-w-md mx-auto">
                        {isAcademicService
                          ? "Review your package orders above and verify your university, program, and section for graduation records"
                          : isWeddingService
                          ? "Review your package orders above and provide couple details, venue, and styling notes"
                          : "Review your package orders above and verify your contact profile and photoshoot requirements"}
                      </p>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        TOPMOST AREA: SELECTED ORDERS COMBINED CARDS HIERARCHY
                        - Exact look of Photo 1:
                          * Main Card (left): Package Name, Cover Image, Roman crest, Check icon
                          * Pop-up Card (right, connected with diamond nub): Set Name, Inclusions count, 2-col chips grid
                          * Add-ons: Matching obsidian card if selected
                        - Left top-side prices ONLY:
                          Total Balance : ----- | Downpayment: ---- / 50%
                        - ZERO PRICES inside the cards!
                        - ALL UNNECESSARY FILLER TEXTS REMOVED!
                    ───────────────────────────────────────────────────────────── */}
                    <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-white via-neutral-50/70 to-amber-50/20 border border-gold/35 shadow-warm-md overflow-hidden">
                      {/* Ambient background glow inside summary dock */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
                      
                      <div className="relative z-10 flex flex-col gap-6">
                        {/* Header Bar: Left Top-Side Prices Only */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200/70">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse shrink-0" />
                            <span className="font-heading font-bold text-neutral-900 text-sm sm:text-base tracking-tight">
                              Total Balance : <span className="text-primary font-extrabold">{formattedTotal}</span> | Downpayment: <span className="text-amber-800 font-extrabold">{formattedDownPayment}</span> / 50%
                            </span>
                          </div>

                          {selectedAddOns.length === 0 && (
                            <button
                              type="button"
                              onClick={() => setStep(3)}
                              className="text-xs font-semibold text-neutral-600 hover:text-gold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Select optional add-ons"
                            >
                              <Sparkles size={13} className="text-gold" />
                              <span>+ Add-ons</span>
                            </button>
                          )}
                        </div>

                        {/* Combined Cards Layout (Matching Photo 1) */}
                        <div className="flex flex-col lg:flex-row items-stretch gap-5">
                          {/* ── 1. MAIN CARD: PACKAGE NAME (PHOTO 1 LEFT CARD) ── */}
                          <div
                            className="relative w-full lg:w-[270px] rounded-3xl overflow-hidden shadow-2xl border-2 border-gold ring-2 ring-gold/40 flex flex-col justify-between shrink-0"
                            style={{ minHeight: 390 }}
                          >
                            {/* Full Cover Image */}
                            <img 
                              src={step4CoverImg}
                              alt={selectedService?.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent z-10 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent z-10 pointer-events-none" />

                            {/* Top: Roman Crest & Collection Label (Photo 1) */}
                            <div className="relative z-20 p-4 flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(201,169,110,0.4)]">
                                  <span className="font-heading font-black text-gold text-xl leading-none">
                                    {tierRoman}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase tracking-[0.25em] text-gold/70 font-bold leading-none">
                                    Collection
                                  </span>
                                  <span className="text-[13px] font-heading font-black text-white leading-tight mt-0.5">
                                    Set {tierRoman}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-gold backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
                                title="Change package"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>

                            {/* Bottom: Package Name + Check Icon Selection (Photo 1) */}
                            <div className="relative z-20">
                              <div className="px-5 pt-2 pb-1.5">
                                <h3 className="font-heading font-extrabold text-white leading-tight drop-shadow-md text-xl">
                                  {selectedService?.name || "Selected Package"}
                                </h3>
                                <p className="text-[10px] text-gold/80 font-semibold mt-0.5">
                                  {selectedTier?.highlights?.length || selectedTier?.inclusions?.length || 0} inclusions · {selectedTier?.name || "Selected Set"}
                                </p>
                              </div>

                              {/* Bottom bar with Check Icon */}
                              <div className="px-5 pb-4 pt-2.5 border-t border-white/15 bg-black/60 backdrop-blur-md flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 block leading-none mb-1">
                                    Package
                                  </span>
                                  <span className="font-heading font-black text-gold text-sm leading-none block">
                                    {tierRoman}
                                  </span>
                                </div>

                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 ring-2 ring-gold/50 shadow-[0_0_18px_rgba(201,169,110,0.85)]">
                                  <Check size={20} className="stroke-[3.5]" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── 2. POP-UP CARD: SET NAME & INCLUSIONS (PHOTO 1 RIGHT CARD) ── */}
                          <div
                            className="relative flex-1 rounded-3xl overflow-hidden shadow-2xl border border-gold/45 flex flex-col justify-between"
                            style={{
                              background: "linear-gradient(165deg, rgba(24, 22, 20, 0.97) 0%, rgba(12, 11, 10, 0.98) 100%)",
                              boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 30px rgba(201,169,110,0.22)",
                              minHeight: 390
                            }}
                          >
                            {/* Seamless Connector Nub matching Photo 1 */}
                            <div
                              className="hidden lg:block absolute top-7 -left-[7px] w-3.5 h-3.5 pointer-events-none rotate-45 bg-[#141210] border-l border-b border-gold/45 z-30"
                            />

                            {/* Golden luxury top accent line */}
                            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

                            {/* Header: What's Included + Set Name + Inclusions Count Pill (Photo 1) */}
                            <div
                              className="px-5 py-3.5 flex items-center justify-between gap-3"
                              style={{
                                background: "linear-gradient(90deg, rgba(201,169,110,0.14) 0%, rgba(255,255,255,0.02) 100%)",
                                borderBottom: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/25 via-gold/15 to-transparent border border-gold/50 flex items-center justify-center shadow-xs text-gold shrink-0">
                                  <span className="font-heading font-black text-gold text-sm leading-none">{tierRoman}</span>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold/70 leading-none font-mono">
                                    What's Included
                                  </p>
                                  <h3 className="text-lg font-heading font-black text-white leading-tight mt-0.5">
                                    {selectedTier?.name || "Selected Set"}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-mono shadow-2xs">
                                  {(selectedTier?.highlights || selectedTier?.inclusions || []).length} Inclusions
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setStep(2)}
                                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                  title="Change set"
                                >
                                  <Edit3 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Inclusions 2-Column Grid (Photo 1) */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(selectedTier?.highlights || selectedTier?.inclusions || []).map((h, i) => {
                                  const cfg = getInclusionConfig(h);
                                  return (
                                    <div
                                      key={i}
                                      className={`flex items-center gap-2 p-2 px-2.5 rounded-xl border shadow-2xs transition-all ${cfg.cardBg} ${
                                        cfg.isFullWidth ? "sm:col-span-2" : "sm:col-span-1"
                                      } ${cfg.isExclusion ? "opacity-45" : ""}`}
                                    >
                                      {/* Micro icon squircle */}
                                      <div className={`w-5 h-5 rounded-md ${cfg.iconBg} border flex items-center justify-center shrink-0 shadow-2xs`}>
                                        {cfg.icon}
                                      </div>

                                      {/* Content with Spec Badge */}
                                      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                                        {cfg.specBadge && !cfg.isExclusion && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-mono shrink-0">
                                            {cfg.specBadge}
                                          </span>
                                        )}
                                        <p className={`text-[11px] font-medium leading-snug break-words ${cfg.textColor} ${cfg.isExclusion ? "line-through" : ""}`}>
                                          {cfg.mainText}
                                        </p>
                                      </div>

                                      {/* Complimentary Perk Badge */}
                                      {cfg.badge && !cfg.isExclusion && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-2xs shrink-0">
                                          {cfg.badge}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Bottom Studio Authenticity Bar (Photo 1) */}
                              <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[8.5px] uppercase tracking-wider font-mono text-gold/70 font-bold">
                                <span className="flex items-center gap-1">
                                  <Sparkles size={9} className="text-gold" />
                                  All Inclusions Guaranteed
                                </span>
                                <span className="text-neutral-400">
                                  Studio Quality Prints
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ── 3. OPTIONAL ADD-ONS OBSIDIAN CARD (ONLY IF SELECTED) ── */}
                          {selectedAddOns.length > 0 && (
                            <div
                              className="relative w-full lg:w-[280px] rounded-3xl overflow-hidden shadow-2xl border border-gold/45 flex flex-col justify-between shrink-0"
                              style={{
                                background: "linear-gradient(165deg, rgba(24, 22, 20, 0.97) 0%, rgba(12, 11, 10, 0.98) 100%)",
                                boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 30px rgba(201,169,110,0.22)",
                                minHeight: 390
                              }}
                            >
                              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-gold to-amber-500" />

                              {/* Header */}
                              <div
                                className="px-4 py-3.5 flex items-center justify-between gap-2"
                                style={{
                                  background: "linear-gradient(90deg, rgba(201,169,110,0.14) 0%, rgba(255,255,255,0.02) 100%)",
                                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                                    <Sparkles size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold/70 leading-none font-mono">
                                      Upgrades
                                    </p>
                                    <h3 className="text-sm font-heading font-bold text-white mt-0.5">
                                      Add-ons ({selectedAddOns.length})
                                    </h3>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setStep(3)}
                                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                  title="Edit add-ons"
                                >
                                  <Edit3 size={13} />
                                </button>
                              </div>

                              {/* Add-ons List */}
                              <div className="p-3.5 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {selectedAddOns.map((addon, idx) => {
                                  const visuals = getAddOnVisuals(addon.name, addon.category);
                                  return (
                                    <div
                                      key={idx}
                                      className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 transition-all"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${visuals.iconBg}`}>
                                          {visuals.icon}
                                        </div>
                                        <span className="text-xs font-medium text-white truncate">
                                          {visuals.cleanName}
                                        </span>
                                      </div>
                                      {visuals.specBadge && (
                                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-mono shrink-0">
                                          {visuals.specBadge}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="p-3 pt-2 border-t border-white/10 text-center text-[8.5px] uppercase tracking-wider font-mono text-gold/70 font-bold">
                                Studio Quality Prints
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

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
                            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full shadow-2xs">
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
                                <span className="text-[10px] uppercase font-bold tracking-wider">Client Name</span>
                              </div>
                              <Edit3 size={11} className="opacity-0 group-hover:opacity-100 text-gold transition-opacity" />
                            </div>
                            <span className="font-semibold text-primary truncate text-xs">
                              {activeProfile?.first_name || activeProfile?.last_name
                                ? `${activeProfile?.first_name || ""} ${activeProfile?.last_name || ""}`.trim()
                                : <span className="text-neutral-400 italic">Click to set</span>}
                            </span>
                            <span className="text-[9px] text-neutral-400 mt-1">Full legal name</span>
                          </div>

                          {/* Card 2: Email */}
                          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between text-neutral-400 mb-1">
                              <div className="flex items-center gap-1.5">
                                <Mail size={13} className="text-gold" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Email</span>
                              </div>
                              <Lock size={10} className="text-neutral-400" title="Account login email" />
                            </div>
                            <span className="font-medium text-neutral-700 truncate text-xs" title={activeProfile?.email || user?.email}>
                              {activeProfile?.email || user?.email || "No email on file"}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
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
                                <span className="text-[10px] uppercase font-bold tracking-wider">Phone</span>
                              </div>
                              <Edit3 size={11} className="opacity-0 group-hover:opacity-100 text-gold transition-opacity" />
                            </div>
                            <span className="font-semibold text-primary truncate text-xs">
                              {activeProfile?.phone ? (
                                activeProfile.phone
                              ) : (
                                <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                                  + Add Phone
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-neutral-400 mt-1">SMS & Studio Alerts</span>
                          </div>

                          {/* Card 4: Account Role */}
                          <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                              <Sparkles size={13} className="text-gold" />
                              <span className="text-[10px] uppercase font-bold tracking-wider">Account Role</span>
                            </div>
                            <span className="font-semibold text-gold capitalize truncate text-xs">
                              {activeProfile?.role || "Customer"}
                            </span>
                            <span className="text-[9px] text-neutral-400 mt-1">Member Account</span>
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
                            <span className="text-[10px] font-mono text-neutral-400">Live DB Sync</span>
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full shadow-2xs">
                            <ShieldCheck size={12} className="text-emerald-600" /> Active Student Profile
                          </span>
                        </div>
                      </div>

                      {/* ── 1. CLIENT PROFILE SECTION ─────────────────────────────────── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                            <User size={13} />
                          </div>
                          <span className="font-heading text-xs sm:text-sm font-bold text-primary">
                            1. Client Profile &amp; Contact Information
                          </span>
                        </div>

                        {/* Name Fields (Row 1): First Name, Middle Name, Last Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={editFirstName}
                              onChange={(e) => setEditFirstName(e.target.value)}
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
                              value={editMiddleName}
                              onChange={(e) => setEditMiddleName(e.target.value)}
                              placeholder="Middle Name / Initial"
                              className="w-full h-11 px-3.5 rounded-xl bg-white border border-neutral-300 focus:border-gold focus:ring-2 focus:ring-gold/25 text-xs sm:text-sm text-primary font-semibold outline-none transition-all shadow-2xs"
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
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5"><Check size={10} /> Verified</span>
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
                                    className="text-[10px] text-neutral-400 hover:text-primary font-semibold"
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
                                  <div className="p-2.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 sticky top-0 flex items-center justify-between border-b border-neutral-100 z-10 backdrop-blur-sm">
                                    <span>Campuses &amp; Branches ({filteredCampuses.length})</span>
                                    <button
                                      type="button"
                                      onClick={() => setUnivDropdownOpen(false)}
                                      className="text-neutral-400 hover:text-primary font-bold px-1.5 py-0.5 rounded hover:bg-neutral-200 text-[10px]"
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
                                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                              Extension
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-full">
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
                                    className="text-[10px] text-neutral-400 hover:text-primary font-semibold"
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
                                  <div className="p-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 sticky top-0 flex items-center justify-between border-b border-neutral-100 z-10">
                                    <span>Popular Academic Programs</span>
                                    <button
                                      type="button"
                                      onClick={() => setDegreeDropdownOpen(false)}
                                      className="text-neutral-400 hover:text-primary font-bold px-1.5 py-0.5 rounded hover:bg-neutral-200 text-[10px]"
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
                              placeholder={isSeniorHighService ? "e.g., Grade 12 - STEM A" : "e.g., BSIT 4-1"}
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
                              <span className="text-[10px] text-neutral-400 font-normal">Official graduation album print</span>
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
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 5: SCHEDULE & STUDIO LOCATION (8AM-5PM, BATCH SCHEDULING)
              ───────────────────────────────────────────────────────────── */}
              {step === 5 && (
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
                          <span className="text-[10px] text-neutral-400 font-normal">Interactive Calendar View</span>
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
                          <span className="text-[10px] text-neutral-400 font-normal">8:00 AM – 5:00 PM Operating Hours</span>
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
                                <span className="text-[10px] uppercase font-bold opacity-75">{slot.period}</span>
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
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-gold border border-gold/40 shadow-2xs">
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
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-gold border border-gold/40 shadow-2xs">
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
                                  <tr className="bg-neutral-50/80 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
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
                                        {studentSection || "GRADE 12- STEM-A"}
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
                  STEP 6: PHOTO STYLE & REFERENCES (Clean, Readable UI)
              ───────────────────────────────────────────────────────────── */}
              {step === 6 && (
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
                      Select preferred photographic styles or upload sample reference photos for our studio lighting team.
                    </p>
                  </div>

                  {/* ── CARD 1: CURATED PHOTOGRAPHIC STYLES ── */}
                  <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                          <Palette size={16} />
                        </div>
                        <div>
                          <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                            Curated Photography Styles
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-body">
                            Select lighting setups and aesthetic tones for our studio crew
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                        Optional · Multi-select
                      </span>
                    </div>

                    {/* Responsive Style Grid: 3 or 4 cards with visual previews */}
                    {(() => {
                      const currentPegs = (isCollegeService || isSeniorHighService)
                        ? PRESET_STYLE_PEGS.graduation
                        : isWeddingService
                        ? PRESET_STYLE_PEGS.wedding
                        : isCorporateService
                        ? PRESET_STYLE_PEGS.corporate
                        : PRESET_STYLE_PEGS.general;

                      const gridColsClass = currentPegs.length === 4
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                        : "grid grid-cols-1 sm:grid-cols-3 gap-4";

                      return (
                        <div className={gridColsClass}>
                          {currentPegs.map((peg) => {
                            const isPegSelected = selectedPresetPegs.includes(peg.title);
                            return (
                              <div
                                key={peg.id}
                                onClick={() => togglePresetPeg(peg)}
                                className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                                  isPegSelected
                                    ? "border-primary bg-neutral-900 text-white shadow-md ring-2 ring-gold/40"
                                    : "border-neutral-200/90 bg-white hover:border-gold/60 hover:shadow-warm-xs text-neutral-900"
                                }`}
                              >
                                {/* Media Thumbnail */}
                                <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-neutral-100">
                                  <img 
                                    src={peg.image} 
                                    alt={peg.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                  {/* Tag Badge */}
                                  {peg.tag && (
                                    <span className="absolute top-2.5 left-2.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-gold border border-gold/40">
                                      {peg.tag}
                                    </span>
                                  )}

                                  {/* Selection Check Circle */}
                                  <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs ${
                                    isPegSelected
                                      ? "bg-gold text-neutral-950 font-bold ring-2 ring-white/60 scale-105"
                                      : "bg-black/50 backdrop-blur-xs text-white/50 border border-white/40 group-hover:border-white"
                                  }`}>
                                    <Check size={13} className={isPegSelected ? "stroke-[3]" : "opacity-0 group-hover:opacity-60"} />
                                  </div>

                                  {/* Full Image Preview Trigger */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePegModal(peg);
                                    }}
                                    className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs text-[11px] font-medium text-white flex items-center gap-1 transition-colors border border-white/20"
                                    title="View full reference image"
                                  >
                                    <Eye size={12} />
                                    <span>Preview</span>
                                  </button>
                                </div>

                                {/* Text Details */}
                                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                                  <div>
                                    <h4 className={`font-heading text-sm font-bold leading-snug ${isPegSelected ? "text-white" : "text-primary"}`}>
                                      {peg.title}
                                    </h4>
                                    <p className={`text-xs font-body leading-relaxed mt-1 line-clamp-2 ${isPegSelected ? "text-neutral-300" : "text-neutral-600"}`}>
                                      {peg.desc}
                                    </p>
                                  </div>

                                  <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-semibold ${
                                    isPegSelected ? "border-white/10 text-gold" : "border-neutral-100 text-neutral-500"
                                  }`}>
                                    <span>{isPegSelected ? "Selected for shoot" : "Click to select"}</span>
                                    {isPegSelected && <CheckCircle size={14} className="text-gold" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── CARD 2: UPLOAD REFERENCE PHOTOS & VISUAL PEGS ── */}
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
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/70">
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
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/70">
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
                          <span className="text-[10px] text-neutral-400 font-body">Click to insert note</span>
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
                  STEP 7: SMART COLLAPSIBLE REVIEW & CONFIRM
              ───────────────────────────────────────────────────────────── */}
              {step === 7 && (
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
                      Review all session data below. You can open, collapse, or directly click &quot;Edit&quot; on any section.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    
                    {/* Accordion A: Service & Package */}
                    <div className="border border-neutral-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, pkg: !prev.pkg }))}
                        className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                            <Package size={16} />
                          </div>
                          <div>
                            <span className="font-heading text-sm font-bold text-primary block leading-tight">Service &amp; Package Tier</span>
                            <span className="text-[11px] text-neutral-500 font-body">
                              {selectedService?.name} • <span className="font-semibold text-gold">{selectedTier?.name || "Standard"}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(2); }}
                            className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
                          >
                            Edit
                          </button>
                          {reviewAccordions.pkg ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                        </div>
                      </div>
                      {reviewAccordions.pkg && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Service</span>
                              <span className="font-bold text-primary text-xs mt-0.5 block truncate" title={selectedService?.name}>{selectedService?.name}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Package Tier</span>
                              <span className="font-bold text-gold text-xs mt-0.5 block">{selectedTier?.name || "Standard"}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60 col-span-2 sm:col-span-1">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Base Price</span>
                              <span className="font-extrabold text-primary text-xs mt-0.5 block">₱{basePrice.toLocaleString()}</span>
                            </div>
                          </div>

                          {selectedTier?.duration && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-200/50 text-amber-900 text-xs">
                              <Clock size={14} className="text-gold shrink-0" />
                              <span>Estimated Session Duration: <strong className="font-bold">{selectedTier.duration}</strong></span>
                            </div>
                          )}

                          {/* Complete Inclusions List */}
                          {tierInclusions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-neutral-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-gold" /> Included in This Package
                                </span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
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
                      )}
                    </div>

                    {/* Accordion B: Client & Institutional Information */}
                    <div className="border border-neutral-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, client: !prev.client }))}
                        className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                            {isAcademicService ? <GraduationCap size={16} /> : isWeddingService ? <Heart size={16} className="text-rose-500" /> : <User size={16} className="text-blue-500" />}
                          </div>
                          <div>
                            <span className="font-heading text-sm font-bold text-primary block leading-tight">
                              {isAcademicService ? "Student Details" : isWeddingService ? "Wedding Information" : "Client Details"}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-body">
                              {isAcademicService 
                                ? ([editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") || "Student Profile")
                                : isWeddingService ? `${brideName || 'Bride'} & ${groomName || 'Groom'}`
                                : [editFirstName, editLastName].filter(Boolean).join(" ") || "Client Profile"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(4); }}
                            className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
                          >
                            Edit
                          </button>
                          {reviewAccordions.client ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                        </div>
                      </div>
                      {reviewAccordions.client && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-3">
                          {isAcademicService && (
                            <>
                              {/* Student Profile Top Banner */}
                              <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/50 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center shrink-0">
                                    <User size={14} />
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider leading-none">Student Name</span>
                                    <span className="font-heading font-extrabold text-primary text-sm">
                                      {[editFirstName, editMiddleName, editLastName].filter(Boolean).join(" ") || "Student Name"}
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
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Institution / School</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {activeUnivId && <SchoolLogo univId={activeUnivId} name={studentSchool} size="xs" />}
                                    <span className="font-bold text-primary text-xs truncate" title={studentSchool}>{studentSchool || "N/A"}</span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                                    {studentType === "COLLEGE" ? "Degree / Course" : "Academic Strand"}
                                  </span>
                                  <span className="font-semibold text-neutral-800 text-xs mt-0.5 block truncate">
                                    {studentType === "COLLEGE" ? (studentCourse || "N/A") : (selectedShsStrand || "N/A")}
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Class Section &amp; Batch</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-bold text-gold bg-gold/10 px-2 py-0.5 rounded text-[11px]">{studentSection || "N/A"}</span>
                                    <span className="text-neutral-400">•</span>
                                    <span className="font-medium text-neutral-700 text-xs">{studentBatch || "Batch 2026"}</span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Arrangement Protocol</span>
                                  <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[10px] mt-0.5 ${
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
                                    <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block">Yearbook Motto</span>
                                    <p className="text-xs font-serif italic text-neutral-800 mt-0.5">&quot;{yearbookMotto}&quot;</p>
                                  </div>
                                </div>
                              )}

                              {schoolScheduleNote && (
                                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Schedule Note:</span>
                                  <p className="italic mt-0.5">{schoolScheduleNote}</p>
                                </div>
                              )}
                            </>
                          )}

                          {isWeddingService && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Couple</span>
                                <span className="font-bold text-primary text-xs mt-0.5 block">{brideName} &amp; {groomName}</span>
                              </div>
                              {weddingTheme && (
                                <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Wedding Theme</span>
                                  <span className="font-medium text-neutral-800 text-xs mt-0.5 block">{weddingTheme}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {!isAcademicService && !isWeddingService && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Client Full Name</span>
                                <span className="font-bold text-primary text-xs mt-0.5 block">
                                  {[editFirstName, editLastName].filter(Boolean).join(" ") || "Client"}
                                </span>
                              </div>
                              {editPhone && (
                                <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Contact Phone</span>
                                  <span className="font-medium text-neutral-800 text-xs mt-0.5 block">{editPhone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accordion C: Schedule & Studio Location */}
                    <div className="border border-neutral-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, schedule: !prev.schedule }))}
                        className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <span className="font-heading text-sm font-bold text-primary block leading-tight">Schedule &amp; Studio Location</span>
                            <span className="text-[11px] text-neutral-500 font-body">
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" ? "Official School Batch Schedule" : `${eventDate || "Date TBD"} • ${preferredTime || "Time TBD"}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(5); }}
                            className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
                          >
                            Edit
                          </button>
                          {reviewAccordions.schedule ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                        </div>
                      </div>
                      {reviewAccordions.schedule && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Date &amp; Time</span>
                              <span className="font-bold text-primary text-xs mt-0.5 block">
                                {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                                  ? "Official School Batch Schedule (Agreed with School)"
                                  : `${eventDate || "Date not selected"} at ${STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime || "TBD"}`}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Designated Venue</span>
                              <span className="font-bold text-primary text-xs mt-0.5 block truncate" title={resolvedLocation}>
                                {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS"
                                  ? `On-Campus (${studentSchool || "School Campus"})`
                                  : resolvedLocation}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion D: Add-ons */}
                    <div className="border border-neutral-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, addons: !prev.addons }))}
                        className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                            <PlusCircle size={16} />
                          </div>
                          <div>
                            <span className="font-heading text-sm font-bold text-primary block leading-tight">
                              Selected Add-ons ({selectedAddOns.length})
                            </span>
                            <span className="text-[11px] text-neutral-500 font-body">
                              {selectedAddOns.length === 0 ? "Base package only" : `${selectedAddOns.length} extra item(s) chosen`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(3); }}
                            className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
                          >
                            Edit
                          </button>
                          {reviewAccordions.addons ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                        </div>
                      </div>
                      {reviewAccordions.addons && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2">
                          {selectedAddOns.length === 0 ? (
                            <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/50 text-neutral-500 italic flex items-center gap-2 text-xs">
                              <Package size={14} className="text-neutral-400 shrink-0" />
                              No add-ons selected (Base package only).
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {selectedAddOns.map((a, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                  <span className="font-medium text-neutral-800">• {a.name}</span>
                                  <span className="font-bold text-gold">+₱{parsePrice(a.price).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accordion E: Pegs & Uploaded References */}
                    {(selectedPresetPegs.length > 0 || referenceFiles.length > 0 || notes) && (
                      <div className="border border-neutral-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                        <div 
                          onClick={() => setReviewAccordions(prev => ({ ...prev, pegs: !prev.pegs }))}
                          className="p-4 bg-gradient-to-r from-neutral-50/90 to-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-neutral-100/70 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
                              <Camera size={16} />
                            </div>
                            <div>
                              <span className="font-heading text-sm font-bold text-primary block leading-tight">
                                Style Directives &amp; Requests
                              </span>
                              <span className="text-[11px] text-neutral-500 font-body">
                                {selectedPresetPegs.length} tone(s) • {referenceFiles.length} photo(s)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setStep(6); }}
                              className="text-xs font-bold text-gold hover:underline bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20"
                            >
                              Edit
                            </button>
                            {reviewAccordions.pegs ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                          </div>
                        </div>
                        {reviewAccordions.pegs && (
                          <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2.5">
                            {selectedPresetPegs.length > 0 && (
                              <div>
                                <span className="text-neutral-400 block mb-1 text-[10px] font-bold uppercase tracking-wider">Aesthetic Tones:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedPresetPegs.map((peg, i) => (
                                    <span key={i} className="bg-gold/10 text-gold px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-gold/25">
                                      {peg}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {referenceFiles.length > 0 && (
                              <div className="text-neutral-700">
                                <span className="text-neutral-400 block mb-0.5 text-[10px] font-bold uppercase tracking-wider">Uploaded Photos:</span>
                                <span className="font-semibold text-primary">{referenceFiles.length} reference file(s) attached</span>
                              </div>
                            )}
                            {notes && (
                              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                                <span className="text-neutral-400 block mb-0.5 text-[10px] font-bold uppercase tracking-wider">Special Requests:</span>
                                <p className="text-neutral-700 italic">{notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-neutral-900 via-primary to-neutral-950 text-white border border-gold/30 shadow-lg space-y-3 font-body">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold font-mono flex items-center gap-1.5">
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
                        <p className="text-[10px] text-neutral-300 uppercase font-medium">50% Down Payment</p>
                        <p className="font-bold text-gold text-base mt-0.5">{formattedDownPayment}</p>
                        <p className="text-[9px] text-neutral-400 mt-0.5">Due upon confirmation</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
                        <p className="text-[10px] text-neutral-300 uppercase font-medium">Remaining at Studio</p>
                        <p className="font-bold text-white text-base mt-0.5">{formattedRemaining}</p>
                        <p className="text-[9px] text-neutral-400 mt-0.5">Payable on session day</p>
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

              {/* Navigation Actions (Steps 2-7) */}
              {step > 1 && (
                <div className="mt-8 pt-6 border-t border-neutral-100">
                  <p className="text-[11px] text-neutral-400 font-body text-center mb-4">
                    Step {step} of 7 — {stepSubtitles[step - 1]}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setValidationError("");
                        setStep(step - 1);
                      }}
                      className="btn-outline px-6 py-3 text-xs font-bold flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn-primary flex items-center gap-2 px-8 py-3 text-xs font-bold tracking-wider shadow-warm-sm flex-1 sm:flex-none justify-center"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={16} className="animate-spin" /> Processing Reservation...</>
                      ) : step === 7 ? (
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
