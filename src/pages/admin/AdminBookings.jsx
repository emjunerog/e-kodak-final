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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
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
  QrCode, Table, Filter, Users, UserCheck, Printer, ShieldCheck, History
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
  emptyTrash,
  adminCreateBooking,
  adminUpdateBooking,
  ALL_BOOKING_STATUSES,
  ALL_PAYMENT_STATUSES,
  getPhotographersWithWorkloadAndAvailability,
  batchScheduleSchoolPictorial,
  rescheduleStudentBooking,
} from '../../services/bookingAdminService';
import BookingLifecycleBadge from '../../components/admin/BookingLifecycleBadge';
import BookingQuickInspector from '../../components/admin/BookingQuickInspector';
import CustomDropdown from '../../components/ui/CustomDropdown';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getBookingSchool(b) {
  return b?.student_details?.school || (b?.notes && b.notes.match(/•\s*(?:School|Institution):\s*([^\n\r]+)/i)?.[1]?.trim()) || '';
}

function getBookingSection(b) {
  return b?.student_details?.section || (b?.notes && b.notes.match(/•\s*Section(?:\s*\/\s*Batch)?:\s*([^\n\r]+)/i)?.[1]?.trim()) || '';
}

function getBookingCampus(b) {
  return b?.student_details?.campus || (b?.notes && b.notes.match(/•\s*Campus(?:\s*\/\s*Address)?:\s*([^\n\r]+)/i)?.[1]?.trim()) || '';
}

