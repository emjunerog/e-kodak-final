/**
 * AdminBookings.jsx
 * =================
 * High-End Administrative Booking Management Workspace for E-Kodak Studio.
 *
 * Key Capabilities:
 * • Seamless executive layout matching Admin Command Center & Workstation Hub (max-w-screen-2xl)
 * • Sub-navigation lifecycle tabs (All, Pending, Confirmed, In Production, Ready, Completed, Unpaid, Deleted)
 * • KPI overview strip with live database counts & 1-click filter selection
 * • Full CRUD with Soft Deletion & Recovery:
 *    - CREATE (Insert): Modal with existing profile select or new walk-in client creation
 *    - READ (Inspect): 1-click row inspection and slide-over BookingQuickInspector drawer
 *    - UPDATE (Edit): Modal to edit lifecycle status, payment clearance, schedule, location, pricing, notes
 *    - SOFT DELETE (Trash): Moves records to the Deleted tab with reason and timestamp
 *    - RECOVERY (Restore): Recovers deleted records with original booking number and ID back to active queue
 *    - PERMANENT DELETE (Purge): Available in Deleted tab for complete database removal with cascade
 * • Dedicated STATUS & PAYMENT columns without redundant stacked duplicates:
 *    - STATUS: Lifecycle state only (Pending, Confirmed, In Bay, etc.)
 *    - PAYMENT: Clearance state only (Cleared, Unpaid, Partial)
 * • Table columns:
 *    - Booking # (with copy-ref capability)
 *    - Customer (Name, Toga/Height size badge, University/Degree with cap icon)
 *    - Service & Tier (Package name, tier badge, pricing)
 *    - Event Schedule (Formatted date & preferred time slot)
 *    - Status (Strict 3-color badge)
 *    - Payment (Strict 3-color badge)
 *    - Photographer (Assigned photographer designation or unassigned status)
 *    - Created date
 *    - Actions: View, Edit, Delete / Recover
 * • Strict 3-color luxury palette: Primary (#1a1a1a), Gold (#c9a96e), Neutral (#f5f5f5, gray, white)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  CalendarDays, AlertCircle, X, Trash2, CheckCircle,
  Camera, GraduationCap, Plus, Eye, Edit3, Save,
  CheckCircle2, Clock, CreditCard, Layers, Sparkles, Package,
  DollarSign, MapPin, User, FileText, ChevronDown, Check,
  Download, ArrowUpDown, Lock, Phone, UserPlus, Copy, RotateCcw,
  Archive, ShieldAlert, ArrowRightLeft, ExternalLink, Building2,
  FileImage, Maximize2, Megaphone, Bell, AlertTriangle,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import StaffQRScannerModal from '../../components/admin/StaffQRScannerModal';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import {
  getAdminBookings,
  softDeleteBooking,
  restoreBooking,
  deleteBookingPermanently,
  adminCreateBooking,
  adminUpdateBooking,
  ALL_BOOKING_STATUSES,
  ALL_PAYMENT_STATUSES,
  getPhotographersWithWorkloadAndAvailability,
  batchScheduleSchoolPictorial,
} from '../../services/bookingAdminService';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import BookingQuickInspector from '../../components/admin/BookingQuickInspector';
import CustomDropdown from '../../components/ui/CustomDropdown';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getCustomerSize(cust, booking) {
  if (booking?.toga_size) return `Toga: ${booking.toga_size}`;
  if (cust?.studio_specs?.toga_size) return `Toga: ${cust.studio_specs.toga_size}`;
  if (cust?.studio_specs?.height_cm) return `${cust.studio_specs.height_cm} cm`;
  return null;
}

function getRefImageUrl(path) {
  if (!path) return '';
  if (typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from('booking-references').getPublicUrl(path);
  return data?.publicUrl || path;
}

/**
 * Bi-directional parsers for intake notes & academic specifications
 */
function parseStructuredNotes(rawNotes = '') {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return {
      school: '',
      campus: '',
      degree: '',
      section: '',
      studentId: '',
      togaSize: '',
      height: '',
      remarks: '',
    };
  }

  // Extract fields with flexible regexes
  const school = rawNotes.match(/•\s*(?:School|Institution):\s*(.*)/i)?.[1]?.trim() || '';
  const campus = rawNotes.match(/•\s*Campus(?:\s*\/\s*Address)?:\s*(.*)/i)?.[1]?.trim() || '';
  const degree = rawNotes.match(/•\s*(?:Degree|Program|Strand|Course)(?:\s*\/.*?)?:\s*(.*)/i)?.[1]?.trim() || '';
  const section = rawNotes.match(/•\s*Section(?:\s*\/\s*Batch)?:\s*(.*)/i)?.[1]?.trim() || '';
  const studentId = rawNotes.match(/•\s*Student ID:\s*(.*)/i)?.[1]?.trim() || '';
  const togaSize = rawNotes.match(/•\s*Toga(?:\s*Size)?:\s*(.*)/i)?.[1]?.trim() || '';
  const height = rawNotes.match(/•\s*Height:\s*(.*)/i)?.[1]?.trim() || '';

  // Clean remarks: filter out any academic bullet lines or section headers
  const lines = rawNotes.split('\n');
  const cleanRemarksLines = [];
  let inSystemBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if entering known academic or metadata block
    if (/^\[(?:STUDENT & YEARBOOK DETAILS|SELECTED ADD-ONS|SYSTEM METADATA)\]/i.test(trimmed)) {
      inSystemBlock = true;
      continue;
    }

    // Check if entering custom remarks block
    if (/^\[(?:SPECIAL INSTRUCTIONS|CLIENT REMARKS|NOTES|INSTRUCTIONS)\]/i.test(trimmed)) {
      inSystemBlock = false;
      continue;
    }

    // Generic bracket header
    if (/^\[.*?\]$/.test(trimmed)) {
      inSystemBlock = false;
      continue;
    }

    if (inSystemBlock) {
      if (trimmed.startsWith('•') || !trimmed) continue;
      inSystemBlock = false;
    }

    // Exclude any remaining academic bullet points
    if (/^•\s*(?:Type|School|Campus|Degree|Program|Strand|Course|Section|Student ID|Toga|Height):/i.test(trimmed)) {
      continue;
    }

    cleanRemarksLines.push(line);
  }

  const remarks = cleanRemarksLines.join('\n').trim();

  const clean = val => (val && val !== 'N/A' && val !== 'null' ? val : '');

  return {
    school: clean(school),
    campus: clean(campus),
    degree: clean(degree),
    section: clean(section),
    studentId: clean(studentId),
    togaSize: clean(togaSize),
    height: clean(height),
    remarks,
  };
}

function buildStructuredNotes({ school, campus, degree, section, studentId, togaSize, height, remarks }) {
  const parts = [];

  const cleanSchool = (school || '').trim();
  const cleanCampus = (campus || '').trim();
  const cleanDegree = (degree || '').trim();
  const cleanSection = (section || '').trim();
  const cleanStudentId = (studentId || '').trim();
  const cleanToga = (togaSize || '').trim();
  const cleanHeight = (height || '').trim();
  const cleanRemarks = (remarks || '').trim();

  const hasAcademic = cleanSchool || cleanCampus || cleanDegree || cleanSection || cleanStudentId || cleanToga || cleanHeight;

  if (hasAcademic) {
    const studentLines = ['[STUDENT & YEARBOOK DETAILS]'];
    if (cleanSchool) studentLines.push(`• School: ${cleanSchool}`);
    if (cleanCampus) studentLines.push(`• Campus / Address: ${cleanCampus}`);
    if (cleanDegree) studentLines.push(`• Degree / Strand: ${cleanDegree}`);
    if (cleanSection) studentLines.push(`• Section / Batch: ${cleanSection}`);
    if (cleanStudentId) studentLines.push(`• Student ID: ${cleanStudentId}`);
    if (cleanToga) studentLines.push(`• Toga Size: ${cleanToga}`);
    if (cleanHeight) studentLines.push(`• Height: ${cleanHeight}`);
    parts.push(studentLines.join('\n'));
  }

  if (cleanRemarks) {
    parts.push(`[SPECIAL INSTRUCTIONS]\n${cleanRemarks}`);
  }

  return parts.join('\n\n');
}

const PAGE_SIZE = 15;

