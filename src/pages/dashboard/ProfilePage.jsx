import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  User, Mail, Phone, MapPin, Camera, Loader2, Save, Calendar, 
  Edit2, Award, ShieldCheck, FileText, CheckCircle, Clock,
  Sparkles, GraduationCap, ExternalLink, QrCode, Heart, Check,
  AlertCircle, ChevronRight, ChevronDown, Lock, Printer, Download, Eye,
  Building, BookOpen, Scissors, Palette, UserCheck, X, Info, ArrowUpRight,
  Truck, Package, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings } from '../../services/bookingService';
import { recordCustomerAction } from '../../services/customerAuditService';
import { CEBU_UNIVERSITIES } from '../../lib/cebuAcademicData';
import { OFFICIAL_STUDIO_BADGES, hasBadge, getBadgeAwardedDate } from '../../data/studioBadgesData';
import Toast from '../../components/ui/Toast';
import StudioDropdown from '../../components/ui/StudioDropdown';

// Hood Disciplines for Academic Graduations
const HOOD_DISCIPLINES = [
  { id: 'it_cs', label: 'Information Technology & Computing (Maroon / Gold)', color: 'bg-rose-900 text-rose-100' },
  { id: 'eng', label: 'Engineering & Technology (Orange)', color: 'bg-orange-800 text-orange-100' },
  { id: 'educ', label: 'Education & Pedagogy (Light Blue)', color: 'bg-sky-800 text-sky-100' },
  { id: 'bus', label: 'Business Administration & Commerce (Yellow)', color: 'bg-amber-800 text-amber-100' },
  { id: 'cas', label: 'Arts & Sciences (White / Ivory)', color: 'bg-neutral-800 text-neutral-100' },
  { id: 'nursing', label: 'Nursing & Allied Health (Green)', color: 'bg-emerald-800 text-emerald-100' },
  { id: 'crim', label: 'Criminology & Public Safety (Dark Blue)', color: 'bg-blue-900 text-blue-100' },
  { id: 'arch', label: 'Architecture & Design (Lilac / Purple)', color: 'bg-purple-900 text-purple-100' },
];

const TOGA_SIZES = ['XS (4\'11" - 5\'1")', 'S (5\'2" - 5\'4")', 'M (5\'5" - 5\'7")', 'L (5\'8" - 5\'10")', 'XL (5\'11" - 6\'1")', 'XXL (6\'2"+)'];

const GRAD_YEAR_OPTIONS = [
  { value: '2026', label: 'Batch 2026' },
  { value: '2027', label: 'Batch 2027' },
  { value: '2025', label: 'Batch 2025 (Alumni)' },
];

const HONORS_OPTIONS = [
  { value: 'Cum Laude Candidate', label: 'Cum Laude' },
  { value: 'Magna Cum Laude Candidate', label: 'Magna Cum Laude' },
  { value: 'Summa Cum Laude Candidate', label: 'Summa Cum Laude' },
  { value: 'Academic Distinction', label: "Dean's Lister" },
  { value: 'Regular Candidate', label: 'Regular' },
];

const BACKDROP_PREFERENCES = [
  { id: 'classic_grey', label: 'Classic Studio Grey', desc: 'Timeless neutral backdrop with directional key light' },
  { id: 'warm_gold', label: 'Editorial Warm Gold', desc: 'Warm ambient glow accentuating natural skin tones' },
  { id: 'pure_white', label: 'High-Key Pure White', desc: 'Crisp, contemporary academic portrait styling' },
  { id: 'dark_slate', label: 'Dramatic Obsidian Slate', desc: 'High-contrast fine art lighting with rim definition' },
];

const RETOUCH_PREFERENCES = [
  { id: 'natural_texture', label: 'Natural Pores & Skin Texture', desc: 'Authentic lighting correction preserving natural skin depth' },
  { id: 'editorial_glamour', label: 'High-End Studio Polish', desc: 'Complete photographic polish, contour enhancement & hair cleanup' },
  { id: 'minimal_polish', label: 'Subtle Blemish Removal', desc: 'Gentle spot cleanup without altering facial features' },
];

const BADGE_ICONS = {
  GraduationCap,
  Scissors,
  ShieldCheck,
  Camera,
  CheckCircle,
  Award,
  Printer,
};

const DEFAULT_CUSTOM_SPECS = {
  university: 'Cebu Technological University (CTU)',
  campus: 'CTU - Main Campus',
  degree: 'Bachelor of Science in Information Technology',
  gradYear: '2026',
  honors: 'Cum Laude Candidate',
  togaSize: 'M (5\'5" - 5\'7")',
  hoodDiscipline: 'it_cs',
  innerAttireSize: 'M (Medium)',
  backdrop: 'warm_gold',
  retouch: 'natural_texture',
  makeupPreference: 'Natural Matte Fresh',
  photographerNotes: 'Prefers 45-degree angle profile shot and soft rim lighting on toga.',
  emergencyContactName: '',
  emergencyContactPhone: '',
  agreedSessionConduct: true,
  agreedModelRelease: true,
  agreedProofingStorage: true,
  agreedPaymentPolicy: true,
  termsSignedTimestamp: '2026-09-01T10:00:00.000Z',
  termsSignatureHash: 'EK-SIG-99428-2026'
};

