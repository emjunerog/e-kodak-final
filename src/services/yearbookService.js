import { supabase } from '../lib/supabase';

// ── Default Yearbook Publication Configuration ──────────────────────────────
// NOTE: All text fields default to ''. The book never invents names, mottos,
// schools, officers, or photos — empty fields print as blank/omitted.
export const DEFAULT_PUBLICATION_CONFIG = {
  id: 'proj-default-2025',
  title: 'Annual Academic Yearbook',
  academicYear: '',
  institutionName: '',
  campus: '',
  sectionName: '',
  programName: '',
  volumeNumber: '',
  principalName: '',
  principalTitle: '',
  principalMessage: '',
  curatorName: '',
  targetSchool: '',

  // Editable cover / back-cover fields (empty = omitted in print)
  coverLogoUrl: '',
  backTitle: '',
  backMessage: '',
  backCredit: '',
  showBackCounts: true,
  
  // Design & Editorial Tokens
  templateId: 'classic', // 'classic' | 'editorial' | 'scrapbook' | 'minimalist' | 'contemporary'
  coverColor: 'midnight', // 'midnight' | 'royal' | 'espresso' | 'marigold' | 'noir'
  coverFoil: 'gold', // 'gold' | 'silver' | 'rosegold'
  coverArt: 'sunburst', // 'sunburst' | 'arches' | 'rings' | 'corners' | 'none'
  coverBgUrl: '',
  coverBgShade: 72,
  layoutDensity: 6, // 4 | 6 | 8 | 9 | 12 portraits per page
  photoCut: '2x2', // '2x2' (square) | '2x3' (vertical portrait) | 'oval'
  photoTone: 'natural', // 'natural' | 'bw' | 'sepia'
  fontFamily: 'serif', // 'serif' | 'sans' | 'display'
  showQuotes: true,
  showHonors: true,
  showBadges: true,
  showSafeMargins: false,
  status: 'draft', // 'draft' | 'in_review' | 'preflight_passed' | 'ready_to_export'
  updatedAt: new Date().toISOString(),
};

// Aliases for compatibility
export const DEFAULT_CONFIG = DEFAULT_PUBLICATION_CONFIG;
export const DEFAULT_STUDENTS = []; // STRICT RULE: Zero mock students
export const loadStoredConfig = loadStoredProject;
export const saveStoredConfig = saveStoredProject;
export const fetchYearbookStudents = fetchEligibleAcademicStudents;

