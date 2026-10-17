import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    User, Mail, Phone, MapPin, Camera, Loader2, Save,
    ShieldCheck, CheckCircle, Clock,
    Sparkles, GraduationCap, Check, Lock, Download,
    Building, ArrowUpRight, Truck,
    CheckCircle2, ChevronRight, X, Calendar,
    BadgeCheck, Fingerprint, Zap, Star, Image as ImageIcon, Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings } from '../../services/bookingService';
import { recordCustomerAction } from '../../services/customerAuditService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import Toast from '../../components/ui/Toast';
import StudioDropdown from '../../components/ui/StudioDropdown';

const GRAD_YEAR_OPTIONS = [
    { value: '2026', label: 'Batch 2026 (Graduating)' },
    { value: '2027', label: 'Batch 2027' },
    { value: '2028', label: 'Batch 2028' },
    { value: '2025', label: 'Batch 2025 (Alumni)' },
];

const HONORS_OPTIONS = [
    { value: 'Regular Candidate', label: 'Regular Candidate' },
    { value: 'Cum Laude Candidate', label: 'Cum Laude Candidate' },
    { value: 'Magna Cum Laude Candidate', label: 'Magna Cum Laude Candidate' },
    { value: 'Summa Cum Laude Candidate', label: 'Summa Cum Laude Candidate' },
    { value: 'Academic Distinction', label: "Dean's Lister / Distinction" },
    { value: 'With Highest Honors', label: 'With Highest Honors (SHS)' },
    { value: 'With High Honors', label: 'With High Honors (SHS)' },
    { value: 'With Honors', label: 'With Honors (SHS)' },
];

const TABS = [
    { id: 'personal', label: 'Personal', desc: 'Identity & contact', icon: User },
    { id: 'academic', label: 'Academic', desc: 'School & records', icon: GraduationCap },
    { id: 'delivery', label: 'Delivery', desc: 'Prints & parcels', icon: Truck },
    { id: 'security', label: 'Security', desc: 'Policies & access', icon: Lock },
];

const inputCls = "w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#17181f] border border-neutral-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold/20 focus:border-gold/60 outline-none font-body text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const bareInputCls = "w-full px-4 py-3 bg-white dark:bg-[#17181f] border border-neutral-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold/20 focus:border-gold/60 outline-none font-body text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const labelCls = "block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.12em] mb-1.5";
const hintCls = "text-[11px] text-neutral-400 font-body mt-1.5 block leading-relaxed";

function Field({ label, hint, icon: Icon, children }) {
    return (
        <div className="group">
            <label className={labelCls}>{label}</label>
            <div className="relative">
                {Icon && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-gold transition-colors pointer-events-none">
                        <Icon size={15} />
                    </span>
                )}
                {children}
            </div>
            {hint && <span className={hintCls}>{hint}</span>}
        </div>
    );
}