export default function AdminBookings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearchParam = searchParams.get('search') || '';

  const { profile } = useAuth();

  // ── Core Data State ───────────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metadata for Selectors
  const [availableServices, setAvailableServices] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [availablePhotographers, setAvailablePhotographers] = useState([]);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearchParam);
  const [liveSearch, setLiveSearch] = useState(initialSearchParam);
  const [statusFilter, setStatus] = useState('');
  const [paymentFilter, setPayment] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('ALL');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Counts for tabs & KPI cards
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    inBay: 0,
    ready: 0,
    completed: 0,
    unpaid: 0,
    deleted: 0,
  });

  // Modals & Inspection Drawers
  const [inspectingBooking, setInspectingBooking] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [bookingToPermanentlyPurge, setBookingToPermanentlyPurge] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Create Mode: 'existing' or 'walkin'
  const [customerMode, setCustomerMode] = useState('existing');
  const [walkinClient, setWalkinClient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  // Create Form State
  const [newBooking, setNewBooking] = useState({
    customer_id: '',
    service_id: '',
    tier_name: 'Set A',
    event_date: '',
    preferred_time: '09:00:00',
    location: 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu',
    total_amount: 0,
    down_payment_amount: 0,
    status: 'PENDING',
    payment_status: 'UNPAID',
    school: '',
    course: '',
    student_id: '',
    section: '',
    toga_size: '',
    height: '',
    notes: '',
  });

  const debounceRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showToast = (text, type = 'success') => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // ── Photographer Availability State ─────────────────────────────────────────
  const [isPhotographerAvailabilityOpen, setIsPhotographerAvailabilityOpen] = useState(false);
  const [availDate, setAvailDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availTime, setAvailTime] = useState('09:00:00');
  const [photographersAvailabilityList, setPhotographersAvailabilityList] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const handleLoadPhotographerAvailability = useCallback(async (date, time) => {
    setLoadingAvail(true);
    try {
      const { data } = await getPhotographersWithWorkloadAndAvailability(date, time);
      setPhotographersAvailabilityList(data || []);
    } catch (err) {
      console.warn('handleLoadPhotographerAvailability error:', err);
    } finally {
      setLoadingAvail(false);
    }
  }, []);

  // ── School Pictorial Scheduler & Announcement Tool State ─────────────────────
  const [isSchoolSchedulerOpen, setIsSchoolSchedulerOpen] = useState(false);
  const [schoolBatchesList, setSchoolBatchesList] = useState([]);
  const [selectedBatchKey, setSelectedBatchKey] = useState('');
  const [batchEventDate, setBatchEventDate] = useState('');
  const [batchPreferredTime, setBatchPreferredTime] = useState('09:00:00');
  const [batchLocationType, setBatchLocationType] = useState('CAMPUS'); // 'CAMPUS' | 'STUDIO'
  const [batchCustomAddress, setBatchCustomAddress] = useState('');
  const [batchPhotographerId, setBatchPhotographerId] = useState('');
  const [batchAnnouncementText, setBatchAnnouncementText] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchPhotographersAvailability, setBatchPhotographersAvailability] = useState([]);

  // Fetch pending school batches across the database
  const fetchSchoolBatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          customer_id,
          status,
          event_date,
          preferred_time,
          location,
          notes,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email)
        `)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const batchesMap = {};
      for (const b of data) {
        const notes = b.notes || '';
        const parsed = parseStructuredNotes(notes);
        const isSchoolBooking = parsed.school || notes.includes('SCHOOL_PARTNER') || notes.includes('School Pictorial');
        const isPendingDate = !b.event_date || b.status === 'PENDING' || notes.includes('SCHOOL_PARTNER');

        if (isSchoolBooking && isPendingDate) {
          const schoolName = parsed.school || 'Designated School';
          const sectionName = parsed.section || 'All Sections';
          const key = `${schoolName}___${sectionName}`;

          if (!batchesMap[key]) {
            batchesMap[key] = {
              key,
              school: schoolName,
              campus: parsed.campus || '',
              section: sectionName,
              count: 0,
              bookingIds: [],
              students: [],
            };
          }
          batchesMap[key].count += 1;
          batchesMap[key].bookingIds.push(b.id);
          const studentName = b.customer
            ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email
            : 'Student';
          batchesMap[key].students.push(studentName);
        }
      }

      const list = Object.values(batchesMap);
      setSchoolBatchesList(list);

      if (list.length > 0 && !selectedBatchKey) {
        setSelectedBatchKey(list[0].key);
        setBatchCustomAddress(list[0].campus || '');
        setBatchAnnouncementText(
          `Graduation Pictorial confirmed for ${list[0].school}${list[0].section ? ` (${list[0].section})` : ''}. Photoshoot schedule is now locked in. Please review your booking pass for session details.`
        );
      }
    } catch (err) {
      console.warn('fetchSchoolBatches warning:', err);
    }
  }, [selectedBatchKey]);

  // When selected batch changes, update default announcement text and prefilled address
  const handleSelectBatch = (key) => {
    setSelectedBatchKey(key);
    const found = schoolBatchesList.find(b => b.key === key);
    if (found) {
      setBatchCustomAddress(found.campus || '');
      setBatchAnnouncementText(
        `Graduation Pictorial confirmed for ${found.school}${found.section ? ` (${found.section})` : ''}. Photoshoot schedule is now locked in. Please review your booking pass for session details.`
      );
    }
  };

  // Sync available photographers when batch date/time changes
  useEffect(() => {
    if (isSchoolSchedulerOpen && batchEventDate) {
      getPhotographersWithWorkloadAndAvailability(batchEventDate, batchPreferredTime).then(res => {
        setBatchPhotographersAvailability(res.data || []);
      });
    }
  }, [isSchoolSchedulerOpen, batchEventDate, batchPreferredTime]);

  const handleBatchScheduleSubmit = async (e) => {
    e.preventDefault();
    const batch = schoolBatchesList.find(b => b.key === selectedBatchKey);
    if (!batch) {
      showToast('Please select a school batch to schedule.', 'error');
      return;
    }
    if (!batchEventDate) {
      showToast('Please specify the confirmed pictorial date.', 'error');
      return;
    }

    setIsBatchSubmitting(true);

    const venue = batchLocationType === 'CAMPUS'
      ? `School Campus: ${batch.school}${batchCustomAddress ? ` (${batchCustomAddress})` : ''}`
      : 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu';

    const adminName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Studio Admin';

    const result = await batchScheduleSchoolPictorial({
      schoolName: batch.school,
      sectionName: batch.section === 'All Sections' ? null : batch.section,
      eventDate: batchEventDate,
      preferredTime: batchPreferredTime,
      location: venue,
      photographerId: batchPhotographerId || null,
      announcementMessage: batchAnnouncementText,
      adminId: profile?.id || null,
      adminName,
    });

    setIsBatchSubmitting(false);

    if (result.success) {
      showToast(`Confirmed pictorial schedule for ${result.count} student(s) at ${batch.school}! Announcement broadcasted.`);
      setIsSchoolSchedulerOpen(false);
      fetchBookings();
      fetchCounts();
      fetchSchoolBatches();
    } else {
      showToast(result.message || 'Failed to schedule pictorial batch.', 'error');
    }
  };

  const pendingSchoolCount = schoolBatchesList.reduce((sum, b) => sum + b.count, 0);

  // ── Fetch metadata (services, customers, photographers) ───────────────────
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [servicesRes, customersRes, photographersRes] = await Promise.all([
          supabase.from('services').select('id, name, base_price, category').eq('is_active', true).order('name'),
          supabase.from('profiles').select('id, first_name, last_name, phone, studio_specs').order('first_name'),
          supabase.from('photographer_profiles').select('id, specialization, profile:profiles(first_name, last_name)'),
        ]);

        if (servicesRes.data) setAvailableServices(servicesRes.data);
        if (customersRes.data) setAvailableCustomers(customersRes.data);
        if (photographersRes.data) setAvailablePhotographers(photographersRes.data);
      } catch (e) {
        console.warn('Metadata fetch warning:', e);
      }
    };
    fetchMetadata();
    fetchSchoolBatches();
  }, [fetchSchoolBatches]);

  // ── Fetch Global Counts for Sub-Navigation Tabs ────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const [allRes, pendingRes, confirmedRes, inBayRes, readyRes, completedRes, unpaidRes, deletedRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('status', 'PENDING'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('status', 'CONFIRMED'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').in('status', ['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'EDITING', 'PRINTING']),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('status', 'READY'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('status', 'COMPLETED'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').in('payment_status', ['UNPAID', 'PARTIAL']),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('is_deleted', true),
      ]);

      setCounts({
        total: allRes.count || 0,
        pending: pendingRes.count || 0,
        confirmed: confirmedRes.count || 0,
        inBay: inBayRes.count || 0,
        ready: readyRes.count || 0,
        completed: completedRes.count || 0,
        unpaid: unpaidRes.count || 0,
        deleted: deletedRes.count || 0,
      });
    } catch (err) {
      console.warn('Count fetch warning:', err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // ── Fetch Bookings List ───────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const isDeletedQuery = activeNavTab === 'DELETED';
    const { data, count, error: err } = await getAdminBookings({
      page,
      pageSize: PAGE_SIZE,
      search,
      statusFilter,
      paymentFilter,
      sortBy,
      sortAsc,
      isDeleted: isDeletedQuery,
    });

    if (err) {
      setError('Failed to load bookings from database.');
    } else {
      setBookings(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, paymentFilter, sortBy, sortAsc, activeNavTab]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Debounced search handler
  const handleSearchChange = (val) => {
    setLiveSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const clearFilters = () => {
    setStatus('');
    setPayment('');
    setSearch('');
    setLiveSearch('');
    setActiveNavTab('ALL');
    setPage(1);
  };

  // ── Quick Sub-Navigation Filter Handler ───────────────────────────────────
  const handleNavTabClick = (tabKey) => {
    setActiveNavTab(tabKey);
    setPage(1);
    switch (tabKey) {
      case 'ALL':
        setStatus('');
        setPayment('');
        break;
      case 'PENDING':
        setStatus('PENDING');
        setPayment('');
        break;
      case 'CONFIRMED':
        setStatus('CONFIRMED');
        setPayment('');
        break;
      case 'PRODUCTION':
        setStatus('CAPTURE');
        setPayment('');
        break;
      case 'READY':
        setStatus('READY');
        setPayment('');
        break;
      case 'COMPLETED':
        setStatus('COMPLETED');
        setPayment('');
        break;
      case 'UNPAID':
        setStatus('');
        setPayment('UNPAID');
        break;
      case 'DELETED':
        setStatus('');
        setPayment('');
        break;
      default:
        setStatus('');
        setPayment('');
    }
  };

  // ── Export CSV Handler ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    const headers = [
      'Booking Number',
      'Client First Name',
      'Client Last Name',
      'Phone',
      'Service',
      'Tier',
      'Event Date',
      'Preferred Time',
      'Lifecycle Status',
      'Payment Status',
      'Total Amount (PHP)',
      'Remaining Balance (PHP)'
    ];

    const rows = bookings.map(b => [
      b.booking_number || '',
      b.customer?.first_name || '',
      b.customer?.last_name || '',
      b.customer?.phone || '',
      b.service?.name || '',
      b.tier_name || '',
      b.event_date || '',
      b.preferred_time || '',
      b.status || '',
      b.payment_status || '',
      b.total_amount || 0,
      b.remaining_balance || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ekodak_bookings_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Copy Booking Ref Helper ───────────────────────────────────────────────
  const handleCopyRef = (refNum, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refNum);
    setCopiedRef(refNum);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  // ── INSERT CRUD (Create Booking) ──────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    let targetCustomerId = newBooking.customer_id;

    // Handle Walk-in / New Customer Creation
    if (customerMode === 'walkin') {
      if (!walkinClient.first_name.trim() || !walkinClient.last_name.trim()) {
        showToast('Please enter walk-in client first & last name.', 'error');
        return;
      }
      setIsSaving(true);
      try {
        const { data: newProfile, error: profErr } = await supabase
          .from('profiles')
          .insert({
            first_name: walkinClient.first_name.trim(),
            last_name: walkinClient.last_name.trim(),
            phone: walkinClient.phone.trim() || null,
            role: 'customer',
            is_active: true,
            studio_specs: {
              university: newBooking.school || null,
              degree: newBooking.course || null,
              toga_size: newBooking.toga_size || null,
              height: newBooking.height || null,
            },
          })
          .select('id, first_name, last_name, phone')
          .single();

        if (profErr) throw profErr;
        targetCustomerId = newProfile.id;
        setAvailableCustomers(prev => [newProfile, ...prev]);
      } catch (err) {
        setIsSaving(false);
        showToast('Could not register client: ' + err.message, 'error');
        return;
      }
    } else {
      if (!targetCustomerId) {
        showToast('Please select a client from the registry.', 'error');
        return;
      }
    }

    if (!newBooking.service_id || !newBooking.event_date) {
      setIsSaving(false);
      showToast('Please select a service and scheduled event date.', 'error');
      return;
    }

    setIsSaving(true);

    // Format consolidated notes with student details
    let studentBlock = '';
    if (newBooking.school || newBooking.course || newBooking.student_id || newBooking.toga_size) {
      studentBlock = `[STUDENT & YEARBOOK DETAILS]\n• School: ${newBooking.school || 'N/A'}\n• Degree / Program: ${newBooking.course || 'N/A'}\n• Section / Batch: ${newBooking.section || 'N/A'}\n• Student ID: ${newBooking.student_id || 'N/A'}\n• Toga Size / Height: ${[newBooking.toga_size, newBooking.height ? `(${newBooking.height})` : null].filter(Boolean).join(' ') || 'N/A'}`;
    }

    const consolidatedNotes = studentBlock
      ? (newBooking.notes ? `${studentBlock}\n\n${newBooking.notes}` : studentBlock)
      : (newBooking.notes || null);

    const { data, error: createErr } = await adminCreateBooking({
      ...newBooking,
      customer_id: targetCustomerId,
      notes: consolidatedNotes,
    });

    setIsSaving(false);

    if (createErr) {
      showToast(createErr.message || 'Failed to insert booking record', 'error');
    } else {
      showToast(`Booking #${data.booking_number} created successfully!`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewBooking({
        customer_id: '',
        service_id: '',
        tier_name: 'Set A',
        event_date: '',
        preferred_time: '09:00:00',
        location: 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu',
        total_amount: 0,
        down_payment_amount: 0,
        status: 'PENDING',
        payment_status: 'UNPAID',
        school: '',
        course: '',
        student_id: '',
        section: '',
        toga_size: '',
        height: '',
        notes: '',
      });
      setWalkinClient({ first_name: '', last_name: '', phone: '' });
      setCustomerMode('existing');
      fetchBookings();
      fetchCounts();
    }
  };

  // ── Open Edit Modal with Bi-directional Field Parsing ───────────────────
  const handleOpenEditModal = (b) => {
    const parsed = parseStructuredNotes(b.notes || '');
    const totalAmt = Number(b.total_amount ?? 0);
    const downAmt = Number(b.down_payment_amount ?? 0);
    const remainingBal = Number(b.remaining_balance ?? Math.max(0, totalAmt - downAmt));

    let refImgs = [];
    if (Array.isArray(b.reference_images)) {
      refImgs = b.reference_images;
    } else if (typeof b.reference_images === 'string') {
      try {
        const parsedImgs = JSON.parse(b.reference_images);
        if (Array.isArray(parsedImgs)) refImgs = parsedImgs;
      } catch {
        if (b.reference_images.trim()) refImgs = [b.reference_images.trim()];
      }
    }

    setEditingBooking({
      ...b,
      _originalStatus: b.status,
      // Customer profile fields
      customer_id: b.customer_id || b.customer?.id,
      first_name: b.customer?.first_name || '',
      last_name: b.customer?.last_name || '',
      phone: b.customer?.phone || '',
      // Customer academic & fitting specs
      school: parsed.school || '',
      campus: parsed.campus || '',
      degree: parsed.degree || '',
      section: parsed.section || '',
      student_id: parsed.studentId || '',
      toga_size: parsed.togaSize || b.toga_size || b.customer?.studio_specs?.toga_size || '',
      height: parsed.height || (b.customer?.studio_specs?.height_cm ? `${b.customer.studio_specs.height_cm} cm` : ''),
      client_remarks: parsed.remarks || '',
      reference_images: refImgs,
      // Order assignment & logistics
      photographer_id: b.photographer_id || b.photographer?.id || '',
      service_id: b.service_id || b.service?.id || '',
      tier_name: b.tier_name || 'Set A',
      event_date: b.event_date ? b.event_date.split('T')[0] : '',
      preferred_time: b.preferred_time || '',
      location: b.location || '',
      // Payment details
      total_amount: totalAmt,
      down_payment_amount: downAmt,
      remaining_balance: remainingBal,
      payment_status: b.payment_status || 'UNPAID',
    });
  };

  // ── UPDATE CRUD (Edit Booking, Customer & Progress) ───────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    setIsSaving(true);

    // 1. Update customer profile details if modified
    if (editingBooking.customer_id) {
      try {
        await supabase
          .from('profiles')
          .update({
            first_name: editingBooking.first_name?.trim() || '',
            last_name: editingBooking.last_name?.trim() || '',
            phone: editingBooking.phone?.trim() || null,
          })
          .eq('id', editingBooking.customer_id);
      } catch (profErr) {
        console.warn('Customer profile update error:', profErr);
      }
    }

    // 2. Rebuild minimal structured notes
    const consolidatedNotes = buildStructuredNotes({
      school: editingBooking.school,
      campus: editingBooking.campus,
      degree: editingBooking.degree,
      section: editingBooking.section,
      studentId: editingBooking.student_id,
      togaSize: editingBooking.toga_size,
      height: editingBooking.height,
      remarks: editingBooking.client_remarks,
    });

    const totalAmt = Math.max(0, Number(editingBooking.total_amount || 0));
    const downAmt = Math.max(0, Number(editingBooking.down_payment_amount || 0));
    const remainingBal = Math.max(0, totalAmt - downAmt);

    const updates = {
      status: editingBooking.status,
      payment_status: editingBooking.payment_status,
      service_id: editingBooking.service_id || null,
      tier_name: editingBooking.tier_name || null,
      photographer_id: editingBooking.photographer_id || null,
      event_date: editingBooking.event_date ? editingBooking.event_date.split('T')[0] : null,
      preferred_time: editingBooking.preferred_time || null,
      location: editingBooking.location || '',
      notes: consolidatedNotes,
      reference_images: editingBooking.reference_images || [],
      total_amount: totalAmt,
      down_payment_amount: downAmt,
      remaining_balance: remainingBal,
    };

    const { error: updateErr } = await adminUpdateBooking(editingBooking.id, updates);

    // 3. Record status history if stage changed
    if (!updateErr && editingBooking.status !== editingBooking._originalStatus) {
      try {
        await supabase.from('booking_status_history').insert([{
          booking_id: editingBooking.id,
          status: editingBooking.status,
          remarks: `Order stage updated to ${editingBooking.status}`,
          changed_by: profile?.id || null,
        }]);
      } catch (histErr) {
        console.warn('Could not record status history:', histErr);
      }
    }

    setIsSaving(false);

    if (updateErr) {
      showToast(updateErr.message || 'Failed to update order', 'error');
    } else {
      showToast(`Order #${editingBooking.booking_number} updated.`);
      setEditingBooking(null);
      fetchBookings();
      fetchCounts();
    }
  };

  // ── SOFT DELETE CRUD (Move to Trash) ──────────────────────────────────────
  const handleConfirmSoftDelete = async () => {
    if (!bookingToDelete) return;
    setIsDeleting(true);
    const deletedByName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Admin Staff';

    const { success, error: delErr } = await softDeleteBooking({
      bookingId: bookingToDelete.id,
      deletedById: profile?.id,
      deletedByName,
      reason: deleteReason || 'Moved to Trash by Admin',
    });

    setIsDeleting(false);
    if (!success) {
      showToast('Failed to archive booking: ' + (delErr?.message || 'Database error'), 'error');
    } else {
      showToast(`Booking #${bookingToDelete.booking_number || ''} moved to Deleted tab.`);
      setBookingToDelete(null);
      setDeleteReason('');
      fetchBookings();
      fetchCounts();
    }
  };

  // ── RECOVER CRUD (Restore from Trash) ─────────────────────────────────────
  const handleRestoreBooking = async (b) => {
    const restoredByName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Admin Staff';

    const { success, error: resErr } = await restoreBooking({
      bookingId: b.id,
      restoredById: profile?.id,
      restoredByName,
    });

    if (!success) {
      showToast('Failed to restore booking: ' + (resErr?.message || 'Database error'), 'error');
    } else {
      showToast(`Booking #${b.booking_number} recovered & restored to active queue!`);
      fetchBookings();
      fetchCounts();
    }
  };

  // ── PERMANENT DELETE CRUD (Hard Wipe) ──────────────────────────────────────
  const handleConfirmPermanentPurge = async () => {
    if (!bookingToPermanentlyPurge) return;
    setIsDeleting(true);
    const deletedByName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Admin Staff';

    const { success, error: delErr } = await deleteBookingPermanently({
      bookingId: bookingToPermanentlyPurge.id,
      deletedById: profile?.id,
      deletedByName,
      reason: 'Permanently purged from Deleted tab',
    });

    setIsDeleting(false);
    if (!success) {
      showToast('Failed to permanently delete: ' + (delErr?.message || 'Database error'), 'error');
    } else {
      showToast(`Booking #${bookingToPermanentlyPurge.booking_number} permanently erased.`);
      setBookingToPermanentlyPurge(null);
      fetchBookings();
      fetchCounts();
    }
  };

  // Dropdown options
  const statusDropdownOptions = [
    { value: '', label: 'All Statuses', dotColor: 'bg-neutral-400' },
    { value: 'PENDING', label: 'Pending Review', dotColor: 'bg-gold' },
    { value: 'CONFIRMED', label: 'Confirmed', dotColor: 'bg-neutral-900' },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', dotColor: 'bg-neutral-600' },
    { value: 'CAPTURE', label: 'In Studio Bay', dotColor: 'bg-gold' },
    { value: 'EDITING', label: 'In Post-Processing', dotColor: 'bg-neutral-600' },
    { value: 'READY', label: 'Ready for Pickup', dotColor: 'bg-gold' },
    { value: 'COMPLETED', label: 'Completed', dotColor: 'bg-neutral-900' },
    { value: 'REJECTED', label: 'Rejected', dotColor: 'bg-neutral-400' },
    { value: 'CANCELLED', label: 'Cancelled', dotColor: 'bg-neutral-300' },
  ];

  const paymentDropdownOptions = [
    { value: '', label: 'All Payments', dotColor: 'bg-neutral-400' },
    { value: 'PAID', label: 'Cleared (Paid)', dotColor: 'bg-neutral-900' },
    { value: 'UNPAID', label: 'Unpaid', dotColor: 'bg-gold' },
    { value: 'PARTIAL', label: 'Partial Balance', dotColor: 'bg-gold' },
    { value: 'REFUNDED', label: 'Refunded', dotColor: 'bg-neutral-300' },
  ];

  const sortDropdownOptions = [
    { value: 'created_at', label: 'Creation Date' },
    { value: 'event_date', label: 'Scheduled Event Date' },
    { value: 'booking_number', label: 'Booking Number' },
    { value: 'total_amount', label: 'Total Amount' },
  ];

  const queueDropdownOptions = [
    { value: 'ALL', label: 'All Bookings', badge: counts.total, dotColor: 'bg-primary', icon: CalendarDays },
    { value: 'PENDING', label: 'Pending Review', badge: counts.pending, dotColor: 'bg-gold', icon: Clock },
    { value: 'CONFIRMED', label: 'Confirmed Sessions', badge: counts.confirmed, dotColor: 'bg-blue-600', icon: CheckCircle2 },
    { value: 'PRODUCTION', label: 'In Production', badge: counts.inBay, dotColor: 'bg-purple-600', icon: Camera },
    { value: 'READY', label: 'Ready for Pickup', badge: counts.ready, dotColor: 'bg-emerald-600', icon: Package },
    { value: 'COMPLETED', label: 'Completed Orders', badge: counts.completed, dotColor: 'bg-neutral-500', icon: CheckCircle },
    { value: 'UNPAID', label: 'Unpaid / Balances', badge: counts.unpaid, dotColor: 'bg-amber-500', icon: AlertCircle },
    { value: 'DELETED', label: 'Deleted (Trash)', badge: counts.deleted, dotColor: 'bg-rose-500', icon: Trash2 },
  ];

  // Sequential Pipeline Stages for Edit Order Progress
  const ORDER_STAGES = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PHOTOGRAPHER_ASSIGNED', label: 'Assigned' },
    { key: 'CAPTURE', label: 'Shoot' },
    { key: 'EDITING', label: 'Editing' },
    { key: 'READY', label: 'Ready' },
    { key: 'COMPLETED', label: 'Done' },
  ];

  const PAYMENT_STAGES = [
    { key: 'UNPAID', label: 'Unpaid' },
    { key: 'PARTIAL', label: 'Partial' },
    { key: 'PAID', label: 'Paid' },
    { key: 'REFUNDED', label: 'Refunded' },
  ];

  // Options for Edit Booking Modal
  const editStatusOptions = [
    { value: 'PENDING', label: 'Pending Review', dotColor: 'bg-amber-500' },
    { value: 'CONFIRMED', label: 'Confirmed Schedule', dotColor: 'bg-blue-600' },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', dotColor: 'bg-indigo-600' },
    { value: 'CAPTURE', label: 'In Studio (Capture)', dotColor: 'bg-purple-600' },
    { value: 'EDITING', label: 'Post-Processing (Editing)', dotColor: 'bg-cyan-600' },
    { value: 'READY', label: 'Ready for Pickup / Release', dotColor: 'bg-emerald-600' },
    { value: 'COMPLETED', label: 'Completed Order', dotColor: 'bg-neutral-800' },
    { value: 'CANCELLED', label: 'Cancelled', dotColor: 'bg-neutral-400' },
    { value: 'REJECTED', label: 'Rejected', dotColor: 'bg-rose-500' },
  ];

  const editPaymentOptions = [
    { value: 'UNPAID', label: 'Unpaid (No Settlement)', dotColor: 'bg-amber-500' },
    { value: 'PARTIAL', label: 'Partial Deposit (Balance Remaining)', dotColor: 'bg-gold' },
    { value: 'PAID', label: 'Paid in Full (Cleared)', dotColor: 'bg-emerald-600' },
    { value: 'REFUNDED', label: 'Refunded', dotColor: 'bg-neutral-400' },
  ];

  const editPhotographerOptions = [
    { value: '', label: 'Unassigned (Assign Later)', dotColor: 'bg-neutral-300' },
    ...availablePhotographers.map(p => {
      const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || 'Photographer';
      const spec = p.specialization ? ` (${p.specialization})` : '';
      return {
        value: p.id,
        label: `${name}${spec}`,
        dotColor: 'bg-indigo-500',
      };
    }),
  ];

  const editServiceOptions = [
    { value: '', label: 'Select photography service package...', dotColor: 'bg-neutral-300' },
    ...availableServices.map(s => ({
      value: s.id,
      label: `${s.name} (₱${Number(s.base_price || 0).toLocaleString()})`,
      dotColor: 'bg-gold',
    })),
  ];

  const TOGA_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Custom'];

  const togaDropdownOptions = [
    { value: '', label: 'Select Toga Size...', dotColor: 'bg-neutral-300' },
    { value: 'XS', label: 'Extra Small (XS)' },
    { value: 'S', label: 'Small (S)' },
    { value: 'M', label: 'Medium (M)' },
    { value: 'L', label: 'Large (L)' },
    { value: 'XL', label: 'Extra Large (XL)' },
    { value: '2XL', label: 'Double Extra Large (2XL)' },
    { value: '3XL', label: 'Triple Extra Large (3XL)' },
  ];

  const isDeletedTab = activeNavTab === 'DELETED';

  return (
    <div className="space-y-6 animate-fade-in max-w-screen-2xl mx-auto pb-16 font-body">

      {/* ── Toast Notification ───────────────────────────────────────── */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-2 text-xs font-semibold"
          >
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-gold" />
            ) : (
              <AlertCircle size={16} className="text-neutral-400" />
            )}
            <span>{actionNotice.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Luxury Dark Hero Banner adapted for Booking Management ─────── */}
      <AdminHeroBanner
        station={profile?.role || 'admin'}
        badgeLabel={isDeletedTab ? 'Trash & Archives' : 'Booking Management'}
        badgeIcon={isDeletedTab ? Trash2 : CalendarDays}
        title={isDeletedTab ? 'Trash & Deleted Bookings' : 'Bookings Management'}
        subtitle={
          isDeletedTab
            ? 'Review archived bookings. Recover any record back to active queue or permanently purge.'
            : 'Review, schedule, and systematically manage all customer photography sessions.'
        }
        statusSummary={`${counts.total || 0} Total in Database · ${counts.pending || 0} Awaiting Review · ${counts.inBay || 0} In Production`}
        primaryAction={{
          label: 'New Booking',
          icon: Plus,
          onClick: () => setIsCreateModalOpen(true),
        }}
        secondaryAction={{
          label: 'Export CSV',
          icon: Download,
          onClick: handleExportCSV,
        }}
        onRefresh={() => { fetchBookings(); fetchCounts(); }}
        isRefreshing={loading}
        onExport={handleExportCSV}
        extraTools={[
          {
            label: 'Scan QR Pass',
            onClick: () => setIsQrScannerOpen(true),
            icon: QrCode,
            iconColor: 'text-gold'
          },
          {
            label: 'Check Photographers',
            onClick: () => {
              setIsPhotographerAvailabilityOpen(true);
              handleLoadPhotographerAvailability(availDate, availTime);
            },
            icon: Camera,
            iconColor: 'text-gold'
          },
          {
            label: 'School Pictorial Tool',
            onClick: () => {
              setIsSchoolSchedulerOpen(true);
              fetchSchoolBatches();
            },
            icon: GraduationCap,
            iconColor: 'text-gold'
          },
          { label: 'Workstation Hub', href: '/admin/workstation', icon: ArrowRightLeft, iconColor: 'text-gold' },
          { label: 'Record Payment', href: '/admin/payments', icon: CreditCard, iconColor: 'text-gold' },
          { label: 'Photographers', href: '/admin/photographers', icon: Camera, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── 2. KPI Overview Metric Strip (Only in Active views) ──────── */}
      {!isDeletedTab && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total in DB', val: counts.total, key: 'ALL', icon: CalendarDays, color: 'text-primary' },
            { label: 'Pending', val: counts.pending, key: 'PENDING', icon: Clock, color: 'text-gold-dark' },
            { label: 'Confirmed', val: counts.confirmed, key: 'CONFIRMED', icon: CheckCircle2, color: 'text-primary' },
            { label: 'In Studio', val: counts.inBay, key: 'PRODUCTION', icon: Camera, color: 'text-primary' },
            { label: 'Ready for Pickup', val: counts.ready, key: 'READY', icon: Package, color: 'text-gold-dark' },
            { label: 'Pending Payment', val: counts.unpaid, key: 'UNPAID', icon: AlertCircle, color: 'text-gold-dark' },
          ].map((kpi, idx) => (
            <motion.button
              key={idx}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavTabClick(kpi.key)}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer select-none bg-white hover:border-gold/60 hover:shadow-sm ${
                activeNavTab === kpi.key
                  ? 'border-gold ring-2 ring-gold/20 bg-gold/5'
                  : 'border-neutral-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  {kpi.label}
                </span>
                <kpi.icon size={16} className={kpi.color} />
              </div>
              <p className={`text-2xl sm:text-3xl font-heading font-bold ${kpi.color}`}>
                <AnimatedCounter value={kpi.val} />
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {/* ── 2.5. School Pictorial Batch Scheduling Alert & Action Banner ── */}
      {pendingSchoolCount > 0 && !isDeletedTab && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 border border-amber-500/30">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-heading font-bold text-primary">
                  {pendingSchoolCount} Student{pendingSchoolCount > 1 ? 's' : ''} Awaiting School Pictorial Schedule
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/40">
                  {schoolBatchesList.length} School Batch{schoolBatchesList.length > 1 ? 'es' : ''}
                </span>
              </div>
              <p className="text-xs text-neutral-600 font-body mt-0.5">
                Students registered under school partner agreements need the confirmed photoshoot date, venue, and photographer assignment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setIsSchoolSchedulerOpen(true);
                fetchSchoolBatches();
              }}
              className="btn-gold text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm justify-center flex-1 sm:flex-none cursor-pointer"
            >
              <Megaphone size={14} /> Schedule & Broadcast
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPhotographerAvailabilityOpen(true);
                handleLoadPhotographerAvailability(availDate, availTime);
              }}
              className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 bg-white shadow-xs justify-center flex-1 sm:flex-none cursor-pointer"
            >
              <Camera size={14} className="text-gold" /> Check Photographers
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Search & Filter Toolbar ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          
          {/* Booking Queue Dropdown (Replaces horizontal tab strip) */}
          <div className="sm:col-span-3">
            <CustomDropdown
              value={activeNavTab}
              onChange={handleNavTabClick}
              options={queueDropdownOptions}
              placeholder="Booking Queue"
              icon={Layers}
              className="w-full"
              popoverWidth="w-64"
            />
          </div>

          {/* Search Bar with Quick QR Scanner Trigger */}
          <div className="sm:col-span-3 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by booking #, client, school..."
              value={liveSearch}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-16 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200 focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all shadow-2xs"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {liveSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsQrScannerOpen(true)}
                className="p-1 rounded-lg text-neutral-400 hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                title="Scan Customer QR Pass"
              >
                <QrCode size={15} />
              </button>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-2">
            <CustomDropdown
              value={statusFilter}
              onChange={val => { setStatus(val); setPage(1); }}
              options={statusDropdownOptions}
              placeholder="All Statuses"
              className="w-full"
              popoverWidth="w-56"
            />
          </div>

          {/* Payment Dropdown */}
          <div className="sm:col-span-2">
            <CustomDropdown
              value={paymentFilter}
              onChange={val => { setPayment(val); setPage(1); }}
              options={paymentDropdownOptions}
              placeholder="All Payments"
              className="w-full"
              popoverWidth="w-52"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="sm:col-span-2">
            <CustomDropdown
              value={sortBy}
              onChange={val => { setSortBy(val); setPage(1); }}
              options={sortDropdownOptions}
              placeholder="Sort By"
              className="w-full"
              popoverWidth="w-52"
            />
          </div>

        </div>

        {/* Active Filter Chips */}
        {(statusFilter || paymentFilter || search || activeNavTab !== 'ALL') && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-neutral-100 flex-wrap text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Active Filters:</span>
            {activeNavTab !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-primary text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Queue: {queueDropdownOptions.find(q => q.value === activeNavTab)?.label || activeNavTab}
                <X size={11} className="cursor-pointer" onClick={() => handleNavTabClick('ALL')} />
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 bg-gold/10 text-gold-dark text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gold/25">
                Status: {statusFilter}
                <X size={11} className="cursor-pointer" onClick={() => { setStatus(''); setPage(1); }} />
              </span>
            )}
            {paymentFilter && (
              <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200">
                Payment: {paymentFilter}
                <X size={11} className="cursor-pointer" onClick={() => { setPayment(''); setPage(1); }} />
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200">
                "{search}"
                <X size={11} className="cursor-pointer" onClick={() => { setSearch(''); setLiveSearch(''); setPage(1); }} />
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-neutral-400 hover:text-primary underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Main Bookings Table (Active vs Deleted) ──────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm font-body">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 text-left">
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setSortAsc(!sortAsc)}>
                    <span>Booking #</span>
                    <ArrowUpDown size={12} className="text-neutral-400" />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">Customer</th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden md:table-cell">Service</th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => { setSortBy('event_date'); setSortAsc(!sortAsc); }}>
                    <span>Event Date</span>
                    <ArrowUpDown size={12} className="text-neutral-400" />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">Status</th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">Payment</th>
                {isDeletedTab ? (
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden xl:table-cell">Deleted At & Reason</th>
                ) : (
                  <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden xl:table-cell">Photographer</th>
                )}
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => { setSortBy('created_at'); setSortAsc(!sortAsc); }}>
                    <span>Created</span>
                    <ArrowUpDown size={12} className="text-neutral-400" />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-5 sm:px-6 py-5">
                      <div className="h-6 bg-neutral-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    {isDeletedTab ? (
                      <>
                        <Trash2 size={34} className="mx-auto text-neutral-300 mb-2.5" />
                        <p className="text-base text-neutral-600 font-semibold">Trash is empty</p>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1">No soft-deleted bookings found.</p>
                      </>
                    ) : (
                      <>
                        <CalendarDays size={34} className="mx-auto text-neutral-300 mb-2.5" />
                        <p className="text-base text-neutral-600 font-semibold">No bookings found in database</p>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1">Try adjusting your filters or search query.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const cust = b.customer;
                  const ph = b.photographer?.profile;
                  const sizeBadge = getCustomerSize(cust, b);

                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/admin/bookings/${b.id}`)}
                      title="Click directly to open full record page"
                      className={`transition-colors ${isDeletedTab ? 'bg-neutral-50/40 hover:bg-neutral-100/50' : 'hover:bg-gold/8'} cursor-pointer group`}
                    >
                      {/* Booking # & ID */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/admin/bookings/${b.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-xs sm:text-sm font-bold text-gold hover:text-primary hover:underline transition-colors"
                              title="Go to full record page"
                            >
                              {b.booking_number}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyRef(b.booking_number, e);
                              }}
                              className="text-neutral-300 hover:text-gold transition-colors p-0.5 cursor-pointer"
                              title="Copy booking number"
                            >
                              {copiedRef === b.booking_number ? (
                                <Check size={12} className="text-gold" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <p className="font-mono text-[10px] text-neutral-400">
                            ID: {b.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>

                      {/* Customer with Size & University */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              to={`/admin/bookings/${b.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-neutral-900 text-sm sm:text-base hover:text-gold transition-colors"
                              title="Go to customer full record page"
                            >
                              {cust ? `${cust.first_name} ${cust.last_name}` : '—'}
                            </Link>
                            {sizeBadge && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                {sizeBadge}
                              </span>
                            )}
                          </div>
                          {(cust?.studio_specs?.university || cust?.studio_specs?.degree) && (
                            <p className="text-xs text-neutral-500 flex items-center gap-1 truncate max-w-[200px]">
                              <GraduationCap size={12} className="text-gold-dark shrink-0" />
                              <span className="truncate">{cust.studio_specs.university || cust.studio_specs.degree}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Service & Tier */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="font-medium text-neutral-800 text-xs sm:text-sm truncate max-w-[220px]">
                            {b.service?.name || 'Studio Photography'}
                          </p>
                          {b.tier_name && (
                            <span className="text-[10px] font-bold uppercase text-gold-dark bg-gold/10 px-2 py-0.5 rounded border border-gold/20 inline-block">
                              {b.tier_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Event Date */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden lg:table-cell text-xs sm:text-sm text-neutral-600">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={13} className="text-gold-dark flex-shrink-0" />
                            {b.event_date ? (
                              <span>{fmtDate(b.event_date)}</span>
                            ) : (b.student_details?.booking_mode === 'SCHOOL_PARTNER' || (b.notes || '').includes('School Pictorial') || (b.notes || '').includes('Official School Partner') || (b.notes || '').includes('School Partner Agreement')) ? (
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                School Pictorial
                              </span>
                            ) : (
                              <span className="text-neutral-400">Date Pending</span>
                            )}
                          </div>
                          {b.preferred_time ? (
                            <p className="text-xs text-neutral-400 pl-4">
                              {formatTime(b.preferred_time)}
                            </p>
                          ) : (b.student_details?.booking_mode === 'SCHOOL_PARTNER' || (b.notes || '').includes('School Pictorial') || (b.notes || '').includes('Official School Partner') || (b.notes || '').includes('School Partner Agreement')) ? (
                            <p className="text-[10px] text-amber-700 pl-4 italic">
                              Schedule TBD
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* Status Column (Lifecycle only, no redundant payment badge) */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <BookingLifecycleBadge
                          status={b.status}
                          showStatus={true}
                          showPayment={false}
                        />
                      </td>

                      {/* Payment Column */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <BookingLifecycleBadge
                          paymentStatus={b.payment_status}
                          showStatus={false}
                          showPayment={true}
                        />
                      </td>

                      {/* Photographer or Deletion Details */}
                      {isDeletedTab ? (
                        <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden xl:table-cell text-xs">
                          <div className="space-y-0.5">
                            <p className="text-neutral-700 font-medium text-xs">
                              {fmtDate(b.deleted_at)}
                            </p>
                            <p className="text-neutral-400 text-[11px] italic truncate max-w-[180px]">
                              {b.deletion_reason || 'Archived'}
                            </p>
                          </div>
                        </td>
                      ) : (
                        <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden xl:table-cell text-xs sm:text-sm">
                          {ph ? (
                            <div className="flex items-center gap-1.5">
                              <Camera size={13} className="text-gold-dark shrink-0" />
                              <span className="font-medium text-neutral-800 truncate max-w-[140px]">
                                {ph.first_name} {ph.last_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}

                      {/* Created */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden sm:table-cell text-xs sm:text-sm text-neutral-400">
                        {fmtDate(b.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {isDeletedTab ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* View Button */}
                            <Link
                              to={`/admin/bookings/${b.id}`}
                              className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-primary border border-neutral-200 rounded-xl text-xs font-semibold transition-all shadow-2xs inline-flex items-center gap-1.5"
                              title="Open full record page"
                            >
                              <span>View</span>
                              <ExternalLink size={12} className="text-neutral-400" />
                            </Link>

                            {/* Recover / Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestoreBooking(b)}
                              className="h-8 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-gold text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs border border-gold/30 transition-all cursor-pointer"
                              title="Recover booking back to active queue"
                            >
                              <RotateCcw size={13} />
                              <span>Recover</span>
                            </button>

                            {/* Permanently Delete Purge Button */}
                            <button
                              type="button"
                              onClick={() => setBookingToPermanentlyPurge(b)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Permanently Delete (Purge)"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* View Full Record Button */}
                            <Link
                              to={`/admin/bookings/${b.id}`}
                              className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-primary border border-neutral-200 rounded-xl text-xs font-semibold transition-all shadow-2xs inline-flex items-center gap-1.5 group/btn"
                              title="Open full customer booking record page"
                            >
                              <span>View</span>
                              <ExternalLink size={12} className="text-gold group-hover/btn:translate-x-0.5 transition-transform" />
                            </Link>

                            {/* Edit Details */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(b)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Soft Delete (Move to Trash) */}
                            <button
                              type="button"
                              onClick={() => {
                                setBookingToDelete(b);
                                setDeleteReason('');
                              }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Move to Trash"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Live DB Sync & Pagination Footer */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-neutral-200 flex items-center justify-between text-xs sm:text-sm text-neutral-500 font-body flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold inline-block animate-pulse" />
            <span>
              Showing {bookings.length} of {total} {isDeletedTab ? 'deleted' : 'active'} records from live database
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Create Booking Modal (INSERT CRUD) ──────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-neutral-950 via-[#141414] to-primary text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
                  Database Insertion
                </span>
                <h3 className="font-heading text-lg font-bold text-white mt-1">Create New Booking</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-body scrollbar-thin">
              
              {/* Customer Mode Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Client Registry Mode *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customerMode === 'existing'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <User size={13} />
                    <span>Existing Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('walkin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      customerMode === 'walkin'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <UserPlus size={13} />
                    <span>New / Walk-in Client</span>
                  </button>
                </div>

                {customerMode === 'existing' ? (
                  <select
                    value={newBooking.customer_id}
                    onChange={e => setNewBooking({ ...newBooking, customer_id: e.target.value })}
                    required={customerMode === 'existing'}
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  >
                    <option value="">Select a registered customer...</option>
                    {availableCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-semibold mb-1">First Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Maria"
                        value={walkinClient.first_name}
                        onChange={e => setWalkinClient({ ...walkinClient, first_name: e.target.value })}
                        required={customerMode === 'walkin'}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 text-xs outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-semibold mb-1">Last Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Santos"
                        value={walkinClient.last_name}
                        onChange={e => setWalkinClient({ ...walkinClient, last_name: e.target.value })}
                        required={customerMode === 'walkin'}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 text-xs outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-semibold mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="0917..."
                        value={walkinClient.phone}
                        onChange={e => setWalkinClient({ ...walkinClient, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 text-xs outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Service & Tier Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Photography Service *
                  </label>
                  <select
                    value={newBooking.service_id}
                    onChange={e => {
                      const svc = availableServices.find(s => s.id === e.target.value);
                      setNewBooking({
                        ...newBooking,
                        service_id: e.target.value,
                        total_amount: svc?.base_price || 0,
                      });
                    }}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  >
                    <option value="">Select package...</option>
                    {availableServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₱{Number(s.base_price || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Package Tier
                  </label>
                  <input
                    type="text"
                    value={newBooking.tier_name}
                    onChange={e => setNewBooking({ ...newBooking, tier_name: e.target.value })}
                    placeholder="e.g. Set A / Deluxe"
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  />
                </div>
              </div>

              {/* Schedule Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={newBooking.event_date}
                    onChange={e => setNewBooking({ ...newBooking, event_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Preferred Time Slot
                  </label>
                  <input
                    type="time"
                    value={newBooking.preferred_time}
                    onChange={e => setNewBooking({ ...newBooking, preferred_time: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Studio Location
                </label>
                <input
                  type="text"
                  value={newBooking.location}
                  onChange={e => setNewBooking({ ...newBooking, location: e.target.value })}
                  placeholder="Studio branch or location address"
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                />
              </div>

              {/* Financials & Clearance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Total Amount (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBooking.total_amount}
                    onChange={e => setNewBooking({ ...newBooking, total_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Initial Payment Clearance
                  </label>
                  <select
                    value={newBooking.payment_status}
                    onChange={e => setNewBooking({ ...newBooking, payment_status: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial Balance</option>
                    <option value="PAID">Paid / Cleared</option>
                  </select>
                </div>
              </div>

              {/* Student & Yearbook Details */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-gold-dark" />
                  Student & Yearbook Details
                </label>

                <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/80 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">School / University</span>
                      <input
                        type="text"
                        placeholder="e.g. University of San Carlos"
                        value={newBooking.school}
                        onChange={e => setNewBooking({ ...newBooking, school: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Degree / Strand</span>
                      <input
                        type="text"
                        placeholder="e.g. BS Computer Science"
                        value={newBooking.course}
                        onChange={e => setNewBooking({ ...newBooking, course: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Student ID</span>
                      <input
                        type="text"
                        placeholder="e.g. 21-0492-381"
                        value={newBooking.student_id}
                        onChange={e => setNewBooking({ ...newBooking, student_id: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Campus / Section</span>
                      <input
                        type="text"
                        placeholder="e.g. Main Campus / 4-A"
                        value={newBooking.section}
                        onChange={e => setNewBooking({ ...newBooking, section: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Toga Size</span>
                      <input
                        type="text"
                        placeholder="e.g. S, M, L, XL"
                        value={newBooking.toga_size}
                        onChange={e => setNewBooking({ ...newBooking, toga_size: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Height</span>
                      <input
                        type="text"
                        placeholder="e.g. 5'7 or 170cm"
                        value={newBooking.height}
                        onChange={e => setNewBooking({ ...newBooking, height: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  General Intake Notes
                </label>
                <textarea
                  rows={2}
                  value={newBooking.notes}
                  onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}
                  placeholder="Special instructions, studio requests, etc."
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin text-gold" /> : <Save size={14} />}
                  <span>Save to Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Order Progress, Customer & Payment Manager Modal ─── */}
      {editingBooking && (() => {
        const totalAmt = Number(editingBooking.total_amount || 0);
        const downAmt = Number(editingBooking.down_payment_amount || 0);
        const calculatedBalance = Math.max(0, totalAmt - downAmt);
        const currentStageIndex = ORDER_STAGES.findIndex(s => s.key === editingBooking.status);

        return (
          <div className="fixed inset-0 z-50 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
              
              {/* Minimal Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-neutral-950 via-[#141414] to-primary text-white flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-heading text-base font-bold text-white tracking-wide">
                    Edit Order
                  </span>
                  <span className="text-xs text-gold font-mono font-medium">
                    #{editingBooking.booking_number}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/admin/bookings/${editingBooking.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1 transition-all border border-white/10"
                    title="View Full Customer Record"
                  >
                    <span>Record</span>
                    <ExternalLink size={11} className="text-gold" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-body scrollbar-thin">
                
                {/* 1. ORDER PROGRESS PIPELINE & STATUS DROPDOWN */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <CustomDropdown
                        value={editingBooking.status}
                        onChange={val => setEditingBooking({ ...editingBooking, status: val })}
                        options={editStatusOptions}
                        label="Order Stage"
                        className="w-full"
                        popoverWidth="w-64"
                      />
                    </div>
                    <div className="flex items-center gap-1 sm:self-end pb-0.5">
                      {['CANCELLED', 'REJECTED'].map(termStatus => (
                        <button
                          key={termStatus}
                          type="button"
                          onClick={() => setEditingBooking({ ...editingBooking, status: termStatus })}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                            editingBooking.status === termStatus
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {termStatus === 'CANCELLED' ? 'Cancel' : 'Reject'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stage Stepper Buttons */}
                  <div className="grid grid-cols-7 gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200/80">
                    {ORDER_STAGES.map((st, idx) => {
                      const isActive = editingBooking.status === st.key;
                      const isPast = currentStageIndex > -1 && idx < currentStageIndex;

                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setEditingBooking({ ...editingBooking, status: st.key })}
                          className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center min-w-0 ${
                            isActive
                              ? 'bg-neutral-900 text-gold shadow-xs font-bold ring-1 ring-gold/40'
                              : isPast
                              ? 'bg-white text-neutral-800 hover:bg-neutral-50 font-medium'
                              : 'text-neutral-400 hover:text-neutral-700 hover:bg-white/60 font-medium'
                          }`}
                        >
                          <span className={`text-[9px] font-mono leading-none mb-0.5 ${isActive ? 'text-gold' : 'text-neutral-400'}`}>
                            {idx + 1}
                          </span>
                          <span className="text-[11px] truncate w-full leading-tight">
                            {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CUSTOMER CONTACT */}
                <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Customer Contact
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">First Name</span>
                      <input
                        type="text"
                        value={editingBooking.first_name || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, first_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Last Name</span>
                      <input
                        type="text"
                        value={editingBooking.last_name || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, last_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Phone</span>
                      <input
                        type="text"
                        value={editingBooking.phone || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                        placeholder="09..."
                        className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:border-gold outline-none text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. STUDENT & YEARBOOK DETAILS */}
                <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-gold-dark" />
                    Student & Yearbook Details
                  </label>

                  <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/80 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">School / University</span>
                        <input
                          type="text"
                          value={editingBooking.school || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, school: e.target.value })}
                          placeholder="e.g. University of San Carlos"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Degree / Strand</span>
                        <input
                          type="text"
                          value={editingBooking.degree || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, degree: e.target.value })}
                          placeholder="e.g. BS Information Technology"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Student ID</span>
                        <input
                          type="text"
                          value={editingBooking.student_id || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, student_id: e.target.value })}
                          placeholder="e.g. 21-0492-381"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Campus / Section</span>
                        <input
                          type="text"
                          value={editingBooking.section || editingBooking.campus || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, section: e.target.value, campus: e.target.value })}
                          placeholder="e.g. Main Campus / 4-A"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Toga Size</span>
                        <input
                          type="text"
                          value={editingBooking.toga_size || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, toga_size: e.target.value })}
                          placeholder="e.g. S, M, L, XL"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-500 font-semibold mb-1">Height</span>
                        <input
                          type="text"
                          value={editingBooking.height || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, height: e.target.value })}
                          placeholder="e.g. 5'7 or 170cm"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PAYMENT & CHARGES WITH CURRENT DROPDOWN UI */}
                <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <CustomDropdown
                        value={editingBooking.payment_status}
                        onChange={val => setEditingBooking({ ...editingBooking, payment_status: val })}
                        options={editPaymentOptions}
                        label="Payment State"
                        className="w-full"
                        popoverWidth="w-56"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Total Amount (₱)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingBooking.total_amount ?? 0}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingBooking({
                            ...editingBooking,
                            total_amount: val,
                            remaining_balance: Math.max(0, Number(val || 0) - Number(editingBooking.down_payment_amount || 0)),
                          });
                        }}
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Paid / Deposit (₱)</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingBooking.down_payment_amount ?? 0}
                          onChange={e => {
                            const val = e.target.value;
                            setEditingBooking({
                              ...editingBooking,
                              down_payment_amount: val,
                              remaining_balance: Math.max(0, Number(editingBooking.total_amount || 0) - Number(val || 0)),
                            });
                          }}
                          className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs font-semibold"
                        />
                        <span className="absolute right-2.5 text-[11px] font-bold text-neutral-500 pointer-events-none">
                          Bal: ₱{calculatedBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SCHEDULE & ASSIGNMENT WITH CURRENT DROPDOWN UI */}
                <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Schedule & Assignment
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <CustomDropdown
                      value={editingBooking.service_id || ''}
                      onChange={val => {
                        const svc = availableServices.find(s => s.id === val);
                        setEditingBooking({
                          ...editingBooking,
                          service_id: val,
                          total_amount: svc?.base_price ?? editingBooking.total_amount,
                        });
                      }}
                      options={editServiceOptions}
                      label="Service Package"
                      className="w-full"
                      popoverWidth="w-72"
                    />

                    <CustomDropdown
                      value={editingBooking.photographer_id || ''}
                      onChange={val => setEditingBooking({ ...editingBooking, photographer_id: val })}
                      options={editPhotographerOptions}
                      label="Assigned Photographer"
                      className="w-full"
                      popoverWidth="w-72"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Date</span>
                      <input
                        type="date"
                        value={editingBooking.event_date ? editingBooking.event_date.split('T')[0] : ''}
                        onChange={e => setEditingBooking({ ...editingBooking, event_date: e.target.value })}
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Time</span>
                      <input
                        type="time"
                        value={editingBooking.preferred_time || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, preferred_time: e.target.value })}
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5">Studio / Location</span>
                      <input
                        type="text"
                        value={editingBooking.location || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, location: e.target.value })}
                        placeholder="Studio branch or venue"
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. INTAKE NOTES & CLIENT REQUIREMENTS */}
                <div className="pt-2 border-t border-neutral-100">
                  <div className="bg-neutral-50/80 rounded-2xl border border-neutral-200/90 p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gold/15 text-gold-dark flex items-center justify-center">
                          <FileText size={12} />
                        </div>
                        <span className="font-heading text-xs font-bold uppercase tracking-wider text-neutral-800">
                          Intake Notes & Client Requests
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Syncs to Order & Invoice
                      </span>
                    </div>

                    {/* Client Uploaded Reference Images (Only displayed when photos exist) */}
                    {editingBooking.reference_images?.length > 0 && (
                      <div className="space-y-1.5 pb-2.5 border-b border-neutral-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <FileImage size={12} className="text-gold-dark" />
                            Client Reference Pegs ({editingBooking.reference_images.length})
                          </span>
                          <span className="text-[9px] text-neutral-400">Click to enlarge</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-xl border border-neutral-200/80">
                          {editingBooking.reference_images.map((imgItem, idx) => {
                            const imgUrl = getRefImageUrl(imgItem);
                            return (
                              <div
                                key={idx}
                                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs flex-shrink-0 cursor-pointer hover:border-gold transition-all"
                                onClick={() => setPreviewImage(imgUrl)}
                                title="Click to inspect full image"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Client peg ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/150x150?text=No+Preview';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                                  <Maximize2 size={14} />
                                </div>
                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-[8px] text-white font-mono">
                                  #{idx + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Textarea for Special Instructions / Notes */}
                    <div className="space-y-1">
                      <span className="block text-[10px] text-neutral-400 font-semibold">Special Instructions & Client Notes</span>
                      <textarea
                        rows={3}
                        value={editingBooking.client_remarks || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, client_remarks: e.target.value })}
                        placeholder="Enter special instructions, pose preferences, or retouching notes..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-300 focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs leading-relaxed resize-none shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSaving ? <RefreshCw size={13} className="animate-spin text-gold" /> : <Save size={13} />}
                    <span>Save Changes</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* ── 8. Soft Delete Modal (Move to Trash) ────────────────────────── */}
      {bookingToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isDeleting && setBookingToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold/10 text-gold-dark flex items-center justify-center shrink-0 border border-gold/20">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary">Move Booking to Trash</h3>
                <p className="text-xs text-neutral-500 font-body mt-1">
                  Booking <strong className="text-primary font-bold">#{bookingToDelete.booking_number}</strong> ({bookingToDelete.customer?.first_name || 'Client'}) will be moved to the <strong className="text-primary">Deleted</strong> tab.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-1 font-body">
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <RotateCcw size={13} className="text-gold-dark" /> Reversible Soft Deletion:
              </p>
              <ul className="list-disc list-inside text-[11px] text-neutral-600 space-y-0.5 ml-1">
                <li>Booking will disappear from active operational views</li>
                <li>Preserves booking record and ID completely</li>
                <li>Can be restored back to active queue anytime from Deleted tab</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Reason for Archiving (Optional)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Client cancelled, duplicate entry, schedule changed"
                className="w-full px-3.5 py-2 text-xs font-body border border-neutral-200 rounded-xl outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBookingToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSoftDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gold border border-gold/40 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-gold" />
                    Moving to Trash...
                  </>
                ) : (
                  <>
                    <Archive size={13} />
                    Move to Trash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Permanent Delete Confirmation Modal (Hard Wipe from Trash) ─ */}
      {bookingToPermanentlyPurge && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isDeleting && setBookingToPermanentlyPurge(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-gold flex items-center justify-center shrink-0 border border-neutral-800">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary">Permanently Purge Record</h3>
                <p className="text-xs text-neutral-500 font-body mt-1">
                  This will permanently delete booking <strong className="text-primary font-bold">#{bookingToPermanentlyPurge.booking_number}</strong> from all database tables. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-1 font-body">
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <AlertCircle size={13} className="text-neutral-500" /> Irreversible Purge:
              </p>
              <ul className="list-disc list-inside text-[11px] text-neutral-600 space-y-0.5 ml-1">
                <li>Permanently removes booking and ID from Supabase</li>
                <li>Cascades dependent logs, outputs, and status history</li>
                <li>Records deletion metadata in system activity logs</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBookingToPermanentlyPurge(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmPermanentPurge}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-black text-gold border border-gold/40 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-gold" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Permanently Purge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9.5. Reference Photo Lightbox Modal ──────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-950/80">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileImage size={14} className="text-gold" />
                Client Uploaded Reference Peg
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Open original in new tab"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto bg-black/40">
              <img
                src={previewImage}
                alt="Client reference full view"
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 9.6. Photographer Availability & Workload Hub Modal ─────────── */}
      <AnimatePresence>
        {isPhotographerAvailabilityOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={() => setIsPhotographerAvailabilityOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 text-gold flex items-center justify-center shadow-xs">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-lg text-primary font-bold">Photographer Availability & Workload</h3>
                    <p className="text-xs text-neutral-400 font-body">Inspect real-time schedules, active workloads, and slot conflicts.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotographerAvailabilityOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Target Date & Slot Controls */}
              <div className="p-3.5 my-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Photoshoot Date</label>
                  <input
                    type="date"
                    value={availDate}
                    onChange={e => {
                      setAvailDate(e.target.value);
                      handleLoadPhotographerAvailability(e.target.value, availTime);
                    }}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-body font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Time Slot</label>
                  <select
                    value={availTime}
                    onChange={e => {
                      setAvailTime(e.target.value);
                      handleLoadPhotographerAvailability(availDate, e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-body font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30"
                  >
                    <option value="09:00:00">9:00 AM – 10:00 AM (Morning)</option>
                    <option value="10:00:00">10:00 AM – 11:00 AM (Morning)</option>
                    <option value="11:00:00">11:00 AM – 12:00 PM (Morning)</option>
                    <option value="13:00:00">1:00 PM – 2:00 PM (Afternoon)</option>
                    <option value="14:00:00">2:00 PM – 3:00 PM (Afternoon)</option>
                    <option value="15:00:00">3:00 PM – 4:00 PM (Afternoon)</option>
                    <option value="16:00:00">4:00 PM – 5:00 PM (Afternoon)</option>
                  </select>
                </div>
              </div>

              {/* List of Photographers */}
              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                {loadingAvail ? (
                  <div className="p-8 text-center text-neutral-400">
                    <RefreshCw size={24} className="animate-spin text-gold mx-auto mb-2" />
                    <p className="text-xs">Checking live photographer calendars...</p>
                  </div>
                ) : photographersAvailabilityList.length === 0 ? (
                  <div className="p-6 text-center text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
                    <Camera size={24} className="mx-auto mb-1.5 text-neutral-300" />
                    <p className="text-xs">No photographer profiles found in registry.</p>
                  </div>
                ) : (
                  photographersAvailabilityList.map(p => {
                    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Photographer';
                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          p.hasConflict
                            ? 'border-neutral-200 bg-neutral-50/70'
                            : 'border-neutral-200 hover:border-gold/50 bg-white shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-gold font-bold flex items-center justify-center shrink-0">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading text-xs font-bold text-primary">{name}</span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                {p.specialization || 'Studio Specialist'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-body mt-0.5 flex items-center gap-2">
                              <span>Active Workload: <strong className="text-primary">{p.activeWorkloadCount || 0} shoot{p.activeWorkloadCount === 1 ? '' : 's'}</strong></span>
                              {p.phone && <span>· {p.phone}</span>}
                            </div>
                            {p.hasConflict && (
                              <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                                <AlertTriangle size={12} /> {p.conflictReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          {p.hasConflict ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <AlertCircle size={11} /> Busy / Conflict
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-neutral-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPhotographerAvailabilityOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-black transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 9.7. School Pictorial Announcement & Batch Scheduling Modal ─── */}
      <AnimatePresence>
        {isSchoolSchedulerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={() => setIsSchoolSchedulerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center shadow-xs">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg text-primary font-bold">School Pictorial Schedule & Announcement</h3>
                  <p className="text-xs text-neutral-400 font-body">Confirm photoshoot dates, assign photographers, and broadcast announcements to students.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSchoolSchedulerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBatchScheduleSubmit} className="overflow-y-auto space-y-4 my-4 pr-1 flex-1">
              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  Select School Batch <span className="text-red-500">*</span>
                </label>
                {schoolBatchesList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 text-center text-xs text-neutral-500">
                    No pending school partner bookings found. Students must book with school agreement to appear here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schoolBatchesList.map(batch => {
                      const isSelected = selectedBatchKey === batch.key;
                      return (
                        <div
                          key={batch.key}
                          onClick={() => handleSelectBatch(batch.key)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-xs'
                              : 'border-neutral-200 bg-white hover:border-gold/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GraduationCap size={16} className={isSelected ? 'text-gold' : 'text-neutral-400'} />
                            <div className="min-w-0">
                              <span className="font-heading text-xs font-bold text-primary block truncate">
                                {batch.school}
                              </span>
                              <p className="text-[11px] text-neutral-500 font-body truncate">
                                Section: {batch.section} {batch.campus ? `· ${batch.campus}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold/15 text-primary shrink-0 ml-2">
                            {batch.count} student{batch.count > 1 ? 's' : ''} awaiting
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Schedule Date & Time */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1">
                    Confirmed Pictorial Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={batchEventDate}
                    onChange={e => setBatchEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary mb-1">
                    Starting Time Slot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchPreferredTime}
                    onChange={e => setBatchPreferredTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30"
                  >
                    <option value="08:00:00">8:00 AM – 9:00 AM (Morning Slot)</option>
                    <option value="09:00:00">9:00 AM – 10:00 AM (Morning Slot)</option>
                    <option value="10:00:00">10:00 AM – 11:00 AM (Morning Slot)</option>
                    <option value="13:00:00">1:00 PM – 2:00 PM (Afternoon Slot)</option>
                    <option value="14:00:00">2:00 PM – 3:00 PM (Afternoon Slot)</option>
                    <option value="15:00:00">3:00 PM – 4:00 PM (Afternoon Slot)</option>
                  </select>
                </div>
              </div>

              {/* Venue Selection */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-primary mb-1.5">
                  Confirmed Pictorial Venue
                </label>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setBatchLocationType('CAMPUS')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      batchLocationType === 'CAMPUS'
                        ? 'border-primary bg-primary/5 font-semibold'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                      <GraduationCap size={15} className="text-gold" /> School Campus (On-site)
                    </div>
                    <p className="text-[11px] text-neutral-500 font-body mt-0.5 truncate">
                      {batchCustomAddress || 'Campus hall / auditorium'}
                    </p>
                  </div>

                  <div
                    onClick={() => setBatchLocationType('STUDIO')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      batchLocationType === 'STUDIO'
                        ? 'border-primary bg-primary/5 font-semibold'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                      <Building2 size={15} className="text-gold" /> E-Kodak Studio
                    </div>
                    <p className="text-[11px] text-neutral-500 font-body mt-0.5">
                      311 Rizal Street, City of Naga, Cebu
                    </p>
                  </div>
                </div>

                {batchLocationType === 'CAMPUS' && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                      Campus Hall or Room Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={batchCustomAddress}
                      onChange={e => setBatchCustomAddress(e.target.value)}
                      placeholder="e.g., Campus AVR / 3rd Floor Gymnasium"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                )}
              </div>

              {/* Photographer Assignment with Live Availability Check */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-primary mb-1 flex items-center justify-between">
                  <span>Assign Lead Photographer</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Optional</span>
                </label>
                <select
                  value={batchPhotographerId}
                  onChange={e => setBatchPhotographerId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="">Assign Later (Schedule Only)</option>
                  {batchPhotographersAvailability.map(p => {
                    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Photographer';
                    const conflictText = p.hasConflict ? ` [CONFLICT: ${p.conflictReason}]` : ' [Available]';
                    return (
                      <option key={p.id} value={p.id} disabled={p.hasConflict}>
                        {name} ({p.specialization || 'Photographer'}) — {p.activeWorkloadCount || 0} active shoots{conflictText}
                      </option>
                    );
                  })}
                </select>
                {batchEventDate && batchPhotographersAvailability.length === 0 && (
                  <p className="text-[11px] text-neutral-400 mt-1">Loading photographer availability for selected date...</p>
                )}
              </div>

              {/* Announcement Message */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-primary mb-1">
                  Broadcast Announcement Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={batchAnnouncementText}
                  onChange={e => setBatchAnnouncementText(e.target.value)}
                  placeholder="Official message broadcasted to students in notification & announcement banner..."
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 resize-none"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  This message will be instantly sent as an in-app notification to all registered students in this batch.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSchoolSchedulerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBatchSubmitting || schoolBatchesList.length === 0}
                  className="btn-gold text-xs py-2 px-4 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isBatchSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Megaphone size={14} />
                      Confirm Schedule & Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 10. Slide-over Quick Inspector Drawer (READ CRUD) ───────────── */}
      <BookingQuickInspector
        booking={inspectingBooking}
        isOpen={!!inspectingBooking}
        onClose={() => setInspectingBooking(null)}
        onStatusUpdated={() => {
          fetchBookings();
          fetchCounts();
        }}
      />

      {/* ── 11. Staff Desk QR Scanner & Verification Modal ────────────── */}
      <StaffQRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
      />

    </div>
  );
}
