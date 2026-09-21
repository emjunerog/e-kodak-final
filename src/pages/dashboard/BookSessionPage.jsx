import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Camera, Calendar, Clock, MapPin, ArrowRight, ArrowLeft, Loader2,
  CheckCircle, Package, PlusCircle, Check, Sparkles, GraduationCap,
  Building, User, Mail, Phone, Info, HelpCircle, Layers, Image as ImageIcon,
  ExternalLink, ChevronRight, X, QrCode, Heart, Briefcase, Search,
  ChevronDown, ChevronUp, Eye, Trash2, ShieldCheck, AlertCircle, FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getServices, getAddOns } from "../../services/contentService";
import { createBooking } from "../../services/bookingService";
import { assignPhotographer } from "../../services/aiAssignmentService";
import { recordCustomerAction } from "../../services/customerAuditService";
import ReferenceImageUploader from "../../components/booking/ReferenceImageUploader";
import InteractiveCalendar from "../../components/booking/InteractiveCalendar";
import QRPass from "../../components/booking/QRPass";
import OrderSummarySidebar from "../../components/booking/OrderSummarySidebar";
import SchoolLogo from "../../components/booking/SchoolLogo";
import {
  CEBU_UNIVERSITIES,
  ALL_CEBU_CAMPUSES,
  POPULAR_COLLEGE_PROGRAMS,
  SHS_STRANDS
} from "../../lib/cebuAcademicData";
import StudioDropdown from "../../components/ui/StudioDropdown";

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
      id: "toga_hood", 
      title: "Classic Toga & Hood", 
      desc: "Formal portrait with university hood and cap", 
      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "creative_grad", 
      title: "Creative & Candid", 
      desc: "Natural poses with diploma and props", 
      image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "barong_filipiniana", 
      title: "Barong / Filipiniana", 
      desc: "Traditional attire with academic medals", 
      image: "https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?w=800&q=80&auto=format&fit=crop"
    },
    { 
      id: "family_co_shot", 
      title: "With Parents / Family", 
      desc: "Achievement portrait with family members", 
      image: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&q=80&auto=format&fit=crop"
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
    { label: "Honors & Medals", text: "Please prepare sash & academic medal setup." },
    { label: "Family Photo", text: "Parents or family members will join for 2-3 portrait shots." },
    { label: "Dark Backdrop", text: "Requesting classic dark charcoal backdrop." },
    { label: "Light Backdrop", text: "Requesting clean white or light gray backdrop." },
    { label: "Glasses Anti-Glare", text: "Anti-glare lighting angle for eyeglasses." }
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
  
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Booking Data State
  const [services, setServices] = useState([]);
  const [addOnsList, setAddOnsList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Form Step State (1-7)
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [addonSearch, setAddonSearch] = useState("");
  const [addonCategoryFilter, setAddonCategoryFilter] = useState("ALL");
  
  // Dynamic Service Detections
  const isCollegeService = useMemo(() => {
    if (!selectedService) return false;
    const s = (selectedService.slug + " " + selectedService.name + " " + selectedService.category).toLowerCase();
    return s.includes("college") || s.includes("university");
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
  const [studentSection, setStudentSection] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [univDropdownOpen, setUnivDropdownOpen] = useState(false);
  const [degreeDropdownOpen, setDegreeDropdownOpen] = useState(false);
  const [activePegModal, setActivePegModal] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

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

  // Body scroll lock and Escape key listener for lightbox/peg modals
  useEffect(() => {
    if (!activePegModal && !lightboxImg) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActivePegModal(null);
        setLightboxImg(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePegModal, lightboxImg]);

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
    if (isAcademicService && academicBookingMode === "SCHOOL_PARTNER") {
      if (locationType !== "STUDIO" && locationType !== "CAMPUS") {
        setLocationType("CAMPUS");
      }
    } else {
      if (locationType === "CAMPUS") {
        setLocationType("STUDIO");
      }
    }
  }, [isAcademicService, academicBookingMode, locationType]);

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

  // Handle University Selection for Cebu Universities
  const handleUniversityChange = (univId) => {
    setSelectedUnivId(univId);
    const found = CEBU_UNIVERSITIES.find(u => u.id === univId);
    if (found && found.id !== "other") {
      setStudentSchool(found.name);
      setStudentSchoolAddress(found.campuses[0] || "");
    } else if (found?.id === "other") {
      setStudentSchool("");
      setStudentSchoolAddress("");
    }
  };

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
      result = result.filter(a => (a.category || "").toUpperCase().includes(addonCategoryFilter));
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
      // Add-ons are completely optional
      setStep(4);
    } else if (step === 4) {
      // Validate dynamic fields based on service
      if (isCollegeService) {
        if (!studentSchool.trim()) {
          setValidationError("Please select or enter your University / College.");
          return;
        }
        if (!studentSection.trim()) {
          setValidationError("Class Section or Batch is required for graduation lab batching.");
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
      handleSubmitBooking();
    }
  };

  // Submit Booking
  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    setValidationError("");

    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";

    // Build consolidated notes with metadata
    let consolidatedNotes = notes || "";
    
    if (isAcademicService) {
      const studentBlock = `[STUDENT DETAILS]\n• Type: ${studentType === "COLLEGE" ? "College / University" : "Senior High School"}\n• Booking Mode: ${isSchoolPartner ? "School Pictorial (Date set by school)" : "Individual Booking"}\n• School: ${studentSchool}\n• Campus / Address: ${studentSchoolAddress || 'N/A'}\n• Degree / Strand: ${studentType === "COLLEGE" ? (studentCourse || 'N/A') : (selectedShsStrand || 'N/A')}\n• Section: ${studentSection}\n• Student ID: ${studentIdNumber}${schoolScheduleNote ? `\n• Note: ${schoolScheduleNote}` : ''}`;
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
        school: studentSchool,
        school_address: studentSchoolAddress,
        course: studentType === "COLLEGE" ? studentCourse : selectedShsStrand,
        section: studentSection,
        student_id: studentIdNumber,
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
      setBookingResult(data);
      setStep(8);
      
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

  // ── STEP 8: SUCCESS VIEW ──────────────────────────────────────────────────
  if (step === 8 && bookingResult) {
    const isSchoolPartner = isAcademicService && academicBookingMode === "SCHOOL_PARTNER";

    return (
      <div className="min-h-screen pt-28 pb-20 bg-neutral-50 px-4 flex items-center justify-center font-body">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-neutral-100 text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle size={36} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full">
            Booking Confirmed & Queued
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl text-primary mt-3 mb-2">Booking Submitted!</h1>
          <p className="font-body text-neutral-500 text-sm mb-6 leading-relaxed">
            Your photography booking has been securely registered in the studio queue. A dedicated lead photographer and administrative assistant have been assigned.
          </p>
          
          <div className="bg-neutral-50 p-5 rounded-2xl text-left font-body text-sm space-y-3 mb-6 border border-neutral-100">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
              <span className="text-neutral-400 text-xs uppercase font-medium">Booking Number</span>
              <span className="font-body font-bold text-primary text-base">{bookingResult.booking_number}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
              <span className="text-neutral-400 text-xs uppercase font-medium">Service & Package</span>
              <span className="font-medium text-primary text-right">{selectedService.name} {selectedTier && `(${selectedTier.name})`}</span>
            </div>
            {isCollegeService && studentSection && (
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
                <span className="text-neutral-400 text-xs uppercase font-medium">Batch / Section</span>
                <span className="font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded text-xs">{studentSection} • {studentSchool}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
              <span className="text-neutral-400 text-xs uppercase font-medium">Target Schedule</span>
              <span className="font-medium text-primary">
                {isSchoolPartner
                  ? "Coordinated via School Agreement (Batch Notification)"
                  : `${eventDate} at ${preferredTime}`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-neutral-400 text-xs uppercase font-medium">Total Balance</span>
              <span className="font-heading text-lg font-bold text-primary">{formattedTotal}</span>
            </div>
          </div>

          {/* Quick QR Code Pass Card */}
          <div className="bg-primary text-white rounded-2xl p-5 mb-6 text-center relative overflow-hidden shadow-warm-md">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-gold/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold bg-white/10 px-2.5 py-0.5 rounded-full border border-gold/20 flex items-center gap-1">
                  <QrCode size={12} /> Studio Session QR Pass
                </span>
                <span className="text-[11px] text-neutral-300 font-body font-medium">
                  {bookingResult.booking_number}
                </span>
              </div>
              <QRPass
                bookingToken={bookingResult.booking_token || bookingResult.id}
                bookingNumber={bookingResult.booking_number}
                qrCodePath={bookingResult.qr_code_path}
                size={170}
                showActions={true}
              />
              <p className="text-[11px] text-neutral-300 mt-2 font-body">
                Keep this QR pass handy on your device when checking in at E-Kodak Studio.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link to={`/dashboard/bookings/${bookingResult.id}`} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold">
              View Booking Details &amp; Order <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard/bookings" className="btn-outline w-full flex items-center justify-center py-3 text-sm">
              Go to My Bookings
            </Link>
          </div>

          {/* ── Mobile Companion App Banner ── */}
          <div className="mt-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-[#1a1508]/80 to-[#0f0f0a]/80 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                <span className="text-lg">📱</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gold mb-1 font-body">
                  Track your booking live on your phone
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed font-body mb-2">
                  Download the <strong className="text-neutral-300">E-Kodak Companion App</strong> and scan your QR
                  pass above to receive real-time updates, milestone notifications, and delivery alerts
                  directly on your device.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-neutral-500 font-body italic">
                    ✓ Status updates &nbsp;·&nbsp; ✓ Milestone tracking &nbsp;·&nbsp; ✓ Delivery alerts
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
    <div className="animate-fade-in max-w-7xl mx-auto pb-24 lg:pb-16 mt-16 px-4 font-body">
      
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

      {/* Header */}
      <div className="mb-8">
        <Link to="/services" className="inline-flex items-center gap-1 text-neutral-400 hover:text-primary transition-colors font-body text-sm mb-3">
          <ArrowLeft size={16} /> Back to Services Catalog
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading text-primary">Book Your Photography Session</h1>
            <p className="font-body text-neutral-500 text-sm mt-1">Configure your package, session schedule, and preferences.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => triggerAIAssistant()}
              className="text-xs font-semibold text-primary hover:text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-full border border-gold/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={13} className="text-gold" />
              <span>Studio Concierge</span>
            </button>
            <span className="text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full">
              Step {step} of 7: {stepTitles[step - 1]}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left: Active Step Form Area */}
        <div className="w-full lg:flex-1 min-w-0">
          <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-neutral-100">
            
            {/* Step Progress Stepper */}
            <div className="flex items-center justify-between mb-8 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-neutral-100 rounded-full" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gold rounded-full transition-all duration-500" 
                style={{ width: `${((step - 1) / 6) * 100}%` }} 
              />
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                <div key={s} className="relative flex flex-col items-center">
                  <div 
                    onClick={() => {
                      if (s < step) setStep(s);
                    }}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-body text-xs font-bold transition-all shadow-sm ${
                      step === s ? "bg-primary text-white ring-4 ring-primary/10" :
                      step > s ? "bg-gold text-white cursor-pointer hover:scale-105" : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {step > s ? <Check size={14} /> : s}
                  </div>
                  <span className={`hidden sm:block absolute top-10 text-[10px] font-medium whitespace-nowrap transition-colors ${
                    step === s ? "text-primary font-bold" : "text-neutral-400"
                  }`}>
                    {stepTitles[s-1]}
                  </span>
                </div>
              ))}
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-body border border-red-200 flex items-start gap-2.5 animate-shake">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleNext}>
              
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: SELECT PHOTOGRAPHY SERVICE
              ───────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
                    <div>
                      <h2 className="text-xl font-heading text-primary">1. Select Photography Service</h2>
                      <p className="text-xs text-neutral-400 font-body mt-1">Choose the primary photography session you want to reserve.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerAIAssistant("Can you recommend which photography package is best suited for me?")}
                      className="text-xs font-semibold text-primary hover:text-gold flex items-center gap-1.5 self-start sm:self-auto bg-neutral-100 px-3 py-1.5 rounded-full"
                    >
                      <Sparkles size={12} className="text-gold" /> Studio Package Guide
                    </button>
                  </div>

                  {loadingData ? (
                    <div className="py-16 text-center text-neutral-400">
                      <Loader2 className="animate-spin mx-auto mb-2 text-gold" size={24} />
                      <p className="text-xs">Loading available photography services...</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {services.map((svc) => {
                        const isSelected = selectedService?.id === svc.id;
                        return (
                          <div 
                            key={svc.id || svc.slug}
                            onClick={() => {
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
                            }}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/10' 
                                : 'border-neutral-100 hover:border-gold/40 bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2.5 py-0.5 rounded-full">
                                  {svc.category || "Service"}
                                </span>
                                {svc.tiers && (
                                  <span className="text-[10px] text-neutral-400 font-medium font-body">
                                    {svc.tiers.length} Tiers Available
                                  </span>
                                )}
                              </div>
                              <h3 className="font-heading text-lg text-primary font-semibold">{svc.name}</h3>
                              <p className="text-xs text-neutral-500 font-body mt-1 line-clamp-2 leading-relaxed">
                                {svc.description}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                              <span className="text-xs font-semibold text-primary">
                                Starts at ₱{(svc.tiers?.length ? Math.min(...svc.tiers.map(t => parsePrice(t.price)).filter(Boolean)) : parsePrice(svc.base_price)).toLocaleString()}
                              </span>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-primary bg-primary text-white" : "border-neutral-300"
                              }`}>
                                {isSelected && <Check size={12} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: ENHANCED & APPEALING PACKAGE TIER SELECTION
              ───────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
                    <div>
                      <h2 className="text-xl font-heading text-primary">2. Choose Your Package Tier</h2>
                      <p className="text-xs text-neutral-500 font-body mt-1">
                        Select the tier that best satisfies your print, wardrobe, and digital file needs for <strong className="text-primary">{selectedService?.name}</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerAIAssistant(`Can you provide guidance on which package tier best matches my needs for ${selectedService?.name}?`)}
                      className="p-2.5 rounded-full bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 transition-all hover:scale-110 shadow-sm self-start sm:self-auto shrink-0"
                      title="Studio Tier Guide"
                      aria-label="Studio Tier Guide"
                    >
                      <Sparkles size={16} className="text-gold" />
                    </button>
                  </div>

                  {!selectedService?.tiers || selectedService.tiers.length === 0 ? (
                    <div className="p-8 bg-neutral-50 rounded-2xl text-center border border-neutral-100">
                      <Package size={32} className="mx-auto text-gold mb-2" />
                      <h3 className="font-heading text-lg text-primary">Standard Package</h3>
                      <p className="text-xs text-neutral-500 font-body mt-1 max-w-md mx-auto">
                        This service has a fixed comprehensive package. All standard inclusions, studio setup, and digital copies are covered.
                      </p>
                      <p className="font-bold text-2xl text-primary mt-3">
                        ₱{parsePrice(selectedService?.base_price).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-5">
                      {selectedService.tiers.map((tier, idx) => {
                        const isTierSelected = selectedTier?.name === tier.name;
                        const isBestValue = idx === 1 || tier.popular;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setSelectedTier(tier);
                              setValidationError("");
                            }}
                            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all relative flex flex-col justify-between group ${
                              isTierSelected 
                                ? 'border-primary bg-primary/5 shadow-warm-md ring-2 ring-primary/10' 
                                : 'border-neutral-200/80 hover:border-gold/60 bg-white hover:shadow-sm'
                            }`}
                          >
                            {/* Badges */}
                            {isBestValue && (
                              <span className="absolute -top-3 right-5 bg-gradient-to-r from-gold to-gold-dark text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <Sparkles size={11} /> Most Popular
                              </span>
                            )}

                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-heading text-xl text-primary font-bold">{tier.name}</h3>
                                  <p className="text-xs text-neutral-400 font-body flex items-center gap-1 mt-0.5">
                                    <Clock size={12} className="text-gold" /> {tier.duration || "Studio Session"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-heading font-extrabold text-primary">{tier.price}</p>
                                  <p className="text-[10px] text-neutral-400 font-body">Fixed Rate</p>
                                </div>
                              </div>

                              {/* Inclusions Checklist */}
                              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Package Inclusions:</p>
                                <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {tier.highlights?.map((h, i) => (
                                    <li key={i} className="text-xs text-neutral-700 flex items-start gap-2 font-body leading-relaxed">
                                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{h}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                              <span className={`text-xs font-semibold transition-colors ${
                                isTierSelected ? "text-primary font-bold" : "text-neutral-500 group-hover:text-gold"
                              }`}>
                                {isTierSelected ? "✓ Selected Tier" : "Select this Package"}
                              </span>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isTierSelected ? "border-primary bg-primary text-white shadow-sm" : "border-neutral-300"
                              }`}>
                                {isTierSelected && <Check size={13} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: ORGANIZED, UN-CROWDED ADD-ONS
              ───────────────────────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-heading text-primary">3. Optional Add-ons</h2>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          100% Optional
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 font-body mt-1">
                        Select extra framed prints, hair & makeup, or rush digital turnaround. Skip anytime.
                      </p>
                    </div>

                    {/* Quick Skip Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddOns([]);
                        setStep(4);
                      }}
                      className="text-xs font-semibold text-neutral-600 hover:text-primary bg-neutral-100 hover:bg-neutral-200 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      Skip Add-ons <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Search Bar & Category Filter */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={addonSearch}
                        onChange={e => setAddonSearch(e.target.value)}
                        placeholder="Search prints, frames, hair & makeup, digital copies..."
                        className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                      />
                      {addonSearch && (
                        <button
                          type="button"
                          onClick={() => setAddonSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "ALL", label: "All Items" },
                        { id: "PRINT", label: "Framed Prints & Albums" },
                        { id: "DIGITAL", label: "Digital & Rush Turnaround" },
                        { id: "MAKEUP", label: "Hair & Makeup Styling" },
                        { id: "PRODUCTION", label: "Video & Extra Poses" },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAddonCategoryFilter(tab.id)}
                          className={`text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all ${
                            addonCategoryFilter === tab.id
                              ? "bg-primary text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected items tray */}
                  {selectedAddOns.length > 0 && (
                    <div className="p-3.5 bg-gold/10 border border-gold/30 rounded-2xl flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gold uppercase tracking-wider mr-1">
                        Active Add-ons ({selectedAddOns.length}):
                      </span>
                      {selectedAddOns.map((addon, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white text-primary px-2.5 py-1 rounded-lg border border-gold/30 font-medium shadow-sm">
                          {addon.name} (+₱{parsePrice(addon.price).toLocaleString()})
                          <button
                            type="button"
                            onClick={() => toggleAddOn(addon)}
                            className="text-neutral-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add-ons List */}
                  <div className="grid gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredAddOns.length === 0 ? (
                      <p className="text-center py-8 text-neutral-400 text-xs italic">
                        No add-on items match your filter.
                      </p>
                    ) : (
                      filteredAddOns.map((addon, idx) => {
                        const isSelected = selectedAddOns.some(a => a.name === addon.name);
                        return (
                          <div 
                            key={addon.id || idx} 
                            onClick={() => toggleAddOn(addon)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-neutral-200/80 hover:border-gold/50 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary text-white' : 'bg-neutral-100 text-transparent border border-neutral-300'
                              }`}>
                                <Check size={12} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-heading text-sm text-primary font-semibold">{addon.name}</span>
                                  {addon.category && (
                                    <span className="text-[10px] text-neutral-400 font-body hidden sm:inline">
                                      • {addon.category}
                                    </span>
                                  )}
                                </div>
                                {addon.description && (
                                  <p className="text-xs text-neutral-500 font-body mt-0.5 line-clamp-1">{addon.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="font-heading font-bold text-gold text-sm whitespace-nowrap ml-3">
                              +₱{parsePrice(addon.price).toLocaleString()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: DYNAMIC CUSTOMER & VERIFICATION DETAILS
              ───────────────────────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-neutral-100 pb-4">
                    <h2 className="text-xl font-heading text-primary">4. Identification & Session Details</h2>
                    <p className="text-xs text-neutral-400 font-body mt-1">
                      {isAcademicService
                        ? "Verify your school, program/strand, and section for graduation batching & yearbook layout."
                        : isWeddingService
                        ? "Provide the wedding couple details, ceremony/reception venue, and styling notes."
                        : "Verify your client contact profile and photoshoot requirements."}
                    </p>
                  </div>

                  {/* Customer Basic Contact Card */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 grid sm:grid-cols-2 gap-3 text-xs font-body">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Client Name</span>
                      <span className="font-semibold text-primary">{profile?.first_name} {profile?.last_name || user?.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Email</span>
                      <span className="font-medium text-neutral-600">{user?.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Contact Phone</span>
                      <span className="font-medium text-primary">{profile?.phone || "Verified on file"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Account Type</span>
                      <span className="font-medium text-gold capitalize">{profile?.role || "Customer"}</span>
                    </div>
                  </div>

                  {/* ── ACADEMIC PICTORIAL ARRANGEMENT SELECTOR ── */}
                  {isAcademicService && (
                    <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 shadow-2xs space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2.5 border-b border-neutral-200/60 pb-3">
                        <Building className="text-gold shrink-0" size={18} />
                        <div>
                          <h4 className="font-heading text-sm sm:text-base text-primary font-bold">Photoshoot Scheduling</h4>
                          <p className="text-xs text-neutral-500 font-body">Choose whether your date is set by your school or self-scheduled</p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        {/* Option 1: School Pictorial */}
                        <div
                          onClick={() => setAcademicBookingMode("SCHOOL_PARTNER")}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            academicBookingMode === "SCHOOL_PARTNER"
                              ? "border-primary bg-white shadow-xs ring-2 ring-primary/10"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <GraduationCap size={15} className="text-gold" />
                                School Pictorial
                              </span>
                              <input
                                type="radio"
                                name="academicBookingMode"
                                checked={academicBookingMode === "SCHOOL_PARTNER"}
                                onChange={() => setAcademicBookingMode("SCHOOL_PARTNER")}
                                className="accent-primary"
                              />
                            </div>
                            <p className="text-[11px] text-neutral-600 font-body leading-relaxed">
                              My school has an agreement with E-Kodak. Shoot date and time will be coordinated with the school.
                            </p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded-md">
                            <Clock size={12} className="shrink-0 text-amber-600" />
                            <span>Date set by school</span>
                          </div>
                        </div>

                        {/* Option 2: Individual Booking */}
                        <div
                          onClick={() => setAcademicBookingMode("INDIVIDUAL")}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            academicBookingMode === "INDIVIDUAL"
                              ? "border-primary bg-white shadow-xs ring-2 ring-primary/10"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <User size={15} className="text-gold" />
                                Individual Booking
                              </span>
                              <input
                                type="radio"
                                name="academicBookingMode"
                                checked={academicBookingMode === "INDIVIDUAL"}
                                onChange={() => setAcademicBookingMode("INDIVIDUAL")}
                                className="accent-primary"
                              />
                            </div>
                            <p className="text-[11px] text-neutral-600 font-body leading-relaxed">
                              I am booking independently. I will choose my own preferred photoshoot date and time.
                            </p>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md">
                            <Calendar size={12} className="shrink-0 text-emerald-600" />
                            <span>Choose date & time in Step 5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CASE A1: COLLEGE / UNIVERSITY PHOTOSHOOT ── */}
                  {isCollegeService && (
                    <div className="space-y-4 p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs animate-fade-in">
                      <div className="flex items-center gap-2.5 border-b border-neutral-200/60 pb-3">
                        <GraduationCap size={20} className="text-gold shrink-0" />
                        <div>
                          <h4 className="font-heading text-base text-primary font-bold">College / University Details</h4>
                          <p className="text-xs text-neutral-500 font-body">Enter your school and course information for your graduation records.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* University Input with Predictive Suggestions & Extension Campuses */}
                        <div ref={univContainerRef} className="relative">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-primary">
                              University / College Name <span className="text-red-500">*</span>
                            </label>
                            {univDropdownOpen && (
                              <button
                                type="button"
                                onClick={() => setUnivDropdownOpen(false)}
                                className="text-[10px] text-neutral-400 hover:text-primary font-semibold"
                              >
                                Hide Suggestions ✕
                              </button>
                            )}
                          </div>

                          <div className="relative flex items-center">
                            {/* School Logo or Academic Icon inside Input */}
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
                              placeholder="Type university or campus (e.g. CTU Naga, USC, CIT-U, UC)..."
                              className={`w-full ${activeUnivId ? "pl-11" : "pl-10"} pr-9 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none font-semibold text-primary shadow-sm transition-all`}
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

                          {/* Floating Predictive University & Campus Suggestion Menu */}
                          {univDropdownOpen && filteredCampuses.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-neutral-200 shadow-2xl max-h-72 overflow-y-auto divide-y divide-neutral-100 animate-fade-in">
                              <div className="p-2.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 sticky top-0 flex items-center justify-between border-b border-neutral-100 z-10 backdrop-blur-sm">
                                <span className="flex items-center gap-1.5">
                                  <span>Cebu Campuses & Extensions</span>
                                  <span className="bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full font-body text-[9px]">{filteredCampuses.length}</span>
                                </span>
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
                                  {/* Authentic School Logo */}
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

                                  {item.shortName && (
                                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-md shrink-0">
                                      {item.shortName}
                                    </span>
                                  )}
                                </div>
                              ))}

                              <div className="p-2 text-[10px] text-neutral-400 bg-neutral-50/80 text-center border-t border-neutral-100">
                                Click any campus to automatically fill university & campus address.
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Campus / Branch Address - Single Clean Control (Uncrowded, No Duplicate Boxes) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-primary">
                              Campus / Branch Address
                            </label>
                            {currentSelectedUniv?.campuses?.length > 1 && (
                              <span className="text-[10px] text-gold font-semibold bg-gold/10 px-2 py-0.5 rounded-full">
                                {currentSelectedUniv.campuses.length} Campuses in Cebu
                              </span>
                            )}
                          </div>

                          {currentSelectedUniv?.campuses?.length > 1 ? (
                            <div className="space-y-2">
                              <StudioDropdown
                                value={
                                  currentSelectedUniv.campuses.includes(studentSchoolAddress)
                                    ? studentSchoolAddress
                                    : "custom"
                                }
                                onChange={(val) => {
                                  if (val === "custom") {
                                    setStudentSchoolAddress("");
                                  } else {
                                    setStudentSchoolAddress(val);
                                    const commaIdx = val.indexOf(",");
                                    const campusTitle = commaIdx !== -1 ? val.substring(0, commaIdx).trim() : val;
                                    setStudentSchool(`${currentSelectedUniv.name} - ${campusTitle}`);
                                  }
                                }}
                                options={[
                                  ...currentSelectedUniv.campuses.map(c => ({ value: c, label: c })),
                                  { value: "custom", label: "Other / Type Custom Campus Address" }
                                ]}
                                placeholder={`-- Select Campus (${currentSelectedUniv.campuses.length}) --`}
                              />

                              {/* Only show custom text input if 'custom' is selected or address isn't in predefined list */}
                              {(!currentSelectedUniv.campuses.includes(studentSchoolAddress) || studentSchoolAddress === "") && (
                                <input
                                  type="text"
                                  value={studentSchoolAddress}
                                  onChange={e => setStudentSchoolAddress(e.target.value)}
                                  placeholder="Type specific branch, building, or extension campus address..."
                                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none animate-fade-in"
                                />
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={studentSchoolAddress}
                              onChange={e => setStudentSchoolAddress(e.target.value)}
                              placeholder="e.g., Main Campus, Gorordo Ave, Lahug, Cebu City"
                              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none shadow-sm"
                            />
                          )}
                        </div>

                        {/* Degree Program Input with Predictive Suggestions */}
                        <div ref={degreeContainerRef} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-primary">
                              Degree Program / Course
                            </label>
                            {degreeDropdownOpen && (
                              <button
                                type="button"
                                onClick={() => setDegreeDropdownOpen(false)}
                                className="text-[10px] text-neutral-400 hover:text-primary font-semibold"
                              >
                                Hide Suggestions ✕
                              </button>
                            )}
                          </div>

                          <div className="relative">
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
                              placeholder="Type course or select from suggestions (e.g. BS Information Technology, BS Nursing)..."
                              className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
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

                          {/* Floating Predictive Degree Program Suggestion Menu */}
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

                        {/* Common: Class Section & Student ID */}
                        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Class Section <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentSection}
                              onChange={e => setStudentSection(e.target.value)}
                              placeholder="e.g., BSIT 4-1 / Batch 2026"
                              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Student ID Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentIdNumber}
                              onChange={e => setStudentIdNumber(e.target.value)}
                              placeholder="e.g., 22104582 / 2022-01452"
                              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CASE A2: SENIOR HIGH SCHOOL PHOTOSHOOT ── */}
                  {isSeniorHighService && (
                    <div className="space-y-4 p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs animate-fade-in">
                      <div className="flex items-center gap-2.5 border-b border-neutral-200/60 pb-3">
                        <GraduationCap size={20} className="text-gold shrink-0" />
                        <div>
                          <h4 className="font-heading text-base text-primary font-bold">Senior High School Details</h4>
                          <p className="text-xs text-neutral-500 font-body">Enter your school and strand information for your graduation records.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">
                            High School Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={studentSchool}
                            onChange={e => setStudentSchool(e.target.value)}
                            placeholder="e.g., Cebu City National Science High School / Abellana National School"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none font-semibold text-primary"
                          />
                          {/* Quick Cebu SHS suggestions */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] font-semibold text-neutral-400">Quick select:</span>
                            {[
                              "Cebu City National Science High School",
                              "Abellana National School",
                              "USC South Basic Education",
                              "CIT-U High School"
                            ].map((sName, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setStudentSchool(sName)}
                                className="text-[10px] bg-white border border-neutral-200 hover:border-gold/60 text-neutral-600 hover:text-primary px-2 py-0.5 rounded-md transition-colors"
                              >
                                {sName}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">School Campus / Address</label>
                          <input
                            type="text"
                            value={studentSchoolAddress}
                            onChange={e => setStudentSchoolAddress(e.target.value)}
                            placeholder="e.g., Salvador St, Labangon, Cebu City"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Senior High Academic Strand</label>
                          <StudioDropdown
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

                        {/* Common: Class Section & Student ID */}
                        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Grade & Section <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentSection}
                              onChange={e => setStudentSection(e.target.value)}
                              placeholder="e.g., Grade 12 - STEM A / Batch 2026"
                              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-1">
                              Student ID Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentIdNumber}
                              onChange={e => setStudentIdNumber(e.target.value)}
                              placeholder="e.g., 2026-SHS-0192"
                              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CASE B: WEDDING PHOTOSHOOT ── */}
                  {isWeddingService && (
                    <div className="space-y-4 p-5 rounded-2xl border-2 border-rose-200 bg-rose-50/40 shadow-sm animate-fade-in">
                      <div className="flex items-start gap-3 border-b border-rose-200/60 pb-3">
                        <Heart size={22} className="text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Wedding Essentials</span>
                          <h4 className="font-heading text-base text-primary font-bold">Couple & Wedding Day Coordination</h4>
                          <p className="text-xs text-neutral-600 font-body mt-0.5">
                            Our lead wedding photographer and lighting team customize equipment and style pegs based on your color palette and venue.
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Bride's Full Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={brideName}
                            onChange={e => setBrideName(e.target.value)}
                            placeholder="e.g., Maria Santos"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Groom's Full Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={groomName}
                            onChange={e => setGroomName(e.target.value)}
                            placeholder="e.g., Juan Dela Cruz"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Wedding Theme / Color Palette</label>
                          <input
                            type="text"
                            value={weddingTheme}
                            onChange={e => setWeddingTheme(e.target.value)}
                            placeholder="e.g., Sage Green & Champagne Gold / Rustic Earth"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Ceremony Church / Venue</label>
                          <input
                            type="text"
                            value={ceremonyVenue}
                            onChange={e => setCeremonyVenue(e.target.value)}
                            placeholder="e.g., Cebu Metropolitan Cathedral / Chateau de Busay"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Wedding Coordinator Name</label>
                          <input
                            type="text"
                            value={coordinatorName}
                            onChange={e => setCoordinatorName(e.target.value)}
                            placeholder="e.g., Signature Events Management"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Coordinator Contact Phone</label>
                          <input
                            type="tel"
                            value={coordinatorContact}
                            onChange={e => setCoordinatorContact(e.target.value)}
                            placeholder="e.g., 0917 123 4567"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CASE C: CORPORATE / COMMERCIAL ── */}
                  {isCorporateService && (
                    <div className="space-y-4 p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 shadow-sm animate-fade-in">
                      <div className="flex items-start gap-3 border-b border-blue-200/60 pb-3">
                        <Briefcase size={22} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Executive & Commercial</span>
                          <h4 className="font-heading text-base text-primary font-bold">Company & Professional Profile</h4>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Company / Organization</label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="e.g., Tech Solutions Cebu / Freelance"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Designation / Role</label>
                          <input
                            type="text"
                            value={clientRole}
                            onChange={e => setClientRole(e.target.value)}
                            placeholder="e.g., Managing Director / Partner / Engineer"
                            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
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
                  )}

                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 5: SCHEDULE & STUDIO LOCATION (8AM-5PM, BATCH SCHEDULING)
              ───────────────────────────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-neutral-100 pb-4">
                    <h2 className="text-xl font-heading text-primary">5. Session Date, Time Slot & Studio Location</h2>
                    <p className="text-xs text-neutral-400 font-body mt-1">
                      Studio operating hours: strictly <strong className="text-primary font-semibold">8:00 AM – 5:00 PM</strong>.
                    </p>
                  </div>

                  {/* ── CASE A: SCHOOL SCHEDULED PICTORIAL ── */}
                  {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                        <div className="flex items-start gap-3">
                          <Clock size={20} className="text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-heading text-sm sm:text-base font-bold text-primary">
                              Date and Time Set by School
                            </h4>
                            <p className="text-xs text-neutral-600 font-body mt-0.5 leading-relaxed">
                              Your pictorial date and time will be scheduled based on your school's agreement. The studio will update your booking once the schedule is confirmed.
                            </p>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs font-body">
                          <div className="p-3 bg-white rounded-xl border border-neutral-200/80">
                            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">School</span>
                            <span className="font-bold text-primary text-xs block truncate mt-0.5">{studentSchool || "School on file"}</span>
                            {studentSchoolAddress && <span className="text-[11px] text-neutral-500 block truncate">{studentSchoolAddress}</span>}
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-neutral-200/80">
                            <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Course & Section</span>
                            <span className="font-bold text-primary text-xs block truncate mt-0.5">
                              {[studentCourse || selectedShsStrand, studentSection].filter(Boolean).join(" · ") || "Section on file"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <label className="block text-xs font-bold text-primary mb-1">
                            Scheduling Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={schoolScheduleNote}
                            onChange={e => setSchoolScheduleNote(e.target.value)}
                            placeholder="e.g. preferred time or special note"
                            className="w-full px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-body focus:ring-2 focus:ring-gold/30 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── CASE B: INDIVIDUAL STUDENTS & REGULAR CLIENTS (CALENDAR & TIME SLOTS) ── */
                    <div className="space-y-6">
                      {/* Notice for Individual Student Booking */}
                      {isAcademicService && academicBookingMode === "INDIVIDUAL" && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 font-body animate-fade-in">
                          <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-xs text-emerald-800">
                              Individual Booking
                            </span>
                            <span className="text-[11px] text-neutral-600">
                              Please select your preferred date and time slot from the calendar below.
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

                  {/* Location Selector */}
                  {isSchoolPartnerBatch ? (
                    /* School Partner Agreement Location Options */
                    <div className="space-y-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-primary">Pictorial Location / Venue</label>
                        <span className="text-[10px] text-neutral-400 font-normal">Based on school agreement</span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Option 1: School Campus */}
                        <div 
                          onClick={() => setLocationType("CAMPUS")}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            locationType === "CAMPUS"
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-neutral-100 hover:border-neutral-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-heading font-bold text-primary text-sm">
                              <GraduationCap size={17} className="text-gold" /> School Campus (On-site)
                            </div>
                            {locationType === "CAMPUS" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-primary">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-700 font-medium font-body mt-1.5 truncate">
                            {studentSchool || "Your School Campus"}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-body mt-0.5 truncate">
                            {studentSchoolAddress || "Designated on-campus venue"}
                          </p>
                        </div>

                        {/* Option 2: E-Kodak Studio */}
                        <div 
                          onClick={() => setLocationType("STUDIO")}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            locationType === "STUDIO"
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-neutral-100 hover:border-neutral-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-heading font-bold text-primary text-sm">
                              <Building size={16} className="text-gold" /> E-Kodak Studio
                            </div>
                            {locationType === "STUDIO" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-primary">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-700 font-medium font-body mt-1.5">
                            311 Rizal Street, City of Naga, Cebu
                          </p>
                          <p className="text-[11px] text-neutral-400 font-body mt-0.5">
                            For batches scheduled for in-studio sessions
                          </p>
                        </div>
                      </div>

                      {/* On-Campus Information Card */}
                      {locationType === "CAMPUS" && (
                        <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 space-y-2 animate-fade-in">
                          <div className="flex items-start gap-2.5">
                            <GraduationCap size={18} className="text-gold mt-0.5 shrink-0" />
                            <div>
                              <h4 className="font-heading text-sm text-primary font-bold">On-Campus Photoshoot Venue</h4>
                              <p className="text-xs text-neutral-700 font-body mt-0.5">
                                <span className="font-semibold text-primary">{studentSchool || "School Campus"}</span>
                                {studentSchoolAddress && <span className="text-neutral-500"> — {studentSchoolAddress}</span>}
                              </p>
                              <p className="text-[11px] text-neutral-500 font-body mt-1.5 leading-relaxed">
                                The studio mobile team brings complete studio backdrops, lighting equipment, togas, and hoods directly to your campus on the agreed pictorial date.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Studio Information Card for School Partner */}
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
                        <div className="p-5 rounded-2xl border border-neutral-200 bg-white space-y-4 animate-fade-in shadow-sm">
                          <h4 className="font-heading text-base text-primary font-bold">On-Location Address Details</h4>
                          
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-primary mb-1">
                                Venue / Hotel / Campus Name
                              </label>
                              <input 
                                type="text" 
                                value={customVenue}
                                onChange={e => setCustomVenue(e.target.value)}
                                placeholder="e.g., USC Talamban Campus / Waterfront Cebu / Private Residence"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-primary mb-1">
                                Street Address & Barangay <span className="text-red-500">*</span>
                              </label>
                              <input 
                                type="text" 
                                required={locationType === "CUSTOM"}
                                value={customAddress}
                                onChange={e => setCustomAddress(e.target.value)}
                                placeholder="e.g., Gov. M. Cuenco Ave, Brgy. Talamban"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">City / Municipality</label>
                              <input 
                                type="text" 
                                value={customBarangayCity}
                                onChange={e => setCustomBarangayCity(e.target.value)}
                                placeholder="e.g., Cebu City / Mandaue City"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1">Landmark / Directions</label>
                              <input 
                                type="text" 
                                value={customLandmark}
                                onChange={e => setCustomLandmark(e.target.value)}
                                placeholder="e.g., Near Main Entrance gate, building B"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
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
                  <div className="border-b border-neutral-100 pb-3">
                    <h2 className="text-xl font-heading text-primary">6. Photo Style & References</h2>
                    <p className="text-xs text-neutral-500 font-body mt-1">
                      Select preferred styles or upload sample reference photos for your session.
                    </p>
                  </div>

                  {/* Preset Style Suggestions */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-2 flex items-center justify-between">
                      <span>Suggested Styles</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Optional</span>
                    </label>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {(isCollegeService
                        ? PRESET_STYLE_PEGS.graduation
                        : isWeddingService
                        ? PRESET_STYLE_PEGS.wedding
                        : isCorporateService
                        ? PRESET_STYLE_PEGS.corporate
                        : PRESET_STYLE_PEGS.general
                      ).map((peg) => {
                        const isPegSelected = selectedPresetPegs.includes(peg.title);
                        return (
                          <div
                            key={peg.id}
                            onClick={() => togglePresetPeg(peg)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isPegSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-neutral-200/80 bg-white hover:border-gold/50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isPegSelected ? "bg-primary text-white" : "bg-neutral-100 text-transparent border border-neutral-300"
                              }`}>
                                <Check size={12} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-heading text-xs text-primary font-bold block">{peg.title}</span>
                                <p className="text-[11px] text-neutral-500 font-body mt-0.5 line-clamp-1">{peg.desc}</p>
                              </div>
                            </div>

                            {/* Photo Thumbnail */}
                            {peg.image && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePegModal(peg);
                                }}
                                className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-200 group/img shadow-xs hover:scale-105 transition-transform"
                                title="Click to view reference photo"
                              >
                                <img 
                                  src={peg.image} 
                                  alt={peg.title} 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={13} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Reference Image Upload */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-primary mb-1">
                      Upload Reference Photos (Optional)
                    </label>
                    <p className="text-xs text-neutral-400 font-body mb-3">
                      Attach sample photos or poses you'd like our photographer to reference.
                    </p>

                    <ReferenceImageUploader 
                      files={referenceFiles} 
                      setFiles={setReferenceFiles} 
                    />
                  </div>

                  {/* Special Requests with Clean Text Chips (Zero Emojis) */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5" htmlFor="notes">
                      Special Notes (Optional)
                    </label>

                    {/* Pre-template chips */}
                    {activeSpecialTemplates.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-[11px] font-semibold text-neutral-400 mr-1">Quick notes:</span>
                        {activeSpecialTemplates.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNotes(prev => prev ? `${prev}\n• ${tmpl.text}` : `• ${tmpl.text}`)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-gold/15 hover:text-primary border border-neutral-200 transition-colors"
                          >
                            {tmpl.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea 
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g., Specific pose requests, backdrop preferences, family members joining, or items to bring..."
                      className="w-full p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 7: SMART COLLAPSIBLE REVIEW & CONFIRM
              ───────────────────────────────────────────────────────────── */}
              {step === 7 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-neutral-100 pb-4">
                    <h2 className="text-xl font-heading text-primary">7. Review & Confirm Booking</h2>
                    <p className="text-xs text-neutral-400 font-body mt-1">
                      Review all session data below. You can open, collapse, or directly click "Edit" on any section.
                    </p>
                  </div>

                  <div className="space-y-3">
                    
                    {/* Accordion A: Service & Package */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, pkg: !prev.pkg }))}
                        className="p-4 bg-neutral-50/70 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60"
                      >
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-gold" />
                          <span className="font-heading text-sm font-bold text-primary">Service & Package Tier</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(2); }}
                            className="text-xs font-bold text-gold hover:underline"
                          >
                            Edit
                          </button>
                          {reviewAccordions.pkg ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {reviewAccordions.pkg && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Service:</span>
                            <span className="font-bold text-primary">{selectedService?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Package Tier:</span>
                            <span className="font-bold text-gold">{selectedTier?.name || "Standard"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Base Price:</span>
                            <span className="font-semibold text-primary">₱{basePrice.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion B: Client & Institutional Information */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, client: !prev.client }))}
                        className="p-4 bg-neutral-50/70 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60"
                      >
                        <div className="flex items-center gap-2">
                          {isAcademicService ? <GraduationCap size={16} className="text-gold" /> : isWeddingService ? <Heart size={16} className="text-rose-500" /> : <User size={16} className="text-blue-500" />}
                          <span className="font-heading text-sm font-bold text-primary">
                            {isAcademicService ? "Student Details" : isWeddingService ? "Wedding Information" : "Client Details"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(4); }}
                            className="text-xs font-bold text-gold hover:underline"
                          >
                            Edit
                          </button>
                          {reviewAccordions.client ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {reviewAccordions.client && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2">
                          {isAcademicService && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-400">Scheduling:</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                                  academicBookingMode === "SCHOOL_PARTNER"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                }`}>
                                  {academicBookingMode === "SCHOOL_PARTNER" ? "School Pictorial (Date set by school)" : "Individual Booking"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-neutral-400 shrink-0">School:</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {activeUnivId && <SchoolLogo univId={activeUnivId} name={studentSchool} size="xs" />}
                                  <span className="font-semibold text-primary truncate">{studentSchool}</span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">{studentType === "COLLEGE" ? "Course:" : "Strand:"}</span>
                                <span className="font-medium text-neutral-700">{studentType === "COLLEGE" ? (studentCourse || "N/A") : (selectedShsStrand || "N/A")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Section:</span>
                                <span className="font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">{studentSection}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Student ID:</span>
                                <span className="font-body text-primary">{studentIdNumber || "N/A"}</span>
                              </div>
                              {schoolScheduleNote && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-400">Note:</span>
                                  <span className="font-medium text-neutral-800 italic">{schoolScheduleNote}</span>
                                </div>
                              )}
                            </>
                          )}
                          {isWeddingService && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Couple:</span>
                                <span className="font-semibold text-primary">{brideName} & {groomName}</span>
                              </div>
                              {weddingTheme && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-400">Theme:</span>
                                  <span className="text-neutral-700">{weddingTheme}</span>
                                </div>
                              )}
                            </>
                          )}
                          {!isCollegeService && !isWeddingService && (
                            <div className="flex justify-between">
                              <span className="text-neutral-400">Client Name:</span>
                              <span className="font-semibold text-primary">{profile?.first_name} {profile?.last_name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accordion C: Schedule & Studio Location */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, schedule: !prev.schedule }))}
                        className="p-4 bg-neutral-50/70 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gold" />
                          <span className="font-heading text-sm font-bold text-primary">Schedule & Studio Location</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(5); }}
                            className="text-xs font-bold text-gold hover:underline"
                          >
                            Edit
                          </button>
                          {reviewAccordions.schedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {reviewAccordions.schedule && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Date:</span>
                            <span className="font-bold text-primary">
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                                ? "Scheduled with school (TBD)"
                                : (eventDate || "Not selected")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Time:</span>
                            <span className="font-semibold text-primary">
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER"
                                ? "Coordinated with school"
                                : (STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime || "TBD")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Location:</span>
                            <span className="font-medium text-primary text-right max-w-[240px] truncate" title={resolvedLocation}>
                              {isAcademicService && academicBookingMode === "SCHOOL_PARTNER" && locationType === "CAMPUS"
                                ? `On-Campus (${studentSchool || "School Campus"})`
                                : resolvedLocation}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accordion D: Add-ons */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div 
                        onClick={() => setReviewAccordions(prev => ({ ...prev, addons: !prev.addons }))}
                        className="p-4 bg-neutral-50/70 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60"
                      >
                        <div className="flex items-center gap-2">
                          <PlusCircle size={16} className="text-gold" />
                          <span className="font-heading text-sm font-bold text-primary">
                            Selected Add-ons ({selectedAddOns.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep(3); }}
                            className="text-xs font-bold text-gold hover:underline"
                          >
                            Edit
                          </button>
                          {reviewAccordions.addons ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {reviewAccordions.addons && (
                        <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-1.5">
                          {selectedAddOns.length === 0 ? (
                            <p className="text-neutral-400 italic">No add-ons selected (Base package only).</p>
                          ) : (
                            selectedAddOns.map((a, i) => (
                              <div key={i} className="flex justify-between">
                                <span>• {a.name}</span>
                                <span className="font-bold text-gold">+₱{parsePrice(a.price).toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accordion E: Pegs & Uploaded References */}
                    {(selectedPresetPegs.length > 0 || referenceFiles.length > 0) && (
                      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div 
                          onClick={() => setReviewAccordions(prev => ({ ...prev, pegs: !prev.pegs }))}
                          className="p-4 bg-neutral-50/70 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60"
                        >
                          <div className="flex items-center gap-2">
                            <Camera size={16} className="text-gold" />
                            <span className="font-heading text-sm font-bold text-primary">
                              Style Pegs & Directives ({selectedPresetPegs.length + referenceFiles.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setStep(6); }}
                              className="text-xs font-bold text-gold hover:underline"
                            >
                              Edit
                            </button>
                            {reviewAccordions.pegs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                        {reviewAccordions.pegs && (
                          <div className="p-4 pt-3 border-t border-neutral-100 text-xs font-body space-y-2">
                            {selectedPresetPegs.length > 0 && (
                              <div>
                                <span className="text-neutral-400 block mb-1">Selected Presets:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedPresetPegs.map((peg, i) => (
                                    <span key={i} className="bg-gold/10 text-gold px-2 py-0.5 rounded text-[11px] font-medium">
                                      {peg}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {referenceFiles.length > 0 && (
                              <div>
                                <span className="text-neutral-400 block mb-1">Uploaded References: {referenceFiles.length} file(s)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-gold/5 border border-gold/20 space-y-2.5 text-xs font-body">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Final Booking Summary</p>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Base Package ({selectedTier?.name || 'Standard'})</span>
                      <span className="font-semibold text-primary">₱{basePrice.toLocaleString()}</span>
                    </div>
                    {selectedAddOns.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Selected Add-ons ({selectedAddOns.length})</span>
                        <span className="font-semibold text-gold">+₱{addOnsTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gold/20">
                      <span className="font-bold text-primary">Total Package</span>
                      <span className="font-heading font-extrabold text-primary text-base">{formattedTotal}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-white rounded-xl p-2.5 text-center border border-gold/20">
                        <p className="text-[10px] text-neutral-400 uppercase font-medium">Down Payment (50%)</p>
                        <p className="font-bold text-gold text-sm mt-0.5">{formattedDownPayment}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Due upon confirmation</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 text-center border border-neutral-200">
                        <p className="text-[10px] text-neutral-400 uppercase font-medium">Balance at Studio</p>
                        <p className="font-bold text-primary text-sm mt-0.5">{formattedRemaining}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">On session day</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Guarantee Card */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800 font-body">
                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Upon submission, an automated digital session QR pass and tracking token will be generated instantly. The studio administrative desk will confirm your schedule and assign your designated lead photographer.
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="mt-8 pt-6 border-t border-neutral-100">
                {/* Step sub-context */}
                <p className="text-[11px] text-neutral-400 font-body text-center mb-4">
                  Step {step} of 7 — {stepSubtitles[step - 1]}
                </p>
                <div className="flex items-center justify-between gap-3">
                  {step > 1 ? (
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
                  ) : (
                    <div />
                  )}
                  
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

            </form>
          </div>
        </div>

        {/* Right: Sticky Order Summary Sidebar with Smart Accordions */}
        <OrderSummarySidebar
          selectedService={selectedService}
          selectedTier={selectedTier}
          selectedAddOns={selectedAddOns}
          onRemoveAddOn={(addonName) => setSelectedAddOns(prev => prev.filter(a => a.name !== addonName))}
          studentDetails={isAcademicService ? {
            type: studentType,
            booking_mode: academicBookingMode,
            school: studentSchool,
            course: studentType === "COLLEGE" ? studentCourse : selectedShsStrand,
            section: studentSection,
            student_id: studentIdNumber
          } : null}
          weddingDetails={isWeddingService ? {
            brideName,
            groomName,
            theme: weddingTheme,
            coordinatorName
          } : null}
          corporateDetails={isCorporateService ? {
            company: companyName
          } : null}
          eventDate={isAcademicService && academicBookingMode === "SCHOOL_PARTNER" ? "School Agreement (Batch TBD)" : eventDate}
          preferredTime={isAcademicService && academicBookingMode === "SCHOOL_PARTNER" ? "Batch Slot" : (preferredTime ? (STUDIO_TIME_SLOTS.find(s => s.time === preferredTime)?.label || preferredTime) : "")}
          locationType={locationType}
          customVenue={customVenue}
          customAddress={customAddress}
          referenceFilesCount={referenceFiles.length}
          selectedPresetPegs={selectedPresetPegs}
          totalAmount={totalAmount}
          downPaymentAmount={downPaymentAmount}
          remainingBalance={remainingBalance}
          formattedTotal={formattedTotal}
          formattedDownPayment={formattedDownPayment}
          formattedRemaining={formattedRemaining}
          activeStep={step}
          onJumpToStep={(s) => {
            setValidationError("");
            setStep(s);
          }}
        />

      </div>

    </div>
  );
}