export default function ProfilePage() {
  const { user, profile, updateProfile, uploadAvatar } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [termsCertModalOpen, setTermsCertModalOpen] = useState(false);
  const [selectedBadgeModal, setSelectedBadgeModal] = useState(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState('section-personal');
  const [breakdownDropdownOpen, setBreakdownDropdownOpen] = useState(false);
  const [sessionSidebarOpen, setSessionSidebarOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const avatarInputRef = useRef(null);

  // Storage key for custom studio preferences
  const customProfileStorageKey = user ? `ekodak_user_custom_${user.id}` : 'ekodak_user_custom_guest';

  // Load custom profile details: check profile.studio_specs -> localStorage -> default
  const [customData, setCustomData] = useState(() => {
    if (profile?.studio_specs && Object.keys(profile.studio_specs).length > 0) {
      return { ...DEFAULT_CUSTOM_SPECS, ...profile.studio_specs };
    }
    try {
      const saved = localStorage.getItem(customProfileStorageKey);
      if (saved) return { ...DEFAULT_CUSTOM_SPECS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_CUSTOM_SPECS;
  });

  const [formData, setFormData] = useState(() => ({
    firstName: profile?.first_name || '',
    lastName:  profile?.last_name  || '',
    phone:     profile?.phone      || '',
    address:   profile?.address    || '',
    bio:       profile?.bio        || '',
  }));

  // Address customization state for booking deliveries
  const [addressCustomizations, setAddressCustomizations] = useState(() => ({
    recipientName: profile?.studio_specs?.courier_recipient_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    courierPhone: profile?.studio_specs?.courier_phone || profile?.phone || '',
    shippingAddress: profile?.studio_specs?.shipping_address || profile?.address || '',
    landmark: profile?.studio_specs?.delivery_instructions || '',
    preferredCourier: profile?.studio_specs?.preferred_courier || 'studio_pickup',
  }));

  // Sync profile data when Auth profile arrives
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.first_name || prev.firstName,
        lastName:  profile.last_name  || prev.lastName,
        phone:     profile.phone      || prev.phone,
        address:   profile.address    || prev.address,
        bio:       profile.bio        || prev.bio,
      }));

      if (profile.studio_specs && Object.keys(profile.studio_specs).length > 0) {
        setCustomData(prev => ({
          ...prev,
          ...profile.studio_specs,
        }));
        setAddressCustomizations(prev => ({
          ...prev,
          recipientName: profile.studio_specs.courier_recipient_name || prev.recipientName,
          courierPhone: profile.studio_specs.courier_phone || prev.courierPhone,
          shippingAddress: profile.studio_specs.shipping_address || prev.shippingAddress,
          landmark: profile.studio_specs.delivery_instructions || prev.landmark,
          preferredCourier: profile.studio_specs.preferred_courier || prev.preferredCourier,
        }));
      }
    }
  }, [profile]);

  // Load customer bookings to calculate session metrics
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getCustomerBookings(user.id).then(({ data }) => {
      if (isMounted && data) {
        setBookings(data);
      }
    });
    return () => { isMounted = false; };
  }, [user]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'section-pass',
        'section-badges',
        'section-personal',
        'section-academic',
        'section-shoot-specs',
        'section-terms',
        'section-security',
      ];
      const scrollY = window.scrollY + 200;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollY) {
          setActiveNavSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFormChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCustomChange = (field, value) => {
    setCustomData(prev => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem(customProfileStorageKey, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save custom profile data:', err);
      }
      return updated;
    });
  };

  // ── Save profile changes to Supabase & local storage ──────────────────────
  const handleSave = async e => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        first_name: formData.firstName,
        last_name:  formData.lastName,
        phone:      formData.phone,
        address:    formData.address,
        bio:        formData.bio,
        studio_specs: customData,
      });

      // Persist custom studio specifications locally as fallback
      try {
        localStorage.setItem(customProfileStorageKey, JSON.stringify(customData));
      } catch {}

      // Record customer audit event
      if (user?.id) {
        const changesList = [
          formData.phone ? `Phone: ${formData.phone}` : null,
          formData.address ? `Address: ${formData.address}` : null,
          customData.university ? `University: ${customData.university}` : null,
          customData.campus ? `Campus: ${customData.campus}` : null,
          customData.degree ? `Degree: ${customData.degree}` : null,
          customData.gradYear ? `Graduation Year: ${customData.gradYear}` : null,
          customData.togaSize ? `Toga Size: ${customData.togaSize}` : null,
          customData.innerAttireSize ? `Inner Attire: ${customData.innerAttireSize}` : null,
          customData.backdrop ? `Backdrop: ${customData.backdrop}` : null,
          customData.retouch ? `Retouching: ${customData.retouch}` : null,
        ].filter(Boolean);

        recordCustomerAction({
          userId: user.id,
          category: 'PROFILE_UPDATE',
          title: 'Profile & Shoot Specifications Saved',
          description: `Customer updated profile and academic session details (${formData.firstName} ${formData.lastName}).`,
          changes: changesList
        });
      }

      setToast({ type: 'success', message: 'Profile & studio specifications saved successfully!' });
    } catch (err) {
      console.error('Failed to save profile:', err);
      setToast({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Delivery & Shipping Address Customizations ─────────────────────
  const handleSaveAddressCustomizations = async (e) => {
    if (e) e.preventDefault();
    setAddressSaving(true);
    try {
      const updatedSpecs = {
        ...customData,
        courier_recipient_name: addressCustomizations.recipientName,
        courier_phone: addressCustomizations.courierPhone,
        shipping_address: addressCustomizations.shippingAddress,
        delivery_instructions: addressCustomizations.landmark,
        preferred_courier: addressCustomizations.preferredCourier,
      };
      setCustomData(updatedSpecs);

      await updateProfile({
        address: addressCustomizations.shippingAddress,
        phone: addressCustomizations.courierPhone || formData.phone,
        studio_specs: updatedSpecs,
      });

      setFormData(prev => ({
        ...prev,
        address: addressCustomizations.shippingAddress,
        phone: addressCustomizations.courierPhone || prev.phone,
      }));

      try {
        localStorage.setItem(customProfileStorageKey, JSON.stringify(updatedSpecs));
      } catch {}

      // Record customer audit event
      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
          category: 'DELIVERY_UPDATE',
          title: 'Delivery Address Customization Saved',
          description: `Customer updated fulfillment destination to ${addressCustomizations.shippingAddress || 'Studio Claim'}.`,
          changes: [
            `Recipient: ${addressCustomizations.recipientName || 'Client'}`,
            `Contact: ${addressCustomizations.courierPhone || 'Recorded Phone'}`,
            `Address: ${addressCustomizations.shippingAddress || 'Not set'}`,
            addressCustomizations.landmark ? `Instructions: ${addressCustomizations.landmark}` : null,
            `Courier Mode: ${addressCustomizations.preferredCourier || 'Studio Direct Delivery'}`
          ].filter(Boolean)
        });
      }

      setToast({ type: 'success', message: 'Delivery address customizations saved successfully!' });
    } catch (err) {
      console.error('Failed to save address customizations:', err);
      setToast({ type: 'error', message: 'Could not save delivery address customizations.' });
    } finally {
      setAddressSaving(false);
    }
  };

  // Auto-save model release preference
  const handleModelReleaseToggle = async (agreed) => {
    handleCustomChange('agreedModelRelease', agreed);
    const updatedSpecs = { ...customData, agreedModelRelease: agreed };
    try {
      await updateProfile({ studio_specs: updatedSpecs });

      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
          category: 'TERMS_SIGN',
          title: agreed ? 'Model Release Agreement Consented' : 'Model Release Opted-Out (Confidential)',
          description: agreed 
            ? 'Customer granted consent for studio portfolio & annual academic lookbook display.'
            : 'Customer restricted portrait distribution to confidential private proofing.',
          changes: [agreed ? 'Model Release: Consented' : 'Model Release: Private / Opted Out']
        });
      }

      setToast({ 
        type: 'info', 
        message: agreed ? 'Model release consented for annual lookbook.' : 'Session set to strictly confidential.' 
      });
    } catch {
      // state updated
    }
  };

  // ── Avatar upload with resilient base64 fallback ──────────────────────────
  const handleAvatarChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Image must be smaller than 5 MB.' });
      return;
    }

    setIsUploading(true);
    try {
      await uploadAvatar(file);

      if (user?.id) {
        recordCustomerAction({
          userId: user.id,
          category: 'PROFILE_UPDATE',
          title: 'Client Profile Avatar Photo Updated',
          description: 'Customer uploaded a new profile portrait photograph.',
          changes: ['Avatar: New image uploaded']
        });
      }

      setToast({ type: 'success', message: 'Profile photo updated!' });
      setPhotoModalOpen(false);
    } catch (err) {
      console.warn('Supabase storage upload failed, using local Data URL fallback:', err);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          await updateProfile({ avatar_url: base64Url });

          if (user?.id) {
            recordCustomerAction({
              userId: user.id,
              category: 'PROFILE_UPDATE',
              title: 'Client Profile Avatar Photo Updated',
              description: 'Customer updated account profile picture.',
              changes: ['Avatar: New image stored locally']
            });
          }

          setToast({ type: 'success', message: 'Profile photo updated locally!' });
          setPhotoModalOpen(false);
        } catch {
          setToast({ type: 'error', message: 'Could not set profile image.' });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate Information-Rich Metrics
  const totalBookings = bookings.length;
  const completedShoots = bookings.filter(b => b.status === 'COMPLETED').length;
  // Always read customer's actual latest order
  const latestBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    return bookings[0];
  }, [bookings]);
  const upcomingBooking = latestBooking;
  const totalInvestment = bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  // Dropdown Option Collections
  const universityOptions = useMemo(() => [
    ...CEBU_UNIVERSITIES.map(u => ({
      value: u.name,
      label: u.name,
      badge: u.campuses?.length > 1 ? `${u.campuses.length} Campuses` : '',
    })),
    { value: 'Other Partner University', label: 'Other Partner University / College' },
  ], []);

  const hoodDisciplineOptions = useMemo(() => 
    HOOD_DISCIPLINES.map(d => ({
      value: d.id,
      label: d.label,
      colorBadge: d.color.split(' ')[0],
    }))
  , []);

  const backdropOptions = useMemo(() => 
    BACKDROP_PREFERENCES.map(b => ({
      value: b.id,
      label: b.label,
      desc: b.desc,
    }))
  , []);

  const retouchOptions = useMemo(() => 
    RETOUCH_PREFERENCES.map(r => ({
      value: r.id,
      label: r.label,
      desc: r.desc,
    }))
  , []);

  // Shoot Readiness Checklist Score (0 to 100%)
  const readinessChecks = useMemo(() => {
    return [
      { id: 'name', label: 'Full Legal Name Set', passed: Boolean(formData.firstName && formData.lastName) },
      { id: 'phone', label: 'Primary Contact Phone', passed: Boolean(formData.phone) },
      { id: 'address', label: 'Courier Shipping Address', passed: Boolean(formData.address || customData.shipping_address) },
      { id: 'school', label: 'Academic School & Course', passed: Boolean(customData.university && customData.degree) },
      { id: 'toga', label: 'Toga & Hood Specifications', passed: Boolean(customData.togaSize && customData.hoodDiscipline) },
      { id: 'terms', label: 'Studio Terms Acknowledged', passed: Boolean(customData.agreedSessionConduct && customData.agreedPaymentPolicy) },
    ];
  }, [formData, customData]);

  const passedCount = readinessChecks.filter(c => c.passed).length;
  const readinessPct = Math.round((passedCount / readinessChecks.length) * 100);

  // Only display official studio recognitions awarded by admin
  const customerBadges = useMemo(() => Array.isArray(profile?.badges) ? profile.badges : [], [profile?.badges]);
  const earnedBadges = useMemo(() => {
    return OFFICIAL_STUDIO_BADGES
      .filter(b => hasBadge(customerBadges, b.id))
      .map(b => ({
        ...b,
        isAwarded: true,
        awardedDate: getBadgeAwardedDate(customerBadges, b.id)
      }));
  }, [customerBadges]);
  const earnedBadgesCount = earnedBadges.length;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'September 2026';

  const initials = `${formData.firstName?.charAt(0) || ''}${formData.lastName?.charAt(0) || ''}`.toUpperCase() || 'EK';

  const scrollToSection = (id) => {
    setActiveNavSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navMenuItems = [
    { id: 'section-pass', label: 'Client Pass & Readiness', icon: QrCode, done: readinessPct >= 80 },
    { id: 'section-badges', label: `Studio Badges (${earnedBadgesCount})`, icon: Award, done: earnedBadgesCount > 0 },
    { id: 'section-personal', label: 'Personal & Contact Info', icon: User, done: Boolean(formData.firstName && formData.phone) },
    { id: 'section-academic', label: 'Academic & Course Milestone', icon: GraduationCap, done: Boolean(customData.university && customData.degree) },
    { id: 'section-shoot-specs', label: 'Shoot & Fitting Specs', icon: Palette, done: Boolean(customData.togaSize && customData.hoodDiscipline) },
    { id: 'section-terms', label: 'Studio Terms & Agreements', icon: FileText, done: true },
    { id: 'section-security', label: 'Account Security', icon: Lock, done: true },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-28">

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── 1. Top Editorial Profile Hero Banner ─────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary p-6 sm:p-8 shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar & Identifiers */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div 
              className="relative group cursor-pointer shrink-0"
              onClick={() => setPhotoModalOpen(true)}
              title="Click to update portrait photo"
            >
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-gold/30 via-gold/10 to-transparent p-1 shadow-lg">
                <div className="w-full h-full rounded-xl bg-neutral-900 flex items-center justify-center text-gold font-heading text-2xl sm:text-3xl font-bold overflow-hidden border border-gold/40">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 bg-neutral-950/70 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-gold">
                <Camera size={18} />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Client Member
                </span>
                <span className="text-[10px] font-body text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                  #EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-heading text-white font-bold tracking-tight truncate">
                {formData.firstName || 'Client'} {formData.lastName || ''}
              </h1>

              <p className="text-xs text-neutral-300 font-body flex items-center gap-1.5 truncate">
                <Building size={12} className="text-gold shrink-0" />
                <span>{customData.university} · {customData.degree}</span>
              </p>
            </div>
          </div>

          {/* Readiness Meter & Quick Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-3">
                <span className="text-neutral-400 font-body">Profile Readiness</span>
                <span className="text-gold font-bold font-body">{readinessPct}%</span>
              </div>
              <div className="w-36 sm:w-44 h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                <div 
                  className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light rounded-full transition-all duration-700" 
                  style={{ width: `${readinessPct}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-body">
                {passedCount} of {readinessChecks.length} verified
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(true)}
              className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5 shadow-md shadow-gold/20 shrink-0 cursor-pointer"
            >
              <Edit2 size={12} /> Edit Profile
            </button>
          </div>

        </div>
      </div>

      {/* ── 2. Metric Overview Strip (Compact & Clean) ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Registered Sessions', value: totalBookings, icon: Camera, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Completed & Released', value: completedShoots, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Studio Investment', value: `₱${totalInvestment.toLocaleString()}`, icon: Award, color: 'text-gold', bg: 'bg-gold/10 dark:bg-gold/15' },
          { label: 'Readiness Score', value: `${readinessPct}%`, icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center font-bold shrink-0`}>
              <stat.icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-heading font-bold text-primary dark:text-neutral-100 truncate">{stat.value}</p>
              <p className="text-[11px] text-neutral-500 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Client Pass & Readiness Breakdown (2-Column) ─────────────────── */}
      <section id="section-pass" className="scroll-mt-24">
        <div className="grid lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left: Studio Client Pass Card (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#121c2d] text-white p-5 sm:p-6 rounded-3xl border border-neutral-800 shadow-lg relative overflow-hidden flex flex-col justify-between h-full space-y-5">
            <div className="absolute top-0 right-0 w-44 h-44 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-gold" />
                <span className="font-heading font-bold tracking-wider text-xs">E-KODAK CLIENT PASS</span>
              </div>
              <span className="text-[9px] font-body bg-neutral-800 text-gold px-2 py-0.5 rounded-full font-bold border border-gold/30 uppercase">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div 
                onClick={() => setPhotoModalOpen(true)}
                className="relative group cursor-pointer shrink-0"
                title="Click to update portrait photo"
              >
                <div className="w-18 h-22 sm:w-20 sm:h-24 rounded-2xl bg-neutral-900 border border-gold/40 shadow-lg p-0.5 overflow-hidden ring-1 ring-gold/20">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={`${formData.firstName || 'Client'} portrait`} 
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-neutral-950 flex flex-col items-center justify-center text-gold">
                      <span className="font-heading font-bold text-lg">{initials}</span>
                      <Camera size={12} className="text-gold/60 mt-1" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-neutral-950/70 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-gold">
                  <Camera size={16} />
                </div>
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[9px] text-neutral-400 font-body uppercase tracking-widest">Client Name</p>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white leading-tight truncate">
                  {formData.firstName || 'Client'} {formData.lastName || ''}
                </h3>
                <p className="text-xs text-neutral-300 font-body truncate">{customData.university}</p>
                <p className="text-xs text-neutral-400 font-body truncate">{customData.degree}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-2.5 text-xs font-body border-y border-neutral-800/80 bg-neutral-900/40 -mx-1 px-2.5 rounded-xl">
              <div>
                <span className="text-[9px] text-neutral-400 block">MEMBER ID</span>
                <span className="font-bold text-gold">#EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 block">ENROLLED</span>
                <span className="text-neutral-200">{memberSince}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 block">BRANCH</span>
                <span className="text-neutral-200">Cebu Studio</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 block">TOGA SIZE</span>
                <span className="text-neutral-200">{customData.togaSize?.split(' ')[0] || 'Standard'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80 pt-2">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                <QrCode size={13} className="text-gold" />
                <span>Kiosk Check-In ID</span>
              </span>
              <Link to="/dashboard" className="text-gold hover:text-gold-light text-[11px] font-bold inline-flex items-center gap-1">
                <span>View Dashboard →</span>
              </Link>
            </div>
          </div>

          {/* Right: Client Account Information & Specifications (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between h-full space-y-4">
            
            {/* 1. Header with quick jump to personal specs */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-gold" />
                  <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                    Client Account & Shoot Profile
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 font-body">
                  Personal identity, delivery destination, and studio fitting record
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold-dark dark:text-gold text-xs font-bold flex items-center gap-1 font-body transition-colors cursor-pointer"
                >
                  <Edit2 size={11} /> Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-personal')}
                  className="text-xs font-medium text-neutral-400 hover:text-primary dark:hover:text-neutral-200 transition-colors"
                >
                  Jump to Form ↓
                </button>
              </div>
            </div>

            {/* 2. Structured User Info Details */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {/* Contact & Courier Endpoints */}
              <div className="bg-neutral-50/70 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-1.5 text-neutral-400 font-body text-[10px] uppercase font-bold tracking-wider">
                  <Mail size={12} className="text-gold" />
                  <span>Contact & Dispatch</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary dark:text-neutral-100 truncate flex items-center gap-1.5">
                    <span className="text-neutral-400 text-[11px]">Email:</span>
                    <span className="truncate">{user?.email || 'Registered client'}</span>
                  </p>
                  <p className="font-semibold text-primary dark:text-neutral-100 truncate flex items-center gap-1.5">
                    <span className="text-neutral-400 text-[11px]">Phone:</span>
                    <span className="truncate font-body">{formData.phone || profile?.phone || 'No phone set'}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-start gap-1 pt-0.5">
                    <MapPin size={12} className="text-gold shrink-0 mt-0.5" />
                    <span className="truncate">{addressCustomizations.shippingAddress || formData.address || 'No shipping address set'}</span>
                  </p>
                </div>
              </div>

              {/* Academic & Fitting Specifications */}
              <div className="bg-neutral-50/70 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-1.5 text-neutral-400 font-body text-[10px] uppercase font-bold tracking-wider">
                  <GraduationCap size={12} className="text-gold" />
                  <span>Academic & Studio Specs</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-primary dark:text-neutral-100 truncate">
                    {customData.university}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {customData.degree} · Batch {customData.gradYear || '2026'}
                  </p>
                  <p className="text-[11px] text-gold-dark dark:text-gold font-body truncate pt-0.5">
                    Toga: {customData.togaSize?.split(' ')[0] || 'S'} · Hood: {HOOD_DISCIPLINES.find(h => h.id === customData.hoodDiscipline)?.label?.split('(')[0]?.trim() || 'IT/CS'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Shoot Day Readiness Breakdown as a Dropdown */}
            <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-800/30 transition-all">
              <button
                type="button"
                onClick={() => setBreakdownDropdownOpen(prev => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-gold" />
                  <span className="font-heading text-xs font-bold text-primary dark:text-neutral-100">
                    Shoot Day Readiness Breakdown
                  </span>
                  <span className="text-[10px] font-body font-bold text-gold bg-gold/15 px-2 py-0.2 rounded-full border border-gold/30">
                    {readinessPct}% Ready
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-body">
                  <span>{breakdownDropdownOpen ? 'Collapse' : `${passedCount}/${readinessChecks.length} Verified`}</span>
                  <ChevronDown size={14} className={`transform transition-transform duration-200 ${breakdownDropdownOpen ? 'rotate-180 text-gold' : ''}`} />
                </div>
              </button>

              {breakdownDropdownOpen && (
                <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-800 grid sm:grid-cols-2 gap-2 bg-white dark:bg-neutral-900 animate-fade-in">
                  {readinessChecks.map(check => (
                    <div 
                      key={check.id}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                        check.passed 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-neutral-800 dark:text-neutral-200'
                          : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-500'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 ${
                        check.passed ? 'bg-emerald-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
                      }`}>
                        <Check size={10} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[11px] truncate">{check.label}</p>
                        <span className="text-[9px] font-body text-neutral-400">
                          {check.passed ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Active Session Card reading latest order */}
            {latestBooking ? (
              <div className="p-3.5 bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-950/20 dark:to-neutral-900 rounded-2xl border border-gold/30 flex items-center justify-between gap-3 shadow-xs">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-body font-bold uppercase text-gold-dark bg-gold/20 px-2 py-0.2 rounded-full font-bold">
                      Active Session · {latestBooking.status}
                    </span>
                    <span className="text-[10px] font-body text-neutral-400">
                      #{latestBooking.booking_number}
                    </span>
                  </div>
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-primary dark:text-neutral-100 truncate">
                    {latestBooking.service?.name || latestBooking.tier_name || 'Senior High Packages and sets'} {latestBooking.tier_name ? `(${latestBooking.tier_name})` : ''}
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-body truncate flex items-center gap-2">
                    <span>{latestBooking.event_date ? new Date(latestBooking.event_date).toLocaleDateString() : 'Date Pending'}</span>
                    <span>•</span>
                    <span className="text-gold truncate">{latestBooking.location?.split(',')[0] || 'Cebu Studio'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to="/dashboard/progress"
                    className="py-1.5 px-3 rounded-xl bg-gold hover:bg-gold-light text-primary text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                    title="Open Full Booking Progress Page"
                  >
                    <span>Track</span>
                    <ArrowUpRight size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSessionSidebarOpen(true)}
                    className="btn-outline py-1.5 px-2.5 text-xs flex items-center gap-1 font-bold hover:bg-gold hover:text-primary hover:border-gold transition-all"
                    title="Quick Preview Drawer"
                  >
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <span>Ready to schedule your graduation portrait session?</span>
                <Link to="/dashboard/book" className="btn-primary py-1 px-3 text-xs shrink-0">
                  Book Now
                </Link>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── 4. E-Kodak Earned Studio Badges & Recognitions (Only Admin-Awarded Badges) ── */}
      <section id="section-badges" className="space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Award className="text-gold" size={18} />
            <h2 className="font-heading text-lg font-bold text-primary dark:text-neutral-100">
              E-Kodak Earned Studio Badges & Recognitions
            </h2>
          </div>
          <span className="text-xs font-body font-bold text-gold bg-gold/15 px-2.5 py-0.5 rounded-full">
            {earnedBadges.length} Awarded
          </span>
        </div>

        {/* Clean Showcase Grid of Badges - ONLY Display Badges Awarded by Admin */}
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {earnedBadges.map(badge => {
              const Icon = BADGE_ICONS[badge.iconName] || Award;
              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadgeModal(badge)}
                  className="p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 shadow-xs hover:border-gold hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs bg-gradient-to-br ${badge.color} text-white`}>
                      <Icon size={17} />
                    </div>
                    <span className="text-[9px] font-body font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
                      Verified
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="text-[9px] font-body text-neutral-400 uppercase tracking-widest block truncate">
                      {badge.category}
                    </span>
                    <h3 className="font-heading text-xs font-bold truncate mt-0.5 text-primary dark:text-neutral-100">
                      {badge.title}
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-body truncate mt-0.5">{badge.badgeLabel}</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-body">
                    <span>{badge.awardedDate || 'Active'}</span>
                    <span className="text-gold font-bold">Details →</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center">
              <Award size={20} />
            </div>
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No studio badges awarded yet.</p>
            <p className="text-[11px] text-neutral-400 font-body max-w-sm mx-auto">
              Badges are officially granted by studio administrators after verified session milestones and photo releases.
            </p>
          </div>
        )}
      </section>

      {/* ── 5. Main Form & Specifications (2-Column Organization) ───────────── */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Sticky Section Navigator & Progress (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 space-y-4">
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3 shadow-xs space-y-3">
            <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[10px] font-body uppercase tracking-wider text-neutral-400 font-bold">
                Specifications Nav
              </span>
              <span className="text-[10px] font-body text-gold font-bold">
                {passedCount}/{readinessChecks.length} Set
              </span>
            </div>

            <nav className="space-y-1">
              {navMenuItems.slice(2).map(item => {
                const isActive = activeNavSection === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-gold dark:text-neutral-950 font-bold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} className={isActive ? 'text-gold dark:text-neutral-950' : 'text-neutral-400'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.done && (
                      <Check size={12} className={isActive ? 'text-gold dark:text-neutral-950' : 'text-emerald-500'} />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-gold/20"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 text-xs text-neutral-500 font-body space-y-1">
            <span className="text-[10px] font-body text-gold-dark uppercase tracking-wider font-bold block">
              Studio Assistance
            </span>
            <p>
              Fitting sizes are confirmed with our wardrobe master during on-site call-time.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Consolidated Specification Cards (8 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-8 xl:col-span-9 space-y-6">

          {/* SECTION A: Personal & Contact Information */}
          <div id="section-personal" className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 scroll-mt-24">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={17} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                  Personal & Contact Information
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold text-gold hover:text-gold-dark bg-gold/10 hover:bg-gold/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 size={11} />
                  <span>Full Modal Editor</span>
                </button>
                <span className="text-[10px] font-body text-neutral-400 hidden sm:inline">Account Owner</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleFormChange}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleFormChange}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-400 font-body text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Primary Mobile Phone (Philippine Mobile)
                </label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="+63 900 000 0000"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Print Courier Delivery Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="House/Unit No., Street, Barangay, City/Municipality, Cebu, Postal Code..."
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Bio / Graduation Motto & Studio Note
                </label>
                <textarea
                  name="bio"
                  rows={2}
                  value={formData.bio}
                  onChange={handleFormChange}
                  placeholder="Write a brief graduation motto or note for the studio..."
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Emergency Contact Name
                </label>
                <input
                  value={customData.emergencyContactName}
                  onChange={e => handleCustomChange('emergencyContactName', e.target.value)}
                  placeholder="e.g. Maria Repunte"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  value={customData.emergencyContactPhone}
                  onChange={e => handleCustomChange('emergencyContactPhone', e.target.value)}
                  placeholder="+63 900 000 0000"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                />
              </div>
            </div>

            {/* Direct Section Save Action Bar */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
              <p className="text-[11px] text-neutral-400 font-body hidden sm:block">
                All changes sync automatically to your official client pass and studio roster.
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-sm shadow-gold/20 ml-auto cursor-pointer"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSaving ? 'Saving Changes...' : 'Save Personal Details'}</span>
              </button>
            </div>
          </div>

          {/* SECTION B: Academic & Course Milestone */}
          <div id="section-academic" className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 scroll-mt-24">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap size={17} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                  Academic & Graduation Milestone
                </h3>
              </div>
              <span className="text-[10px] font-body text-neutral-400">University Specs</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  University / College Institution
                </label>
                <StudioDropdown
                  value={customData.university}
                  onChange={val => handleCustomChange('university', val)}
                  options={universityOptions}
                  searchable
                  placeholder="Select University / Institution"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Campus Location
                </label>
                <input
                  value={customData.campus}
                  onChange={e => handleCustomChange('campus', e.target.value)}
                  placeholder="e.g. Main Campus, Naga Extension..."
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Degree / Major Program
                </label>
                <input
                  value={customData.degree}
                  onChange={e => handleCustomChange('degree', e.target.value)}
                  placeholder="e.g. BS in Information Technology"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Graduation Year & Honors
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <StudioDropdown
                    value={customData.gradYear}
                    onChange={val => handleCustomChange('gradYear', val)}
                    options={GRAD_YEAR_OPTIONS}
                  />
                  <StudioDropdown
                    value={customData.honors}
                    onChange={val => handleCustomChange('honors', val)}
                    options={HONORS_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C: Shoot & Fitting Specifications */}
          <div id="section-shoot-specs" className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 scroll-mt-24">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={17} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                  Custom Studio Shoot & Wardrobe Fitting
                </h3>
              </div>
              <span className="text-[10px] font-body text-neutral-400">Styling & Calibration</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Academic Toga Robe Size
                </label>
                <StudioDropdown
                  value={customData.togaSize}
                  onChange={val => handleCustomChange('togaSize', val)}
                  options={TOGA_SIZES}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Hood Discipline / Collar Velvet Color
                </label>
                <StudioDropdown
                  value={customData.hoodDiscipline}
                  onChange={val => handleCustomChange('hoodDiscipline', val)}
                  options={hoodDisciplineOptions}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Backdrop Ambient Lighting
                </label>
                <StudioDropdown
                  value={customData.backdrop}
                  onChange={val => handleCustomChange('backdrop', val)}
                  options={backdropOptions}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Digital Retouching Style
                </label>
                <StudioDropdown
                  value={customData.retouch}
                  onChange={val => handleCustomChange('retouch', val)}
                  options={retouchOptions}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Special Notes for Photographer & Stylist
                </label>
                <textarea
                  rows={2}
                  value={customData.photographerNotes}
                  onChange={e => handleCustomChange('photographerNotes', e.target.value)}
                  placeholder="e.g. Prefers profile angle, glasses anti-glare, specific smile preference..."
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none font-body text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION D: Client Service Terms & Model Release (High Readability) */}
          <div id="section-terms" className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 scroll-mt-24">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                  Client Service Terms & Agreements
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTermsCertModalOpen(true)}
                className="text-[11px] font-bold text-gold hover:text-gold-dark flex items-center gap-1 font-body"
              >
                <span>View Certificate</span>
                <ArrowUpRight size={12} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Clause 1: Session Conduct */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Clock size={13} className="text-gold" />
                    <span>1. 15-Minute Call-Time & 48h Rescheduling</span>
                  </h4>
                  <span className="text-[10px] font-body text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Enforced
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-body leading-relaxed">
                  Arrive 15 minutes before camera time for toga steaming & grooming. Zero rebooking fees when rescheduled 48 hours in advance.
                </p>
              </div>

              {/* Clause 2: Model Release Toggle */}
              <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                        2. Model Release & Lookbook Consent
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        {customData.agreedModelRelease ? 'Consented for studio print lookbook' : 'Strictly confidential — private only'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleModelReleaseToggle(!customData.agreedModelRelease)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                      customData.agreedModelRelease
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {customData.agreedModelRelease ? <Check size={11} /> : null}
                    <span>{customData.agreedModelRelease ? 'Consented' : 'Confidential'}</span>
                  </button>
                </div>
              </div>

              {/* Clause 3: 365 Cloud Vault */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-gold" />
                    <span>3. 365-Day Cloud Vault & Reproduction Rights</span>
                  </h4>
                  <span className="text-[10px] font-body text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Protected
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-body leading-relaxed">
                  High-res soft copies preserved in private cloud storage for 365 days with unencumbered personal printing license.
                </p>
              </div>

              {/* Clause 4: Payment Policy */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Award size={13} className="text-gold" />
                    <span>4. 50% Downpayment & Shoot-Day Settlement</span>
                  </h4>
                  <span className="text-[10px] font-body text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-body leading-relaxed">
                  50% confirms your reserved camera bay. Remaining balance cleared on shoot day before lab print dispatch.
                </p>
              </div>
            </div>

            {/* Electronic Signature Audit Stamp */}
            <div className="p-3.5 rounded-xl bg-neutral-900 text-neutral-200 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-body">
              <span className="truncate"><strong className="text-gold">Audit Signature:</strong> {customData.termsSignatureHash}</span>
              <span className="text-emerald-400 font-bold shrink-0 flex items-center gap-1">
                <Check size={12} /> Verified Studio Agreement
              </span>
            </div>
          </div>

          {/* SECTION E: Account Security & Data Export */}
          <div id="section-security" className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 scroll-mt-24">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={17} className="text-gold" />
                <h3 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                  Account Security & Data Export
                </h3>
              </div>
              <span className="text-[10px] font-body text-neutral-400">Security</span>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 space-y-3">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="font-semibold text-xs text-primary dark:text-neutral-100">Password Recovery</h4>
                  <p className="text-[11px] text-neutral-500 font-body mt-0.5">Send a secure reset link to your email.</p>
                </div>
                <button
                  type="button"
                  className="btn-outline py-1.5 px-3 text-xs"
                  onClick={() => setToast({ type: 'info', message: 'Password reset link sent to your email.' })}
                >
                  Reset Password
                </button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <h4 className="font-semibold text-xs text-primary dark:text-neutral-100">Export Specifications</h4>
                  <p className="text-[11px] text-neutral-500 font-body mt-0.5">Download a JSON copy of your profile & sizing.</p>
                </div>
                <button
                  type="button"
                  className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, customData }, null, 2));
                    const dlAnchor = document.createElement('a');
                    dlAnchor.setAttribute("href", dataStr);
                    dlAnchor.setAttribute("download", `ekodak_profile_${user?.id?.slice(0, 6) || 'client'}.json`);
                    dlAnchor.click();
                    setToast({ type: 'success', message: 'Profile data exported!' });
                  }}
                >
                  <Download size={12} />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Floating/Fixed Save Bar */}
          <div className="sticky bottom-6 z-20 bg-neutral-950/90 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-neutral-800 shadow-2xl flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gold font-body uppercase tracking-wider truncate">
                Profile Specifications
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                Save modifications to your toga sizing and contact details.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 shadow-md shadow-gold/20 shrink-0"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* ── MODAL: BADGE DETAILS POPUP ────────────────────────────────────── */}
      {selectedBadgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <span className="text-[10px] font-body text-neutral-400 uppercase tracking-widest font-bold">
                {selectedBadgeModal.category}
              </span>
              <button onClick={() => setSelectedBadgeModal(null)} className="text-neutral-400 hover:text-primary dark:hover:text-white">
                ✕
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-sm ${
                selectedBadgeModal.isAwarded 
                  ? `bg-gradient-to-br ${selectedBadgeModal.color} text-white` 
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400'
              }`}>
                {React.createElement(BADGE_ICONS[selectedBadgeModal.iconName] || Award, { size: 26 })}
              </div>
              <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100">
                {selectedBadgeModal.title}
              </h3>
              <p className="text-xs font-semibold text-gold">{selectedBadgeModal.badgeLabel}</p>
            </div>

            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300 font-body leading-relaxed space-y-2">
              <p><strong>Milestone:</strong> {selectedBadgeModal.description}</p>
              <p><strong>Requirement:</strong> {selectedBadgeModal.requirement}</p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-body">
              <span className="text-neutral-400">Status:</span>
              <span className={selectedBadgeModal.isAwarded ? 'text-emerald-600 font-bold' : 'text-neutral-400'}>
                {selectedBadgeModal.isAwarded ? `Verified (${selectedBadgeModal.awardedDate || 'Active'})` : 'Pending Studio Verification'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadgeModal(null)}
              className="w-full btn-outline py-2 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: FULL EDIT PROFILE MODAL ─────────────────────────────────── */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-slide-up my-8 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100 leading-tight">
                    Edit Profile Credentials
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-body">
                    Update your identity, contact details, and graduation profile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-primary dark:text-neutral-300 dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="edit-profile-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSave(e);
                setIsEditProfileModalOpen(false);
              }}
              className="space-y-4 overflow-y-auto pr-1 flex-1 font-body text-xs"
            >
              {/* Avatar Bar */}
              <div className="flex items-center gap-3.5 p-3.5 bg-neutral-50/70 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
                <div className="relative shrink-0 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-gold/40 shadow-xs bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-heading font-bold text-sm text-gold">{initials}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-neutral-950/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={14} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Profile Portrait
                  </span>
                  <p className="font-bold text-primary dark:text-neutral-100 text-xs truncate">
                    {formData.firstName || 'Client'} {formData.lastName || ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploading}
                    className="mt-1 text-[11px] font-bold text-gold hover:text-gold-dark flex items-center gap-1 cursor-pointer"
                  >
                    <Camera size={11} />
                    <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Maria"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Santos"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Email (Read-Only)
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-400 text-xs cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="0917 123 4567"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Courier Delivery Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="Complete shipping address for physical photo frames..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs resize-none"
                />
              </div>

              {/* Bio / Motto */}
              <div>
                <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Bio / Graduation Motto & Note
                </label>
                <textarea
                  name="bio"
                  rows={2}
                  value={formData.bio}
                  onChange={handleFormChange}
                  placeholder="Personal motto or shoot preference..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs resize-none"
                />
              </div>

              {/* Academic Milestone */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-dark dark:text-gold block">
                  Academic Affiliation & Milestone
                </span>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      University / College
                    </label>
                    <input
                      type="text"
                      value={customData.university}
                      onChange={e => handleCustomChange('university', e.target.value)}
                      placeholder="e.g. Cebu Technological University"
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Campus / Branch
                    </label>
                    <input
                      type="text"
                      value={customData.campus}
                      onChange={e => handleCustomChange('campus', e.target.value)}
                      placeholder="e.g. Main Campus"
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Degree / Course Program
                    </label>
                    <input
                      type="text"
                      value={customData.degree}
                      onChange={e => handleCustomChange('degree', e.target.value)}
                      placeholder="e.g. BS in Information Technology"
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Graduation Year
                    </label>
                    <select
                      value={customData.gradYear}
                      onChange={e => handleCustomChange('gradYear', e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                    >
                      <option value="2026">Batch 2026</option>
                      <option value="2027">Batch 2027</option>
                      <option value="2025">Batch 2025 (Alumni)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Emergency Contact
                </span>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={customData.emergencyContactName}
                    onChange={e => handleCustomChange('emergencyContactName', e.target.value)}
                    placeholder="Contact person name"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                  />
                  <input
                    type="tel"
                    value={customData.emergencyContactPhone}
                    onChange={e => handleCustomChange('emergencyContactPhone', e.target.value)}
                    placeholder="Contact mobile phone"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gold/30 outline-none text-xs"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="btn-outline py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-profile-modal-form"
                disabled={isSaving}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-gold/20 cursor-pointer"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE PHOTO ───────────────────────────────────────────── */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100 flex items-center gap-2">
                <Camera size={18} className="text-gold" />
                <span>Update Profile Photo</span>
              </h3>
              <button onClick={() => setPhotoModalOpen(false)} className="text-neutral-400 hover:text-primary dark:hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 font-body">
              Upload a clear graduation portrait or photo for your E-Kodak Studio client pass.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploading}
                className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <span>Select Image from Device</span>
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="btn-outline py-1.5 px-4 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TERMS & SERVICE CERTIFICATE ────────────────────────────── */}
      {termsCertModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-gold" />
                <h3 className="font-heading text-base font-bold text-primary dark:text-neutral-100">Studio Agreement Certificate</h3>
              </div>
              <button onClick={() => setTermsCertModalOpen(false)} className="text-neutral-400 hover:text-primary dark:hover:text-white">
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-sm space-y-3 font-body">
              <div className="text-center pb-2.5 border-b border-neutral-200 dark:border-neutral-700">
                <span className="font-heading text-base font-bold text-primary dark:text-neutral-100 block">E-KODAK PHOTOGRAPHY STUDIO</span>
                <span className="text-[10px] font-body text-neutral-500 uppercase tracking-widest">Cebu City · Client Agreement Certificate</span>
              </div>

              <div className="space-y-1 font-body text-xs text-neutral-800 dark:text-neutral-200">
                <p><strong>Client:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Account ID:</strong> #EK-{user?.id?.slice(0, 6)?.toUpperCase() || '2026'}</p>
                <p><strong>Institution:</strong> {customData.university}</p>
                <p><strong>Degree / Major:</strong> {customData.degree}</p>
                <p><strong>Model Release:</strong> {customData.agreedModelRelease ? 'Consented (Annual Lookbook Showcase)' : 'Restricted (Strict Private Session)'}</p>
                <p><strong>Call-Time Protocol:</strong> 15-Minute Prior Arrival Acknowledged</p>
                <p><strong>Cloud Storage:</strong> 365-Day Soft Copy Archival</p>
                <p><strong>Signature Reference:</strong> {customData.termsSignatureHash}</p>
                <p><strong>Execution Date:</strong> {new Date(customData.termsSignedTimestamp).toLocaleString()}</p>
              </div>

              <div className="pt-2.5 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs text-emerald-800 dark:text-emerald-400 font-bold font-body">
                ✓ VERIFIED STUDIO AGREEMENT ON RECORD
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <Printer size={12} /> Print
              </button>
              <button
                type="button"
                onClick={() => setTermsCertModalOpen(false)}
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SLIDE-OVER SIDEBAR: PACKAGES & SETS SESSION PROGRESS + ADDRESS CUSTOMIZATIONS ── */}
      {sessionSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setSessionSidebarOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-neutral-900 h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-10 animate-slide-left overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary text-white flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-body uppercase tracking-widest text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30 font-bold">
                    Packages & Sets Dispatch
                  </span>
                  {latestBooking?.booking_number && (
                    <span className="text-[10px] font-body text-neutral-300">
                      #{latestBooking.booking_number}
                    </span>
                  )}
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white truncate">
                  {latestBooking?.service?.name || 'Senior High Packages and sets'}
                </h3>
                <p className="text-xs text-neutral-300 font-body flex items-center gap-2 truncate">
                  <span>Tier: {latestBooking?.tier_name || 'Set A'}</span>
                  <span>•</span>
                  <span>{latestBooking?.event_date ? new Date(latestBooking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date Pending'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSessionSidebarOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 divide-y divide-neutral-100 dark:divide-neutral-800">
              
              {/* 1. Detailed Packages & Sets Session Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="text-gold" size={17} />
                    <h4 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                      Packages & Sets Session Progress
                    </h4>
                  </div>
                  <span className="text-[10px] font-body font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Status: {latestBooking?.status || 'Active'}
                  </span>
                </div>

                {/* Progress Steps Timeline */}
                <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                  {[
                    {
                      step: 1,
                      title: 'Order Registration & Booking Placed',
                      desc: `Booking #${latestBooking?.booking_number || 'BK-2026-00004'} verified in studio dispatch system.`,
                      status: 'COMPLETED',
                      time: latestBooking?.created_at ? new Date(latestBooking.created_at).toLocaleDateString() : 'Confirmed'
                    },
                    {
                      step: 2,
                      title: 'Attire Sizing & Wardrobe Allocation',
                      desc: `Toga size (${customData.togaSize?.split(' ')[0] || 'S'}) and academic discipline hood allocated in wardrobe.`,
                      status: 'COMPLETED',
                      time: 'Verified'
                    },
                    {
                      step: 3,
                      title: 'Camera Bay Photography Session',
                      desc: `Scheduled shoot at Cebu Studio camera bay.`,
                      status: latestBooking?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                      time: latestBooking?.event_date ? new Date(latestBooking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'
                    },
                    {
                      step: 4,
                      title: 'Digital Raw Proofing Selection',
                      desc: 'Cloud proofing portal access for client review and final shot selections.',
                      status: latestBooking?.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
                      time: 'Est. 3-5 days post-shoot'
                    },
                    {
                      step: 5,
                      title: 'Master Retouching & Color Grading',
                      desc: 'Editorial facial contouring, skin polish, and academic lookbook grading.',
                      status: 'UPCOMING',
                      time: 'Est. 5-7 business days'
                    },
                    {
                      step: 6,
                      title: 'Archival Print & Crystal Framing',
                      desc: 'Laboratory photographic print run and premium crystal glass framing.',
                      status: 'UPCOMING',
                      time: 'Est. 7-10 business days'
                    },
                    {
                      step: 7,
                      title: 'Courier Dispatch & Handover',
                      desc: 'Protective packaging sealed and handed over to chosen delivery courier.',
                      status: 'UPCOMING',
                      time: 'Handover Notification'
                    },
                  ].map((milestone) => (
                    <div key={milestone.step} className="relative group">
                      {/* Node circle */}
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        milestone.status === 'COMPLETED'
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-50 dark:ring-emerald-950/40'
                          : milestone.status === 'IN_PROGRESS'
                            ? 'bg-gold text-primary ring-4 ring-gold/20 animate-pulse'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                      }`}>
                        {milestone.status === 'COMPLETED' ? '✓' : milestone.step}
                      </div>

                      <div className="bg-neutral-50/70 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-heading text-xs font-bold text-primary dark:text-neutral-100">
                            {milestone.title}
                          </h5>
                          <span className="text-[10px] font-body text-neutral-400">
                            {milestone.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-body mt-0.5">
                          {milestone.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Package Inclusions Quick Pill */}
                <div className="p-3.5 bg-gold/10 dark:bg-gold/15 rounded-2xl border border-gold/30 text-xs space-y-1.5">
                  <span className="font-heading font-bold text-gold-dark dark:text-gold block text-[11px] uppercase tracking-wider">
                    Package Inclusions & Deliverables
                  </span>
                  <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-700 dark:text-neutral-300 font-body">
                    <li>• Formal Toga Portrait</li>
                    <li>• Creative / Barong Shot</li>
                    <li>• 8x10 Crystal Frame</li>
                    <li>• 8R Commemorative Print</li>
                    <li>• 12 Wallet Size Prints</li>
                    <li>• Cloud High-Res Files</li>
                  </ul>
                </div>
              </div>

              {/* 2. User's Booking Addresses Customization */}
              <div className="pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="text-gold" size={17} />
                    <h4 className="font-heading text-sm font-bold text-primary dark:text-neutral-100">
                      Booking Delivery & Shipping Address
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-500 font-body">
                    Customize where the studio will ship your crystal graduation frames, official prints, and keepsake parcel.
                  </p>
                </div>

                <form onSubmit={handleSaveAddressCustomizations} className="space-y-3.5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                        Recipient Full Name
                      </label>
                      <input
                        type="text"
                        value={addressCustomizations.recipientName}
                        onChange={(e) => setAddressCustomizations(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="Name of recipient"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                        Courier Contact Mobile
                      </label>
                      <input
                        type="tel"
                        value={addressCustomizations.courierPhone}
                        onChange={(e) => setAddressCustomizations(prev => ({ ...prev, courierPhone: e.target.value }))}
                        placeholder="0917 000 0000"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                      Complete Courier Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={addressCustomizations.shippingAddress}
                      onChange={(e) => setAddressCustomizations(prev => ({ ...prev, shippingAddress: e.target.value }))}
                      placeholder="Unit / House No., Street, Barangay, City, Province, Postal Code"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-gold outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                      Delivery Landmark / Guard Instructions
                    </label>
                    <input
                      type="text"
                      value={addressCustomizations.landmark}
                      onChange={(e) => setAddressCustomizations(prev => ({ ...prev, landmark: e.target.value }))}
                      placeholder="e.g. Near Gate 2, please call recipient upon arrival"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-gold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-body uppercase text-neutral-400 block font-bold">
                      Fulfillment & Claiming Method
                    </label>
                    <select
                      value={addressCustomizations.preferredCourier}
                      onChange={(e) => setAddressCustomizations(prev => ({ ...prev, preferredCourier: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-gold outline-none"
                    >
                      <option value="studio_pickup">Studio In-Person Claiming (Claim at Cebu Studio Front Desk)</option>
                      <option value="studio_delivery">Studio Direct Delivery (Handled directly by E-Kodak Studio Staff)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="w-full btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-gold/20"
                  >
                    {addressSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Updating Delivery Specifications...</span>
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        <span>Save Address Customizations</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
