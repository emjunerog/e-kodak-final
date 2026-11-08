import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, CreditCard, Building, Store, Mail, Phone,
  User, Users, GraduationCap, QrCode, Maximize2, Loader2, AlertCircle, XCircle,
  Printer, FileText, PenLine, Check, X, Quote, Truck, Download
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { generateMasterlistPDFTemplate } from '../../services/masterlistTemplateService';
import { BookingDetailsSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';
import {
  getBookingById,
  getCustomerBookings,
  getCachedCustomerBookings,
  cancelBooking,
  parseStudentDetailsFromNotes,
  parseParticipantDetailsFromNotes,
  parseDeliveryDetailsFromNotes,
  updateBookingYearbookMotto,
  updateBookingDeliveryDetails,
  updateBookingAcademicDetails
} from '../../services/bookingService';
import {
  DEFAULT_REGION,
  DEFAULT_PROVINCE,
  DEFAULT_CITY,
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,
  composeDeliveryAddress,
  parseStructuredAddress,
} from '../../data/philippineLocations';
import { QRCodeSVG } from '../../lib/qr.tsx';
import QRPass from '../../components/booking/QRPass';
import Toast from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StudioDropdown from '../../components/ui/StudioDropdown';
import CredentialsDossierSheet from '../../components/booking/CredentialsDossierSheet';

// Extract clean studio venue name and Google Maps link
function getCleanLocation(locStr) {
  if (!locStr) {
    return {
      name: 'E-Kodak Studio, City of Naga, Cebu',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=311+Rizal+Street,+City+of+Naga,+Cebu',
    };
  }
  const match = locStr.match(/(https?:\/\/[^\s,]+)/i);
  const mapUrl = match ? match[1] : `https://maps.google.com/?q=${encodeURIComponent(locStr)}`;
  const cleanName = locStr
    .replace(/(https?:\/\/[^\s,]+)/gi, '')
    .trim()
    .replace(/,\s*$/, '')
    .trim() || 'E-Kodak Studio, City of Naga, Cebu';

  return { name: cleanName, mapUrl };
}

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const outletContext = useOutletContext();

  const initialBookings = useMemo(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      return outletContext.bookings.filter((b) => !b.is_deleted);
    }
    const cached = getCachedCustomerBookings(user?.id);
    if (cached && Array.isArray(cached)) {
      return cached.filter((b) => !b.is_deleted);
    }
    return [];
  }, [outletContext?.bookings, user?.id]);

  const initialTargetBooking = useMemo(() => {
    if (initialBookings.length === 0) return null;
    if (id) {
      return initialBookings.find(b => String(b.id) === String(id) || String(b.booking_number) === String(id)) || null;
    }
    return initialBookings.find(b => b.status !== 'CANCELLED') || initialBookings[0] || null;
  }, [initialBookings, id]);

  const [booking, setBooking] = useState(initialTargetBooking);
  const [allUserBookings, setAllUserBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(!initialTargetBooking);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isDossierPreviewOpen, setIsDossierPreviewOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState('credentials');
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoInput, setMottoInput] = useState('');
  const [savingMotto, setSavingMotto] = useState(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [academicForm, setAcademicForm] = useState({
    school: '',
    school_address: '',
    course: '',
    section: '',
    batch: '',
    student_id: '',
    yearbook_motto: '',
  });
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [deliveryForm, setDeliveryForm] = useState({
    fulfillment_mode: 'STUDIO_DELIVERY',
    recipient_name: '',
    recipient_phone: '',
    region: DEFAULT_REGION,
    province: DEFAULT_PROVINCE,
    city: DEFAULT_CITY,
    barangay: '',
    street: '',
    delivery_address: '',
    delivery_instructions: '',
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setError('');
    try {
      if (id) {
        const { data, error: bErr } = await getBookingById(id);
        if (bErr) setError(bErr.message || 'Error loading booking');
        else if (data) setBooking(data);

        const bRes = await getCustomerBookings(user.id);
        if (bRes?.data) setAllUserBookings(bRes.data.filter(b => !b.is_deleted));
      } else {
        const { data, error: bErr } = await getCustomerBookings(user.id);
        if (bErr) {
          setError(bErr.message || 'Error loading bookings');
          return;
        }
        const activeList = (data || []).filter(b => !b.is_deleted);
        setAllUserBookings(activeList);

        if (activeList.length === 0) {
          setBooking(null);
          return;
        }

        const target = activeList.find(b => b.status !== 'CANCELLED') || activeList[0];
        const { data: fullData, error: fErr } = await getBookingById(target.id);
        if (fErr) setError(fErr.message || 'Error loading booking');
        else if (fullData) setBooking(fullData);
      }
    } catch (err) {
      console.warn('BookingDetailsPage loadData error:', err);
      setError(err?.message || 'Network error fetching booking');
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    if (!user?.id) return;
    if (initialTargetBooking) {
      setBooking(initialTargetBooking);
      setLoading(false);
    }
    loadData();
  }, [user?.id, id, loadData]);

  // Structured Student Dossier parsing
  const studentDossier = useMemo(() => {
    if (!booking) return null;
    const existing = booking.student_details || {};
    const parsed = parseStudentDetailsFromNotes(booking.notes) || {};

    const nameMatch = booking.notes?.match(/•\s*Student\s*Name:\s*([^\n\r]+)/i);
    const middleMatch = booking.notes?.match(/•\s*Middle\s*Name:\s*([^\n\r]+)/i);
    const mottoMatch = booking.notes?.match(/•\s*(?:Yearbook\s*)?Motto:\s*([^\n\r]+)/i);
    const typeMatch = booking.notes?.match(/•\s*Type:\s*([^\n\r]+)/i);
    const strandMatch = booking.notes?.match(/•\s*(?:Track|Degree|Program|Strand|Course)(?:\s*(?:\/|\&)\s*(?:Track|Degree|Program|Strand|Course))*:\s*([^\n\r]+)/i);
    const campusMatch = booking.notes?.match(/•\s*(?:Campus(?:\s*(?:\/|&)\s*(?:Address|Branch))?|School\s*Address):\s*([^\n\r]+)/i);
    const batchMatch = booking.notes?.match(/•\s*(?:Batch|Graduation\s*Year|Graduating\s*Batch):\s*([^\n\r]+)/i);
    const schoolMatch = booking.notes?.match(/•\s*(?:School|University|College|Institution):\s*([^\n\r]+)/i);
    const sectionMatch = booking.notes?.match(/•\s*Section(?:\s*(?:\/|&)\s*Batch)?:\s*([^\n\r]+)/i);
    const idMatch = booking.notes?.match(/•\s*Student\s*ID(?:\s*Number)?:\s*([^\n\r]+)/i);

    const specs = profile?.studio_specs || {};
    const isSelfBooking = booking.booking_for === 'myself' || (!booking.booking_for && (!booking.notes || !/•\s*Booking\s*For:\s*Someone\s*Else/i.test(booking.notes)));

    const student_name = booking.participant_name || existing.student_name || parsed.student_name || nameMatch?.[1]?.trim() || (isSelfBooking ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() : '');
    const middle_name = existing.middle_name || parsed.middle_name || middleMatch?.[1]?.trim() || (isSelfBooking ? profile?.middle_name : '') || '';
    const yearbook_motto = booking.yearbook_motto || existing.yearbook_motto || parsed.yearbook_motto || mottoMatch?.[1]?.trim() || '';
    const rawSchool = booking.school || existing.school || parsed.school || schoolMatch?.[1]?.trim() || (isSelfBooking ? (specs.university || specs.school) : '') || '';
    const batch = booking.batch || existing.batch || parsed.batch || batchMatch?.[1]?.trim() || (isSelfBooking ? specs.gradYear : '') || '';
    const section = booking.section || existing.section || parsed.section || sectionMatch?.[1]?.trim() || (isSelfBooking ? specs.section : '') || '';
    const student_id = booking.student_id || existing.student_id || parsed.student_id || idMatch?.[1]?.trim() || (isSelfBooking ? specs.student_id : '') || '';
    const course = booking.track || existing.course || parsed.course || strandMatch?.[1]?.trim() || (isSelfBooking ? (specs.degree || specs.strand) : '') || '';
    const school_address = booking.school_address || existing.school_address || parsed.school_address || campusMatch?.[1]?.trim() || (isSelfBooking ? specs.campus : '') || '';
    const education_type = existing.education_type || parsed.education_type || typeMatch?.[1]?.trim() || '';

    const cleanSchool = rawSchool && rawSchool !== 'N/A' ? rawSchool : '';

    return {
      student_name,
      middle_name,
      yearbook_motto: yearbook_motto === 'N/A' ? '' : yearbook_motto,
      school: cleanSchool,
      batch: batch === 'N/A' ? '' : batch,
      section: section === 'N/A' ? '' : section,
      student_id: student_id === 'N/A' ? '' : student_id,
      course: course === 'N/A' ? '' : course,
      school_address: school_address === 'N/A' ? '' : school_address,
      education_type: education_type === 'N/A' ? '' : education_type,
    };
  }, [booking, profile]);

  // Delivery & Claiming details resolved from booking notes or profile studio_specs
  const deliveryDetails = useMemo(() => {
    const parsedFromBooking = booking?.delivery_details || parseDeliveryDetailsFromNotes(booking?.notes);
    const specs = profile?.studio_specs || {};
    const hasBookingDelivery = Boolean(parsedFromBooking);
    const hasProfileDelivery = Boolean(
      specs.shipping_address &&
      !specs.shipping_address.startsWith('Studio Pickup') &&
      !specs.shipping_address.startsWith('Studio Counter')
    );

    // Default fulfillment mode is Home Delivery ('STUDIO_DELIVERY') unless Studio Pick-up is explicitly selected
    const mode = parsedFromBooking?.fulfillment_mode
      || (specs.fulfillment_mode === 'STUDIO_PICKUP' || specs.preferred_courier === 'studio_pickup'
        ? 'STUDIO_PICKUP'
        : 'STUDIO_DELIVERY');

    const recipient_name = parsedFromBooking?.recipient_name
      || specs.courier_recipient_name
      || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      || '';
    const recipient_phone = parsedFromBooking?.recipient_phone
      || specs.courier_phone
      || profile?.phone
      || '';
    const delivery_address = parsedFromBooking?.delivery_address
      || (mode === 'STUDIO_DELIVERY' ? (specs.shipping_address || profile?.address || '') : '');
    const delivery_instructions = parsedFromBooking?.delivery_instructions
      || specs.delivery_instructions
      || '';

    const structured = parseStructuredAddress(delivery_address, {
      region: parsedFromBooking?.region || specs.delivery_region || '',
      province: parsedFromBooking?.province || specs.delivery_province || '',
      city: parsedFromBooking?.city || specs.delivery_city || '',
      barangay: parsedFromBooking?.barangay || specs.delivery_barangay || '',
      street: parsedFromBooking?.street || specs.delivery_street || '',
    });

    const saved_at = parsedFromBooking?.saved_at || specs.delivery_saved_at || '';
    const isConfigured = hasBookingDelivery || hasProfileDelivery || Boolean(specs.fulfillment_mode);

    return {
      fulfillment_mode: mode,
      recipient_name,
      recipient_phone,
      region: structured.region,
      province: structured.province,
      city: structured.city,
      barangay: structured.barangay,
      street: structured.street,
      delivery_address,
      delivery_instructions,
      saved_at,
      isConfigured,
    };
  }, [booking, profile]);

  // 3-minute grace window after saving address/selection to allow switching to Studio Pick-up
  const canSwitchFulfillment = useMemo(() => {
    if (!deliveryDetails.saved_at) return true;
    const savedTime = new Date(deliveryDetails.saved_at).getTime();
    if (Number.isNaN(savedTime)) return true;
    return nowTick - savedTime < 3 * 60 * 1000;
  }, [deliveryDetails.saved_at, nowTick]);

  useEffect(() => {
    if (!deliveryDetails.saved_at) return;
    const savedTime = new Date(deliveryDetails.saved_at).getTime();
    if (Number.isNaN(savedTime) || Date.now() - savedTime >= 3 * 60 * 1000) return;

    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [deliveryDetails.saved_at]);

  // Studio Fulfillment Mode from resolved deliveryDetails
  const fulfillmentMode = deliveryDetails.fulfillment_mode;

  // Financial breakdown & downpayment state
  const financialInfo = useMemo(() => {
    if (!booking) return { totalAmount: 1750, downPaid: 875, remBalance: 875, needsDownpayment: false };
    const totalAmount = Number(booking.total_amount || 1750);
    const downPaid = Number(booking.down_payment_amount || (totalAmount > 0 ? totalAmount * 0.5 : 875));
    const remBalance = booking.remaining_balance !== undefined && booking.remaining_balance !== null
      ? Number(booking.remaining_balance)
      : Math.max(0, totalAmount - downPaid);
    const isUnpaid = !booking.payment_status || (booking.payment_status || '').toUpperCase() === 'UNPAID';
    const needsDownpayment = (isUnpaid || remBalance > 0) && (!booking.down_payment_confirmed && downPaid === 0);
    return { totalAmount, downPaid, remBalance, needsDownpayment };
  }, [booking]);

  // Participant & Beneficiary details
  const participantDetails = useMemo(() => {
    if (!booking) return null;
    const fromBooking = booking.participant_details || parseParticipantDetailsFromNotes(booking.notes) || {};
    return {
      booking_for: booking.booking_for || fromBooking.booking_for || (booking.notes?.includes('• Booking For: Someone Else') ? 'someone_else' : 'myself'),
      full_name: booking.participant_name || fromBooking.full_name || '',
      phone: booking.participant_phone || fromBooking.phone || '',
      email: booking.participant_email || fromBooking.email || '',
      relationship: booking.participant_relationship || fromBooking.relationship || '',
      ...fromBooking
    };
  }, [booking]);

  // Synchronize motto input with student dossier when not editing
  useEffect(() => {
    if (!isEditingMotto && studentDossier?.yearbook_motto) {
      setMottoInput(studentDossier.yearbook_motto === 'N/A' ? '' : studentDossier.yearbook_motto);
    }
  }, [studentDossier?.yearbook_motto, isEditingMotto]);

  // Synchronize delivery form when not editing
  useEffect(() => {
    if (!isEditingDelivery && deliveryDetails) {
      const region = deliveryDetails.region || DEFAULT_REGION;
      const province = deliveryDetails.province || DEFAULT_PROVINCE;
      const city = deliveryDetails.city || DEFAULT_CITY;
      const barangay = deliveryDetails.barangay || '';
      const street = deliveryDetails.street || '';
      const rawAddr =
        deliveryDetails.delivery_address && !deliveryDetails.delivery_address.startsWith('Studio Counter')
          ? deliveryDetails.delivery_address
          : '';
      const composed = composeDeliveryAddress({ street, barangay, city, province, region });

      setDeliveryForm({
        fulfillment_mode: deliveryDetails.fulfillment_mode || 'STUDIO_DELIVERY',
        recipient_name: deliveryDetails.recipient_name || '',
        recipient_phone: deliveryDetails.recipient_phone || '',
        region,
        province,
        city,
        barangay,
        street,
        delivery_address: rawAddr || composed,
        delivery_instructions: deliveryDetails.delivery_instructions || '',
      });
    }
  }, [deliveryDetails, isEditingDelivery]);

  if (loading && !booking) {
    return (
      <SmartLoadingContainer
        loading={loading}
        hasData={false}
        error={error}
        onRetry={loadData}
        skeleton={<BookingDetailsSkeleton />}
        delayMs={220}
        title="Booking Details"
      />
    );
  }

  if (!booking) {
    if (error) {
      return (
        <SmartLoadingContainer
          loading={loading}
          hasData={false}
          error={error}
          onRetry={loadData}
          skeleton={<BookingDetailsSkeleton />}
          title="Booking Details"
        />
      );
    }

    if (allUserBookings.length === 0) {
      return (
        <div className="h-full min-h-[55vh] flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
            <GraduationCap size={32} />
          </div>
          <h2 className="font-heading text-2xl text-neutral-900 dark:text-white font-bold mb-2">No Active Booking Records</h2>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            You don't have an active studio booking yet. Reserve your graduation portrait session today to get your pictorial schedule and gate pass!
          </p>
          <Link
            to="/dashboard/book"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Book a Session Now
          </Link>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="font-heading text-2xl text-neutral-900 dark:text-white font-bold mb-2">Booking Record Not Found</h2>
        <p className="text-xs text-neutral-500 mb-6">{error || "The requested booking record could not be loaded."}</p>
        <Link to="/dashboard" className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (booking.is_deleted) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 mb-3">
          Order Removed / Cancelled
        </div>
        <h1 className="text-2xl font-heading text-neutral-900 dark:text-white font-bold mb-2">
          Order #{booking.booking_number || 'N/A'} Has Been Removed
        </h1>
        <p className="font-body text-neutral-600 dark:text-neutral-300 text-sm mb-6 leading-relaxed">
          This booking order has been cancelled and removed from active studio records.
        </p>
        <Link to="/dashboard" className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Detect dynamic customer fields
  const effectiveBookingNumber = booking.booking_number || 'BK-2026-00002';
  const status = (booking.status || 'CONFIRMED').toUpperCase();

  // Status badge display label (pure calculation, no hooks after early returns)
  let statusDisplay = 'APPROVED & RESERVED';
  if (status === 'CONFIRMED' || status === 'PHOTOGRAPHER_ASSIGNED') {
    statusDisplay = 'APPROVED & RESERVED';
  } else if (status === 'READY' || status === 'COMPLETED') {
    statusDisplay = 'COMPLETED & READY';
  } else if (status === 'IN_PROGRESS' || status === 'CAPTURE' || status === 'EDITING') {
    statusDisplay = 'IN PRODUCTION';
  } else if (status === 'CANCELLED') {
    statusDisplay = 'CANCELLED';
  }

  // Package & Tier
  const tierName = (booking.tier_name || 'SET A').toUpperCase();
  // Ensure eyebrow represents the studio discipline/portfolio (e.g. "GRADUATION STUDIO PORTFOLIO · SET A")
  // and avoids redundant repetition when service name is identical to headline
  const rawCategory = booking.service?.category || '';
  const portfolioDiscipline = rawCategory && rawCategory.toLowerCase() !== 'graduation'
    ? `${rawCategory.toUpperCase()} STUDIO PORTFOLIO`
    : 'GRADUATION STUDIO PORTFOLIO';
  const packageEyebrow = `${portfolioDiscipline} · ${tierName}`;
  const headline = booking.service?.name || booking.service?.title || booking.service_title || 'Graduation Portrait Session';

  // Account Owner resolution (the authenticated user / customer who holds the booking)
  const accountOwnerFullName = (
    booking.customer
      ? `${booking.customer.first_name || ''} ${booking.customer.last_name || ''}`.trim()
      : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  ) || user?.email?.split('@')[0] || 'Account Owner';

  const accountOwnerEmail = booking.customer?.email || profile?.email || user?.email || '';
  const accountOwnerPhone = booking.customer?.phone || profile?.phone || '';

  // Participant & Relationship resolution (supports School Section under Class Adviser's name)
  const isSchoolSectionRecord =
    booking.booking_for === 'school_section' ||
    participantDetails?.booking_for === 'school_section' ||
    Boolean(booking.student_details?.adviser_name || booking.student_details?.masterlist_students?.length);
  const isSomeoneElse = participantDetails?.booking_for === 'someone_else';

  const adviserFullName =
    booking.student_details?.adviser_name ||
    participantDetails?.full_name ||
    booking.participant_name ||
    '';

  const participantFullName = (
    (isSchoolSectionRecord ? adviserFullName : '') ||
    participantDetails?.full_name ||
    studentDossier?.student_name ||
    (!isSomeoneElse ? accountOwnerFullName : '')
  );

  const displayPrimaryName = isSchoolSectionRecord
    ? (adviserFullName || accountOwnerFullName || 'Class Adviser')
    : isSomeoneElse
    ? (participantFullName || 'Participant')
    : accountOwnerFullName;

  const displayPrimarySubtitle = isSchoolSectionRecord
    ? `Class Adviser · ${booking.student_details?.masterlist_students?.length || 0} Enrolled Students`
    : isSomeoneElse
    ? `Photoshoot participant · Booked by ${accountOwnerFullName}`
    : 'Primary contact & session participant';

  const displayEyebrow = isSchoolSectionRecord
    ? 'Class Adviser · School Section'
    : isSomeoneElse
    ? 'Participant / Graduate'
    : 'Customer & Participant';

  const relationshipText = isSchoolSectionRecord
    ? 'Class Adviser (School Section)'
    : isSomeoneElse
    ? (participantDetails?.relationship || 'Booking for someone else')
    : 'Self / account owner';

  // Customer Profile Information variables for compatibility with downstream components
  const customerFullName = displayPrimaryName;
  const nameParts = customerFullName.split(' ').filter(Boolean);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = `${firstName[0] || 'C'}${lastName[0] || ''}`.toUpperCase();

  const customerEmail = isSchoolSectionRecord
    ? (booking.student_details?.adviser_email || participantDetails?.email || accountOwnerEmail || 'Not provided')
    : isSomeoneElse
    ? (participantDetails?.email || accountOwnerEmail || 'Not provided')
    : (accountOwnerEmail || 'Not provided');

  const customerPhone = isSchoolSectionRecord
    ? (booking.student_details?.adviser_phone || participantDetails?.phone || accountOwnerPhone || 'Not provided')
    : isSomeoneElse
    ? (participantDetails?.phone || accountOwnerPhone || 'Not provided')
    : (accountOwnerPhone || 'Not provided');

  // Customer Portrait Photo (Priority: booking.customer profile > user auth profile > null)
  const customerPhotoUrl =
    booking.customer?.avatar_url ||
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    booking.customer_photo_url ||
    booking.reference_image_url ||
    null;

  // Academic Profile Information
  const rawSchool = studentDossier?.school || booking.student_details?.school || '';
  const schoolName = rawSchool || 'School not specified';
  const rawBatch = studentDossier?.batch || booking.student_details?.batch || '';
  const gradYear = rawBatch ? rawBatch.replace(/^Batch\s*/i, '').trim() : '';
  const batchDisplay = gradYear ? `Batch ${gradYear}` : 'Graduation Session';
  const trackName = studentDossier?.course || booking.student_details?.course || booking.student_details?.strand || 'Not specified';
  const educationType = studentDossier?.education_type || booking.student_details?.education_type || (rawCategory ? `${rawCategory} Studio` : 'Academic Portrait');
  const cleanSection = (studentDossier?.section && studentDossier.section !== 'N/A')
    ? studentDossier.section
    : (booking.student_details?.section && booking.student_details.section !== 'N/A')
      ? booking.student_details.section
      : '';
  const sectionName = cleanSection || 'Not specified';

  const cleanStudentId = (studentDossier?.student_id && studentDossier.student_id !== 'N/A')
    ? studentDossier.student_id
    : (booking.student_details?.student_id && booking.student_details.student_id !== 'N/A')
      ? booking.student_details.student_id
      : '';
  const studentId = cleanStudentId || 'Not provided';

  const { name: cleanLocationName, mapUrl: googleMapsUrl } = getCleanLocation(booking.location);
  const schoolLocation = studentDossier?.school_address || (cleanLocationName !== 'E-Kodak Studio, City of Naga, Cebu' ? cleanLocationName : 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu');

  // Quick Info Bar Metrics
  const scheduleValue = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Awaiting confirmation';
  const scheduleSub = booking.event_date
    ? (booking.preferred_time?.substring(0, 5) ? `${booking.preferred_time.substring(0, 5)} Studio Slot` : 'Studio slot scheduled')
    : "We'll notify you once scheduled";

  const venueValue = cleanLocationName.replace(/^(?:School Campus|E-Kodak Studio):\s*/i, '').split(',').slice(0, 2).join(',').trim() || 'City of Naga, Cebu';
  const venueSub = 'Cebu · View location';

  const totalSub = financialInfo.downPaid > 0
    ? (financialInfo.remBalance === 0 ? 'Fully settled' : 'Downpayment received')
    : 'Pending payment';

  const claimingValue = fulfillmentMode === 'STUDIO_DELIVERY' ? 'Home Delivery' : 'Studio Pick-up';
  const claimingSub = fulfillmentMode === 'STUDIO_DELIVERY'
    ? (deliveryDetails.delivery_address || booking.delivery_address || `${deliveryDetails.city || DEFAULT_CITY}, ${deliveryDetails.province || DEFAULT_PROVINCE}`)
    : 'E-Kodak Studio Counter';

  const financialBadgeText = financialInfo.remBalance === 0
    ? 'PAID'
    : (financialInfo.downPaid > 0 ? 'DOWNPAYMENT' : 'UNPAID');

  const effectiveToken = booking.booking_token || booking.id || effectiveBookingNumber;
  const hasMotto = Boolean(studentDossier?.yearbook_motto && studentDossier.yearbook_motto !== 'N/A');

  const handleSaveMotto = async () => {
    if (!booking?.id) return;
    setSavingMotto(true);
    try {
      const cleanMotto = mottoInput.trim();
      const { updatedNotes, error: mErr } = await updateBookingYearbookMotto(
        booking.id,
        cleanMotto,
        booking.notes || '',
        user?.id
      );
      if (mErr) throw mErr;

      setBooking((prev) => ({
        ...prev,
        notes: updatedNotes || prev.notes,
        student_details: {
          ...(prev.student_details || {}),
          yearbook_motto: cleanMotto || 'N/A',
        },
      }));
      setIsEditingMotto(false);
      setToast({
        type: 'success',
        message: cleanMotto ? 'Yearbook motto saved successfully!' : 'Yearbook motto cleared.',
      });
    } catch (err) {
      console.error('Error saving motto:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to update yearbook motto.',
      });
    } finally {
      setSavingMotto(false);
    }
  };

  const handleSaveAcademicProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!booking?.id) return;
    setSavingAcademic(true);
    try {
      const payload = {
        ...academicForm,
        student_name: studentDossier?.student_name || '',
        education_type: studentDossier?.education_type || '',
      };
      const { updatedNotes, error: aErr } = await updateBookingAcademicDetails(
        booking.id,
        payload,
        booking.notes || '',
        user?.id
      );
      if (aErr) throw aErr;

      setBooking((prev) => ({
        ...prev,
        notes: updatedNotes || prev.notes,
        student_details: {
          ...(prev.student_details || {}),
          ...payload,
        },
      }));
      setIsEditingAcademic(false);
      setToast({
        type: 'success',
        message: 'Academic profile details updated successfully!',
      });
    } catch (err) {
      console.error('Error saving academic details:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to update academic profile.',
      });
    } finally {
      setSavingAcademic(false);
    }
  };

  const updateLocationField = (field, value) => {
    setDeliveryForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'region') {
        const provinces = getProvincesByRegion(value);
        next.province = provinces[0] || '';
        const cities = getCitiesByProvince(value, next.province);
        next.city = cities[0] || '';
        const brgys = getBarangaysByCity(value, next.province, next.city);
        next.barangay = brgys[0] || '';
      } else if (field === 'province') {
        const cities = getCitiesByProvince(prev.region, value);
        next.city = cities[0] || '';
        const brgys = getBarangaysByCity(prev.region, value, next.city);
        next.barangay = brgys[0] || '';
      } else if (field === 'city') {
        const brgys = getBarangaysByCity(prev.region, prev.province, value);
        next.barangay = brgys[0] || '';
      }

      next.delivery_address = composeDeliveryAddress({
        street: next.street,
        barangay: next.barangay,
        city: next.city,
        province: next.province,
        region: next.region,
      });
      return next;
    });
  };

  const handleSaveDelivery = async () => {
    if (!booking?.id) return;

    const finalComposedAddress =
      deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY'
        ? composeDeliveryAddress({
          street: deliveryForm.street,
          barangay: deliveryForm.barangay,
          city: deliveryForm.city,
          province: deliveryForm.province,
          region: deliveryForm.region,
        }) || deliveryForm.delivery_address.trim()
        : 'Studio Counter (311 Rizal Street, City of Naga, Cebu)';

    if (deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY' && (!deliveryForm.barangay && !deliveryForm.street.trim())) {
      setToast({
        type: 'error',
        message: 'Please select a Barangay or enter your Street / Purok for courier delivery.',
      });
      return;
    }

    setSavingDelivery(true);
    try {
      const savedAtIso = new Date().toISOString();
      const payloadToSave = {
        ...deliveryForm,
        delivery_address: finalComposedAddress,
        saved_at: savedAtIso,
      };

      const { updatedNotes, deliveryDetails: savedDelivery, error: dErr } = await updateBookingDeliveryDetails(
        booking.id,
        payloadToSave,
        booking.notes || '',
        user?.id
      );
      if (dErr) throw dErr;

      if (updateProfile) {
        const updatedSpecs = {
          ...(profile?.studio_specs || {}),
          fulfillment_mode: deliveryForm.fulfillment_mode,
          preferred_courier: deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY' ? 'studio_delivery' : 'studio_pickup',
          courier_recipient_name: deliveryForm.recipient_name.trim(),
          courier_phone: deliveryForm.recipient_phone.trim(),
          delivery_region: deliveryForm.region,
          delivery_province: deliveryForm.province,
          delivery_city: deliveryForm.city,
          delivery_barangay: deliveryForm.barangay,
          delivery_street: deliveryForm.street.trim(),
          delivery_saved_at: savedAtIso,
          shipping_address:
            deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY'
              ? finalComposedAddress
              : 'Studio Pickup (311 Rizal Street, City of Naga, Cebu)',
          delivery_instructions: deliveryForm.delivery_instructions.trim(),
        };
        await updateProfile({
          studio_specs: updatedSpecs,
          address:
            deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY'
              ? finalComposedAddress
              : profile?.address,
        });
      }

      setBooking((prev) => ({
        ...prev,
        notes: updatedNotes || prev.notes,
        delivery_details: savedDelivery || prev.delivery_details,
      }));
      setNowTick(Date.now());
      setIsEditingDelivery(false);
      setToast({
        type: 'success',
        message:
          deliveryForm.fulfillment_mode === 'STUDIO_DELIVERY'
            ? 'Delivery destination saved to database!'
            : 'Studio pickup preference saved to database!',
      });
    } catch (err) {
      console.error('Error saving delivery details:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to save delivery details.',
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSwitchFulfillmentMode = async (targetMode) => {
    if (!booking?.id) return;
    if (targetMode === 'STUDIO_DELIVERY') {
      setDeliveryForm((prev) => ({ ...prev, fulfillment_mode: 'STUDIO_DELIVERY' }));
      setIsEditingDelivery(true);
      return;
    }

    // Switching to Studio Pick-up immediately generates the Studio Pick-up Receipt & saves to DB
    setDeliveryForm((prev) => ({ ...prev, fulfillment_mode: 'STUDIO_PICKUP' }));
    setIsEditingDelivery(false);
    setSavingDelivery(true);
    try {
      const savedAtIso = new Date().toISOString();
      const payloadToSave = {
        ...deliveryForm,
        fulfillment_mode: 'STUDIO_PICKUP',
        recipient_name: deliveryForm.recipient_name || customerFullName,
        recipient_phone: deliveryForm.recipient_phone || (customerPhone !== 'Not provided' ? customerPhone : ''),
        delivery_address: 'Studio Counter (311 Rizal Street, City of Naga, Cebu)',
        saved_at: savedAtIso,
      };

      const { updatedNotes, deliveryDetails: savedDelivery, error: dErr } = await updateBookingDeliveryDetails(
        booking.id,
        payloadToSave,
        booking.notes || '',
        user?.id
      );
      if (dErr) throw dErr;

      if (updateProfile) {
        const updatedSpecs = {
          ...(profile?.studio_specs || {}),
          fulfillment_mode: 'STUDIO_PICKUP',
          preferred_courier: 'studio_pickup',
          courier_recipient_name: payloadToSave.recipient_name,
          courier_phone: payloadToSave.recipient_phone,
          delivery_saved_at: savedAtIso,
          shipping_address: 'Studio Pickup (311 Rizal Street, City of Naga, Cebu)',
        };
        await updateProfile({ studio_specs: updatedSpecs });
      }

      setBooking((prev) => ({
        ...prev,
        notes: updatedNotes || prev.notes,
        delivery_details: savedDelivery || prev.delivery_details,
      }));
      setNowTick(Date.now());
      setToast({
        type: 'success',
        message: 'Switched to Studio Pick-up. Your printable claiming receipt is ready!',
      });
    } catch (err) {
      console.error('Error switching to Studio Pick-up:', err);
      setToast({
        type: 'error',
        message: err.message || 'Could not switch to Studio Pick-up.',
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handlePrintCredentials = () => {
    setPrintDocType('credentials');
    setTimeout(() => window.print(), 40);
  };

  const handlePrintPickupReceipt = () => {
    setPrintDocType('pickup_receipt');
    setTimeout(() => window.print(), 40);
  };

  return (
    <div className="animate-fade-in w-full px-4 sm:px-6 lg:px-8 pt-4 pb-16 font-body">
      {/* Toast notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} loading={cancelling} />


      {/* ── Top Navigation & Order Switcher ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard Overview</span>
          </Link>

          {allUserBookings.length > 1 && (
            <div className="flex items-center gap-2 text-xs pl-3 border-l border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-400 font-normal">Active Order:</span>
              <select
                value={booking?.id || ''}
                onChange={(e) => navigate(`/dashboard/bookings/${e.target.value}`)}
                aria-label="Switch Booking Record"
                className="bg-white dark:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium text-xs rounded-xl px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                {allUserBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.booking_number || b.id.substring(0, 8)} · {b.package_title || b.service?.name || 'Studio Order'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Link
          to="/dashboard/progress"
          className="text-xs font-semibold text-amber-600 dark:text-amber-500 hover:underline inline-flex items-center gap-1"
        >
          <span>Production Progress</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* ── Composite Hero Section: Dark Banner + Overlapping Floating Quick Info Bar ── */}
      <div className="relative mb-10 sm:mb-12">
        {/* 1. Top Dark Hero Banner */}
        <section className="rounded-2xl sm:rounded-3xl lg:rounded-[28px] bg-[#111214] text-white border border-neutral-800/80 overflow-hidden relative shadow-md pt-8 pb-16 sm:pt-9 sm:pb-20 lg:pt-11 lg:pb-24 px-6 sm:px-10 lg:px-14 min-h-[250px] sm:min-h-[280px]">
          {/* Left Text Content */}
          <div className="max-w-2xl z-10 relative">
            {/* Eyebrow */}
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-amber-500 mb-2">
              {packageEyebrow}
            </p>

            {/* Main Headline */}
            <h1 className="font-heading font-medium text-4xl sm:text-5xl lg:text-[54px] text-white leading-[1.04] tracking-tight">
              Senior High
              <br />
              Packages and Sets
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-[13.5px] text-neutral-400 font-light mt-3 max-w-xl leading-relaxed">
              A complete overview of your booking, session details, and account record.
            </p>
          </div>

          {/* Right Hero Graduation Studio Portrait (Group of Students in Toga & Caps) */}
          <div className="absolute right-0 top-0 bottom-0 w-[54%] sm:w-[50%] md:w-[46%] lg:w-[44%] xl:w-[40%] h-full overflow-hidden pointer-events-none">
            <img
              src="/images/ekodak-graduation-students.jpg"
              alt="Graduation Studio Portrait of Students"
              className="w-full h-full object-cover object-[center_top]"
            />
            {/* Smooth horizontal gradient fade from black into the photo */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#111214] via-[#111214]/40 to-transparent" />
            {/* Soft vertical gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111214]/70 via-transparent to-transparent" />
          </div>
        </section>

        {/* 2. Floating Quick Info Bar (Overlaps the bottom edge of the banner by 50%) */}
        <section className="relative z-20 -mt-10 sm:-mt-12 lg:-mt-14 mx-3 sm:mx-6 lg:mx-8 bg-white dark:bg-[#1a1b1f] rounded-2xl sm:rounded-3xl border border-neutral-200/90 dark:border-neutral-800 py-4 sm:py-5 px-5 sm:px-7 lg:px-8 shadow-xl shadow-black/8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-4 divide-y sm:divide-y-0 lg:divide-x divide-neutral-200/80 dark:divide-neutral-800">
            {/* Column 1: Session Schedule */}
            <div className="flex items-start gap-3.5 sm:pr-4 pt-3 sm:pt-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#faf6ed] dark:bg-amber-950/30 text-[#b38a38] dark:text-amber-400 flex items-center justify-center shrink-0 border border-[#f0e6d0]/80 dark:border-amber-800/30">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                  Session Schedule
                </p>
                <p className="font-bold text-xs sm:text-[13px] text-neutral-900 dark:text-white mt-1 leading-snug truncate">
                  {scheduleValue}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {scheduleSub}
                </p>
              </div>
            </div>

            {/* Column 2: Studio Venue */}
            <div className="flex items-start gap-3.5 sm:px-4 pt-3 sm:pt-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#faf6ed] dark:bg-amber-950/30 text-[#b38a38] dark:text-amber-400 flex items-center justify-center shrink-0 border border-[#f0e6d0]/80 dark:border-amber-800/30">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                  Studio Venue
                </p>
                <p className="font-bold text-xs sm:text-[13px] text-neutral-900 dark:text-white mt-1 leading-snug truncate">
                  {venueValue}
                </p>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 mt-0.5 inline-block truncate"
                >
                  {venueSub}
                </a>
              </div>
            </div>

            {/* Column 3: Booking Total */}
            <div className="flex items-start gap-3.5 sm:px-4 pt-3 sm:pt-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#faf6ed] dark:bg-amber-950/30 text-[#b38a38] dark:text-amber-400 flex items-center justify-center shrink-0 border border-[#f0e6d0]/80 dark:border-amber-800/30">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                  Booking Total
                </p>
                <p className="font-bold text-xs sm:text-[13px] text-neutral-900 dark:text-white mt-1 leading-snug truncate">
                  ₱{financialInfo.totalAmount.toLocaleString()}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {totalSub}
                </p>
              </div>
            </div>

            {/* Column 4: Claiming Method */}
            <div className="flex items-start gap-3.5 sm:pl-4 pt-3 sm:pt-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#faf6ed] dark:bg-amber-950/30 text-[#b38a38] dark:text-amber-400 flex items-center justify-center shrink-0 border border-[#f0e6d0]/80 dark:border-amber-800/30">
                <Store size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                  Claiming Method
                </p>
                <p className="font-bold text-xs sm:text-[13px] text-neutral-900 dark:text-white mt-1 leading-snug truncate">
                  {claimingValue}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {claimingSub}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── 3. Lower Content Grid: Left (Wide) + Right (Narrow) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* ── Left Column (Wide) ────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Card A: Customer & Participant Card (White) */}
          <section className="bg-white dark:bg-[#18191c] rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 p-8 sm:p-10 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left: Arch Avatar + Full Name + Description (fills the space) */}
              <div className="lg:col-span-7 flex items-center gap-5 sm:gap-6 min-w-0">
                {/* Arch Avatar matching Image 2 */}
                <div className="w-[84px] h-[104px] sm:w-[94px] sm:h-[116px] rounded-t-full rounded-b-xs bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden border border-neutral-200/80 dark:border-neutral-700 shadow-xs">
                  {customerPhotoUrl ? (
                    <img
                      src={customerPhotoUrl}
                      alt={customerFullName}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <span className="font-heading font-medium text-2xl tracking-wider text-neutral-400 select-none">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#c77826] dark:text-amber-500 mb-1.5">
                    {displayEyebrow}
                  </p>
                  <h2 className="font-heading font-normal text-2xl sm:text-3xl lg:text-[36px] xl:text-[40px] text-neutral-900 dark:text-white leading-[1.12] tracking-tight break-words">
                    {customerFullName}
                  </h2>
                  <p className="font-body text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-2 font-normal leading-relaxed">
                    {displayPrimarySubtitle}
                  </p>
                </div>
              </div>

              {/* Right: Contact Rows */}
              <div className="lg:col-span-5 w-full pt-1">
                <p className="font-body text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-normal mb-5 leading-relaxed">
                  {isSomeoneElse
                    ? `Photoshoot participant registered by account owner (${accountOwnerFullName}).`
                    : 'The participant and primary contact for this graduation portrait session.'}
                </p>

                <div className="space-y-3.5 sm:space-y-4 font-body">
                  {/* Email */}
                  <div className="flex items-center justify-between text-xs sm:text-[13px] pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                      <Mail size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                      <span>{isSomeoneElse ? 'Participant email' : 'Email address'}</span>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[210px]">
                      {customerEmail}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between text-xs sm:text-[13px] pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                      <Phone size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                      <span>{isSomeoneElse ? 'Participant phone' : 'Phone number'}</span>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {customerPhone}
                    </span>
                  </div>

                  {/* Relationship */}
                  <div className={`flex items-center justify-between text-xs sm:text-[13px] ${isSomeoneElse ? 'pb-3 border-b border-neutral-100 dark:border-neutral-800/80' : ''}`}>
                    <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                      <User size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                      <span>Booking relationship</span>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {relationshipText}
                    </span>
                  </div>

                  {/* Account Owner Row if someone else */}
                  {isSomeoneElse && (
                    <div className="flex items-center justify-between text-xs sm:text-[13px]">
                      <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                        <User size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Account owner</span>
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[210px]">
                        {accountOwnerFullName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Card B: Academic Profile Card (Dark Charcoal) */}
          <section className="bg-[#18191c] text-white rounded-[32px] border border-neutral-800 p-8 sm:p-10 shadow-xs">
            {/* Top Row: Eyebrow + Class of Year + Cap Icon & Edit Profile Action */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.24em] text-neutral-400 mb-2">
                  Academic Profile
                </p>
                <h3 className="font-heading font-medium text-3xl sm:text-4xl text-white tracking-tight">
                  {gradYear ? (
                    <>Class of <span className="text-amber-500 font-serif">{gradYear}</span></>
                  ) : (
                    'Academic Profile'
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {!isEditingAcademic && (
                  <button
                    type="button"
                    onClick={() => {
                      setAcademicForm({
                        school: studentDossier?.school || '',
                        school_address: studentDossier?.school_address || '',
                        course: studentDossier?.course || '',
                        section: studentDossier?.section || '',
                        batch: studentDossier?.batch || '',
                        student_id: studentDossier?.student_id || '',
                        yearbook_motto: studentDossier?.yearbook_motto || '',
                      });
                      setIsEditingAcademic(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-700 hover:border-amber-500/80 text-neutral-300 hover:text-amber-400 text-xs font-medium transition-all cursor-pointer"
                  >
                    <PenLine size={12} />
                    <span>Edit Profile</span>
                  </button>
                )}
                <div className="text-amber-500/90 pt-1 shrink-0">
                  <GraduationCap size={28} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {isEditingAcademic ? (
              <form onSubmit={handleSaveAcademicProfile} className="border-t border-neutral-800/90 pt-6 mt-7 space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      School / Institution Name
                    </label>
                    <input
                      type="text"
                      value={academicForm.school}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, school: e.target.value }))}
                      placeholder="e.g. Lipata Senior High School"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Campus / Address
                    </label>
                    <input
                      type="text"
                      value={academicForm.school_address}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, school_address: e.target.value }))}
                      placeholder="e.g. Lipata, Minglanilla, Cebu"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Track / Strand / Degree
                    </label>
                    <input
                      type="text"
                      value={academicForm.course}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, course: e.target.value }))}
                      placeholder="e.g. ABM, STEM, TVL, BSIT"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Section
                    </label>
                    <input
                      type="text"
                      value={academicForm.section}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="e.g. Section A, Mayana"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Batch / Graduating Year
                    </label>
                    <input
                      type="text"
                      value={academicForm.batch}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, batch: e.target.value }))}
                      placeholder="e.g. 2026"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Student ID Number
                    </label>
                    <input
                      type="text"
                      value={academicForm.student_id}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, student_id: e.target.value }))}
                      placeholder="e.g. 12-2026-00492"
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Yearbook Motto
                    </label>
                    <input
                      type="text"
                      value={academicForm.yearbook_motto}
                      onChange={(e) => setAcademicForm(prev => ({ ...prev, yearbook_motto: e.target.value }))}
                      placeholder="Enter personal yearbook motto..."
                      className="w-full h-10 px-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white italic focus:border-amber-500 outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingAcademic(false)}
                    disabled={savingAcademic}
                    className="px-4 py-2 rounded-full border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAcademic}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    {savingAcademic ? (
                      <><Loader2 size={13} className="animate-spin" /> Saving...</>
                    ) : (
                      <><Check size={13} /> Save Academic Profile</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Bottom Grid: Institution on left, Track/Section/ID on right */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-neutral-800/90 pt-8 mt-7 items-start">
                  {/* Left: School Name & Location */}
                  <div className="md:col-span-6 lg:col-span-7 pr-2 sm:pr-4">
                    <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#c77826] dark:text-amber-500/90 mb-3">
                      Institution
                    </p>
                    <h4 className="font-heading font-normal text-2xl sm:text-3xl lg:text-[34px] text-white leading-[1.18] max-w-sm">
                      {schoolName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-4 font-light">
                      <MapPin size={13} className="text-neutral-500 shrink-0" />
                      <span>{schoolLocation}</span>
                    </div>
                  </div>

                  {/* Right: Track, Section, Student ID (Left-aligned column layout matching reference design) */}
                  <div className="md:col-span-6 lg:col-span-5 space-y-4">
                    {/* Track */}
                    <div className="flex items-start gap-6 sm:gap-10 pb-3.5 border-b border-neutral-800/80">
                      <span className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 w-24 sm:w-28 shrink-0 pt-0.5">
                        Track / Course
                      </span>
                      <div>
                        <p className="text-base sm:text-[17px] font-bold text-white leading-tight">
                          {trackName}
                        </p>
                        <p className="text-xs text-neutral-400 font-light mt-0.5">
                          {educationType}
                        </p>
                      </div>
                    </div>

                    {/* Section */}
                    <div className="flex items-start gap-6 sm:gap-10 pb-3.5 border-b border-neutral-800/80">
                      <span className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 w-24 sm:w-28 shrink-0 pt-0.5">
                        Section
                      </span>
                      <div>
                        <p className="text-base sm:text-[17px] font-bold text-white leading-tight">
                          {sectionName}
                        </p>
                        <p className="text-xs text-neutral-400 font-light mt-0.5">
                          {batchDisplay}
                        </p>
                      </div>
                    </div>

                    {/* Student ID */}
                    <div className="flex items-start gap-6 sm:gap-10 pt-0.5">
                      <span className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 w-24 sm:w-28 shrink-0 pt-0.5">
                        Student ID
                      </span>
                      <div>
                        <p className="text-base sm:text-[17px] font-bold text-white font-mono leading-tight">
                          {studentId}
                        </p>
                        <p className="text-xs text-neutral-400 font-light mt-0.5">
                          {studentId && studentId !== 'Not provided' && studentId !== 'N/A' ? 'Verified student record' : 'Not submitted'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yearbook Motto Display (if available in academic profile) */}
                {hasMotto && (
                  <div className="mt-8 pt-6 border-t border-neutral-800/80 flex items-start gap-3.5">
                    <Quote size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                          Yearbook Motto
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setMottoInput(studentDossier?.yearbook_motto || '');
                            setIsEditingMotto(true);
                            const el = document.getElementById('motto-editor-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-[11px] text-amber-500 hover:text-amber-400 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <PenLine size={11} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <p className="font-serif italic text-sm sm:text-base text-neutral-200 leading-relaxed">
                        “{studentDossier.yearbook_motto}”
                      </p>
                    </div>
                  </div>
                )}

                {/* School Section Masterlist Roster & Stored PDF (when booked for a School Section) */}
                {Array.isArray(booking.student_details?.masterlist_students) && booking.student_details.masterlist_students.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-neutral-800/90 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-amber-500 mb-1">
                          Registered Under Class Adviser · {displayPrimaryName}
                        </p>
                        <h4 className="font-heading text-lg sm:text-xl font-bold text-white">
                          School Section Masterlist ({booking.student_details.masterlist_students.length} Students)
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {booking.student_details?.masterlist_pdf_url && (
                          <a
                            href={booking.student_details.masterlist_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <FileText size={13} />
                            <span>View Stored PDF</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            generateMasterlistPDFTemplate({
                              school: schoolName,
                              section: sectionName,
                              strand: trackName,
                              batch: batchDisplay,
                              adviserName: displayPrimaryName,
                              adviserEmail: customerEmail,
                              adviserPhone: customerPhone,
                              packageName: headline,
                              students: booking.student_details.masterlist_students,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-neutral-700 hover:border-amber-500/60 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Download size={13} className="text-amber-400" />
                          <span>Download Masterlist PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Set Breakdown Cards */}
                    {booking.student_details?.masterlist_summary?.setCounts && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {['Set A', 'Set B', 'Set C', 'Set D'].map((sKey) => {
                          const cnt = booking.student_details.masterlist_summary.setCounts[sKey] || 0;
                          const sub = booking.student_details.masterlist_summary.setSubtotals?.[sKey] || 0;
                          return (
                            <div key={sKey} className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                {sKey} ({cnt})
                              </span>
                              <span className="text-sm font-extrabold text-white block mt-1">
                                ₱{Number(sub).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                            Overall Total
                          </span>
                          <span className="text-sm font-extrabold text-amber-300 block mt-1">
                            ₱{Number(booking.student_details.masterlist_summary.totalAmount || booking.total_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Student Roster Table */}
                    <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-900/60 max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left text-xs divide-y divide-neutral-800">
                        <thead className="bg-neutral-900 sticky top-0 z-10">
                          <tr className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Student ID</th>
                            <th className="py-2.5 px-3">Complete Name</th>
                            <th className="py-2.5 px-3">Set</th>
                            <th className="py-2.5 px-3">Price</th>
                            <th className="py-2.5 px-3">Yearbook Motto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/70 text-neutral-200">
                          {booking.student_details.masterlist_students.map((st, idx) => (
                            <tr key={st.studentId || idx} className="hover:bg-neutral-800/40 transition-colors">
                              <td className="py-2 px-3 font-mono text-neutral-500">{st.rowNo || idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-amber-400">{st.studentId}</td>
                              <td className="py-2 px-3 font-semibold text-white">{st.fullName}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                                  {st.packageTier || 'Set A'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-neutral-300">
                                {st.unitPrice ? `₱${Number(st.unitPrice).toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2 px-3 italic text-neutral-400 truncate max-w-[200px]" title={st.motto}>
                                “{st.motto}”
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Card E: Delivery & Claiming Destination (Left Column Bottom) */}
          <section className="flex-1 flex flex-col justify-between bg-white dark:bg-[#18191c] rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 p-8 sm:p-10 shadow-xs">
            <div className="flex-1 flex flex-col justify-between">
              {/* Top Header Row: Editorial Title + Single Mode Badge & Action */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-[10.5px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#c77826] dark:text-amber-500 mb-1.5">
                    Fulfillment &amp; Dispatch
                  </p>
                  <h3 className="font-heading font-normal text-2xl sm:text-3xl text-neutral-900 dark:text-white leading-tight">
                    Delivery &amp; Claiming Destination
                  </h3>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Single Active Mode Pill: Only Home Delivery OR Studio Pick-up */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-[#faf6ed] dark:bg-amber-950/30 text-[#b38a38] dark:text-amber-400 border border-[#f0e6d0] dark:border-amber-800/40">
                    {!isEditingDelivery && deliveryDetails.fulfillment_mode === 'STUDIO_PICKUP' ? (
                      <>
                        <Store size={13} className="shrink-0" />
                        <span>Studio Pick-up</span>
                      </>
                    ) : (
                      <>
                        <Truck size={13} className="shrink-0" />
                        <span>Home Delivery</span>
                      </>
                    )}
                  </span>

                  {!isEditingDelivery && deliveryDetails.fulfillment_mode === 'STUDIO_DELIVERY' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryForm((prev) => ({ ...prev, fulfillment_mode: 'STUDIO_DELIVERY' }));
                        setIsEditingDelivery(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 hover:border-[#c77826] text-neutral-700 dark:text-neutral-200 hover:text-[#c77826] dark:hover:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <PenLine size={12} />
                      <span>Edit Destination</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Mode 1: Home Delivery Editorial Inline Editor (Organized 2x4 Aligned Grid) ── */}
              {isEditingDelivery ? (
                <div className="border-t border-neutral-100 dark:border-neutral-800/90 pt-6 mt-5 flex-1 flex flex-col justify-between gap-7">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 lg:gap-x-12 gap-y-2 items-start font-body text-xs sm:text-[13px]">
                    {/* Left Column (6 Cols): Region, Province, City / Municipality, Barangay */}
                    <div className="md:col-span-6 divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {/* Row 1: Region */}
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Region</span>
                        </div>
                        <StudioDropdown
                          value={deliveryForm.region}
                          onChange={(val) => updateLocationField('region', val)}
                          searchable={true}
                          align="right"
                          placeholder="Select Region..."
                          ariaLabel="Select Region"
                          className="w-auto min-w-[205px] sm:min-w-[235px] max-w-[260px]"
                          triggerClassName="!h-10 !px-4 !rounded-full !border-neutral-200/90 dark:!border-neutral-700/80 !bg-[#faf8f5] dark:!bg-neutral-800/70 hover:!border-[#c77826] !text-xs"
                          menuClassName="!w-80"
                          options={getRegions().map((reg) => ({
                            value: reg,
                            label: reg,
                          }))}
                        />
                      </div>

                      {/* Row 2: Province */}
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Province</span>
                        </div>
                        <StudioDropdown
                          value={deliveryForm.province}
                          onChange={(val) => updateLocationField('province', val)}
                          searchable={true}
                          align="right"
                          placeholder="Select Province..."
                          ariaLabel="Select Province"
                          className="w-auto min-w-[205px] sm:min-w-[235px] max-w-[260px]"
                          triggerClassName="!h-10 !px-4 !rounded-full !border-neutral-200/90 dark:!border-neutral-700/80 !bg-[#faf8f5] dark:!bg-neutral-800/70 hover:!border-[#c77826] !text-xs"
                          menuClassName="!w-72"
                          options={getProvincesByRegion(deliveryForm.region).map((prov) => ({
                            value: prov,
                            label: prov,
                          }))}
                        />
                      </div>

                      {/* Row 3: City / Municipality */}
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>City / Municipality</span>
                        </div>
                        <StudioDropdown
                          value={deliveryForm.city}
                          onChange={(val) => updateLocationField('city', val)}
                          searchable={true}
                          align="right"
                          placeholder="Select City / Municipality..."
                          ariaLabel="Select City or Municipality"
                          className="w-auto min-w-[205px] sm:min-w-[235px] max-w-[260px]"
                          triggerClassName="!h-10 !px-4 !rounded-full !border-neutral-200/90 dark:!border-neutral-700/80 !bg-[#faf8f5] dark:!bg-neutral-800/70 hover:!border-[#c77826] !text-xs"
                          menuClassName="!w-72"
                          options={getCitiesByProvince(deliveryForm.region, deliveryForm.province).map((ct) => ({
                            value: ct,
                            label: ct,
                          }))}
                        />
                      </div>

                      {/* Row 4: Barangay */}
                      <div className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Barangay</span>
                        </div>
                        <StudioDropdown
                          value={deliveryForm.barangay}
                          onChange={(val) => updateLocationField('barangay', val)}
                          searchable={true}
                          align="right"
                          placeholder="Select Barangay..."
                          ariaLabel="Select Barangay"
                          className="w-auto min-w-[205px] sm:min-w-[235px] max-w-[260px]"
                          triggerClassName="!h-10 !px-4 !rounded-full !border-[#f0e6d0] dark:!border-amber-800/50 !bg-[#faf6ed] dark:!bg-amber-950/30 hover:!border-[#c77826] !text-xs"
                          menuClassName="!w-72"
                          options={getBarangaysByCity(deliveryForm.region, deliveryForm.province, deliveryForm.city).map((brgy) => ({
                            value: brgy,
                            label: `Brgy. ${brgy}`,
                            desc: `${deliveryForm.city}, ${deliveryForm.province}`,
                          }))}
                        />
                      </div>
                    </div>

                    {/* Right Column (6 Cols): Recipient Name, Phone Number, Street / Purok, Landmark Note */}
                    <div className="md:col-span-6 divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {/* Row 1: Recipient Name */}
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <User size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Recipient name</span>
                        </div>
                        <input
                          type="text"
                          value={deliveryForm.recipient_name}
                          onChange={(e) => setDeliveryForm((prev) => ({ ...prev, recipient_name: e.target.value }))}
                          placeholder={customerFullName}
                          className="h-10 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700/80 bg-[#faf8f5] dark:bg-neutral-800/70 font-bold text-xs text-neutral-900 dark:text-white text-right focus:outline-hidden focus:border-[#c77826] placeholder:text-neutral-400 placeholder:font-normal w-full max-w-[245px]"
                        />
                      </div>

                      {/* Row 2: Phone Number */}
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <Phone size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Phone number</span>
                        </div>
                        <input
                          type="text"
                          value={deliveryForm.recipient_phone}
                          onChange={(e) => setDeliveryForm((prev) => ({ ...prev, recipient_phone: e.target.value }))}
                          placeholder="09XX XXX XXXX"
                          className="h-10 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700/80 bg-[#faf8f5] dark:bg-neutral-800/70 font-bold text-xs text-neutral-900 dark:text-white text-right focus:outline-hidden focus:border-[#c77826] placeholder:text-neutral-400 placeholder:font-normal w-full max-w-[245px]"
                        />
                      </div>

                      {/* Row 3: Street / Purok */}
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Street / Purok</span>
                        </div>
                        <input
                          type="text"
                          value={deliveryForm.street}
                          onChange={(e) => updateLocationField('street', e.target.value)}
                          placeholder="House no., street, or purok"
                          className="h-10 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700/80 bg-[#faf8f5] dark:bg-neutral-800/70 font-bold text-xs text-neutral-900 dark:text-white text-right focus:outline-hidden focus:border-[#c77826] placeholder:text-neutral-400 placeholder:font-normal w-full max-w-[245px]"
                        />
                      </div>

                      {/* Row 4: Landmark Note */}
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 shrink-0">
                          <FileText size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                          <span>Landmark note</span>
                        </div>
                        <input
                          type="text"
                          value={deliveryForm.delivery_instructions}
                          onChange={(e) => setDeliveryForm((prev) => ({ ...prev, delivery_instructions: e.target.value }))}
                          placeholder="Optional gate or landmark"
                          className="h-10 px-4 rounded-full border border-neutral-200/90 dark:border-neutral-700/80 bg-[#faf8f5] dark:bg-neutral-800/70 font-medium text-xs text-neutral-700 dark:text-neutral-200 text-right focus:outline-hidden focus:border-[#c77826] placeholder:text-neutral-400 placeholder:font-normal w-full max-w-[245px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Editorial Footer Bar: "Choose studio pick-up instead" on left + Save/Cancel on right */}
                  <div className="pt-5 border-t border-neutral-100 dark:border-neutral-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {canSwitchFulfillment ? (
                      <button
                        type="button"
                        disabled={savingDelivery}
                        onClick={() => handleSwitchFulfillmentMode('STUDIO_PICKUP')}
                        className="text-xs font-semibold text-[#c77826] dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer w-fit"
                      >
                        <Store size={13} />
                        <span>Choose studio pick-up instead &rarr;</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingDelivery(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingDelivery}
                        onClick={handleSaveDelivery}
                        className="px-5 py-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {savingDelivery ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            <span>Save Home Delivery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : deliveryDetails.fulfillment_mode === 'STUDIO_PICKUP' ? (
                /* ── Mode 2: Studio Pick-up Selected -> Aesthetic Printable Claiming Receipt ── */
                <div className="border-t border-neutral-100 dark:border-neutral-800/90 pt-7 mt-6 flex-1 flex flex-col justify-between gap-6">
                  {/* Luxury Dark Charcoal & Warm Gold Studio Claiming Pass / Receipt */}
                  <div className="rounded-3xl bg-[#18191c] text-white border border-neutral-800 p-6 sm:p-8 relative overflow-hidden shadow-sm">
                    {/* Receipt Top Row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-dashed border-neutral-700/90">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-500 mb-1.5">
                          Official Studio Claiming Receipt
                        </p>
                        <h4 className="font-heading font-normal text-2xl sm:text-3xl text-white tracking-tight">
                          {customerFullName}
                        </h4>
                        <p className="text-xs text-neutral-400 font-light mt-1">
                          {schoolName} · Class of {gradYear}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 pr-4">
                        <div className="bg-white p-1.5 rounded-xl shrink-0">
                          <QRCodeSVG value={String(effectiveToken)} size={46} level="M" />
                        </div>
                        <div className="text-left">
                          <p className="text-[9.5px] font-bold uppercase tracking-widest text-neutral-400">
                            Student ID No.
                          </p>
                          <p className="font-mono font-bold text-sm sm:text-base text-amber-400 tracking-wider">
                            {studentId}
                          </p>
                          <p className="font-mono text-[10px] text-neutral-400">
                            #{effectiveBookingNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Receipt Details Ledger: School, Selected Package, and Studio Counter */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs">
                      <div className="sm:border-r border-neutral-800 sm:pr-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
                          Academic Institution
                        </p>
                        <p className="font-bold text-sm text-white leading-snug">
                          {schoolName}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                          {trackName} · {sectionName}
                        </p>
                      </div>

                      <div className="sm:border-r border-neutral-800 sm:pr-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
                          Selected Package
                        </p>
                        <p className="font-bold text-sm text-amber-400 leading-snug">
                          {headline}
                        </p>
                        <p className="text-[11px] text-neutral-300 font-medium mt-0.5">
                          {tierName} · ₱{financialInfo.totalAmount.toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
                          Claiming Counter
                        </p>
                        <p className="font-bold text-sm text-white leading-snug">
                          E-Kodak Studio Main
                        </p>
                        <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                          311 Rizal St., City of Naga, Cebu
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Bottom Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {canSwitchFulfillment ? (
                      <button
                        type="button"
                        disabled={savingDelivery}
                        onClick={() => handleSwitchFulfillmentMode('STUDIO_DELIVERY')}
                        className="text-xs font-semibold text-neutral-500 hover:text-[#c77826] dark:text-neutral-400 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer w-fit"
                      >
                        <Truck size={13} className="text-[#c77826] dark:text-amber-500" />
                        <span>Use Home Delivery instead &rarr;</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={handlePrintPickupReceipt}
                      className="px-5 py-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      <Printer size={14} />
                      <span>Print Studio Pick-up Receipt</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Mode 3: Home Delivery Aesthetic Editorial Showcase (Neatly Centered, Non-Form) ── */
                <div className="border-t border-neutral-100 dark:border-neutral-800/90 pt-5 mt-5 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col justify-center py-4 sm:py-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
                      {/* Left Column (6 Cols): Editorial Serif Destination Headline (without "Registered Dispatch Address") */}
                      <div className="md:col-span-6 pr-2">
                        <h4 className="font-heading font-normal text-2xl sm:text-3xl text-neutral-900 dark:text-white leading-[1.2]">
                          {deliveryDetails.barangay
                            ? `Brgy. ${deliveryDetails.barangay}, ${deliveryDetails.city || DEFAULT_CITY}`
                            : `${deliveryDetails.city || DEFAULT_CITY}, ${deliveryDetails.province || DEFAULT_PROVINCE}`}
                        </h4>
                        <div className="flex items-start gap-2 text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-3.5 font-normal leading-relaxed">
                          <MapPin size={15} className="text-[#c77826] dark:text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            {deliveryDetails.street
                              ? `${deliveryDetails.street}, `
                              : ''}
                            {deliveryDetails.barangay ? `Brgy. ${deliveryDetails.barangay}, ` : ''}
                            {deliveryDetails.city || DEFAULT_CITY}, {deliveryDetails.province || DEFAULT_PROVINCE} ·{' '}
                            {(deliveryDetails.region || DEFAULT_REGION).replace(/\s*\(.*?\)\s*/, '')}
                          </span>
                        </div>

                        {deliveryDetails.delivery_instructions && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 italic mt-3 pl-4 border-l-2 border-amber-500/50">
                            “{deliveryDetails.delivery_instructions}”
                          </p>
                        )}
                      </div>

                      {/* Right Column (6 Cols): Clean Hairline-Divided Rows Matching Card A */}
                      <div className="md:col-span-6 space-y-4 font-body text-xs sm:text-[13px]">
                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                            <Truck size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                            <span>Fulfillment mode</span>
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            Home Delivery
                          </span>
                        </div>

                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800/80">
                          <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                            <User size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                            <span>Authorized recipient</span>
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[210px]">
                            {deliveryDetails.recipient_name || customerFullName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
                            <Phone size={15} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                            <span>Contact number</span>
                          </div>
                          <span className="font-medium text-neutral-500 dark:text-neutral-400">
                            {deliveryDetails.recipient_phone || customerPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Footer Switcher to Studio Pick-up (automatically removed 3 minutes after saving) */}
                  {(canSwitchFulfillment || (!deliveryDetails.barangay && !deliveryDetails.street)) && (
                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-4 flex-wrap">
                      {canSwitchFulfillment ? (
                        <button
                          type="button"
                          disabled={savingDelivery}
                          onClick={() => handleSwitchFulfillmentMode('STUDIO_PICKUP')}
                          className="text-xs font-semibold text-[#c77826] dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Store size={13} />
                          <span>Choose studio pick-up instead &rarr;</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {!deliveryDetails.barangay && !deliveryDetails.street && (
                        <button
                          type="button"
                          onClick={() => setIsEditingDelivery(true)}
                          className="text-xs font-bold text-neutral-900 dark:text-white hover:text-[#c77826] dark:hover:text-amber-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Complete barangay &amp; street details</span>
                          <span>&rarr;</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* ── Right Column (Narrow) ─────────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Card C: Continue on Mobile (QR Pass Card - Dark) */}
          <section className="bg-[#18191c] text-white rounded-[32px] border border-neutral-800 p-7 sm:p-8 text-center shadow-xs">
            {/* Header: Label */}
            <div className="text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-4">
              <span>Continue on Mobile</span>
            </div>

            {/* Headline */}
            <h3 className="font-heading font-normal text-2xl sm:text-[26px] text-white leading-snug mt-4 mb-6">
              Scan this with
              <br />
              our mobile app.
            </h3>

            {/* Single Clean QR Code */}
            <div className="flex justify-center my-3">
              <QRPass
                bookingToken={booking.booking_token || booking.id}
                bookingNumber={effectiveBookingNumber}
                qrCodePath={booking.qr_code_path}
                size={160}
                showActions={false}
                showBookingNumber={false}
                isOpen={isQRModalOpen}
                onOpenChange={setIsQRModalOpen}
              />
            </div>

            {/* Single Booking Reference */}
            <p className="font-mono font-bold text-base text-white tracking-widest mt-4">
              {effectiveBookingNumber}
            </p>

            <p className="text-xs text-neutral-400 font-light mt-1.5 mb-6 px-4 leading-relaxed">
              Open this booking, receive updates, and keep your details close.
            </p>

            {/* Action Button: Enlarge QR Code */}
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Maximize2 size={13} className="text-amber-500" />
              <span>Enlarge QR code</span>
            </button>
          </section>

          {/* Card D: Financial Status (White Card) */}
          <section className="bg-white dark:bg-[#18191c] rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 p-7 sm:p-8 shadow-xs">
            {/* Header: Label + Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">
                Financial Status
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {financialBadgeText}
              </span>
            </div>

            {/* Headline */}
            <h3 className="font-heading font-normal text-2xl text-neutral-900 dark:text-white mt-3 mb-5">
              Payment summary
            </h3>

            {/* 3 Rows */}
            <div className="space-y-3.5 text-xs sm:text-[13px]">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 font-light">
                  Total session fee
                </span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  ₱{financialInfo.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500 dark:text-neutral-400 font-light">
                  Amount paid
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₱{financialInfo.downPaid.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-neutral-900 dark:text-white font-bold">
                  Remaining balance
                </span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  ₱{financialInfo.remBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Settle Remaining Button */}
            {financialInfo.remBalance > 0 ? (
              <Link
                to="/dashboard/payments"
                className="mt-6 w-full py-3.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
              >
                <CreditCard size={15} />
                <span>Settle remaining ₱{financialInfo.remBalance.toLocaleString()}</span>
              </Link>
            ) : (
              <div className="mt-6 w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs text-center border border-emerald-200/80 dark:border-emerald-800">
                Fully Settled
              </div>
            )}
          </section>

          {/* Card F: Compact Graduate Motto & Studio Dossier Tools (Below Payment Summary) */}
          <section id="motto-editor-section" className="flex-1 flex flex-col justify-between bg-white dark:bg-[#18191c] rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 p-7 sm:p-8 shadow-xs">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#c77826] dark:text-amber-500">
                  Yearbook &amp; Dossier
                </span>
                {!isEditingMotto && hasMotto && (
                  <button
                    type="button"
                    onClick={() => {
                      setMottoInput(studentDossier?.yearbook_motto || '');
                      setIsEditingMotto(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-amber-500 text-neutral-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <PenLine size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <h3 className="font-heading font-normal text-2xl text-neutral-900 dark:text-white mt-2">
                Personal Graduate Motto
              </h3>
            </div>

            {/* Centered Motto Body */}
            <div className="flex-1 flex flex-col justify-center my-4">
              {isEditingMotto ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={180}
                      value={mottoInput}
                      onChange={(e) => setMottoInput(e.target.value)}
                      placeholder="Enter your graduation quote or motto..."
                      className="w-full p-3.5 text-xs text-center font-serif italic rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 leading-relaxed resize-none"
                    />
                    <span className="absolute bottom-2 right-2.5 text-[10px] font-mono text-neutral-400">
                      {mottoInput.length}/180
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMottoInput(studentDossier?.yearbook_motto || '');
                        setIsEditingMotto(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingMotto}
                      onClick={handleSaveMotto}
                      className="px-4 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingMotto ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          <span>Save Motto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : hasMotto ? (
                <div className="py-6 px-5 rounded-2xl bg-[#faf8f5] dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col items-center justify-center text-center gap-2">
                  <Quote size={18} className="text-[#c77826] dark:text-amber-500 shrink-0" />
                  <p className="font-serif italic text-sm sm:text-base text-neutral-800 dark:text-neutral-100 leading-relaxed max-w-xs mx-auto">
                    “{studentDossier.yearbook_motto}”
                  </p>
                </div>
              ) : (
                <div className="py-6 px-5 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700/80 text-center flex flex-col items-center justify-center gap-2.5 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 font-light leading-relaxed">
                    Add your personal quote for the Class of {gradYear} dossier.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMottoInput('');
                      setIsEditingMotto(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PenLine size={12} />
                    <span>Add Personal Motto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions: Preview Dossier & Print PDF */}
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-2.5">
                Official Credentials Slip
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDossierPreviewOpen(true)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 border border-neutral-200/80 dark:border-neutral-700 transition-all cursor-pointer active:scale-98"
                >
                  <FileText size={14} className="text-amber-500 shrink-0" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintCredentials}
                  className="w-full px-3 py-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Printer size={14} className="shrink-0" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* ── High-Resolution Dossier Preview Modal ─────────────────────────────── */}
      {isDossierPreviewOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md overflow-y-auto py-6 sm:py-10 px-4 flex items-center justify-center animate-fade-in"
          onClick={() => setIsDossierPreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#18191c] rounded-[32px] max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-neutral-200/90 dark:border-neutral-800 relative my-auto animate-scale-up max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                <h3 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                  Student Credentials Slip Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCredentials}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-950 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDossierPreviewOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Sheet */}
            <div className="overflow-y-auto flex-1 pr-1">
              <CredentialsDossierSheet
                effectiveBookingNumber={effectiveBookingNumber}
                effectiveToken={effectiveToken}
                customerFullName={customerFullName}
                customerPhotoUrl={customerPhotoUrl}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                studentId={studentId}
                schoolName={schoolName}
                schoolLocation={schoolLocation}
                gradYear={gradYear}
                trackName={trackName}
                educationType={educationType}
                sectionName={sectionName}
                yearbookMotto={studentDossier?.yearbook_motto}
                headline={headline}
                tierName={tierName}
                scheduleValue={scheduleValue}
                scheduleSub={scheduleSub}
                venueValue={venueValue}
                claimingValue={claimingValue}
                claimingSub={claimingSub}
                financialInfo={financialInfo}
                financialBadgeText={financialBadgeText}
                isPrintMode={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone Hidden Print Target for Native Browser Print to PDF ─── */}
      <div id="printable-credentials" className="hidden print:block">
        {printDocType === 'pickup_receipt' ? (
          <div className="max-w-2xl mx-auto bg-white text-neutral-900 p-8 border-2 border-neutral-900 rounded-3xl font-body">
            {/* Studio Header */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b-2 border-neutral-900">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c77826] mb-1">
                  E-Kodak Photography Studio · Official Pass
                </p>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-neutral-900">
                  Studio Pick-up Claiming Receipt
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  311 Rizal Street, City of Naga, Cebu · Present this slip when claiming your portrait package
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Booking Ref
                </p>
                <p className="font-mono font-bold text-lg text-neutral-900">
                  #{effectiveBookingNumber}
                </p>
              </div>
            </div>

            {/* Candidate & Package Details */}
            <div className="grid grid-cols-12 gap-6 py-7 border-b border-dashed border-neutral-300 items-center">
              <div className="col-span-8 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Graduate / Customer Full Name
                  </p>
                  <p className="font-heading text-2xl font-bold text-neutral-900 mt-0.5">
                    {customerFullName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                      Student ID Number
                    </p>
                    <p className="font-mono font-bold text-base text-neutral-900 mt-0.5">
                      {studentId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                      Academic Track &amp; Section
                    </p>
                    <p className="font-bold text-sm text-neutral-900 mt-0.5">
                      {trackName} · {sectionName}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    School / Institution
                  </p>
                  <p className="font-bold text-base text-neutral-900 mt-0.5">
                    {schoolName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {schoolLocation} · Class of {gradYear}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    Selected Package &amp; Set
                  </p>
                  <p className="font-bold text-base text-neutral-900 mt-0.5">
                    {headline} — {tierName}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Total Package Fee: ₱{financialInfo.totalAmount.toLocaleString()} · Paid: ₱{financialInfo.downPaid.toLocaleString()} · Balance: ₱{financialInfo.remBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl border border-neutral-200 bg-neutral-50 text-center">
                <div className="bg-white p-2 rounded-xl border border-neutral-200 mb-2">
                  <QRCodeSVG value={String(effectiveToken)} size={110} level="M" />
                </div>
                <p className="font-mono font-bold text-xs text-neutral-900">
                  ID: {studentId}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Studio Counter Verification QR
                </p>
              </div>
            </div>

            {/* Footer Signature & Studio Counter */}
            <div className="pt-6 flex items-end justify-between gap-6 text-xs text-neutral-600">
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                  Claiming Destination
                </p>
                <p className="font-bold text-neutral-900 mt-0.5">
                  Studio Pick-up · E-Kodak Studio (311 Rizal Street, City of Naga, Cebu)
                </p>
              </div>
              <div className="text-right">
                <div className="w-44 border-b border-neutral-400 mb-1" />
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Customer / Representative Signature
                </p>
              </div>
            </div>
          </div>
        ) : (
          <CredentialsDossierSheet
            effectiveBookingNumber={effectiveBookingNumber}
            effectiveToken={effectiveToken}
            customerFullName={customerFullName}
            customerPhotoUrl={customerPhotoUrl}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            studentId={studentId}
            schoolName={schoolName}
            schoolLocation={schoolLocation}
            gradYear={gradYear}
            trackName={trackName}
            educationType={educationType}
            sectionName={sectionName}
            yearbookMotto={studentDossier?.yearbook_motto}
            headline={headline}
            tierName={tierName}
            scheduleValue={scheduleValue}
            scheduleSub={scheduleSub}
            venueValue={venueValue}
            claimingValue={claimingValue}
            claimingSub={claimingSub}
            financialInfo={financialInfo}
            financialBadgeText={financialBadgeText}
            isPrintMode={true}
          />
        )}
      </div>

      {/* Dedicated Print Media Stylesheet to guarantee clean single-sheet PDF output */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-credentials,
          #printable-credentials * {
            visibility: visible !important;
          }
          #printable-credentials {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            z-index: 999999 !important;
          }
          @page {
            size: portrait;
            margin: 10mm;
          }
        }
      `}} />

    </div>
  );
}