function SectionHead({ step, title, desc, icon: Icon }) {
    return (
        <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold via-[#d9bc7f] to-gold-dark text-[#1a1714] flex items-center justify-center shadow-lg shadow-gold/30 shrink-0">
                <Icon size={17} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-dark dark:text-gold">Step {step}</p>
                <h3 className="font-heading text-[17px] font-bold text-neutral-900 dark:text-white leading-tight">{title}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-body mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, profile, updateProfile, uploadAvatar } = useAuth();

    // Navigation & interaction states
    const [activeTab, setActiveTab] = useState('personal');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const avatarInputRef = useRef(null);

    // ── 1. Form Data: Root Account Owner Profile Fields ─────────────────────────
    const [formData, setFormData] = useState(() => ({
        firstName: profile?.first_name || '',
        middleName: profile?.middle_name || '',
        lastName: profile?.last_name || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        bio: profile?.bio || '',
    }));

    // ── 2. Studio Specifications State ──────────────────────────────────────────
    const [studioSpecs, setStudioSpecs] = useState(() => {
        const s = profile?.studio_specs || {};
        return {
            university: s.university || '',
            campus: s.campus || '',
            degree: s.degree || '',
            gradYear: s.gradYear || '2026',
            honors: s.honors || 'Regular Candidate',
            studentId: s.student_id || s.studentId || '',
            section: s.section || '',
            togaSize: s.togaSize || '',
            heightCm: s.height_cm || s.heightCm || '',
            hoodDiscipline: s.hoodDiscipline || '',
            photographerNotes: s.photographerNotes || '',
            emergencyContactName: s.emergencyContactName || '',
            emergencyContactPhone: s.emergencyContactPhone || '',
            courier_recipient_name: s.courier_recipient_name || '',
            courier_phone: s.courier_phone || '',
            shipping_address: s.shipping_address || '',
            delivery_instructions: s.delivery_instructions || '',
            preferred_courier: s.preferred_courier || s.fulfillment_mode || 'studio_pickup',
            agreedModelRelease: s.agreedModelRelease !== undefined ? Boolean(s.agreedModelRelease) : true,
        };
    });

    // Keep state synced when Supabase profile data loads
    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                firstName: profile.first_name || prev.firstName,
                middleName: profile.middle_name || prev.middleName,
                lastName: profile.last_name || prev.lastName,
                phone: profile.phone || prev.phone,
                address: profile.address || prev.address,
                bio: profile.bio || prev.bio,
            }));

            const s = profile.studio_specs || {};
            setStudioSpecs(prev => ({
                university: s.university || prev.university,
                campus: s.campus || prev.campus,
                degree: s.degree || prev.degree,
                gradYear: s.gradYear || prev.gradYear || '2026',
                honors: s.honors || prev.honors || 'Regular Candidate',
                studentId: s.student_id || s.studentId || prev.studentId,
                section: s.section || prev.section,
                togaSize: s.togaSize || prev.togaSize,
                heightCm: s.height_cm || s.heightCm || prev.heightCm,
                hoodDiscipline: s.hoodDiscipline || prev.hoodDiscipline,
                photographerNotes: s.photographerNotes || prev.photographerNotes,
                emergencyContactName: s.emergencyContactName || prev.emergencyContactName,
                emergencyContactPhone: s.emergencyContactPhone || prev.emergencyContactPhone,
                courier_recipient_name: s.courier_recipient_name || prev.courier_recipient_name,
                courier_phone: s.courier_phone || prev.courier_phone,
                shipping_address: s.shipping_address || prev.shipping_address,
                delivery_instructions: s.delivery_instructions || prev.delivery_instructions,
                preferred_courier: s.preferred_courier || s.fulfillment_mode || prev.preferred_courier || 'studio_pickup',
                agreedModelRelease: s.agreedModelRelease !== undefined ? Boolean(s.agreedModelRelease) : prev.agreedModelRelease,
            }));
        }
    }, [profile]);

    // Load customer bookings to detect active session (Studio vs School)
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

    // Handle standard form changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle studio specs changes
    const handleSpecChange = (field, value) => {
        setStudioSpecs(prev => ({ ...prev, [field]: value }));
    };

    // ── Save All Profile & Studio Specifications to Supabase ───────────────────
    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const mergedSpecs = {
                ...(profile?.studio_specs || {}),
                university: studioSpecs.university,
                campus: studioSpecs.campus,
                degree: studioSpecs.degree,
                gradYear: studioSpecs.gradYear,
                honors: studioSpecs.honors,
                student_id: studioSpecs.studentId,
                studentId: studioSpecs.studentId,
                section: studioSpecs.section,
                togaSize: studioSpecs.togaSize,
                height_cm: studioSpecs.heightCm,
                heightCm: studioSpecs.heightCm,
                hoodDiscipline: studioSpecs.hoodDiscipline,
                photographerNotes: studioSpecs.photographerNotes,
                emergencyContactName: studioSpecs.emergencyContactName,
                emergencyContactPhone: studioSpecs.emergencyContactPhone,
                courier_recipient_name: studioSpecs.courier_recipient_name,
                courier_phone: studioSpecs.courier_phone,
                shipping_address: studioSpecs.shipping_address,
                delivery_instructions: studioSpecs.delivery_instructions,
                preferred_courier: studioSpecs.preferred_courier,
                fulfillment_mode: studioSpecs.preferred_courier === 'studio_delivery' ? 'STUDIO_DELIVERY' : 'STUDIO_PICKUP',
                agreedModelRelease: studioSpecs.agreedModelRelease,
            };

            await updateProfile({
                first_name: formData.firstName,
                middle_name: formData.middleName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                bio: formData.bio,
                studio_specs: mergedSpecs,
            });

            // Audit log entry
            if (user?.id) {
                recordCustomerAction({
                    userId: user.id,
                    category: 'PROFILE_UPDATE',
                    title: 'Account Owner Profile Updated',
                    description: `Profile credentials and studio fitting records updated for ${formData.firstName} ${formData.lastName}.`,
                    changes: [
                        formData.phone ? `Phone: ${formData.phone}` : null,
                        formData.address ? `Address: ${formData.address}` : null,
                        studioSpecs.university ? `University: ${studioSpecs.university}` : null,
                        studioSpecs.degree ? `Degree/Program: ${studioSpecs.degree}` : null,
                        studioSpecs.section ? `Section: ${studioSpecs.section}` : null,
                    ].filter(Boolean),
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

    // ── Avatar Photo Upload ───────────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
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
                    title: 'Client Profile Avatar Updated',
                    description: 'Customer uploaded a new profile portrait photograph.',
                    changes: ['Avatar: New image uploaded']
                });
            }
            setToast({ type: 'success', message: 'Profile portrait updated!' });
            setPhotoModalOpen(false);
        } catch (err) {
            console.warn('Storage upload fallback triggered:', err);
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64Url = reader.result;
                    await updateProfile({ avatar_url: base64Url });
                    setToast({ type: 'success', message: 'Profile portrait updated!' });
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

    // ── Password Reset Email ──────────────────────────────────────────────────
    const handlePasswordReset = async () => {
        if (!user?.email) return;
        try {
            if (!isSupabaseConfigured) {
                setToast({ type: 'info', message: 'Password reset link simulated in demo mode.' });
                return;
            }
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setToast({ type: 'success', message: `Password reset instructions sent to ${user.email}.` });
        } catch (err) {
            setToast({ type: 'error', message: err.message || 'Could not send reset email.' });
        }
    };

    // ── Export Profile Data as JSON ───────────────────────────────────────────
    const handleExportData = () => {
        const exportPayload = {
            account_owner: {
                id: user?.id,
                email: user?.email,
                full_name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
                first_name: formData.firstName,
                middle_name: formData.middleName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                bio_motto: formData.bio,
            },
            academic_specs: {
                university: studioSpecs.university,
                campus: studioSpecs.campus,
                degree: studioSpecs.degree,
                graduation_year: studioSpecs.gradYear,
                honors: studioSpecs.honors,
                student_id: studioSpecs.studentId,
                section: studioSpecs.section,
                toga_size: studioSpecs.togaSize,
                height_cm: studioSpecs.heightCm,
                hood_discipline: studioSpecs.hoodDiscipline,
                photographer_notes: studioSpecs.photographerNotes,
            },
            fulfillment_preferences: {
                mode: studioSpecs.preferred_courier,
                recipient_name: studioSpecs.courier_recipient_name || `${formData.firstName} ${formData.lastName}`.trim(),
                recipient_phone: studioSpecs.courier_phone || formData.phone,
                shipping_address: studioSpecs.shipping_address || formData.address,
                delivery_instructions: studioSpecs.delivery_instructions,
            },
            exported_at: new Date().toISOString(),
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `ekodak_profile_${user?.id?.slice(0, 6) || 'client'}.json`);
        dlAnchor.click();
        setToast({ type: 'success', message: 'Profile data exported successfully!' });
    };

    // ── Detect Active Booking Session & Venue (Studio vs School) ──────────────
    const latestBooking = useMemo(() => {
        if (!bookings || bookings.length === 0) return null;
        return bookings[0];
    }, [bookings]);

    const detectedSessionInfo = useMemo(() => {
        if (!latestBooking) return null;

        const notesLower = (latestBooking.notes || '').toLowerCase();
        const locationLower = (latestBooking.location || '').toLowerCase();
        const studentDetails = latestBooking.student_details;

        const isSchoolPictorial =
            studentDetails?.booking_mode === 'SCHOOL_PARTNER' ||
            notesLower.includes('school pictorial') ||
            notesLower.includes('official school partner') ||
            notesLower.includes('partner agreement') ||
            locationLower.includes('school') ||
            locationLower.includes('campus') ||
            Boolean(studentDetails?.school);

        const venueName = isSchoolPictorial
            ? (studentDetails?.school || studentDetails?.school_address || latestBooking.location || 'Partner School Campus')
            : 'E-Kodak Studio Cebu (Camera Bay)';

        const sessionType = isSchoolPictorial ? 'School Campus Pictorial' : 'In-Studio Session';
        const venueLabel = isSchoolPictorial ? 'Official School Campus Venue' : 'Cebu Studio Flagship Bay';

        return {
            isSchoolPictorial,
            venueName,
            sessionType,
            venueLabel,
            dateText: latestBooking.event_date
                ? new Date(latestBooking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : (isSchoolPictorial ? 'School Schedule (TBD)' : 'Date to be Announced'),
            timeText: latestBooking.preferred_time ? latestBooking.preferred_time.substring(0, 5) : '',
            tierName: latestBooking.tier_name || 'Standard Set',
            serviceName: latestBooking.service?.name || 'Graduation Portrait Session',
            bookingNumber: latestBooking.booking_number,
            status: latestBooking.status || 'PENDING',
        };
    }, [latestBooking]);

    // ── Academic records sourced strictly from database (bookings + profile) ──
    // Every school / campus / student ID / section option below comes from real
    // database records — no hardcoded lists, no free-text inputs underneath.
    const dbAcademicRecords = useMemo(() => {
        const records = [];
        (bookings || []).forEach((b) => {
            const sd = b?.student_details || {};
            const school = (sd.school || '').trim();
            const campus = (sd.school_address || '').trim();
            const studentId = String(sd.student_id || '').trim();
            const section = String(sd.section || '').trim();
            const course = (sd.course || '').trim();
            const batch = (sd.batch || '').trim();
            if (!school && !campus && !studentId && !section) return;
            if (school === 'N/A' && campus === 'N/A' && !studentId && !section) return;
            records.push({
                school: school === 'N/A' ? '' : school,
                campus: campus === 'N/A' ? '' : campus,
                studentId: studentId === 'N/A' ? '' : studentId,
                section: section === 'N/A' ? '' : section,
                course,
                batch,
                bookingNumber: b.booking_number || '',
                bookingId: b.id || '',
            });
        });
        return records;
    }, [bookings]);

    const hasDbAcademic = dbAcademicRecords.length > 0;

    // University options — distinct schools from booking database records
    const universityOptions = useMemo(() => {
        const seen = new Map();
        dbAcademicRecords.forEach((r) => {
            if (!r.school || seen.has(r.school)) return;
            seen.set(r.school, {
                value: r.school,
                label: r.school,
                badge: r.bookingNumber ? `#${r.bookingNumber}` : '',
            });
        });
        // Keep the currently saved profile value selectable even if no booking carries it yet
        if (studioSpecs.university && !seen.has(studioSpecs.university)) {
            seen.set(studioSpecs.university, {
                value: studioSpecs.university,
                label: studioSpecs.university,
                badge: 'On file',
            });
        }
        return [...seen.values()];
    }, [dbAcademicRecords, studioSpecs.university]);

    // Campus options — distinct campus branches from booking database records,
    // narrowed to the selected university when it matches a record
    const campusOptions = useMemo(() => {
        const pool = studioSpecs.university
            ? dbAcademicRecords.filter((r) => r.school === studioSpecs.university)
            : dbAcademicRecords;
        const source = pool.length > 0 ? pool : dbAcademicRecords;
        const seen = new Map();
        source.forEach((r) => {
            if (!r.campus || seen.has(r.campus)) return;
            seen.set(r.campus, {
                value: r.campus,
                label: r.campus,
                badge: r.bookingNumber ? `#${r.bookingNumber}` : '',
            });
        });
        if (studioSpecs.campus && !seen.has(studioSpecs.campus)) {
            seen.set(studioSpecs.campus, {
                value: studioSpecs.campus,
                label: studioSpecs.campus,
                badge: 'On file',
            });
        }
        return [...seen.values()];
    }, [dbAcademicRecords, studioSpecs.university, studioSpecs.campus]);

    // Student ID options — distinct IDs from booking database records
    const studentIdOptions = useMemo(() => {
        const seen = new Map();
        dbAcademicRecords.forEach((r) => {
            if (!r.studentId || seen.has(r.studentId)) return;
            seen.set(r.studentId, {
                value: r.studentId,
                label: r.studentId,
                badge: r.bookingNumber ? `#${r.bookingNumber}` : '',
            });
        });
        if (studioSpecs.studentId && !seen.has(studioSpecs.studentId)) {
            seen.set(studioSpecs.studentId, {
                value: studioSpecs.studentId,
                label: studioSpecs.studentId,
                badge: 'On file',
            });
        }
        return [...seen.values()];
    }, [dbAcademicRecords, studioSpecs.studentId]);

    // Class section options — distinct sections from booking database records
    const sectionOptions = useMemo(() => {
        const seen = new Map();
        dbAcademicRecords.forEach((r) => {
            if (!r.section || seen.has(r.section)) return;
            seen.set(r.section, {
                value: r.section,
                label: r.section,
                badge: r.bookingNumber ? `#${r.bookingNumber}` : '',
            });
        });
        if (studioSpecs.section && !seen.has(studioSpecs.section)) {
            seen.set(studioSpecs.section, {
                value: studioSpecs.section,
                label: studioSpecs.section,
                badge: 'On file',
            });
        }
        return [...seen.values()];
    }, [dbAcademicRecords, studioSpecs.section]);

    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || 'Client Member';
    const initials = `${formData.firstName?.charAt(0) || ''}${formData.lastName?.charAt(0) || ''}`.toUpperCase() || 'EK';

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Member';

    // Profile completeness
    const completeness = useMemo(() => {
        const checks = [
            !!formData.firstName, !!formData.lastName, !!formData.phone, !!formData.address,
            !!studioSpecs.university, !!studioSpecs.degree, !!studioSpecs.gradYear,
            !!studioSpecs.studentId, !!studioSpecs.section,
            !!studioSpecs.shipping_address || studioSpecs.preferred_courier === 'studio_pickup',
            !!profile?.avatar_url,
        ];
        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    }, [formData, studioSpecs, profile]);

    // Copy Residential Address into Shipping Address
    const handleCopyResidentialAddress = () => {
        if (!formData.address) {
            setToast({ type: 'info', message: 'No permanent address recorded yet.' });
            return;
        }
        setStudioSpecs(prev => ({
            ...prev,
            shipping_address: formData.address,
            courier_recipient_name: prev.courier_recipient_name || fullName,
            courier_phone: prev.courier_phone || formData.phone,
        }));
        setToast({ type: 'success', message: 'Address copied to delivery destination!' });
    };

    return (
        <div className="w-full max-w-screen-2xl mx-auto space-y-5 animate-fade-in pb-24 relative">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* ambient page glows */}
            <div className="pointer-events-none absolute -top-10 -left-10 w-[420px] h-[420px] bg-gold/15 blur-[120px] rounded-full" />
            <div className="pointer-events-none absolute top-40 -right-16 w-[380px] h-[380px] bg-amber-500/10 blur-[120px] rounded-full" />

            {/* ═══════════ 1. CINEMATIC PROFILE HERO ═══════════ */}
            <section className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] bg-[#0b0c12]">
                {/* cover art */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(201,169,110,0.35),transparent_60%),radial-gradient(800px_circle_at_90%_20%,rgba(217,119,6,0.22),transparent_55%),radial-gradient(700px_circle_at_50%_110%,rgba(56,42,18,0.8),transparent_60%),linear-gradient(160deg,#101218_0%,#0b0c12_45%,#141019_100%)]" />
                    {/* film grid */}
                    <div
                        className="absolute inset-0 opacity-[0.14]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(80% 90% at 50% 10%, black 40%, transparent 100%)' }}
                    />
                    <div className="absolute -top-24 right-[8%] w-96 h-96 bg-gold/25 blur-[110px] rounded-full animate-float-slow-1" />
                    <div className="absolute -bottom-32 left-[5%] w-[420px] h-[420px] bg-amber-600/20 blur-[120px] rounded-full animate-float-slow-2" />
                    {/* aperture rings */}
                    <div className="absolute -right-20 -top-20 w-[380px] h-[380px] rounded-full border border-gold/15" />
                    <div className="absolute -right-12 -top-12 w-[300px] h-[300px] rounded-full border border-gold/20" />
                    <div className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-gold/25" />
                </div>

                <div className="relative z-10 p-6 sm:p-9">
                    {/* top bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-[11px] font-body text-white/60">
                            <Link to="/dashboard" className="hover:text-gold transition-colors">Dashboard</Link>
                            <ChevronRight size={12} />
                            <span className="text-gold font-semibold">My Profile</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleExportData}
                                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/8 border border-white/15 text-white/80 text-xs font-bold backdrop-blur-md hover:bg-white/15 hover:border-gold/40 transition-all cursor-pointer"
                            >
                                <Download size={13} /> Export
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-[#1a1408] text-xs font-extrabold shadow-lg shadow-gold/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {isSaving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>

                    {/* identity row */}
                    <div className="mt-7 flex flex-col lg:flex-row lg:items-end gap-7">
                        <div className="flex items-start sm:items-center gap-5 flex-1 min-w-0">
                            {/* avatar */}
                            <button
                                type="button"
                                onClick={() => setPhotoModalOpen(true)}
                                className="group relative shrink-0 cursor-pointer"
                                title="Update portrait photo"
                            >
                                <div className="absolute -inset-2 rounded-[30px] bg-gradient-to-br from-gold/50 via-transparent to-amber-500/40 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-24 h-24 sm:w-[112px] sm:h-[112px] rounded-[26px] p-[3px] bg-gradient-to-br from-gold-light via-gold to-gold-dark shadow-2xl">
                                    <div className="w-full h-full rounded-[23px] bg-[#15161d] flex items-center justify-center overflow-hidden text-gold font-heading text-3xl font-bold">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="bg-gradient-to-br from-gold-light to-gold-dark bg-clip-text text-transparent">{initials}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center shadow-lg shadow-black/40 ring-4 ring-[#0b0c12] group-hover:scale-110 transition-transform">
                                    <Camera size={15} strokeWidth={2.5} />
                                </span>
                                <span className="absolute top-2 -left-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-[#0b0c12] shadow-lg" title="Active member" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1a1408] bg-gradient-to-r from-gold-light to-gold px-2.5 py-1 rounded-full shadow-md shadow-gold/25">
                                        <Sparkles size={11} /> Account Owner
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-mono text-white/70 bg-white/8 border border-white/12 px-2.5 py-1 rounded-full backdrop-blur-md">
                                        <Fingerprint size={11} className="text-gold" /> #EK-{user?.id?.slice(0, 8)?.toUpperCase() || 'CLIENT'}
                                    </span>
                                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-body text-emerald-300 bg-emerald-400/10 border border-emerald-300/25 px-2.5 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified client
                                    </span>
                                </div>
                                <h1 className="mt-2 font-heading text-3xl sm:text-[40px] leading-[1.05] font-bold text-white tracking-tight truncate">
                                    {fullName}
                                </h1>
                                <div className="mt-1.5 flex items-center gap-3 text-[13px] text-white/65 font-body flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <Building size={13} className="text-gold shrink-0" />
                                        <span className="truncate">{studioSpecs.university ? `${studioSpecs.university}${studioSpecs.degree ? ` · ${studioSpecs.degree}` : ''}` : 'Academic institution not set yet'}</span>
                                    </span>
                                    <span className="hidden sm:inline text-white/25">•</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar size={13} className="text-gold/80" /> Joined {memberSince}
                                    </span>
                                </div>
                                <div className="mt-2.5 flex items-center gap-2 text-xs text-white/60 font-body flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full pl-1 pr-3 py-1 backdrop-blur-md max-w-full">
                                        <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0"><Mail size={12} /></span>
                                        <span className="truncate max-w-[220px]">{user?.email || 'Registered Client'}</span>
                                    </span>
                                    {formData.phone && (
                                        <span className="inline-flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full pl-1 pr-3 py-1 backdrop-blur-md">
                                            <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0"><Phone size={12} /></span>
                                            {formData.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* completeness */}
                        <div className="w-full lg:w-[300px] shrink-0 rounded-3xl bg-white/[0.06] border border-white/12 backdrop-blur-xl p-5 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold">Profile strength</p>
                                <p className="font-heading text-2xl font-bold text-white">{completeness}<span className="text-sm text-gold">%</span></p>
                            </div>
                            <div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-amber-500 shadow-[0_0_16px_rgba(201,169,110,0.7)] transition-all duration-700"
                                    style={{ width: `${completeness}%` }}
                                />
                            </div>
                            <p className="mt-2.5 text-[11px] leading-relaxed text-white/55 font-body">
                                {completeness >= 90
                                    ? 'Studio-ready. Your pass, academic & delivery records are complete.'
                                    : completeness >= 60
                                        ? 'Almost camera-ready — finish academic & delivery details.'
                                        : 'Add your academic records & delivery details to unlock faster check-in.'}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                {!profile?.avatar_url && (
                                    <button type="button" onClick={() => setPhotoModalOpen(true)} className="flex-1 text-[11px] font-bold bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl py-2 transition-all cursor-pointer">Add photo</button>
                                )}
                                {!studioSpecs.university && hasDbAcademic && (
                                    <button type="button" onClick={() => setActiveTab('academic')} className="flex-1 text-[11px] font-bold bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold rounded-xl py-2 transition-all cursor-pointer">Sync school records</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* gold base line */}
                <div className="relative h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />
            </section>

            {/* ═══════════ 2. SESSION SPOTLIGHT ═══════════ */}
            {detectedSessionInfo ? (
                <section className="relative rounded-[24px] p-[1.5px] bg-gradient-to-r from-gold/60 via-amber-400/30 to-gold/60 shadow-[0_16px_50px_-16px_rgba(201,169,110,0.45)] overflow-hidden">
                    <div className="rounded-[22.5px] bg-gradient-to-br from-[#14141c] via-[#101018] to-[#0c0d13] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 relative overflow-hidden">
                        <div className="absolute -left-16 -top-16 w-64 h-64 bg-gold/15 blur-[80px] rounded-full" />
                        <div className="flex items-center gap-4 flex-1 min-w-0 relative">
                            <div className="relative shrink-0">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center shadow-lg shadow-gold/40">
                                    {detectedSessionInfo.isSchoolPictorial ? <Building size={22} /> : <Camera size={22} />}
                                </div>
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-[#14141c] animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-[#1a1408] bg-gradient-to-r from-gold-light to-gold px-2.5 py-0.5 rounded-full">
                                        <Zap size={10} /> {detectedSessionInfo.sessionType}
                                    </span>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-300/25 px-2 py-0.5 rounded-full">{detectedSessionInfo.status}</span>
                                    <span className="text-[11px] font-mono text-white/40">#{detectedSessionInfo.bookingNumber}</span>
                                </div>
                                <h3 className="mt-1.5 font-heading text-lg font-bold text-white truncate">
                                    {detectedSessionInfo.serviceName} <span className="text-gold font-body font-bold text-sm">· {detectedSessionInfo.tierName}</span>
                                </h3>
                                <p className="mt-1 flex items-center gap-3 text-xs text-white/60 font-body flex-wrap">
                                    <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-gold" /> {detectedSessionInfo.dateText}{detectedSessionInfo.timeText && ` at ${detectedSessionInfo.timeText}`}</span>
                                    <span className="text-white/20">•</span>
                                    <span className="inline-flex items-center gap-1.5 text-gold font-semibold"><MapPin size={13} /> {detectedSessionInfo.venueName}</span>
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/dashboard/progress"
                            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-gold-light to-gold text-[#1a1408] text-xs font-extrabold shadow-lg shadow-gold/30 hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            Track session <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </section>
            ) : (
                <section className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-light to-gold-dark" />
                    <div className="w-12 h-12 rounded-2xl bg-gold/12 text-gold-dark dark:text-gold flex items-center justify-center shrink-0">
                        <Camera size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="font-heading text-[15px] font-bold text-neutral-900 dark:text-white">No active photoshoot on record</p>
                        <p className="text-xs text-neutral-500 font-body">Celebrate your milestone — book a studio or campus pictorial in under a minute.</p>
                    </div>
                    <Link to="/dashboard/book" className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-neutral-900 dark:bg-gold text-white dark:text-[#1a1408] text-xs font-extrabold hover:opacity-90 transition-all">
                        Book pictorial <ArrowUpRight size={13} />
                    </Link>
                </section>
            )}

            {/* ═══════════ 3. MAIN EDITOR GRID ═══════════ */}
            <div className="grid w-full lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)] gap-5 xl:gap-6 items-start">
                {/* ── left rail ── */}
                <aside className="space-y-4 lg:sticky lg:top-4">
                    {/* navigator */}
                    <div className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 shadow-sm p-3 overflow-hidden">
                        <p className="px-3 pt-2 pb-1 text-xs font-extrabold uppercase tracking-[0.2em] text-neutral-400">Edit sections</p>
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.id;
                            const doneHint =
                                tab.id === 'personal' ? (!!formData.firstName && !!formData.phone) :
                                    tab.id === 'academic' ? (!!studioSpecs.university && !!studioSpecs.section) :
                                        tab.id === 'delivery' ? (studioSpecs.preferred_courier === 'studio_pickup' || !!studioSpecs.shipping_address) :
                                            true;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all cursor-pointer ${isActive
                                        ? 'bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/30 shadow-sm'
                                        : 'border border-transparent hover:bg-neutral-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] shadow-md shadow-gold/30' : 'bg-neutral-100 dark:bg-white/8 text-neutral-500'}`}>
                                        <tab.icon size={17} />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className={`block text-[13px] font-extrabold ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>{tab.label}</span>
                                        <span className="block text-[11px] text-neutral-400 truncate">{tab.desc}</span>
                                    </span>
                                    {doneHint
                                        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        : <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0 mr-1" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* account card */}
                    <div className="rounded-[24px] overflow-hidden border border-white/10 bg-[#0e0f16] p-5 relative">
                        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gold/20 blur-[70px] rounded-full" />
                        <div className="relative">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={15} className="text-gold" />
                                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold">Account owner</p>
                            </div>
                            <p className="mt-2 text-[12px] leading-relaxed text-white/60 font-body">
                                This is your <strong className="text-white">master profile</strong>. Booking for someone else? Their details stay on that booking — your profile is never overwritten.
                            </p>
                            <button
                                type="button"
                                onClick={handleExportData}
                                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                <Download size={13} /> Export profile JSON
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── right editor ── */}
                <div className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)] overflow-hidden min-w-0">
                    {/* pill tab bar */}
                    <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-white/8 bg-gradient-to-b from-neutral-50/80 to-transparent dark:from-white/[0.03] dark:to-transparent">
                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/10 overflow-x-auto">
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${isActive
                                            ? 'bg-[#14141b] dark:bg-gradient-to-r dark:from-gold-light dark:to-gold text-white dark:text-[#1a1408] shadow-lg'
                                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="p-5 sm:p-8 space-y-8">
                        {/* ── TAB 1 ── */}
                        {activeTab === 'personal' && (
                            <div className="space-y-7 animate-fade-in">
                                <SectionHead step="01" title="Personal identity & contact" desc="Your legal identity as printed on the E-Kodak client pass and roster." icon={BadgeCheck} />

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <Field label="First name *">
                                        <input name="firstName" value={formData.firstName} onChange={handleFormChange} required placeholder="e.g. Maria" className={bareInputCls} />
                                    </Field>
                                    <Field label="Middle name">
                                        <input name="middleName" value={formData.middleName} onChange={handleFormChange} placeholder="Santos (optional)" className={bareInputCls} />
                                    </Field>
                                    <Field label="Last name *">
                                        <input name="lastName" value={formData.lastName} onChange={handleFormChange} required placeholder="e.g. Cruz" className={bareInputCls} />
                                    </Field>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Registered email" hint="Contact support to change your login email.">
                                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                        <input value={user?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
                                    </Field>
                                    <Field label="Primary mobile" hint="SMS reminders, call-time confirmations & dispatch alerts." icon={Phone}>
                                        <input name="phone" value={formData.phone} onChange={handleFormChange} placeholder="0917 123 4567" className={inputCls} />
                                    </Field>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <Field label="Permanent residential address" icon={MapPin}>
                                            <textarea name="address" rows={2} value={formData.address} onChange={handleFormChange} placeholder="House/Unit No., Street, Barangay, City/Municipality, Cebu, Postal Code…" className="w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#17181f] border border-neutral-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold/20 focus:border-gold/60 outline-none font-body text-sm resize-none text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all" />
                                        </Field>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field label="Yearbook motto / bio note" hint="Considered for commemorative proofing or batch yearbook prints." icon={Star}>
                                            <textarea name="bio" rows={2} value={formData.bio} onChange={handleFormChange} placeholder="e.g. 'Strive not to be a success, but rather to be of value.'" className="w-full pl-10 pr-3.5 py-3 bg-white dark:bg-[#17181f] border border-neutral-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold/20 focus:border-gold/60 outline-none font-body text-sm resize-none text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all" />
                                        </Field>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-dashed border-gold/40 bg-gold/[0.06] dark:bg-gold/[0.07] p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gold" />
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-dark dark:text-gold">Emergency contact on-call</p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <Field label="Contact person">
                                            <input value={studioSpecs.emergencyContactName} onChange={e => handleSpecChange('emergencyContactName', e.target.value)} placeholder="Guardian / next of kin" className={bareInputCls} />
                                        </Field>
                                        <Field label="Contact mobile">
                                            <input value={studioSpecs.emergencyContactPhone} onChange={e => handleSpecChange('emergencyContactPhone', e.target.value)} placeholder="0917 000 0000" className={bareInputCls} />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB 2 ── */}
                        {activeTab === 'academic' && (
                            <div className="space-y-7 animate-fade-in">
                                <SectionHead step="02" title="Academic milestones & records" desc="Your university, campus, student ID and section — synced from your booking database records." icon={GraduationCap} />

                                {!hasDbAcademic ? (
                                    <div className="rounded-3xl border border-dashed border-gold/40 bg-gold/[0.06] dark:bg-gold/[0.07] p-6 text-center space-y-3">
                                        <span className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center shadow-lg shadow-gold/30">
                                            <Database size={20} />
                                        </span>
                                        <h4 className="font-heading text-[15px] font-bold text-neutral-900 dark:text-white">No academic records in the database yet</h4>
                                        <p className="text-xs text-neutral-500 font-body max-w-md mx-auto leading-relaxed">
                                            Your university, campus branch, student ID and class section are read automatically from your booking records.
                                            Book a pictorial session and they will appear here — nothing to type by hand.
                                        </p>
                                        <Link to="/dashboard/book" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-neutral-900 dark:bg-gold text-white dark:text-[#1a1408] text-xs font-extrabold hover:opacity-90 transition-all">
                                            Book a session <ArrowUpRight size={13} />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/25 px-4 py-3 flex items-center gap-2.5 text-xs font-body text-emerald-700 dark:text-emerald-300">
                                        <Database size={15} className="shrink-0" />
                                        <span><strong>{dbAcademicRecords.length} record{dbAcademicRecords.length === 1 ? '' : 's'}</strong> found in your booking database — pick the values below. Each option shows its source booking.</span>
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>University / school · from database</label>
                                        <StudioDropdown
                                            value={studioSpecs.university}
                                            onChange={val => handleSpecChange('university', val)}
                                            options={universityOptions}
                                            searchable
                                            placeholder={hasDbAcademic ? 'Select university from your bookings' : 'No university on record yet'}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Campus / branch · from database</label>
                                        <StudioDropdown
                                            value={studioSpecs.campus}
                                            onChange={val => handleSpecChange('campus', val)}
                                            options={campusOptions}
                                            searchable
                                            placeholder={hasDbAcademic ? 'Select campus branch from your bookings' : 'No campus on record yet'}
                                        />
                                    </div>
                                    <Field label="Degree / strand">
                                        <input value={studioSpecs.degree} onChange={e => handleSpecChange('degree', e.target.value)} placeholder="e.g. BS in Information Technology, STEM 12…" className={bareInputCls} />
                                    </Field>
                                    <div>
                                        <label className={labelCls}>Batch year & honors</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <StudioDropdown value={studioSpecs.gradYear} onChange={val => handleSpecChange('gradYear', val)} options={GRAD_YEAR_OPTIONS} />
                                            <StudioDropdown value={studioSpecs.honors} onChange={val => handleSpecChange('honors', val)} options={HONORS_OPTIONS} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Student ID · from database</label>
                                        <StudioDropdown
                                            value={studioSpecs.studentId}
                                            onChange={val => handleSpecChange('studentId', val)}
                                            options={studentIdOptions}
                                            searchable
                                            placeholder={hasDbAcademic ? 'Select student ID from your bookings' : 'No student ID on record yet'}
                                        />
                                        <span className={hintCls}>Essential for campus batch sorting & proof release.</span>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Class section / block · from database</label>
                                        <StudioDropdown
                                            value={studioSpecs.section}
                                            onChange={val => handleSpecChange('section', val)}
                                            options={sectionOptions}
                                            searchable
                                            placeholder={hasDbAcademic ? 'Select section from your bookings' : 'No section on record yet'}
                                        />
                                        <span className={hintCls}>Aligns your slot with your class batch roster.</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB 3 ── */}
                        {activeTab === 'delivery' && (
                            <div className="space-y-7 animate-fade-in">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <SectionHead step="03" title="Print delivery destination" desc="Where the studio dispatches frames, prints and parcels." icon={Truck} />
                                    <button
                                        type="button"
                                        onClick={handleCopyResidentialAddress}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gold/40 text-gold-dark dark:text-gold hover:bg-gold/10 text-xs font-extrabold transition-all cursor-pointer"
                                    >
                                        <MapPin size={13} /> Copy home address
                                    </button>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        { id: 'studio_pickup', title: 'Studio pickup', desc: 'Claim framed portraits & prints at the Cebu front desk. No delivery fee.', icon: Building, tag: 'Free' },
                                        { id: 'studio_delivery', title: 'Direct delivery', desc: 'Studio dispatch delivers to your home or campus address.', icon: Truck, tag: 'Tracked' },
                                    ].map(opt => {
                                        const active = studioSpecs.preferred_courier === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleSpecChange('preferred_courier', opt.id)}
                                                className={`text-left p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group ${active
                                                    ? 'border-gold bg-gradient-to-br from-gold/15 to-amber-500/5 shadow-lg shadow-gold/20'
                                                    : 'border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] hover:border-gold/40'
                                                    }`}
                                            >
                                                {active && <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center shadow"><Check size={13} strokeWidth={3} /></span>}
                                                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${active ? 'bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] shadow-md shadow-gold/30' : 'bg-neutral-200 dark:bg-white/10 text-neutral-500'}`}>
                                                    <opt.icon size={19} />
                                                </span>
                                                <span className="mt-3 flex items-center gap-2">
                                                    <span className="font-heading text-[14px] font-bold text-neutral-900 dark:text-white">{opt.title}</span>
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-gold-dark dark:text-gold bg-gold/12 px-2 py-0.5 rounded-full">{opt.tag}</span>
                                                </span>
                                                <span className="mt-1 block text-[12px] text-neutral-500 leading-relaxed font-body">{opt.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Recipient name">
                                        <input value={studioSpecs.courier_recipient_name} onChange={e => handleSpecChange('courier_recipient_name', e.target.value)} placeholder={fullName} className={bareInputCls} />
                                    </Field>
                                    <Field label="Courier mobile">
                                        <input value={studioSpecs.courier_phone} onChange={e => handleSpecChange('courier_phone', e.target.value)} placeholder={formData.phone || '0917 000 0000'} className={bareInputCls} />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Complete shipping address">
                                            <textarea rows={2} value={studioSpecs.shipping_address} onChange={e => handleSpecChange('shipping_address', e.target.value)} placeholder="Unit / House No., Street, Barangay, City, Province, Postal Code…" className="w-full px-4 py-3 bg-white dark:bg-[#17181f] border border-neutral-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-gold/20 focus:border-gold/60 outline-none font-body text-sm resize-none text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all" />
                                        </Field>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field label="Landmark & gate instructions">
                                            <input value={studioSpecs.delivery_instructions} onChange={e => handleSpecChange('delivery_instructions', e.target.value)} placeholder="e.g. Near Barangay Hall, Gate 2, call upon arrival…" className={bareInputCls} />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB 4 ── */}
                        {activeTab === 'security' && (
                            <div className="space-y-7 animate-fade-in">
                                <SectionHead step="04" title="Policies & account security" desc="Model release consent, password recovery and data export." icon={Lock} />

                                <div className={`rounded-3xl border-2 p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${studioSpecs.agreedModelRelease ? 'border-gold/50 bg-gradient-to-br from-gold/12 to-transparent' : 'border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03]'}`}>
                                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${studioSpecs.agreedModelRelease ? 'bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] shadow-lg shadow-gold/30' : 'bg-neutral-200 dark:bg-white/10 text-neutral-500'}`}>
                                        <ImageIcon size={20} />
                                    </span>
                                    <div className="flex-1">
                                        <h3 className="font-heading text-[14px] font-bold text-neutral-900 dark:text-white">Model release & lookbook consent</h3>
                                        <p className="text-[12px] text-neutral-500 font-body mt-0.5 leading-relaxed">
                                            {studioSpecs.agreedModelRelease
                                                ? 'Consented — your portrait may appear in the studio lookbook & showcase.'
                                                : 'Confidential — photos stay in your private proofing vault only.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleSpecChange('agreedModelRelease', !studioSpecs.agreedModelRelease)}
                                        className={`relative w-16 h-9 rounded-full transition-all shrink-0 cursor-pointer ${studioSpecs.agreedModelRelease ? 'bg-gradient-to-r from-gold-light to-gold-dark shadow-md shadow-gold/30' : 'bg-neutral-300 dark:bg-white/15'}`}
                                        aria-pressed={studioSpecs.agreedModelRelease}
                                    >
                                        <span className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md transition-all ${studioSpecs.agreedModelRelease ? 'left-8' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="rounded-3xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-100 dark:divide-white/8 overflow-hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-5">
                                        <div>
                                            <h3 className="font-heading text-[13px] font-bold text-neutral-900 dark:text-white">Password reset & recovery</h3>
                                            <p className="text-[11px] text-neutral-500 font-body">Reset link goes to <span className="font-semibold text-neutral-700 dark:text-neutral-200">{user?.email}</span></p>
                                        </div>
                                        <button type="button" onClick={handlePasswordReset} className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/15 text-xs font-extrabold hover:border-gold hover:text-gold-dark dark:hover:text-gold transition-all shrink-0 cursor-pointer">
                                            Reset password
                                        </button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-5 bg-neutral-50/60 dark:bg-white/[0.02]">
                                        <div>
                                            <h3 className="font-heading text-[13px] font-bold text-neutral-900 dark:text-white">Export records (JSON)</h3>
                                            <p className="text-[11px] text-neutral-500 font-body">Archive of measurements, contacts & academic specs.</p>
                                        </div>
                                        <button type="button" onClick={handleExportData} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-white/15 text-xs font-extrabold hover:border-gold hover:text-gold-dark dark:hover:text-gold transition-all shrink-0 cursor-pointer">
                                            <Download size={13} /> Export JSON
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── action bar ── */}
                        <div className="pt-5 border-t border-neutral-100 dark:border-white/8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <p className="text-[11px] text-neutral-400 font-body flex items-center gap-1.5">
                                <CheckCircle size={13} className="text-emerald-500" /> Syncs to your official client pass & session roster
                            </p>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="sm:ml-auto inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-2xl bg-gradient-to-r from-neutral-900 via-[#23232c] to-neutral-900 dark:from-gold-light dark:via-gold dark:to-gold-dark text-white dark:text-[#1a1408] text-sm font-extrabold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Saving specifications…' : 'Save profile changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── MODAL: CHANGE PHOTO ── */}
            {photoModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-md animate-fade-in" onClick={() => !isUploading && setPhotoModalOpen(false)}>
                    <div className="bg-white dark:bg-[#14151c] rounded-[28px] p-6 sm:p-8 max-w-md w-full border border-neutral-200 dark:border-white/10 shadow-2xl space-y-5 animate-slide-up relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute -top-20 -right-20 w-56 h-56 bg-gold/20 blur-[70px] rounded-full" />
                        <div className="relative flex items-center justify-between">
                            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center"><Camera size={16} /></span>
                                Update portrait
                            </h3>
                            <button onClick={() => setPhotoModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="relative mx-auto w-32 h-32 rounded-[28px] p-[3px] bg-gradient-to-br from-gold-light via-gold to-gold-dark shadow-xl">
                            <div className="w-full h-full rounded-[25px] bg-neutral-100 dark:bg-white/5 flex items-center justify-center overflow-hidden font-heading text-3xl font-bold text-gold">
                                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Preview" className="w-full h-full object-cover" /> : initials}
                            </div>
                        </div>
                        <p className="relative text-xs text-neutral-500 font-body text-center leading-relaxed">
                            Upload a clear portrait for your official E-Kodak client pass.<br />JPG or PNG · max 5 MB.
                        </p>
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isUploading}
                            className="relative w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-neutral-900 to-[#2a2a33] dark:from-gold-light dark:to-gold-dark text-white dark:text-[#1a1408] text-sm font-extrabold shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                        >
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                            {isUploading ? 'Uploading image…' : 'Select image from device'}
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                </div>
            )}
        </div>
    );
}