// ── Helper: Parse Structured Academic Notes from Bookings ─────────────────────
export function parseAcademicNotes(rawNotes = '') {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return {
      school: '',
      campus: '',
      degree: '',
      section: '',
      studentId: '',
      yearbookMotto: '',
      honors: '',
      officerRole: '',
    };
  }

  const school = rawNotes.match(/•\s*(?:School|Institution):\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const campus = rawNotes.match(/•\s*Campus(?:\s*\/\s*Address)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const degree = rawNotes.match(/•\s*(?:Degree|Program|Strand|Course)(?:\s*(?:\/|\&)\s*(?:Program|Strand|Course))?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const section = rawNotes.match(/•\s*Section(?:\s*\/\s*Batch)?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const studentId = rawNotes.match(/•\s*Student\s*ID:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const yearbookMotto = rawNotes.match(/•\s*(?:Yearbook\s*Motto|Senior\s*Quote|Motto):\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const honors = rawNotes.match(/•\s*(?:Honors|Awards|Distinction):\s*([^\n\r]+)/i)?.[1]?.trim() || '';
  const officerRole = rawNotes.match(/•\s*(?:Class\s*Officer|Officer\s*Role|Position|Role):\s*([^\n\r]+)/i)?.[1]?.trim() || '';

  const clean = (val) => (val && val !== 'N/A' && val !== 'null' ? val : '');

  return {
    school: clean(school),
    campus: clean(campus),
    degree: clean(degree),
    section: clean(section),
    studentId: clean(studentId),
    yearbookMotto: clean(yearbookMotto),
    honors: clean(honors),
    officerRole: clean(officerRole),
  };
}

// ── Check Student Profile Completeness ────────────────────────────────────────
export function calculateStudentCompleteness(student) {
  const missing = [];

  if (!student.photoUrl) missing.push('2×2 Portrait Photo');
  if (!student.name || student.name.trim() === '') missing.push('Student Name');
  if (!student.motto || student.motto.trim() === '') missing.push('Senior Quote / Motto');
  if (!student.degree && !student.credentials) missing.push('Program / Degree');
  if (!student.studentId) missing.push('Student ID / LRN');

  const totalChecks = 5;
  const score = Math.round(((totalChecks - missing.length) / totalChecks) * 100);

  return {
    score,
    isComplete: missing.length === 0,
    hasPhoto: !!student.photoUrl,
    hasMotto: !!student.motto,
    hasDegree: !!(student.degree || student.credentials),
    hasStudentId: !!student.studentId,
    missingFields: missing,
  };
}

// ── Strict record validation ────────────────────────────────────────────────
// The generator NEVER invents people, data, photos, or officers. A record is
// only book-eligible when every required field holds real data.
const REQUIRED_FIELDS = [
  { key: 'name', label: 'Full name' },
  { key: 'school', label: 'School' },
  { key: 'section', label: 'Section' },
  { key: 'studentId', label: 'Student ID' },
];

export function validateStudentRecord(student = {}) {
  const errors = [];
  REQUIRED_FIELDS.forEach(({ key, label }) => {
    const val = (student[key] || '').trim();
    if (!val) errors.push(`Missing ${label}`);
  });
  if (!student.photoUrl) errors.push('Missing photo');
  return { valid: errors.length === 0, errors };
}

export function normalizeSchoolName(name = '') {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Distinct schools present in a record set (for same-school scoping).
export function detectSchools(students = []) {
  const map = new Map();
  students.forEach((s) => {
    const raw = (s.school || '').trim();
    if (!raw) return;
    const key = normalizeSchoolName(raw);
    if (!map.has(key)) map.set(key, { name: raw, count: 0 });
    map.get(key).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// Distinct raw values for a field, preserving first-seen casing.
// Used to print the real campus(es) and section(s) on covers.
export function distinctValues(students = [], key) {
  const seen = new Map();
  (students || []).forEach((s) => {
    const raw = (s?.[key] || '').trim();
    if (!raw) return;
    const k = raw.toLowerCase();
    if (!seen.has(k)) seen.set(k, raw);
  });
  return Array.from(seen.values());
}

export function detectCampuses(students = []) {
  return distinctValues(students, 'campus');
}

export function detectSections(students = []) {
  return distinctValues(students, 'section');
}

// Remove duplicate records (same normalized name + student ID + school).
// Keeps the first occurrence, returns the rest in `removed`.
export function dedupeStudents(students = []) {
  const seen = new Set();
  const kept = [];
  const removed = [];
  students.forEach((stu) => {
    const key = [
      normalizeSchoolName(stu.name || ''),
      (stu.studentId || '').toLowerCase().trim(),
      normalizeSchoolName(stu.school || ''),
    ].join('|');
    if (seen.has(key)) {
      removed.push(stu);
    } else {
      seen.add(key);
      kept.push(stu);
    }
  });
  return { students: kept, removed };
}

// ── Fetch Eligible Academic Students from Supabase (STRICT REAL DATA ONLY) ────
export async function fetchEligibleAcademicStudents(filters = {}) {
  try {
    // 1. Fetch real bookings with joined profile and service data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        customer_id,
        tier_name,
        event_date,
        status,
        notes,
        reference_images,
        profiles:customer_id (
          id,
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          avatar_url,
          bio,
          studio_specs,
          badges
        ),
        services:service_id (
          id,
          name,
          category,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.warn('Yearbook DB query notice:', bookingsError);
    }

    // 2. Fetch available photo outputs
    const { data: photoOutputs } = await supabase
      .from('photo_outputs')
      .select('*')
      .order('created_at', { ascending: false });

    const photoMapByBooking = {};
    if (photoOutputs && photoOutputs.length > 0) {
      photoOutputs.forEach((p) => {
        if (!photoMapByBooking[p.booking_id]) {
          photoMapByBooking[p.booking_id] = p.file_path;
        }
      });
    }

    // 3. Map real bookings into standardized student records
    const studentList = [];
    const seenStudentKeys = new Set();

    if (bookings && bookings.length > 0) {
      bookings.forEach((b) => {
        const prof = b.profiles || {};
        if (!prof.first_name && !prof.last_name) return;

        const structured = parseAcademicNotes(b.notes || '');
        const specs = prof.studio_specs || {};

        const fullName = `${prof.first_name || ''} ${prof.middle_name ? prof.middle_name + ' ' : ''}${prof.last_name || ''}`.trim();
        // Photos: only real studio deliverables or the profile photo.
        // Never reference images, never placeholders.
        const photo = photoMapByBooking[b.id] || prof.avatar_url || null;
        // Every field below holds real data or '' — nothing is invented.
        const school = structured.school || specs.university || specs.school || '';
        const section = structured.section || specs.section || '';
        const studentId = structured.studentId || specs.student_id || '';
        const degree = structured.degree || specs.degree || '';
        const motto = structured.yearbookMotto || specs.motto || '';
        const honors = structured.honors || specs.honors || '';
        // Officers are never auto-assigned. Only an explicit officer role
        // written in booking notes or studio specs marks a class officer.
        const officerRole = structured.officerRole || specs.officerRole || specs.officer_role || '';
        const isOfficer = officerRole.trim() !== '';

        const dedupeKey = `${fullName.toLowerCase()}_${studentId.toLowerCase()}`;
        if (!seenStudentKeys.has(dedupeKey)) {
          seenStudentKeys.add(dedupeKey);

          const studentRecord = {
            id: `stu-${b.id || prof.id}`,
            bookingId: b.id,
            bookingNumber: b.booking_number,
            customerId: b.customer_id,
            name: fullName,
            firstName: prof.first_name || '',
            lastName: prof.last_name || '',
            nickname: prof.first_name || '',
            studentId,
            school,
            campus: structured.campus || specs.campus || '',
            degree,
            section,
            academicYear: b.event_date ? new Date(b.event_date).getFullYear().toString() : '',
            role: isOfficer ? officerRole : 'Student',
            isOfficer,
            motto,
            honors,
            credentials: degree || '',
            superlative: '',
            photoUrl: photo,
            photoSpecs: {
              zoom: 1,
              panX: 0,
              panY: 0,
              aspectRatio: '2x2',
            },
            isFromDatabase: true,
            status: b.status || 'confirmed',
          };

          studentRecord.completeness = calculateStudentCompleteness(studentRecord);
          studentRecord.validation = validateStudentRecord(studentRecord);
          studentList.push(studentRecord);
        }
      });
    }

    // 4. Also check standalone customer profiles if bookings are empty.
    // Same strict rule: only records with real school + section + ID are kept.
    if (studentList.length === 0) {
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(20);

      if (customerProfiles && customerProfiles.length > 0) {
        customerProfiles.forEach((prof) => {
          if (!prof.first_name && !prof.last_name) return;

          const specs = prof.studio_specs || {};
          const fullName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
          const officerRole = specs.officerRole || specs.officer_role || '';

          const studentRecord = {
            id: `prof-${prof.id}`,
            customerId: prof.id,
            name: fullName,
            firstName: prof.first_name || '',
            lastName: prof.last_name || '',
            nickname: prof.first_name || '',
            studentId: specs.student_id || '',
            school: specs.university || specs.school || '',
            campus: specs.campus || '',
            degree: specs.degree || '',
            section: specs.section || '',
            academicYear: '',
            role: officerRole.trim() !== '' ? officerRole : 'Student',
            isOfficer: officerRole.trim() !== '',
            motto: specs.motto || '',
            honors: specs.honors || '',
            credentials: specs.degree || '',
            superlative: '',
            photoUrl: prof.avatar_url || null,
            photoSpecs: { zoom: 1, panX: 0, panY: 0, aspectRatio: '2x2' },
            isFromDatabase: true,
            status: 'registered',
          };

          studentRecord.completeness = calculateStudentCompleteness(studentRecord);
          studentRecord.validation = validateStudentRecord(studentRecord);
          if (studentRecord.validation.valid) studentList.push(studentRecord);
        });
      }
    }

    // 5. Merge with manually added records stored locally (manual-* only).
    // Database records are never overwritten by stale drafts; every merged
    // record is re-validated and de-duplicated.
    const savedOverrides = (loadStoredStudents() || []).filter((s) => s && (s.id || '').startsWith('manual-'));
    if (savedOverrides.length > 0) {
      const map = new Map();
      studentList.forEach((s) => map.set(s.id, s));
      savedOverrides.forEach((s) => {
        const record = {
          ...s,
          completeness: calculateStudentCompleteness(s),
          validation: validateStudentRecord(s),
        };
        if (!map.has(record.id)) map.set(record.id, record);
      });
      const { students: deduped } = dedupeStudents(Array.from(map.values()));
      return deduped;
    }

    return dedupeStudents(studentList).students;
  } catch (err) {
    console.error('Error fetching academic students:', err);
    return loadStoredStudents() || [];
  }
}

// ── Duplicate Record Detection ────────────────────────────────────────────────
export function detectDuplicateRecords(students = []) {
  const duplicates = [];
  const seenName = new Map();
  const seenId = new Map();

  students.forEach((stu, index) => {
    const cleanName = (stu.name || '').toLowerCase().trim();
    const cleanId = (stu.studentId || '').toLowerCase().trim();

    if (cleanName && seenName.has(cleanName)) {
      duplicates.push({
        type: 'Duplicate Name',
        student: stu,
        conflictsWith: seenName.get(cleanName),
        index,
      });
    } else if (cleanName) {
      seenName.set(cleanName, stu);
    }

    if (cleanId && seenId.has(cleanId)) {
      duplicates.push({
        type: 'Duplicate Student ID',
        student: stu,
        conflictsWith: seenId.get(cleanId),
        index,
      });
    } else if (cleanId) {
      seenId.set(cleanId, stu);
    }
  });

  return duplicates;
}

// ── Print Preflight Quality Checker ───────────────────────────────────────────
// context: { excludedInvalidCount, otherSchoolCount } — records kept out of
// the book so the admin knows exactly what was left out and why.
export function runPreflightQualityCheck(config, students = [], context = {}) {
  const issues = [];
  const warnings = [];

  // Check 0: Records excluded for failed validation (never silently dropped)
  const invalid = students.filter((s) => !(s.validation || validateStudentRecord(s)).valid);
  if (invalid.length > 0) {
    issues.push({
      level: 'critical',
      code: 'INVALID_RECORDS',
      title: `${invalid.length} Record${invalid.length === 1 ? '' : 's'} Missing Required Data`,
      description: 'Name, school, section, student ID, and photo are all required. Fix or remove these records.',
      affectedStudents: invalid.map((s) => s.name || '(unnamed record)'),
    });
  }
  const excluded = context.excludedInvalidCount || 0;
  if (excluded > 0) {
    warnings.push({
      level: 'warning',
      code: 'EXCLUDED_INVALID',
      title: `${excluded} Incomplete Record${excluded === 1 ? '' : 's'} Excluded From This Book`,
      description: 'Records missing required data are kept out of the PDF until fixed.',
      affectedStudents: [],
    });
  }
  const otherSchools = context.otherSchoolCount || 0;
  if (otherSchools > 0) {
    warnings.push({
      level: 'warning',
      code: 'OTHER_SCHOOLS',
      title: `${otherSchools} Record${otherSchools === 1 ? '' : 's'} From Other Schools Excluded`,
      description: 'This book covers one school only. Switch schools to include them.',
      affectedStudents: [],
    });
  }

  // Check 1: Missing Photos
  const missingPhotos = students.filter((s) => !s.photoUrl);
  if (missingPhotos.length > 0) {
    issues.push({
      level: 'critical',
      code: 'MISSING_PORTRAITS',
      title: `${missingPhotos.length} Student${missingPhotos.length === 1 ? '' : 's'} Missing Portrait Photo`,
      description: 'These records have no portrait photo attached. They will print with an empty photo frame.',
      affectedStudents: missingPhotos.map((s) => s.name),
    });
  }

  // Check 2: Missing Senior Quotes
  const missingQuotes = students.filter((s) => !s.motto || s.motto.trim() === '');
  if (missingQuotes.length > 0) {
    warnings.push({
      level: 'warning',
      code: 'MISSING_QUOTES',
      title: `${missingQuotes.length} Student${missingQuotes.length === 1 ? '' : 's'} Without Motto / Quote`,
      description: 'Entries without a motto will print name, ID, and program only.',
      affectedStudents: missingQuotes.map((s) => s.name),
    });
  }

  // Check 3: Duplicate Entries — export is blocked until removed
  const duplicates = detectDuplicateRecords(students);
  if (duplicates.length > 0) {
    issues.push({
      level: 'critical',
      code: 'DUPLICATE_ENTRIES',
      title: `${duplicates.length} Duplicate Student${duplicates.length === 1 ? '' : 's'} Must Be Removed`,
      description: 'Records sharing identical names or student ID numbers. Use Remove Duplicates.',
      affectedStudents: duplicates.map((d) => d.student.name),
    });
  }

  // Check 4: Page Count & Spread Balance
  const totalStudents = students.length;
  const density = config.layoutDensity || 6;
  const estimatedPages = Math.ceil(totalStudents / density);

  if (totalStudents === 0) {
    issues.push({
      level: 'critical',
      code: 'ZERO_STUDENTS',
      title: 'No Students Included',
      description: 'The roster is empty. Sync database records or add candidates before exporting.',
    });
  }

  const passed = issues.length === 0;

  return {
    passed,
    issuesCount: issues.length,
    warningsCount: warnings.length,
    issues,
    warnings,
    summary: passed
      ? 'Preflight passed. The book is ready to export to PDF.'
      : `${issues.length} issue(s) to review before PDF export.`,
  };
}

// ── Print pagination helper (single source of truth for PDF export) ─────────
// A4 portrait flow: cover + message + directory + interiors + back.
export const PRINT_SHEET_COUNT_OFFSET = 4;
// Returns the number of interior student pages and the slice for a given page.
export function getStudentPageCount(totalStudents, density = 6) {
  const safeDensity = Math.max(1, density || 6);
  if (totalStudents <= 0) return 0;
  return Math.ceil(totalStudents / safeDensity);
}

export function getStudentsForPage(students = [], pageNumber = 1, density = 6) {
  const safeDensity = Math.max(1, density || 6);
  const start = (Math.max(1, pageNumber) - 1) * safeDensity;
  return students.slice(start, start + safeDensity);
}

// ── Legacy placeholder purge ────────────────────────────────────────────────
// Old builds pre-filled invented defaults (e.g. 'Aldepos Academy'). They may
// still sit in localStorage or old records. Treat them as blank so the book
// only ever shows the real school name.
const LEGACY_PLACEHOLDERS = new Set(
  [
    'aldepos academy',
    'general batch',
    'academic graduate',
    'academic candidate',
    'graduation candidate',
    'senior high school academic track',
    'main campus',
    'e-kodak professional photography studio',
  ].map((s) => s.toLowerCase())
);

function sanitizeLegacy(value) {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (LEGACY_PLACEHOLDERS.has(raw.toLowerCase())) return '';
  if (/^honors candidate \(.*\)$/i.test(raw)) return '';
  return raw;
}

// ── Publication Project Persistence ───────────────────────────────────────────
const STORAGE_KEY_STUDENTS = 'ekodak_yearbook_roster';
const STORAGE_KEY_PROJECT = 'ekodak_yearbook_active_project';
const STORAGE_KEY_ALL_PROJECTS = 'ekodak_yearbook_all_projects';

function sanitizeStoredStudent(s) {
  if (!s || typeof s !== 'object') return s;
  const clean = { ...s };
  if ('school' in clean) clean.school = sanitizeLegacy(clean.school);
  if ('section' in clean) clean.section = sanitizeLegacy(clean.section);
  if ('degree' in clean) clean.degree = sanitizeLegacy(clean.degree);
  if ('credentials' in clean) clean.credentials = sanitizeLegacy(clean.credentials);
  if ('honors' in clean) clean.honors = sanitizeLegacy(clean.honors);
  if (clean.nickname && clean.nickname.trim().toLowerCase() === 'senior') clean.nickname = '';
  clean.completeness = calculateStudentCompleteness(clean);
  clean.validation = validateStudentRecord(clean);
  return clean;
}

export function loadStoredStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(sanitizeStoredStudent) : parsed;
  } catch {
    return null;
  }
}

export function saveStoredStudents(students) {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.warn('Failed to save students to localStorage:', e);
  }
}

export function loadStoredProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    const stored = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_PUBLICATION_CONFIG, ...stored };
    // Purge legacy invented defaults so the real school name shows instead.
    ['institutionName', 'campus', 'sectionName', 'programName', 'curatorName'].forEach((k) => {
      if (k in merged) merged[k] = sanitizeLegacy(merged[k]);
    });
    return merged;
  } catch {
    return DEFAULT_PUBLICATION_CONFIG;
  }
}

export function saveStoredProject(project) {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(project));
  } catch (e) {
    console.warn('Failed to save project to localStorage:', e);
  }
}

export function listStoredProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALL_PROJECTS);
    if (raw) return JSON.parse(raw);
    return [DEFAULT_PUBLICATION_CONFIG];
  } catch {
    return [DEFAULT_PUBLICATION_CONFIG];
  }
}

// ── Web Audio Realistic Page Flip Sound Synthesizer ───────────────────────────
let audioCtx = null;
export function playRealisticPageFlipSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const bufferSize = audioCtx.sampleRate * 0.16;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.3));
      output[i] = (Math.random() * 2 - 1) * decay * 0.15;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(280, audioCtx.currentTime + 0.15);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    whiteNoise.start();
  } catch (e) {
    // Graceful fallback if restricted
  }
}