function getBookingStudentName(b) {
  return b?.student_details?.student_name || (b?.customer ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() : '—');
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

export default function AdminBookings({ initialSection }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialSearchParam = searchParams.get('search') || '';

  const resolveTabFromLocation = useCallback(() => {
    if (initialSection) return initialSection;
    if (location.pathname.endsWith('/trash')) return 'DELETED';
    if (location.pathname.endsWith('/done-orders')) return 'COMPLETED';
    const tabParam = searchParams.get('tab')?.toUpperCase();
    if (tabParam && ['ALL', 'PENDING', 'CONFIRMED', 'PRODUCTION', 'READY', 'COMPLETED', 'UNPAID', 'DELETED'].includes(tabParam)) {
      return tabParam;
    }
    return 'ALL';
  }, [initialSection, location.pathname, searchParams]);

  const initialTab = resolveTabFromLocation();

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
  const [statusFilter, setStatus] = useState(() => {
    if (initialTab === 'PENDING') return 'PENDING';
    if (initialTab === 'CONFIRMED') return 'CONFIRMED';
    if (initialTab === 'PRODUCTION') return 'CAPTURE';
    if (initialTab === 'READY') return 'READY';
    if (initialTab === 'COMPLETED') return 'COMPLETED';
    return '';
  });
  const [schoolFilter, setSchoolFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolSortBy, setSchoolSortBy] = useState('pending_desc');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState('ALL');
  const [collapsedSchools, setCollapsedSchools] = useState({});
  const [paymentFilter, setPayment] = useState(() => {
    if (initialTab === 'UNPAID') return 'UNPAID';
    return '';
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState(initialTab);
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
  const [editBookingPhotographers, setEditBookingPhotographers] = useState([]);
  const [loadingEditPhotographers, setLoadingEditPhotographers] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [bookingToPermanentlyPurge, setBookingToPermanentlyPurge] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
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
  const [viewMode, setViewMode] = useState('table'); // 'table' (complete tables is default) | 'batch' (school batches)
  const [isSchoolSchedulerOpen, setIsSchoolSchedulerOpen] = useState(false);
  const [schoolBatchesList, setSchoolBatchesList] = useState([]);
  const [selectedBatchKey, setSelectedBatchKey] = useState('');
  const [selectedBatchSchool, setSelectedBatchSchool] = useState('');
  const [selectedBatchSection, setSelectedBatchSection] = useState('ALL');
  const [batchEventDate, setBatchEventDate] = useState('');
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchEndTime, setBatchEndTime] = useState('11:30');
  const [batchLocationType, setBatchLocationType] = useState('CAMPUS'); // 'CAMPUS' | 'STUDIO'
  const [batchCustomAddress, setBatchCustomAddress] = useState('');
  const [batchPhotographerId, setBatchPhotographerId] = useState('');
  const [batchAnnouncementText, setBatchAnnouncementText] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchPhotographersAvailability, setBatchPhotographersAvailability] = useState([]);
  const [allowRescheduleProtection, setAllowRescheduleProtection] = useState(true);
  const [rescheduleStudentId, setRescheduleStudentId] = useState('');
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Unable to attend confirmed batch date');
  const [isReschedulingSingleStudent, setIsReschedulingSingleStudent] = useState(false);
  const [completedSchoolStudents, setCompletedSchoolStudents] = useState([]);

  const adminStaffName = useMemo(() => profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : 'Admin Staff', [profile]);

  const formattedBatchTimeRange = `${formatTime(batchStartTime)} – ${formatTime(batchEndTime)}`;

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
        const isPendingDate = !b.event_date || b.status === 'PENDING';

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

      if (list.length > 0 && !selectedBatchSchool) {
        setSelectedBatchKey(list[0].key);
        setSelectedBatchSchool(list[0].school);
        setSelectedBatchSection('ALL');
        setBatchCustomAddress(''); // Never duplicate full campus/city in custom landmark
        setBatchAnnouncementText(
          `Graduation Pictorial confirmed for ${list[0].school}. Date: Confirmed Date. Schedule: 8:00 AM – 11:30 AM. Venue: School Campus. Please arrive 15 minutes before your time slot. Notice: Students with scheduling conflicts can request a batch transfer or studio makeup session via their portal pass.`
        );
      }
    } catch (err) {
      console.warn('fetchSchoolBatches warning:', err);
    }
  }, [selectedBatchSchool]);

  // Unique schools for the school dropdown
  const uniqueSchools = useMemo(() => {
    const map = new Map();
    schoolBatchesList.forEach(b => {
      const sch = b.school;
      if (!sch) return;
      if (!map.has(sch)) {
        map.set(sch, {
          name: sch,
          campus: b.campus || '',
          count: 0,
        });
      }
      map.get(sch).count += b.count;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schoolBatchesList]);

  // Sections under the currently selected school
  const sectionsForSelectedSchool = useMemo(() => {
    if (!selectedBatchSchool) return [];
    const set = new Set();
    schoolBatchesList.forEach(b => {
      if (b.school.toLowerCase() === selectedBatchSchool.toLowerCase()) {
        if (b.section && b.section !== 'All Sections' && b.section !== 'ALL') {
          set.add(b.section);
        }
      }
    });
    bookings.forEach(b => {
      const sch = b.student_details?.school || (b.notes && b.notes.match(/•\s*School:\s*([^\n\r]+)/i)?.[1]?.trim());
      const sec = b.student_details?.section || (b.notes && b.notes.match(/•\s*Section(?:\s*\/\s*Batch)?:\s*([^\n\r]+)/i)?.[1]?.trim());
      if (sch && sch.toLowerCase().includes(selectedBatchSchool.toLowerCase()) && sec && sec !== 'N/A' && sec !== 'All Sections') {
        set.add(sec);
      }
    });
    return Array.from(set).sort();
  }, [schoolBatchesList, bookings, selectedBatchSchool]);

  // Total student count for the currently selected school and section
  const targetStudentCount = useMemo(() => {
    if (!selectedBatchSchool) return 0;
    return schoolBatchesList
      .filter(b => {
        if (b.school.toLowerCase() !== selectedBatchSchool.toLowerCase()) return false;
        if (selectedBatchSection !== 'ALL' && selectedBatchSection !== 'All Sections') {
          return b.section === selectedBatchSection;
        }
        return true;
      })
      .reduce((sum, b) => sum + b.count, 0);
  }, [schoolBatchesList, selectedBatchSchool, selectedBatchSection]);

  // Detect students in this school with reschedule / rollover requests
  const detectedRescheduleStudents = useMemo(() => {
    if (!selectedBatchSchool) return [];
    const reschedList = [];
    bookings.forEach(b => {
      const notes = (b.notes || '').toLowerCase();
      const sch = b.student_details?.school || (notes.match(/•\s*school:\s*([^\n\r]+)/i)?.[1]?.trim());
      if (sch && sch.toLowerCase().includes(selectedBatchSchool.toLowerCase())) {
        const hasConflictOrReq = notes.includes('reschedule') || notes.includes('makeup') || notes.includes('conflict') || notes.includes('rollover');
        if (hasConflictOrReq && !b.event_date) {
          const studentName = b.customer
            ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email
            : 'Student';
          reschedList.push({
            id: b.id,
            bookingNumber: b.booking_number,
            name: studentName,
            section: b.student_details?.section || 'General',
            reason: notes.includes('conflict') ? 'Schedule Conflict' : 'Makeup Rollover Requested'
          });
        }
      }
    });
    return reschedList;
  }, [bookings, selectedBatchSchool]);

  // Detailed student roster for the selected school & section
  const studentsInSelectedBatch = useMemo(() => {
    if (!selectedBatchSchool) return [];
    return bookings.filter(b => {
      const notes = (b.notes || '').toLowerCase();
      const sch = b.student_details?.school || (notes.match(/•\s*school:\s*([^\n\r]+)/i)?.[1]?.trim());
      if (!sch || !sch.toLowerCase().includes(selectedBatchSchool.toLowerCase())) return false;
      if (selectedBatchSection && selectedBatchSection !== 'ALL' && selectedBatchSection !== 'All Sections') {
        const sec = b.student_details?.section || (notes.match(/•\s*section(?:\s*\/\s*batch)?:\s*([^\n\r]+)/i)?.[1]?.trim());
        if (sec && sec.toLowerCase() !== selectedBatchSection.toLowerCase()) return false;
      }
      return !b.is_deleted;
    }).map(b => {
      const name = b.customer
        ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email
        : (b.student_details?.full_name || 'Student');
      const isRescheduled = (b.notes || '').includes('[RESCHEDULED_MAKEUP]');
      return {
        id: b.id,
        bookingNumber: b.booking_number,
        name,
        section: b.student_details?.section || (b.notes?.match(/•\s*section(?:\s*\/\s*batch)?:\s*([^\n\r]+)/i)?.[1]?.trim()) || 'General',
        eventDate: b.event_date,
        status: b.status,
        isRescheduled,
      };
    });
  }, [bookings, selectedBatchSchool, selectedBatchSection]);

  // Fetch completed students for post-pictorial attendance & makeup review
  const fetchCompletedStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          status,
          event_date,
          preferred_time,
          location,
          notes,
          customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, email)
        `)
        .eq('status', 'COMPLETED')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('event_date', { ascending: false });

      if (error || !data) return;

      const list = data.map(b => {
        const notes = b.notes || '';
        const parsed = parseStructuredNotes(notes);
        const name = b.customer
          ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() || b.customer.email
          : 'Student';
        return {
          id: b.id,
          bookingNumber: b.booking_number,
          name,
          school: parsed.school || 'Designated School',
          section: parsed.section || 'General',
          eventDate: b.event_date,
          isRescheduled: notes.includes('[RESCHEDULED_MAKEUP]'),
        };
      });
      setCompletedSchoolStudents(list);
    } catch (err) {
      console.warn('fetchCompletedStudents error:', err);
    }
  }, []);

  useEffect(() => {
    if (activeNavTab === 'COMPLETED') {
      fetchCompletedStudents();
    }
  }, [activeNavTab, fetchCompletedStudents]);

  const handleRescheduleSingleStudent = async () => {
    if (!rescheduleStudentId) {
      showToast('Please choose a student to reschedule.', 'error');
      return;
    }
    const targetStudent = completedSchoolStudents.find(s => s.id === rescheduleStudentId) || bookings.find(b => b.id === rescheduleStudentId);
    setIsReschedulingSingleStudent(true);
    try {
      const res = await rescheduleStudentBooking({
        bookingId: rescheduleStudentId,
        newDate: rescheduleNewDate || null,
        newLocation: 'E-Kodak Studio (Makeup Session)',
        reason: rescheduleReason || 'Unable to attend confirmed pictorial date',
        adminId: profile?.id || null,
        adminName: adminStaffName,
      });

      if (res.success) {
        showToast(res.message || `Rescheduled ${targetStudent?.name || 'student'} for makeup session. Pushed back to active queue.`);
        setRescheduleStudentId('');
        setRescheduleNewDate('');
        fetchBookings();
        fetchCounts();
        fetchSchoolBatches();
        fetchCompletedStudents();
      } else {
        showToast(res.message || 'Failed to reschedule student.', 'error');
      }
    } catch (err) {
      showToast('Error rescheduling student.', 'error');
    } finally {
      setIsReschedulingSingleStudent(false);
    }
  };

  // Smart announcement generator (clean, no duplicate text, with reschedule protection notice)
  const generateAnnouncementText = (school, section, date, startTime, endTime, locType, customAddr, photogId, hasReschedule = true, photogList = batchPhotographersAvailability) => {
    if (!school) return '';
    const secLabel = section && section !== 'ALL' && section !== 'All Sections'
      ? (section.toLowerCase().startsWith('section') ? ` (${section})` : ` (Section ${section})`)
      : '';
    const dateLabel = date ? fmtDate(date) : 'Confirmed Date';
    const timeLabel = `${formatTime(startTime)} – ${formatTime(endTime)}`;
    const venueLabel = locType === 'CAMPUS'
      ? `School Campus${customAddr && customAddr.trim() ? ` (${customAddr.trim()})` : ''}`
      : 'E-Kodak Studio, 311 Rizal Street, City of Naga';
    const listToSearch = (photogList && photogList.length > 0) ? photogList : batchPhotographersAvailability;
    const photog = listToSearch.find(p => p.id === photogId);
    const photogName = photog ? `${photog.first_name || ''} ${photog.last_name || ''}`.trim() : '';
    const photogText = photogName ? ` Lead Photographer: ${photogName}.` : '';
    const safetyNote = hasReschedule
      ? ' Notice: Students unable to attend this date can request a batch transfer or studio makeup session via their portal pass.'
      : '';

    return `Graduation Pictorial confirmed for ${school}${secLabel}. Date: ${dateLabel}. Schedule: ${timeLabel}. Venue: ${venueLabel}.${photogText} Please arrive 15 minutes before your time slot.${safetyNote}`;
  };

  // Open scheduler modal for a specific school and section
  const handleOpenSchoolScheduler = (schoolName, sectionName = 'ALL') => {
    setSelectedBatchSchool(schoolName);
    setSelectedBatchSection(sectionName);
    setBatchCustomAddress('');
    setBatchPhotographerId('');
    const found = schoolBatchesList.find(b => b.school.toLowerCase().includes(schoolName.toLowerCase()));
    if (found) {
      setSelectedBatchKey(found.key);
    }
    const generated = generateAnnouncementText(
      schoolName,
      sectionName,
      batchEventDate,
      batchStartTime,
      batchEndTime,
      batchLocationType,
      '',
      '',
      allowRescheduleProtection
    );
    setBatchAnnouncementText(generated);
    setIsSchoolSchedulerOpen(true);
  };

  // Sync available photographers and auto-assign best available photographer (strictly photographer accounts)
  useEffect(() => {
    if (isSchoolSchedulerOpen) {
      const targetDate = batchEventDate ? batchEventDate : null;
      getPhotographersWithWorkloadAndAvailability(targetDate, batchStartTime).then(res => {
        const list = (res.data || []).filter(p => (!p.role || p.role.toLowerCase() === 'photographer') && p.role?.toLowerCase() !== 'admin' && p.role?.toLowerCase() !== 'staff');
        setBatchPhotographersAvailability(list);

        // Only auto-assign if an actual target event date is chosen
        if (targetDate) {
          const currentPhotog = list.find(p => p.id === batchPhotographerId);
          if (!batchPhotographerId || (currentPhotog && (currentPhotog.hasConflict || !currentPhotog.is_available))) {
            const available = list.filter(p => !p.hasConflict && p.is_available).sort((a, b) => (a.activeWorkloadCount || 0) - (b.activeWorkloadCount || 0));
            if (available.length > 0) {
              const bestPhotogId = available[0].id;
              setBatchPhotographerId(bestPhotogId);
              setBatchAnnouncementText(generateAnnouncementText(
                selectedBatchSchool,
                selectedBatchSection,
                batchEventDate,
                batchStartTime,
                batchEndTime,
                batchLocationType,
                batchCustomAddress,
                bestPhotogId,
                allowRescheduleProtection,
                list
              ));
            } else {
              setBatchPhotographerId('');
              setBatchAnnouncementText(generateAnnouncementText(
                selectedBatchSchool,
                selectedBatchSection,
                batchEventDate,
                batchStartTime,
                batchEndTime,
                batchLocationType,
                batchCustomAddress,
                '',
                allowRescheduleProtection,
                list
              ));
            }
          }
        }
      });
    }
  }, [isSchoolSchedulerOpen, batchEventDate, batchStartTime, batchEndTime, batchLocationType, batchCustomAddress, selectedBatchSchool, selectedBatchSection, allowRescheduleProtection]);

  // Auto-detect & auto-assign photographer availability for active booking editing (strictly photographer accounts)
  useEffect(() => {
    if (editingBooking && editingBooking.event_date) {
      const targetDate = editingBooking.event_date.split('T')[0];
      setLoadingEditPhotographers(true);
      getPhotographersWithWorkloadAndAvailability(targetDate, editingBooking.preferred_time)
        .then(res => {
          const list = (res.data || []).filter(p => (!p.role || p.role.toLowerCase() === 'photographer') && p.role?.toLowerCase() !== 'admin' && p.role?.toLowerCase() !== 'staff');
          setEditBookingPhotographers(list);

          // Auto-assign: if the booking has no photographer yet or current one conflicts on this date: put available photographer's name on it!
          const currentPhotog = list.find(p => p.id === editingBooking.photographer_id);
          if (!editingBooking.photographer_id || (currentPhotog && (currentPhotog.hasConflict || !currentPhotog.is_available))) {
            const available = list.filter(p => !p.hasConflict && p.is_available).sort((a, b) => (a.activeWorkloadCount || 0) - (b.activeWorkloadCount || 0));
            if (available.length > 0) {
              setEditingBooking(prev => {
                if (!prev) return prev;
                return { ...prev, photographer_id: available[0].id };
              });
            }
          }
        })
        .finally(() => setLoadingEditPhotographers(false));
    } else if (!editingBooking) {
      setEditBookingPhotographers([]);
    }
  }, [editingBooking?.id, editingBooking?.event_date, editingBooking?.preferred_time]);

  const handleBatchScheduleSubmit = async (e) => {
    e.preventDefault();
    const targetSchool = selectedBatchSchool || (schoolBatchesList.find(b => b.key === selectedBatchKey)?.school);
    if (!targetSchool) {
      showToast('Please select a school batch to schedule.', 'error');
      return;
    }
    if (!batchEventDate) {
      showToast('Please specify the confirmed pictorial date.', 'error');
      return;
    }

    setIsBatchSubmitting(true);

    const venue = batchLocationType === 'CAMPUS'
      ? `School Campus: ${targetSchool}${batchCustomAddress ? ` (${batchCustomAddress})` : ''}`
      : 'E-Kodak Studio, 311 Rizal Street, City of Naga, Cebu';

    const adminName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Studio Admin';

    const result = await batchScheduleSchoolPictorial({
      schoolName: targetSchool,
      sectionName: selectedBatchSection === 'ALL' || selectedBatchSection === 'All Sections' ? null : selectedBatchSection,
      eventDate: batchEventDate,
      preferredTime: formattedBatchTimeRange,
      location: venue,
      photographerId: batchPhotographerId || null,
      announcementMessage: batchAnnouncementText,
      adminId: profile?.id || null,
      adminName,
      allowRescheduleProtection,
    });

    setIsBatchSubmitting(false);

    if (result.success) {
      showToast(`Confirmed pictorial schedule for ${result.count} student(s) at ${targetSchool}! Announcement broadcasted.`);
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
          supabase.from('photographer_profiles').select('id, specialization, profile:profiles(first_name, last_name, role)'),
        ]);

        if (servicesRes.data) setAvailableServices(servicesRes.data);
        if (customersRes.data) setAvailableCustomers(customersRes.data);
        if (photographersRes.data) {
          const onlyPhotogs = photographersRes.data.filter(p => !p.profile || p.profile.role === 'photographer');
          setAvailablePhotographers(onlyPhotogs);
        }
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
  const handleNavTabClick = useCallback((tabKey) => {
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
  }, []);

  // Sync active tab whenever location, initialSection, or search query params change
  const prevTabRef = useRef(initialTab);
  useEffect(() => {
    const targetTab = resolveTabFromLocation();
    if (targetTab !== prevTabRef.current) {
      prevTabRef.current = targetTab;
      handleNavTabClick(targetTab);
    }
  }, [location.pathname, initialSection, searchParams, resolveTabFromLocation, handleNavTabClick]);

  // ── Export CSV Handler ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    const headers = [
      'Booking Number',
      'Account Owner First Name',
      'Account Owner Last Name',
      'Phone',
      'Booking For',
      'Participant Name',
      'Participant Relationship',
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
      b.participant_details?.booking_for === 'someone_else' ? 'Someone else' : 'Myself',
      b.participant_details?.full_name || '',
      b.participant_details?.relationship || '',
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

    const { success, error: delErr } = await softDeleteBooking({
      bookingId: bookingToDelete.id,
      deletedById: profile?.id,
      deletedByName: adminStaffName,
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
      window.dispatchEvent(new CustomEvent('trash-updated'));
    }
  };

  // ── RECOVER CRUD (Restore from Trash) ─────────────────────────────────────
  const handleRestoreBooking = async (b) => {
    const { success, error: resErr } = await restoreBooking({
      bookingId: b.id,
      restoredById: profile?.id,
      restoredByName: adminStaffName,
    });

    if (!success) {
      showToast('Failed to restore booking: ' + (resErr?.message || 'Database error'), 'error');
    } else {
      showToast(`Booking #${b.booking_number} recovered & restored to active queue!`);
      fetchBookings();
      fetchCounts();
      window.dispatchEvent(new CustomEvent('trash-updated'));
    }
  };

  // ── PERMANENT DELETE CRUD (Hard Wipe) ──────────────────────────────────────
  const handleConfirmPermanentPurge = async () => {
    if (!bookingToPermanentlyPurge) return;
    setIsDeleting(true);

    const { success, error: delErr } = await deleteBookingPermanently({
      bookingId: bookingToPermanentlyPurge.id,
      deletedById: profile?.id,
      deletedByName: adminStaffName,
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
      window.dispatchEvent(new CustomEvent('trash-updated'));
    }
  };

  // ── EMPTY ENTIRE TRASH CRUD ──────────────────────────────────────────────
  const handleEmptyTrash = async () => {
    setIsEmptyingTrash(true);

    const { success, count, error: err } = await emptyTrash({
      deletedById: profile?.id,
      deletedByName: adminStaffName,
    });

    setIsEmptyingTrash(false);
    setIsEmptyTrashModalOpen(false);

    if (!success) {
      showToast('Failed to empty trash: ' + (err?.message || 'Database error'), 'error');
    } else {
      showToast(`Trash cleared: ${count} record(s) permanently erased.`);
      fetchBookings();
      fetchCounts();
      window.dispatchEvent(new CustomEvent('trash-updated'));
    }
  };

  // Dropdown options
  const statusDropdownOptions = [
    { value: '', label: 'All Statuses', dotColor: 'bg-neutral-400' },
    { value: 'PENDING', label: 'Pending Review', dotColor: 'bg-amber-500' },
    { value: 'CONFIRMED', label: 'Confirmed Sessions', dotColor: 'bg-neutral-900' },
    { value: 'PHOTOGRAPHER_ASSIGNED', label: 'Photographer Assigned', dotColor: 'bg-neutral-600' },
    { value: 'CAPTURE', label: 'In Studio Bay', dotColor: 'bg-gold' },
    { value: 'EDITING', label: 'In Post-Processing', dotColor: 'bg-neutral-600' },
    { value: 'READY', label: 'Ready for Pickup', dotColor: 'bg-gold' },
    { value: 'COMPLETED', label: 'Completed Orders', dotColor: 'bg-neutral-900' },
    { value: 'REJECTED', label: 'Rejected', dotColor: 'bg-neutral-400' },
    { value: 'CANCELLED', label: 'Cancelled', dotColor: 'bg-neutral-300' },
  ];

  const sortDropdownOptions = [
    { value: 'created_at', label: 'Newest First' },
    { value: 'student_name_asc', label: 'Student (A–Z)' },
    { value: 'student_name_desc', label: 'Student (Z–A)' },
    { value: 'event_date', label: 'Event Date' },
    { value: 'booking_number', label: 'Booking Number' },
    { value: 'total_amount', label: 'Total Amount' },
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


  // Apply in-memory filtering and multi-attribute sorting for campus batch orders
  const displayedBookings = useMemo(() => {
    let result = [...bookings];

    if (schoolFilter) {
      result = result.filter(b => getBookingSchool(b).toLowerCase().includes(schoolFilter.toLowerCase()));
    }

    if (sectionFilter) {
      result = result.filter(b => getBookingSection(b).toLowerCase().includes(sectionFilter.toLowerCase()));
    }

    if (sortBy === 'student_name_asc') {
      result.sort((a, b) => getBookingStudentName(a).localeCompare(getBookingStudentName(b)));
    } else if (sortBy === 'student_name_desc') {
      result.sort((a, b) => getBookingStudentName(b).localeCompare(getBookingStudentName(a)));
    } else if (sortBy === 'school_asc') {
      result.sort((a, b) => getBookingSchool(a).localeCompare(getBookingSchool(b)));
    } else if (sortBy === 'section_asc') {
      result.sort((a, b) => getBookingSection(a).localeCompare(getBookingSection(b)));
    } else if (sortBy === 'batch_asc') {
      result.sort((a, b) => {
        const btA = (a.student_details?.batch || '').trim();
        const btB = (b.student_details?.batch || '').trim();
        return btA.localeCompare(btB);
      });
    } else if (sortBy === 'student_id_asc') {
      result.sort((a, b) => {
        const idA = (a.student_details?.student_id || '').trim();
        const idB = (b.student_details?.student_id || '').trim();
        return idA.localeCompare(idB);
      });
    }

    return result;
  }, [bookings, schoolFilter, sectionFilter, sortBy]);

  // Group all bookings into school places with sections (Batching categorization)
  const allSchoolPlacesList = useMemo(() => {
    const map = {};
    displayedBookings.forEach(b => {
      const sch = getBookingSchool(b) || 'Studio Direct / General';
      const sec = getBookingSection(b) || 'General Section';
      const campus = getBookingCampus(b);

      if (!map[sch]) {
        map[sch] = {
          schoolName: sch,
          campus,
          totalStudents: 0,
          pendingScheduleCount: 0,
          confirmedScheduleCount: 0,
          sectionsMap: {},
          bookings: [],
        };
      }

      map[sch].totalStudents += 1;
      map[sch].bookings.push(b);

      const isPending = !b.event_date || b.status === 'PENDING';
      if (isPending) {
        map[sch].pendingScheduleCount += 1;
      } else {
        map[sch].confirmedScheduleCount += 1;
      }

      if (!map[sch].sectionsMap[sec]) {
        map[sch].sectionsMap[sec] = [];
      }
      map[sch].sectionsMap[sec].push(b);
    });

    return Object.values(map);
  }, [displayedBookings]);

  const totalSchoolsCount = allSchoolPlacesList.length;
  const pendingSchoolsCount = allSchoolPlacesList.filter(s => s.pendingScheduleCount > 0).length;
  const confirmedSchoolsCount = allSchoolPlacesList.filter(s => s.pendingScheduleCount === 0).length;

  const categorizedSchoolPlaces = useMemo(() => {
    let list = [...allSchoolPlacesList];

    // Live search by school name, campus, or section
    if (schoolSearch.trim()) {
      const q = schoolSearch.trim().toLowerCase();
      list = list.filter(s =>
        s.schoolName.toLowerCase().includes(q) ||
        (s.campus && s.campus.toLowerCase().includes(q)) ||
        Object.keys(s.sectionsMap).some(sec => sec.toLowerCase().includes(q))
      );
    }

    // Status filter chip
    if (schoolStatusFilter === 'PENDING') {
      list = list.filter(s => s.pendingScheduleCount > 0);
    } else if (schoolStatusFilter === 'CONFIRMED') {
      list = list.filter(s => s.pendingScheduleCount === 0);
    }

    // Dynamic school sorting (Future-proofed for large directories)
    return list.sort((a, b) => {
      if (a.schoolName === 'Studio Direct / General') return 1;
      if (b.schoolName === 'Studio Direct / General') return -1;

      if (schoolSortBy === 'students_desc') {
        return b.totalStudents - a.totalStudents;
      }
      if (schoolSortBy === 'students_asc') {
        return a.totalStudents - b.totalStudents;
      }
      if (schoolSortBy === 'name_desc') {
        return b.schoolName.localeCompare(a.schoolName);
      }
      if (schoolSortBy === 'name_asc') {
        return a.schoolName.localeCompare(b.schoolName);
      }
      // default: 'pending_desc' (Action required first, then alphabetical)
      if (b.pendingScheduleCount !== a.pendingScheduleCount) {
        return b.pendingScheduleCount - a.pendingScheduleCount;
      }
      return a.schoolName.localeCompare(b.schoolName);
    });
  }, [allSchoolPlacesList, schoolSearch, schoolStatusFilter, schoolSortBy]);

  const areAllCollapsed = useMemo(() => {
    if (categorizedSchoolPlaces.length === 0) return false;
    return categorizedSchoolPlaces.every(s => collapsedSchools[s.schoolName]);
  }, [categorizedSchoolPlaces, collapsedSchools]);

  const toggleSchoolCollapse = (schoolName) => {
    setCollapsedSchools(prev => ({
      ...prev,
      [schoolName]: !prev[schoolName]
    }));
  };

  const handleExpandAllSchools = () => {
    setCollapsedSchools({});
  };

  const handleCollapseAllSchools = () => {
    const all = {};
    categorizedSchoolPlaces.forEach(s => {
      all[s.schoolName] = true;
    });
    setCollapsedSchools(all);
  };

  // Handler for printing an official school masterlist call-sheet
  const handlePrintClassRoster = (targetSchool = null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const activeSchool = targetSchool || schoolFilter;
    const targetList = activeSchool
      ? displayedBookings.filter(b => {
          const s = getBookingSchool(b);
          return s && s.toLowerCase().includes(activeSchool.toLowerCase());
        })
      : displayedBookings;
    const title = activeSchool ? `${activeSchool} - ${sectionFilter || 'All Sections'}` : 'E-Kodak Student Roster';
    const rowsHtml = targetList.map((b, idx) => {
      const sName = b.student_details?.student_name || (b.customer ? `${b.customer.last_name}, ${b.customer.first_name}` : 'N/A');
      const sId = b.student_details?.student_id || 'N/A';
      const sSec = b.student_details?.section || 'N/A';
      const sCourse = b.student_details?.course || 'N/A';
      const sTier = b.tier_name || 'Standard';
      const sPayment = b.payment_status || 'UNPAID';
      const sStatus = b.status || 'PENDING';
      return `<tr>
        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd; font-weight: bold;">${sName}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${sId}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd;">${sSec}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd;">${sCourse}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd;">${sTier}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${sPayment}</td>
        <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${sStatus}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>E-Kodak Class Masterlist - ${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            h2 { margin: 0 0 16px; font-size: 13px; color: #666; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
            th { background: #f0ede6; padding: 8px 10px; border: 1px solid #ccc; text-align: left; font-size: 10px; text-transform: uppercase; }
            .header-info { display: flex; justify-content: space-between; border-bottom: 2px solid #c9a96e; padding-bottom: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <h1>E-KODAK STUDIO CEBU</h1>
              <h2>Official Campus Batch Pictorial Masterlist &bull; ${title}</h2>
            </div>
            <div style="text-align: right; font-size: 11px; color: #555;">
              <p style="margin: 0;">Total Students: <strong>${displayedBookings.length}</strong></p>
              <p style="margin: 4px 0 0;">Date Printed: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Student Name (Alphabetical)</th>
                <th style="width: 100px; text-align: center;">Student ID</th>
                <th style="width: 80px;">Section</th>
                <th>Degree / Strand</th>
                <th style="width: 80px;">Package</th>
                <th style="width: 90px; text-align: center;">Payment</th>
                <th style="width: 90px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };
  const editPhotographerOptions = useMemo(() => {
    const base = [{ value: '', label: 'Unassigned (Assign Later)', dotColor: 'bg-neutral-300' }];
    if (editBookingPhotographers.length > 0) {
      return [
        ...base,
        ...editBookingPhotographers.map(p => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Photographer';
          const isAvail = !p.hasConflict && p.is_available;
          const statusText = isAvail ? 'Available (On Duty)' : (p.conflictReason ? `Off Duty (${p.conflictReason})` : 'Off Duty');
          return {
            value: p.id,
            label: `${name} — ${statusText}`,
            dotColor: isAvail ? 'bg-emerald-500' : 'bg-neutral-400',
          };
        }),
      ];
    }
    return [
      ...base,
      ...availablePhotographers
        .filter(p => (!p.profile?.role || p.profile.role.toLowerCase() === 'photographer') && p.profile?.role?.toLowerCase() !== 'admin')
        .map(p => {
          const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || 'Photographer';
          const spec = p.specialization ? ` (${p.specialization})` : '';
          return {
            value: p.id,
            label: `${name}${spec}`,
            dotColor: 'bg-indigo-500',
          };
        }),
    ];
  }, [editBookingPhotographers, availablePhotographers]);

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
    <div className="w-full animate-fade-in pb-16 font-body">

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
      />

      {/* ── Page Content Container ───────────────────────────────────── */}
      <div className="space-y-6 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-7 mt-6 sm:mt-7">

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

      {/* ── 2. Unified Luxury Studio KPI Overview Metric Strip ─────────────── */}
      <CategorizedMetricStrip
        loading={loading}
        columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        cards={[
          {
            key: 'ALL',
            label: 'TOTAL',
            subtitle: 'Active studio orders',
            value: counts.total,
            isActive: activeNavTab === 'ALL',
            onClick: () => handleNavTabClick('ALL'),
          },
          {
            key: 'PENDING',
            label: 'PENDING',
            subtitle: 'Awaiting scheduling & review',
            value: counts.pending,
            isActive: activeNavTab === 'PENDING',
            onClick: () => handleNavTabClick('PENDING'),
          },
          {
            key: 'READY',
            label: 'READY',
            subtitle: 'Ready for client pickup',
            value: counts.ready,
            isActive: activeNavTab === 'READY',
            onClick: () => handleNavTabClick('READY'),
          },
          {
            key: 'COMPLETED',
            label: 'COMPLETED',
            subtitle: 'Fulfilled & closed orders',
            value: counts.completed,
            isActive: activeNavTab === 'COMPLETED',
            onClick: () => handleNavTabClick('COMPLETED'),
          },
          {
            key: 'DELETED',
            label: 'ARCHIVED',
            subtitle: 'Trash & soft deleted',
            value: counts.deleted,
            isActive: activeNavTab === 'DELETED',
            onClick: () => handleNavTabClick('DELETED'),
          },
        ]}
      />

      {/* ── 2.5. School Pictorial Batch Scheduling Alert (Table View Only) ── */}
      {pendingSchoolCount > 0 && !isDeletedTab && activeNavTab !== 'COMPLETED' && viewMode === 'table' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#FAF7F2] to-amber-500/5 border border-amber-300/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 border border-amber-400/40">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-heading font-bold text-neutral-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>{pendingSchoolCount} Student{pendingSchoolCount > 1 ? 's' : ''} Awaiting School Pictorial Schedule</span>
                </h4>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
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

      {/* ── 2.6. Completed Students Reschedule & Absentee Makeup Tool ── */}
      {activeNavTab === 'COMPLETED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#FAF7F2] to-amber-500/5 border border-amber-300/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 border border-amber-400/40">
                <RotateCcw size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>Reschedule Absent Student(s) · Post-Pictorial Makeup Tool</span>
                </h4>
                <p className="text-[11px] text-amber-900/80 font-body">
                  Identify students who were unable to attend the completed pictorial date. Rescheduling removes them from Completed and pushes them back into active orders / pending for makeup.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300 self-start sm:self-auto shrink-0">
              Safety Mechanism
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-amber-950 mb-1">
                Select Absent Student from Completed
              </label>
              <select
                value={rescheduleStudentId}
                onChange={e => setRescheduleStudentId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-neutral-900 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">-- Choose Student Unable to Attend / Absent --</option>
                {completedSchoolStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.school} {s.section ? `· ${s.section}` : ''}) {s.isRescheduled ? '· [Previously Rescheduled]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-amber-950 mb-1">
                Makeup Date (Optional)
              </label>
              <input
                type="date"
                value={rescheduleNewDate}
                onChange={e => setRescheduleNewDate(e.target.value)}
                placeholder="Leave blank for pending"
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-neutral-900 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                disabled={!rescheduleStudentId || isReschedulingSingleStudent}
                onClick={handleRescheduleSingleStudent}
                className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                {isReschedulingSingleStudent ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Pushing to Active Queue...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Reschedule & Push to Active/Pending</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Streamlined Search & Filter Toolbar ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Bar with Quick QR Scanner Trigger */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by booking #, client, school, section..."
              value={liveSearch}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full h-9.5 pl-9 pr-16 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200 focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-all shadow-2xs"
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
                className="p-1.5 rounded-lg text-neutral-400 hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                title="Scan Customer QR Pass"
              >
                <QrCode size={15} />
              </button>
            </div>
          </div>

          {/* Streamlined Controls: Sort, Status, and View Mode */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            
            {/* Sort & Grouping Dropdown */}
            <div className="w-36 sm:w-44">
              <CustomDropdown
                value={sortBy}
                onChange={val => setSortBy(val)}
                options={sortDropdownOptions}
                placeholder="Sort"
                className="w-full"
                popoverWidth="w-52"
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-36 sm:w-44">
              <CustomDropdown
                value={statusFilter}
                onChange={val => { setStatus(val); setPage(1); }}
                options={statusDropdownOptions}
                placeholder="All Statuses"
                className="w-full"
                popoverWidth="w-56"
              />
            </div>

            {/* View Mode: Complete Tables (Default Button) & School Batches (Icon) */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Complete Tables (Master View)"
              >
                <Table size={13} className={viewMode === 'table' ? 'text-gold' : ''} />
                <span>Complete Tables</span>
              </button>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setViewMode('batch')}
                  className={`relative p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    viewMode === 'batch'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title={pendingSchoolCount > 0 ? `${pendingSchoolCount} Pending Schedule` : 'School Batches'}
                  aria-label="School Batches"
                >
                  <GraduationCap size={15} className={viewMode === 'batch' ? 'text-gold' : ''} />
                  {pendingSchoolCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-white"></span>
                    </span>
                  )}
                </button>
                {/* Notification Tooltip on Hover */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 text-white text-xs font-bold shadow-lg whitespace-nowrap z-30">
                  {pendingSchoolCount > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{pendingSchoolCount} Pending Schedule</span>
                    </>
                  ) : (
                    <span>School Batches</span>
                  )}
                </div>
              </div>
            </div>

            {/* Clear Filters (if active) */}
            {(statusFilter || paymentFilter || search || sortBy !== 'created_at') && (
              <button
                type="button"
                onClick={() => {
                  setStatus('');
                  setPayment('');
                  setSearch('');
                  setLiveSearch('');
                  setSortBy('created_at');
                }}
                className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-neutral-200 transition-colors cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {/* Empty Entire Trash (when on Deleted tab) */}
            {isDeletedTab && counts.deleted > 0 && (
              <button
                type="button"
                onClick={() => setIsEmptyTrashModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Permanently empty all soft-deleted records"
              >
                <Trash2 size={13} />
                <span>Empty Trash</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ── 5. Main Bookings View: School Batches vs Flat Table ──────────── */}
      {viewMode === 'batch' && !isDeletedTab ? (
        <div className="space-y-4 sm:space-y-5">
          {/* School Partner Directory & Sorting Control Toolbar */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                    Partner School Directories & Batches
                  </h3>
                  <p className="text-xs text-neutral-500 font-body">
                    Organize, sort, and inspect registered student cohorts across partner campuses.
                  </p>
                </div>
              </div>

              {/* Roster & Quick Global Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePrintClassRoster()}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print master call-sheet for all schools"
                >
                  <Printer size={13} />
                  <span>Print Master Roster</span>
                </button>
                <button
                  type="button"
                  onClick={areAllCollapsed ? handleExpandAllSchools : handleCollapseAllSchools}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={areAllCollapsed ? "Expand all school batches" : "Collapse all school batches"}
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${areAllCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  />
                  <span>{areAllCollapsed ? 'Expand All' : 'Collapse All'}</span>
                </button>
              </div>
            </div>

            {/* Directory Filter, Search & Multi-Sort Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1 border-t border-neutral-100">
              {/* Search School / Campus / Section */}
              <div className="lg:col-span-5 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder="Filter by school name, campus, or section..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-50/80 border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                />
                {schoolSearch && (
                  <button
                    type="button"
                    onClick={() => setSchoolSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="lg:col-span-4 flex items-center gap-1.5 overflow-x-auto py-0.5">
                {[
                  { key: 'ALL', label: `All (${totalSchoolsCount})` },
                  { key: 'PENDING', label: `Awaiting Schedule (${pendingSchoolsCount})` },
                  { key: 'CONFIRMED', label: `All Confirmed (${confirmedSchoolsCount})` },
                ].map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setSchoolStatusFilter(chip.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      schoolStatusFilter === chip.key
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Sort School Directory Dropdown */}
              <div className="lg:col-span-3">
                <select
                  value={schoolSortBy}
                  onChange={(e) => setSchoolSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50/80 border border-neutral-200 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all cursor-pointer"
                  title="Sort registered partner schools"
                >
                  <option value="pending_desc">Sort: Action Needed First</option>
                  <option value="name_asc">Sort: School Name (A to Z)</option>
                  <option value="name_desc">Sort: School Name (Z to A)</option>
                  <option value="students_desc">Sort: Largest Cohorts First</option>
                  <option value="students_asc">Sort: Smallest Cohorts First</option>
                </select>
              </div>
            </div>
          </div>

          {categorizedSchoolPlaces.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-xs">
              <GraduationCap size={40} className="mx-auto text-neutral-300 mb-3" />
              <h3 className="font-heading text-base font-bold text-primary">No Matching School Batches</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                No school partner records match your current directory filters or search queries.
              </p>
              {(schoolSearch || schoolStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSchoolSearch('');
                    setSchoolStatusFilter('ALL');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-neutral-100 text-neutral-800 text-xs font-semibold hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset Directory Filters</span>
                </button>
              )}
            </div>
          ) : (
            categorizedSchoolPlaces.map((schoolPlace) => {
              const isStudioGroup = schoolPlace.schoolName === 'Studio Direct / General';
              const isCollapsed = !!collapsedSchools[schoolPlace.schoolName];

              return (
                <div
                  key={schoolPlace.schoolName}
                  className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden transition-all hover:border-gold/50"
                >
                  {/* School Place Header (Collapsible Accordion) */}
                  <div
                    onClick={() => toggleSchoolCollapse(schoolPlace.schoolName)}
                    className="p-4 sm:p-5 bg-gradient-to-r from-neutral-950 via-neutral-900 to-[#1e1e1e] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-md">
                        {isStudioGroup ? (
                          <Building2 size={24} className="stroke-[2.2]" />
                        ) : (
                          <GraduationCap size={24} className="stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-base sm:text-lg font-bold text-white group-hover:text-gold transition-colors">
                            {schoolPlace.schoolName}
                          </h3>
                          {schoolPlace.campus && (
                            <span className="text-[11px] font-medium text-neutral-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                              {schoolPlace.campus}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
                            {schoolPlace.totalStudents} Student{schoolPlace.totalStudents === 1 ? '' : 's'}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-400">
                            {Object.keys(schoolPlace.sectionsMap).length} Section{Object.keys(schoolPlace.sectionsMap).length === 1 ? '' : 's'}
                          </span>
                          {schoolPlace.pendingScheduleCount > 0 ? (
                            <span
                              title={`${schoolPlace.pendingScheduleCount} Pending Schedule`}
                              className="text-[11px] font-semibold text-amber-200 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1.5"
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                              <span>{schoolPlace.pendingScheduleCount} Pending Schedule</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 size={11} /> All Confirmed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* School Level Actions & Accordion Toggle */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintClassRoster(schoolPlace.schoolName);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Print official school call-sheet roster"
                      >
                        <Printer size={13} />
                        <span>Print Class Roster</span>
                      </button>

                      {!isStudioGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSchoolScheduler(schoolPlace.schoolName, 'ALL');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-neutral-950 text-xs font-heading font-black tracking-wider shadow-md shadow-gold/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Schedule and broadcast to this school"
                        >
                          <Megaphone size={13} />
                          <span>Schedule & Broadcast</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSchoolCollapse(schoolPlace.schoolName);
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/20 transition-all cursor-pointer ml-1"
                        title={isCollapsed ? 'Expand school batch' : 'Collapse school batch'}
                        aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                      >
                        <ChevronDown size={15} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Collapsed Preview Summary */}
                  {isCollapsed ? (
                    <div
                      onClick={() => toggleSchoolCollapse(schoolPlace.schoolName)}
                      className="px-5 py-3.5 bg-neutral-50/90 hover:bg-neutral-100/80 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{schoolPlace.schoolName}</span>
                        <span>•</span>
                        <span>{Object.keys(schoolPlace.sectionsMap).length} sections</span>
                        <span>•</span>
                        <span>{schoolPlace.totalStudents} students registered</span>
                      </span>
                      <span className="font-semibold text-gold-dark hover:text-gold flex items-center gap-1">
                        Click to expand sections & roster <ChevronDown size={13} className="-rotate-90" />
                      </span>
                    </div>
                  ) : (
                    /* Sections Categorized Sub-Blocks */
                    <div className="p-4 sm:p-5 space-y-4 bg-neutral-50/50">
                      {Object.entries(schoolPlace.sectionsMap).map(([sectionName, sectionBookings]) => {
                        const sectionPendingCount = sectionBookings.filter(b => !b.event_date || b.status === 'PENDING').length;

                        return (
                          <div
                            key={sectionName}
                            className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden"
                          >
                            {/* Section Bar */}
                            <div className="px-4 py-2.5 bg-neutral-100/70 border-b border-neutral-200/80 flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-2.5 h-2.5 rounded-full bg-gold shrink-0" />
                                <h4 className="font-heading text-xs sm:text-sm font-bold text-neutral-900">
                                  Section: <span className="text-gold-dark">{sectionName}</span>
                                </h4>
                                <span className="text-[11px] font-medium text-neutral-500">
                                  ({sectionBookings.length} student{sectionBookings.length === 1 ? '' : 's'})
                                </span>
                                {sectionPendingCount > 0 ? (
                                  <span
                                    title={`${sectionPendingCount} Pending Schedule`}
                                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span>{sectionPendingCount} Pending Schedule</span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Confirmed
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Section Students Table */}
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs font-body">
                                <thead>
                                  <tr className="border-b border-neutral-100 bg-neutral-50/50 text-xs font-bold uppercase tracking-wider text-neutral-400 text-left">
                                    <th className="px-4 py-2.5">Booking #</th>
                                    <th className="px-4 py-2.5">Student / Client</th>
                                    <th className="px-4 py-2.5">Service Package</th>
                                    <th className="px-4 py-2.5">Pictorial Schedule</th>
                                    <th className="px-4 py-2.5">Shoot Location</th>
                                    <th className="px-4 py-2.5">Lead Photographer</th>
                                    <th className="px-4 py-2.5">Status</th>
                                    <th className="px-4 py-2.5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {sectionBookings.map((b) => {
                                    const cust = b.customer;
                                    const sizeBadge = getCustomerSize(cust, b);
                                    const isPending = !b.event_date || b.status === 'PENDING';

                                    return (
                                      <tr
                                        key={b.id}
                                        onClick={() => setInspectingBooking(b)}
                                        className="hover:bg-gold/8 cursor-pointer transition-colors"
                                      >
                                        {/* Booking # */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-xs font-bold text-gold">
                                              {b.booking_number}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyRef(b.booking_number, e);
                                              }}
                                              className="text-neutral-300 hover:text-gold p-0.5 cursor-pointer"
                                              title="Copy booking number"
                                            >
                                              {copiedRef === b.booking_number ? <Check size={11} className="text-gold" /> : <Copy size={11} />}
                                            </button>
                                          </div>
                                        </td>

                                        {/* Student / Customer */}
                                        <td className="px-4 py-3">
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-neutral-900 text-xs">
                                                {getBookingStudentName(b)}
                                              </span>
                                              {b.participant_details?.booking_for === 'someone_else' ? (
                                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                                                  For: {b.participant_details.full_name}{b.participant_details.relationship ? ` (${b.participant_details.relationship})` : ''}
                                                </span>
                                              ) : (
                                                <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-full border border-neutral-200">
                                                  Direct Student
                                                </span>
                                              )}
                                              {sizeBadge && (
                                                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                                  {sizeBadge}
                                                </span>
                                              )}
                                            </div>
                                            {b.student_details?.student_id && (
                                              <p className="text-xs text-neutral-400 font-mono">
                                                ID: {b.student_details.student_id}
                                              </p>
                                            )}
                                          </div>
                                        </td>

                                        {/* Package */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="space-y-0.5">
                                            <span className="text-xs font-medium text-neutral-800">
                                              {b.service?.name || 'School Pictorial'}
                                            </span>
                                            {b.tier_name && (
                                              <div>
                                                <span className="text-[11px] font-bold uppercase text-gold-dark bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20">
                                                  {b.tier_name}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </td>

                                        {/* Pictorial Schedule */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {isPending ? (
                                            <span
                                              title="Schedule TBA"
                                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80"
                                            >
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                              <span>Schedule TBA</span>
                                            </span>
                                          ) : (
                                            <div>
                                              <span className="font-semibold text-xs text-primary flex items-center gap-1">
                                                <CalendarDays size={11} className="text-gold-dark" /> {fmtDate(b.event_date)}
                                              </span>
                                              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                                                {formatTime(b.preferred_time)}
                                              </p>
                                            </div>
                                          )}
                                        </td>

                                        {/* Shoot Location */}
                                        <td className="px-4 py-3 max-w-[200px]">
                                          {isPending ? (
                                            <span className="text-xs text-neutral-400 italic">
                                              Venue TBA
                                            </span>
                                          ) : (
                                            <div className="flex items-center gap-1 text-xs text-neutral-800 truncate" title={b.location}>
                                              <MapPin size={11} className="text-gold shrink-0" />
                                              <span className="truncate">{b.location}</span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Lead Photographer */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {b.photographer ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                                              <Camera size={12} className="text-gold shrink-0" />
                                              <span>
                                                {`${b.photographer.first_name || b.photographer.profile?.first_name || ''} ${b.photographer.last_name || b.photographer.profile?.last_name || ''}`.trim() || 'Assigned Lead'}
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-[11px] text-neutral-400 italic">
                                              Unassigned
                                            </span>
                                          )}
                                        </td>

                                        {/* Status Column */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <BookingLifecycleBadge
                                            status={(!b.event_date && (b.student_details?.school || (b.notes || '').includes('School Pictorial') || (b.notes || '').includes('SCHOOL_PARTNER'))) ? 'PENDING' : b.status}
                                            showStatus={true}
                                            showPayment={false}
                                          />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => setInspectingBooking(b)}
                                              className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                                              title="Inspect student details"
                                            >
                                              <Eye size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditModal(b)}
                                              className="p-1.5 rounded-lg text-neutral-400 hover:text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                                              title="Edit booking"
                                            >
                                              <Edit3 size={13} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm font-body">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-600 text-left">
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setSortAsc(!sortAsc)}>
                    <span>Booking #</span>
                    <ArrowUpDown size={12} className="text-neutral-400" />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">
                  <div 
                    className="flex items-center gap-1.5 cursor-pointer select-none hover:text-gold transition-colors"
                    onClick={() => {
                      setSortBy(prev => prev === 'student_name_asc' ? 'student_name_desc' : 'student_name_asc');
                    }}
                    title="Click to sort by Student Name (Alphabetical A-Z)"
                  >
                    <span>Customer / Student</span>
                    <ArrowUpDown size={12} className={sortBy.startsWith('student_name') ? "text-gold" : "text-neutral-400"} />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden md:table-cell">Service</th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => { setSortBy('event_date'); setSortAsc(!sortAsc); }}>
                    <span>Event Date</span>
                    <ArrowUpDown size={12} className="text-neutral-400" />
                  </div>
                </th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4">Status</th>
                <th className="px-5 sm:px-6 py-3.5 sm:py-4 hidden xl:table-cell">Lead Photographer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-5 sm:px-6 py-5">
                      <div className="h-6 bg-neutral-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : displayedBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
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
                displayedBookings.map((b) => {
                  const cust = b.customer;
                  const sizeBadge = getCustomerSize(cust, b);

                  return (
                    <tr
                      key={b.id}
                      onClick={() => setInspectingBooking(b)}
                      title="Click to view details"
                      className={`transition-colors ${isDeletedTab ? 'bg-neutral-50/40 hover:bg-neutral-100/50' : 'hover:bg-gold/8'} cursor-pointer group`}
                    >
                      {/* Booking # & ID */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingBooking(b);
                              }}
                              className="font-mono text-xs sm:text-sm font-bold text-gold hover:text-primary hover:underline transition-colors text-left cursor-pointer"
                              title="Inspect booking details"
                            >
                              {b.booking_number}
                            </button>
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
                          <p className="font-mono text-xs text-neutral-400">
                            ID: {b.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>

                      {/* Customer / Participant with Size & Details */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <div className="space-y-0.5">
                          {b.participant_details?.booking_for === 'someone_else' ? (
                            <>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingBooking(b);
                                  }}
                                  className="font-bold text-neutral-900 text-sm sm:text-base hover:text-gold transition-colors text-left cursor-pointer"
                                  title="Inspect participant details"
                                >
                                  {b.participant_details.full_name}
                                </button>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                                  For: {b.participant_details.full_name}{b.participant_details.relationship ? ` (${b.participant_details.relationship})` : ''}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 truncate max-w-[220px]">
                                Account Owner: <span className="font-semibold text-neutral-700">{cust ? `${cust.first_name} ${cust.last_name}` : '—'}</span>
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingBooking(b);
                                }}
                                className="font-semibold text-neutral-900 text-sm sm:text-base hover:text-gold transition-colors text-left cursor-pointer"
                                title="Inspect customer details"
                              >
                                {cust ? `${cust.first_name} ${cust.last_name}` : '—'}
                              </button>
                              <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/80">
                                Direct Student
                              </span>
                              {sizeBadge && (
                                <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                  {sizeBadge}
                                </span>
                              )}
                            </div>
                          )}

                          {b.student_details?.student_name && (!b.participant_details?.full_name || b.student_details.student_name.toLowerCase() !== b.participant_details.full_name.toLowerCase()) && (
                            <p className="text-xs text-neutral-600 flex items-center gap-1 truncate max-w-[200px]">
                              <span className="text-xs text-neutral-400 font-medium uppercase">Student:</span>
                              <span className="font-semibold text-primary truncate">{b.student_details.student_name}</span>
                            </p>
                          )}
                          {(b.student_details?.school || cust?.studio_specs?.university || cust?.studio_specs?.degree) && (
                            <p className="text-xs text-neutral-500 flex items-center gap-1 truncate max-w-[200px]">
                              <GraduationCap size={12} className="text-gold-dark shrink-0" />
                              <span className="truncate">{b.student_details?.school || cust?.studio_specs?.university || cust?.studio_specs?.degree}</span>
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
                            <span className="text-xs font-bold uppercase text-gold-dark bg-gold/10 px-2 py-0.5 rounded border border-gold/20 inline-block">
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
                            ) : (
                              <span
                                title="Schedule TBA"
                                className="text-[11px] font-semibold text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80 inline-flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>Schedule TBA</span>
                              </span>
                            )}
                          </div>
                          {b.preferred_time && (
                            <p className="text-xs text-neutral-400 pl-4">
                              {formatTime(b.preferred_time)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5">
                        <BookingLifecycleBadge
                          status={(!b.event_date && (b.student_details?.school || (b.notes || '').includes('School Pictorial') || (b.notes || '').includes('SCHOOL_PARTNER'))) ? 'PENDING' : b.status}
                          showStatus={true}
                          showPayment={false}
                        />
                      </td>

                      {/* Lead Photographer Column */}
                      <td className="px-5 sm:px-6 py-4 sm:py-4.5 hidden xl:table-cell whitespace-nowrap">
                        {b.photographer ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                            <Camera size={13} className="text-gold shrink-0" />
                            <span>
                              {`${b.photographer.first_name || b.photographer.profile?.first_name || ''} ${b.photographer.last_name || b.photographer.profile?.last_name || ''}`.trim() || 'Assigned Lead'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">
                            Unassigned
                          </span>
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
      )}

      {/* ── 6. Create Booking Modal (INSERT CRUD) ──────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-neutral-950 via-[#141414] to-primary text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
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
                      <label className="block text-xs text-neutral-500 font-semibold mb-1">First Name *</label>
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
                      <label className="block text-xs text-neutral-500 font-semibold mb-1">Last Name *</label>
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
                      <label className="block text-xs text-neutral-500 font-semibold mb-1">Phone Number</label>
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
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">School / University</span>
                      <input
                        type="text"
                        placeholder="e.g. University of San Carlos"
                        value={newBooking.school}
                        onChange={e => setNewBooking({ ...newBooking, school: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">Degree / Strand</span>
                      <input
                        type="text"
                        placeholder="e.g. BS Computer Science"
                        value={newBooking.course}
                        onChange={e => setNewBooking({ ...newBooking, course: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">Student ID</span>
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
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">Campus / Section</span>
                      <input
                        type="text"
                        placeholder="e.g. Main Campus / 4-A"
                        value={newBooking.section}
                        onChange={e => setNewBooking({ ...newBooking, section: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">Toga Size</span>
                      <input
                        type="text"
                        placeholder="e.g. S, M, L, XL"
                        value={newBooking.toga_size}
                        onChange={e => setNewBooking({ ...newBooking, toga_size: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-500 font-semibold mb-1">Height</span>
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
                          <span className={`text-[11px] font-mono leading-none mb-0.5 ${isActive ? 'text-gold' : 'text-neutral-400'}`}>
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
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">First Name</span>
                      <input
                        type="text"
                        value={editingBooking.first_name || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, first_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Last Name</span>
                      <input
                        type="text"
                        value={editingBooking.last_name || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, last_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Phone</span>
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
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">School / University</span>
                        <input
                          type="text"
                          value={editingBooking.school || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, school: e.target.value })}
                          placeholder="e.g. University of San Carlos"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">Degree / Strand</span>
                        <input
                          type="text"
                          value={editingBooking.degree || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, degree: e.target.value })}
                          placeholder="e.g. BS Information Technology"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">Student ID</span>
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
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">Campus / Section</span>
                        <input
                          type="text"
                          value={editingBooking.section || editingBooking.campus || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, section: e.target.value, campus: e.target.value })}
                          placeholder="e.g. Main Campus / 4-A"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">Toga Size</span>
                        <input
                          type="text"
                          value={editingBooking.toga_size || ''}
                          onChange={e => setEditingBooking({ ...editingBooking, toga_size: e.target.value })}
                          placeholder="e.g. S, M, L, XL"
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 focus:border-gold outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-neutral-500 font-semibold mb-1">Height</span>
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
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Total Amount (₱)</span>
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
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Paid / Deposit (₱)</span>
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

                    <div className="space-y-1.5">
                      <CustomDropdown
                        value={editingBooking.photographer_id || ''}
                        onChange={val => setEditingBooking({ ...editingBooking, photographer_id: val })}
                        options={editPhotographerOptions}
                        label="Assigned Lead Photographer"
                        className="w-full"
                        popoverWidth="w-80"
                      />
                      {editingBooking.event_date && (
                        (() => {
                          const assignedPh = editBookingPhotographers.find(p => p.id === editingBooking.photographer_id);
                          if (!assignedPh) {
                            return (
                              <div className="text-[11px] text-neutral-400 italic flex items-center gap-1 mt-1">
                                <Camera size={12} className="text-neutral-400" />
                                <span>No lead assigned yet · Only verified photographer accounts eligible</span>
                              </div>
                            );
                          }
                          const isAvail = !assignedPh.hasConflict && assignedPh.is_available;
                          return (
                            <div className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between border mt-1.5 ${
                              isAvail ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              <span className="flex items-center gap-1.5 truncate">
                                {isAvail ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={13} className="text-amber-600 shrink-0" />}
                                <span className="truncate">{isAvail ? `On Duty on ${fmtDate(editingBooking.event_date)}` : (assignedPh.conflictReason || 'Not scheduled on this date')}</span>
                              </span>
                              <span className="text-xs text-neutral-500 font-normal shrink-0 ml-1">Photographer Account</span>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Date</span>
                      <input
                        type="date"
                        value={editingBooking.event_date ? editingBooking.event_date.split('T')[0] : ''}
                        onChange={e => setEditingBooking({ ...editingBooking, event_date: e.target.value })}
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Time</span>
                      <input
                        type="time"
                        value={editingBooking.preferred_time || ''}
                        onChange={e => setEditingBooking({ ...editingBooking, preferred_time: e.target.value })}
                        className="w-full px-2.5 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:border-gold outline-none text-xs"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Studio / Location</span>
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
                      <span className="text-xs text-neutral-400 font-mono">
                        Syncs to Order & Invoice
                      </span>
                    </div>

                    {/* Client Uploaded Reference Images (Only displayed when photos exist) */}
                    {editingBooking.reference_images?.length > 0 && (
                      <div className="space-y-1.5 pb-2.5 border-b border-neutral-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <FileImage size={12} className="text-gold-dark" />
                            Client Reference Pegs ({editingBooking.reference_images.length})
                          </span>
                          <span className="text-[11px] text-neutral-400">Click to enlarge</span>
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
                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-[10px] text-white font-mono">
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
                      <span className="block text-xs text-neutral-400 font-semibold">Special Instructions & Client Notes</span>
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
                  Booking <strong className="text-primary font-bold">#{bookingToDelete.booking_number}</strong> ({bookingToDelete.customer?.first_name || 'Client'}) will be cancelled and moved to the <strong className="text-rose-600 font-semibold">Trash Cycle</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-1 font-body">
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <Bell size={13} className="text-gold-dark" /> Customer Notification & Trash Cycle:
              </p>
              <ul className="list-disc list-inside text-[11px] text-neutral-600 space-y-0.5 ml-1">
                <li>Booking will be cleared from active records and customer dashboard</li>
                <li>Customer will receive an immediate notification that their order was removed</li>
                <li>Order can be reviewed, restored, or permanently cleared out anytime from the Trash Cycle</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Reason for Removal / Cancellation (Optional)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Client requested cancellation, duplicate order, schedule expired"
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
                <h3 className="font-heading text-lg font-bold text-primary">Permanently Clear Out Order</h3>
                <p className="text-xs text-neutral-500 font-body mt-1">
                  This will permanently delete booking <strong className="text-primary font-bold">#{bookingToPermanentlyPurge.booking_number}</strong> directly from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-1 font-body">
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <AlertCircle size={13} className="text-neutral-500" /> Irreversible Database Wipe:
              </p>
              <ul className="list-disc list-inside text-[11px] text-neutral-600 space-y-0.5 ml-1">
                <li>Permanently removes booking and ID from Supabase tables</li>
                <li>Cascades dependent payments, logs, outputs, and status history</li>
                <li>Records deletion audit in system activity logs</li>
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
                    Clearing Out...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Directly Clear Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9.1. Empty Entire Trash Confirmation Modal ───────────────── */}
      {isEmptyTrashModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isEmptyingTrash && setIsEmptyTrashModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary">Empty Entire Trash Cycle</h3>
                <p className="text-xs text-neutral-500 font-body mt-1">
                  Are you sure you want to permanently delete all <strong className="text-rose-600 font-bold">{counts.deleted} orders</strong> currently in the trash cycle?
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 space-y-1 font-body">
              <p className="font-bold flex items-center gap-1.5 text-rose-700">
                <AlertCircle size={13} /> Irreversible Bulk Purge:
              </p>
              <ul className="list-disc list-inside text-[11px] text-neutral-600 space-y-0.5 ml-1">
                <li>All {counts.deleted} soft-deleted records will be wiped directly from the database</li>
                <li>Associated payments, outputs, deliveries, and scans will be cleaned up</li>
                <li>This action CANNOT be undone</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isEmptyingTrash}
                onClick={() => setIsEmptyTrashModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEmptyingTrash}
                onClick={handleEmptyTrash}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isEmptyingTrash ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Emptying Trash...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Permanently Empty Trash
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
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
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
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <AlertCircle size={11} /> Busy / Conflict
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            onClick={() => setIsSchoolSchedulerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-neutral-200/90 flex flex-col max-h-[92vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Clean Minimal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold-dark flex items-center justify-center shadow-xs">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading text-base sm:text-lg text-primary font-bold">School Pictorial Scheduler</h3>
                    <p className="text-xs text-neutral-400 font-body">Batch session scheduling & student attendance management</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchoolSchedulerOpen(false)}
                  className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBatchScheduleSubmit} className="overflow-y-auto space-y-4 my-4 pr-1 flex-1 font-body custom-scrollbar">
                {/* ── Box 1: School Partner & Target Section Selection ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* School Partner Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1.5">
                        School Partner <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedBatchSchool}
                        onChange={e => {
                          const sch = e.target.value;
                          setSelectedBatchSchool(sch);
                          setSelectedBatchSection('ALL');
                          setBatchCustomAddress('');
                          setRescheduleStudentId('');
                          const found = schoolBatchesList.find(b => b.school.toLowerCase() === sch.toLowerCase());
                          if (found) {
                            setSelectedBatchKey(found.key);
                          }
                          const gen = generateAnnouncementText(
                            sch,
                            'ALL',
                            batchEventDate,
                            batchStartTime,
                            batchEndTime,
                            batchLocationType,
                            '',
                            batchPhotographerId,
                            allowRescheduleProtection
                          );
                          setBatchAnnouncementText(gen);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 transition-shadow"
                      >
                        <option value="">-- Select Partner School --</option>
                        {uniqueSchools.map(sch => (
                          <option key={sch.name} value={sch.name}>
                            {sch.name} ({sch.count} student{sch.count > 1 ? 's' : ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Section Dropdown (Appears once School is selected) */}
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1.5">
                        Target Section <span className="text-red-500">*</span>
                      </label>
                      {selectedBatchSchool ? (
                        <select
                          value={selectedBatchSection}
                          onChange={e => {
                            const sec = e.target.value;
                            setSelectedBatchSection(sec);
                            setRescheduleStudentId('');
                            const gen = generateAnnouncementText(
                              selectedBatchSchool,
                              sec,
                              batchEventDate,
                              batchStartTime,
                              batchEndTime,
                              batchLocationType,
                              batchCustomAddress,
                              batchPhotographerId,
                              allowRescheduleProtection
                            );
                            setBatchAnnouncementText(gen);
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 transition-shadow"
                        >
                          <option value="ALL">All Sections (Entire School Batch)</option>
                          {sectionsForSelectedSchool.map(sec => (
                            <option key={sec} value={sec}>
                              Section {sec}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3.5 py-2.5 bg-neutral-100/60 border border-neutral-200 rounded-xl text-xs text-neutral-400 italic">
                          Choose school first to select sections...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  {selectedBatchSchool && (
                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-neutral-200/60 text-neutral-600">
                      <span>
                        Target Batch: <strong className="text-primary font-bold">{targetStudentCount} student{targetStudentCount !== 1 ? 's' : ''}</strong>
                      </span>
                      {selectedBatchSection !== 'ALL' && (
                        <span className="font-semibold text-neutral-500">Section {selectedBatchSection}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Box 2: STEP 1 · Scheduled Date & Time Slot (Highlighted Process 1) ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-gold/40 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gold text-neutral-950 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        1
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Step 1 · Scheduled Date & Time Slot
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                      First Process
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                        Pictorial Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        disabled={!selectedBatchSchool}
                        value={batchEventDate}
                        onChange={e => {
                          const newDate = e.target.value;
                          setBatchEventDate(newDate);
                          setBatchPhotographerId('');
                          const gen = generateAnnouncementText(
                            selectedBatchSchool,
                            selectedBatchSection,
                            newDate,
                            batchStartTime,
                            batchEndTime,
                            batchLocationType,
                            batchCustomAddress,
                            '',
                            allowRescheduleProtection,
                            batchPhotographersAvailability
                          );
                          setBatchAnnouncementText(gen);
                        }}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        disabled={!selectedBatchSchool}
                        value={batchStartTime}
                        onChange={e => {
                          setBatchStartTime(e.target.value);
                          const gen = generateAnnouncementText(
                            selectedBatchSchool,
                            selectedBatchSection,
                            batchEventDate,
                            e.target.value,
                            batchEndTime,
                            batchLocationType,
                            batchCustomAddress,
                            batchPhotographerId,
                            allowRescheduleProtection
                          );
                          setBatchAnnouncementText(gen);
                        }}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        disabled={!selectedBatchSchool}
                        value={batchEndTime}
                        onChange={e => {
                          setBatchEndTime(e.target.value);
                          const gen = generateAnnouncementText(
                            selectedBatchSchool,
                            selectedBatchSection,
                            batchEventDate,
                            batchStartTime,
                            e.target.value,
                            batchLocationType,
                            batchCustomAddress,
                            batchPhotographerId,
                            allowRescheduleProtection
                          );
                          setBatchAnnouncementText(gen);
                        }}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Box 3: STEP 2 · Confirmed Pictorial Venue (Highlighted Process 2) ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-gold/40 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gold text-neutral-950 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        2
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Step 2 · Confirmed Pictorial Venue
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gold/10 text-gold-dark border border-gold/20 uppercase tracking-wider">
                      Second Process
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBatchLocationType('CAMPUS');
                        const gen = generateAnnouncementText(
                          selectedBatchSchool,
                          selectedBatchSection,
                          batchEventDate,
                          batchStartTime,
                          batchEndTime,
                          'CAMPUS',
                          batchCustomAddress,
                          batchPhotographerId,
                          allowRescheduleProtection
                        );
                        setBatchAnnouncementText(gen);
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        batchLocationType === 'CAMPUS'
                          ? 'border-primary bg-primary/5 font-semibold shadow-xs ring-1 ring-primary/20'
                          : 'border-neutral-200 bg-white hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-primary font-bold">
                        <GraduationCap size={16} className="text-gold" />
                        <span>School Campus (On-site)</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-body mt-1 truncate">
                        {selectedBatchSchool ? `${selectedBatchSchool} Campus` : 'School partner premises'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBatchLocationType('STUDIO');
                        const gen = generateAnnouncementText(
                          selectedBatchSchool,
                          selectedBatchSection,
                          batchEventDate,
                          batchStartTime,
                          batchEndTime,
                          'STUDIO',
                          '',
                          batchPhotographerId,
                          allowRescheduleProtection
                        );
                        setBatchAnnouncementText(gen);
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        batchLocationType === 'STUDIO'
                          ? 'border-primary bg-primary/5 font-semibold shadow-xs ring-1 ring-primary/20'
                          : 'border-neutral-200 bg-white hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-primary font-bold">
                        <Building2 size={16} className="text-gold" />
                        <span>E-Kodak Studio</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-body mt-1">
                        311 Rizal Street, City of Naga
                      </p>
                    </button>
                  </div>

                  {batchLocationType === 'CAMPUS' && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Room or Hall Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={batchCustomAddress}
                        onChange={e => {
                          setBatchCustomAddress(e.target.value);
                          const gen = generateAnnouncementText(
                            selectedBatchSchool,
                            selectedBatchSection,
                            batchEventDate,
                            batchStartTime,
                            batchEndTime,
                            batchLocationType,
                            e.target.value,
                            batchPhotographerId,
                            allowRescheduleProtection
                          );
                          setBatchAnnouncementText(gen);
                        }}
                        placeholder="e.g. Auditorium, Gymnasium, Room 302"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30"
                      />
                    </div>
                  )}
                </div>

                {/* ── Box 4: Assigned Lead Photographer ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Camera size={14} className="text-gold" />
                      <span>Assigned Lead Photographer</span>
                    </label>
                    {(() => {
                      const assignedPh = batchPhotographersAvailability.find(p => p.id === batchPhotographerId);
                      const isAvail = assignedPh && !assignedPh.hasConflict && assignedPh.is_available;
                      if (isAvail) {
                        return (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>On Duty: {assignedPh.first_name} {assignedPh.last_name} ({batchEventDate ? fmtDate(batchEventDate) : 'Date'})</span>
                          </span>
                        );
                      }
                      if (batchPhotographerId && assignedPh && (assignedPh.hasConflict || !assignedPh.is_available)) {
                        return (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                            <AlertTriangle size={12} className="text-amber-600" />
                            <span>{assignedPh.conflictReason || 'Schedule Notice'}</span>
                          </span>
                        );
                      }
                      const hasAnyAvail = batchPhotographersAvailability.some(p => !p.hasConflict && p.is_available);
                      if (batchEventDate && !hasAnyAvail) {
                        return (
                          <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                            <span>No photographers on duty for {fmtDate(batchEventDate)}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <span>Verified Photographers Only</span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="relative">
                    <select
                      value={batchPhotographerId}
                      onChange={e => {
                        const pid = e.target.value;
                        setBatchPhotographerId(pid);
                        const gen = generateAnnouncementText(
                          selectedBatchSchool,
                          selectedBatchSection,
                          batchEventDate,
                          batchStartTime,
                          batchEndTime,
                          batchLocationType,
                          batchCustomAddress,
                          pid,
                          allowRescheduleProtection,
                          batchPhotographersAvailability
                        );
                        setBatchAnnouncementText(gen);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-gold/30 appearance-none pr-9 transition-all cursor-pointer shadow-2xs hover:border-neutral-300"
                    >
                      <option value="">-- No Lead Assigned Yet (Optional) --</option>
                      {batchPhotographersAvailability.map(p => {
                        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Photographer';
                        const isAvail = !p.hasConflict && p.is_available;
                        const statusTag = isAvail 
                          ? '✓ Available (On Duty)' 
                          : (p.conflictReason ? `Off Duty (${p.conflictReason})` : 'Off Duty');
                        return (
                          <option key={p.id} value={p.id}>
                            {name} — {statusTag}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>

                  {batchPhotographerId ? (
                    (() => {
                      const photog = batchPhotographersAvailability.find(p => p.id === batchPhotographerId);
                      if (!photog) return null;
                      const name = `${photog.first_name || ''} ${photog.last_name || ''}`.trim() || 'Photographer';
                      const isAvail = !photog.hasConflict && photog.is_available;
                      return (
                        <div className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                          isAvail 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          <div className="flex items-center gap-2 truncate">
                            {isAvail ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                            )}
                            <span className="truncate">
                              {isAvail 
                                ? `${name} is verified on duty and synced with the announcement message.`
                                : `${name} · ${photog.conflictReason || 'Not scheduled for duty on this date.'}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isAvail ? 'Assigned' : 'Conflict'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setBatchPhotographerId('');
                                setBatchAnnouncementText(generateAnnouncementText(
                                  selectedBatchSchool,
                                  selectedBatchSection,
                                  batchEventDate,
                                  batchStartTime,
                                  batchEndTime,
                                  batchLocationType,
                                  batchCustomAddress,
                                  '',
                                  allowRescheduleProtection,
                                  batchPhotographersAvailability
                                ));
                              }}
                              className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">
                      {batchEventDate 
                        ? (batchPhotographersAvailability.some(p => !p.hasConflict && p.is_available)
                            ? `Photographers available on ${fmtDate(batchEventDate)} can be selected above.`
                            : `No photographers have duty shifts scheduled on ${fmtDate(batchEventDate)}. Assignment is optional.`)
                        : 'Select a pictorial date to check photographer duty shifts.'}
                    </p>
                  )}
                </div>

                {/* ── Box 5: Broadcast Announcement Message ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-primary">
                      Broadcast Announcement Message <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const gen = generateAnnouncementText(
                          selectedBatchSchool,
                          selectedBatchSection,
                          batchEventDate,
                          batchStartTime,
                          batchEndTime,
                          batchLocationType,
                          batchCustomAddress,
                          batchPhotographerId,
                          allowRescheduleProtection
                        );
                        setBatchAnnouncementText(gen);
                      }}
                      className="text-xs font-bold text-gold-dark hover:text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={10} /> Auto-format Message
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={batchAnnouncementText}
                    onChange={e => setBatchAnnouncementText(e.target.value)}
                    placeholder="Official message broadcasted to students..."
                    className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 resize-none text-neutral-800"
                  />
                </div>

                {/* ── Footer Actions ── */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSchoolSchedulerOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBatchSubmitting || !selectedBatchSchool || !batchEventDate}
                    className="btn-gold text-xs py-2.5 px-5 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
                  >
                    {isBatchSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        <Megaphone size={14} />
                        Confirm Schedule & Broadcast {targetStudentCount > 0 ? `(${targetStudentCount})` : ''}
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
        onRestore={(b) => handleRestoreBooking(b)}
        onEdit={(b) => handleOpenEditModal(b)}
        onDelete={(b) => {
          setBookingToDelete(b);
          setDeleteReason('');
        }}
      />

      {/* ── 11. Staff Desk QR Scanner & Verification Modal ────────────── */}
      <StaffQRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
      />

      </div>
    </div>
  );
}
