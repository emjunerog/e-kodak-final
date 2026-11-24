import { supabase } from '../lib/supabase';
import { OFFICIAL_SCHOOL_LOGOS } from '../components/booking/SchoolLogo';

export const INSTITUTIONAL_FONT_OPTIONS = [
  { id: 'serif', label: 'Classic Serif', family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans', label: 'Google Sans', family: '"Google Sans", system-ui, -apple-system, sans-serif' },
  { id: 'garamond', label: 'Editorial Garamond', family: '"Garamond", "Palatino Linotype", Georgia, serif' },
  { id: 'mono', label: 'Academic Mono', family: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

export const INSTITUTIONAL_CATEGORIES = [
  {
    key: 'vmgo',
    shortLabel: 'VMGO',
    label: 'VMGO (Vision, Mission & Goals)',
    kind: 'vmgo',
    hint: 'School Vision, Mission, Core Values & Goals.',
    hasPerson: false,
  },
  {
    key: 'programme',
    shortLabel: 'Programme',
    label: 'Graduation Programme',
    kind: 'document',
    hint: 'Order of Commencement Exercises & program flow.',
    hasPerson: false,
  },
  {
    key: 'governor',
    shortLabel: 'Governor',
    label: 'Message of the Governor',
    kind: 'message',
    defaultTitle: 'Provincial Governor',
    hint: 'Governor portrait photo, full name & commencement message.',
    hasPerson: true,
  },
  {
    key: 'mayor',
    shortLabel: 'Mayor',
    label: 'Message of the Mayor',
    kind: 'message',
    defaultTitle: 'City / Municipal Mayor',
    hint: 'Mayor portrait photo, full name & commencement message.',
    hasPerson: true,
  },
  {
    key: 'president',
    shortLabel: 'President / Supt.',
    label: 'University President / Division Superintendent',
    kind: 'message',
    defaultTitle: 'University President',
    altTitle: 'Schools Division Superintendent',
    hint: 'College University President or High School Division Superintendent.',
    hasPerson: true,
    hasLevelToggle: true,
  },
  {
    key: 'campusDirector',
    shortLabel: 'Campus Director',
    label: 'Office of the Campus Director (College)',
    kind: 'message',
    defaultTitle: 'Campus Director',
    hint: 'Office of the Campus Director portrait, name & message.',
    hasPerson: true,
  },
  {
    key: 'dean',
    shortLabel: 'Dean',
    label: 'Dean of Instruction',
    kind: 'message',
    defaultTitle: 'Dean of Instruction',
    hint: 'Dean of Instruction portrait, name & academic message.',
    hasPerson: true,
  },
];

export function createDefaultInstitutionalData() {
  return {
    vmgo: {
      heading: 'Vision, Mission & Goals',
      topPhotoUrl: '',
      topPhotoSizePx: 64,
      vision: '',
      mission: '',
      goals: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'left',
      extraBlocks: [],
    },
    programme: {
      heading: 'Graduation Programme',
      subtitle: '',
      body: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'left',
      extraBlocks: [],
    },
    governor: {
      heading: 'Message from the Office of the Governor',
      name: '',
      roleTitle: 'Provincial Governor',
      photoUrl: '',
      message: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'justify',
      extraBlocks: [],
    },
    mayor: {
      heading: 'Message from the Office of the Mayor',
      name: '',
      roleTitle: 'City / Municipal Mayor',
      photoUrl: '',
      message: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'justify',
      extraBlocks: [],
    },
    president: {
      level: 'college', // 'college' | 'highschool'
      heading: 'Message from the University President',
      name: '',
      roleTitle: 'University President',
      photoUrl: '',
      message: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'justify',
      extraBlocks: [],
    },
    campusDirector: {
      heading: 'Message from the Office of the Campus Director',
      name: '',
      roleTitle: 'Campus Director',
      photoUrl: '',
      message: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'justify',
      extraBlocks: [],
    },
    dean: {
      heading: 'Message from the Dean of Instruction',
      name: '',
      roleTitle: 'Dean of Instruction',
      photoUrl: '',
      message: '',
      fontFamily: 'serif',
      fontSizePx: 10.5,
      textAlign: 'justify',
      extraBlocks: [],
    },
  };
}

export function isInstitutionalSectionPopulated(sectionKey, sectionData = {}) {
  if (!sectionData || typeof sectionData !== 'object') return false;
  const hasBlocks = Array.isArray(sectionData.extraBlocks) && sectionData.extraBlocks.length > 0;
  if (sectionKey === 'vmgo') {
    return Boolean(
      (sectionData.topPhotoUrl || '').trim() ||
      (sectionData.vision || '').trim() ||
      (sectionData.mission || '').trim() ||
      (sectionData.goals || '').trim() ||
      hasBlocks
    );
  }
  if (sectionKey === 'programme') {
    return Boolean(
      (sectionData.subtitle || '').trim() ||
      (sectionData.body || '').trim() ||
      hasBlocks
    );
  }
  return Boolean(
    (sectionData.name || '').trim() ||
    (sectionData.photoUrl || '').trim() ||
    (sectionData.message || '').trim() ||
    hasBlocks
  );
}

export function getActiveInstitutionalSections(customTemplate = {}) {
  const defaults = createDefaultInstitutionalData();
  const data = { ...defaults, ...(customTemplate?.institutionalData || {}) };
  return INSTITUTIONAL_CATEGORIES.filter((cat) =>
    isInstitutionalSectionPopulated(cat.key, data[cat.key])
  ).map((cat) => ({
    ...cat,
    data: { ...defaults[cat.key], ...(data[cat.key] || {}) },
  }));
}

export const DEFAULT_CUSTOM_TEMPLATE = {
  presetName: 'My Canva Design',
  interiorBgUrl: '',
  titlePageBgUrl: '',
  facultyBgUrl: '',
  openerBgUrl: '',
  officersBgUrl: '',
  dedicationBgUrl: '',
  memoriesBgUrl: '',
  backCoverBgUrl: '',
  institutionalData: createDefaultInstitutionalData(),
  bgScrimOpacity: 10,
  paddingTop: 52,
  paddingBottom: 34,
  paddingX: 28,
  gridGap: 14,
  cardStyle: 'glass-light', // 'transparent' | 'glass-light' | 'glass-dark' | 'bordered'
  cardBgOpacity: 90,
  cardRadius: 14,
  cardOffsetX: 0,
  cardOffsetY: 0,
  photoShape: 'inherit', // 'inherit' | '2x2' | '2x3' | 'oval'
  photoSizePct: 86,
  fontScale: 1,
  headerColor: '#171717',
  textColor: '#171717',
  mutedTextColor: '#525252',
  accentColor: '#b47b2b',
  showHeader: true,
  showFooter: true,
  showSchoolCrest: true,
  showGuides: false,
};

export const STUDIO_BACKGROUND_RESOURCES = [
  {
    id: 'grad-students',
    label: 'Graduates Group Warm',
    url: '/images/ekodak-graduation-students.jpg',
    kind: 'cover',
  },
  {
    id: 'grad-portrait',
    label: 'Graduation Spotlight',
    url: '/images/ekodak-graduation-portrait.jpg',
    kind: 'cover',
  },
  {
    id: 'studio-editorial',
    label: 'Editorial Dark Studio',
    url: '/images/ekodak-editorial-portrait.png',
    kind: 'cover',
  },
  {
    id: 'studio-wood',
    label: 'Classic Studio Gold',
    url: '/images/login-dark.jpg',
    kind: 'cover',
  },
  {
    id: 'studio-daylight',
    label: 'Daylight Minimal Print',
    url: '/images/login-light.jpg',
    kind: 'interior',
  },
  {
    id: 'family-grad',
    label: 'Commencement Portrait',
    url: '/images/brochure/grad/family-graduation.jpg',
    kind: 'cover',
  },
];

// ── Default Yearbook Publication Configuration ──────────────────────────────
export const DEFAULT_PUBLICATION_CONFIG = {
  id: 'proj-default-2026',
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
  targetSection: 'ALL',

  // Editable cover / back-cover fields (empty = omitted in print)
  coverLogoUrl: '',
  hideCoverLogo: false,
  backTitle: '',
  backMessage: '',
  backCredit: '',
  showBackCounts: true,

  // Design & Editorial Tokens
  templateId: 'classic', // 'classic' | 'editorial' | 'minimalist' | 'scrapbook' | 'chalkboard' | 'custom'
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
  customTemplate: { ...DEFAULT_CUSTOM_TEMPLATE },
  status: 'draft',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_CONFIG = DEFAULT_PUBLICATION_CONFIG;
export const DEFAULT_STUDENTS = [];
export const loadStoredConfig = loadStoredProject;
export const saveStoredConfig = saveStoredProject;
export const fetchYearbookStudents = fetchEligibleAcademicStudents;

const SCHOOL_ALIAS_MAP = {
  usc: ['university of san carlos', 'usc', 'carolinian'],
  ctu: ['cebu technological university', 'ctu'],
  uc: ['university of ceu', 'university of cebu', 'uc'],
  uv: ['university of the visayas', 'uv'],
  cnu: ['cebu normal university', 'cnu'],
  citu: ['cebu institute of technology', 'cit-u', 'citu', 'cit university'],
  upcebu: ['university of the philippines cebu', 'up cebu', 'upcebu'],
  usjr: ['university of san jose', 'usj-r', 'usjr', 'recoletos'],
  swu: ['southwestern university', 'swu', 'phinma'],
  cdu: ['cebu doctors', 'cdu'],
  velez: ['velez college', 'velez'],
  uspf: ['university of southern philippines', 'uspf'],
  benedicto: ['benedicto college', 'benedicto'],
  act: ['asian college of technology', 'act'],
  stc: ["st. theresa's college", 'saint theresa', 'stc'],
};

/** Match any institution name against the official Cebu school seals in /public/images/schools/. */
export function resolveSchoolCrest(schoolName = '') {
  const clean = normalizeSchoolName(schoolName);
  if (!clean) return null;
  for (const [key, aliases] of Object.entries(SCHOOL_ALIAS_MAP)) {
    if (aliases.some((alias) => clean.includes(alias))) {
      const entry = OFFICIAL_SCHOOL_LOGOS[key];
      if (entry) return { id: key, ...entry };
    }
  }
  return null;
}

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
  const degree = rawNotes.match(/•\s*(?:Degree|Program|Strand|Course)(?:\s*(?:\/|&)\s*(?:Program|Strand|Course))?:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
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

export function detectSchools(students = []) {
  if (!Array.isArray(students)) return [];
  const counts = new Map();
  students.forEach((stu) => {
    const raw = (stu?.school || '').trim();
    if (!raw) return;
    const key = normalizeSchoolName(raw);
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { name: raw, count: 1 });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function distinctValues(students = [], field) {
  if (!Array.isArray(students)) return [];
  const seen = new Map();
  students.forEach((stu) => {
    const raw = (stu?.[field] || '').trim();
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

export function dedupeStudents(students = []) {
  if (!Array.isArray(students)) return { students: [], removed: [] };
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

/** Match an individual student in a batch booking to uploaded `photo_outputs` by ID, full name, or surname. */
function matchStudentBatchPhoto(outputs = [], studentName = '', studentId = '') {
  if (!Array.isArray(outputs) || outputs.length === 0) return null;
  const cleanId = String(studentId || '').trim().toLowerCase();
  const nameTokens = String(studentName || '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length >= 2);

  for (const out of outputs) {
    const fileName = String(out.file_name || out.file_path || '').toLowerCase();
    if (!fileName) continue;
    if (cleanId && fileName.includes(cleanId)) return out.file_path;
    if (nameTokens.length > 0 && nameTokens.every((t) => fileName.includes(t))) {
      return out.file_path;
    }
  }
  // Surname fallback if single unique surname token >= 4 chars matches
  const lastToken = nameTokens[nameTokens.length - 1];
  if (lastToken && lastToken.length >= 4) {
    const hit = outputs.find((out) =>
      String(out.file_name || '').toLowerCase().includes(lastToken)
    );
    if (hit) return hit.file_path;
  }
  return null;
}

// ── Fetch Eligible Academic Students from Supabase (Individual + School Section Batches) ──
export async function fetchEligibleAcademicStudents() {
  try {
    if (!supabase) return loadStoredStudents() || [];

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        customer_id,
        booking_for,
        school,
        school_address,
        track,
        batch,
        section,
        student_id,
        yearbook_motto,
        student_details,
        participant_details,
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
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.warn('Yearbook DB query notice:', bookingsError);
    }

    const { data: photoOutputs } = await supabase
      .from('photo_outputs')
      .select('*')
      .order('created_at', { ascending: false });

    const photoListByBooking = {};
    if (Array.isArray(photoOutputs)) {
      photoOutputs.forEach((p) => {
        if (!photoListByBooking[p.booking_id]) photoListByBooking[p.booking_id] = [];
        photoListByBooking[p.booking_id].push(p);
      });
    }

    const studentList = [];
    const seenStudentKeys = new Set();

    if (Array.isArray(bookings)) {
      bookings.forEach((b) => {
        const structured = parseAcademicNotes(b.notes || '');
        const prof = b.profiles || {};
        const specs = prof.studio_specs || {};
        const sd = b.student_details || {};
        const outputsForBooking = photoListByBooking[b.id] || [];

        const baseSchool = b.school || sd.school || structured.school || specs.university || specs.school || '';
        const baseCampus = b.school_address || sd.school_address || structured.campus || specs.campus || '';
        const baseDegree = b.track || sd.course || structured.degree || specs.degree || '';
        const baseSection = b.section || sd.section || structured.section || specs.section || '';
        const baseYear =
          b.batch ||
          sd.batch ||
          (b.event_date ? new Date(b.event_date).getFullYear().toString() : '');

        // A. School Section Masterlist Batch Booking — unpack every student row in masterlist_students
        const batchRoster = Array.isArray(sd.masterlist_students) ? sd.masterlist_students : [];
        if (batchRoster.length > 0 || b.booking_for === 'school_section') {
          batchRoster.forEach((item, idx) => {
            const rawName = String(
              item.fullName || item.name || `${item.firstName || ''} ${item.lastName || ''}`
            ).trim();
            if (!rawName) return;

            const stuId = String(item.studentId || item.lrn || item.idNumber || '').trim();
            const stuSection = String(item.section || baseSection || '').trim();
            const stuDegree = String(item.strand || item.course || item.degree || baseDegree || '').trim();
            const stuOfficer = String(item.officerRole || item.role || '').trim();
            const isOfficer = Boolean(stuOfficer && stuOfficer.toLowerCase() !== 'student');
            const matchedPhoto =
              item.photoUrl ||
              matchStudentBatchPhoto(outputsForBooking, rawName, stuId) ||
              null;

            const dedupeKey = `${rawName.toLowerCase()}_${stuId.toLowerCase()}_${baseSchool.toLowerCase()}`;
            if (seenStudentKeys.has(dedupeKey)) return;
            seenStudentKeys.add(dedupeKey);

            const parts = rawName.split(/\s+/);
            const record = {
              id: `stu-batch-${b.id}-${idx}`,
              bookingId: b.id,
              bookingNumber: b.booking_number,
              customerId: b.customer_id,
              tierName: item.tier || item.set || b.tier_name || '',
              name: rawName,
              firstName: item.firstName || parts[0] || '',
              lastName: item.lastName || parts.slice(1).join(' ') || '',
              nickname: item.nickname || parts[0] || '',
              studentId: stuId,
              school: item.school || baseSchool,
              campus: baseCampus,
              degree: stuDegree,
              section: stuSection,
              academicYear: String(item.batch || baseYear || ''),
              role: isOfficer ? stuOfficer : 'Student',
              isOfficer,
              motto: String(item.motto || item.quote || '').trim(),
              honors: String(item.honors || item.awards || '').trim(),
              credentials: stuDegree,
              superlative: '',
              photoUrl: matchedPhoto,
              photoSpecs: { zoom: 1, panX: 0, panY: 0, aspectRatio: '2x2' },
              isFromDatabase: true,
              isBatchMember: true,
              status: b.status || 'confirmed',
            };
            record.completeness = calculateStudentCompleteness(record);
            record.validation = validateStudentRecord(record);
            studentList.push(record);
          });
          if (batchRoster.length > 0) return;
        }

        // B. Individual / Someone-Else Academic Booking
        const pd = b.participant_details || {};
        const fallbackName = `${prof.first_name || ''} ${prof.middle_name ? prof.middle_name + ' ' : ''}${prof.last_name || ''}`.trim();
        const fullName = String(sd.student_name || pd.name || fallbackName || '').trim();
        if (!fullName) return;

        const studentId = b.student_id || sd.student_id || structured.studentId || specs.student_id || '';
        const motto = b.yearbook_motto || sd.yearbook_motto || structured.yearbookMotto || specs.motto || '';
        const honors = structured.honors || specs.honors || '';
        const officerRole = structured.officerRole || specs.officerRole || specs.officer_role || '';
        const isOfficer = officerRole.trim() !== '';
        const photo =
          matchStudentBatchPhoto(outputsForBooking, fullName, studentId) ||
          outputsForBooking[0]?.file_path ||
          prof.avatar_url ||
          null;

        const dedupeKey = `${fullName.toLowerCase()}_${studentId.toLowerCase()}_${baseSchool.toLowerCase()}`;
        if (!seenStudentKeys.has(dedupeKey)) {
          seenStudentKeys.add(dedupeKey);
          const nameParts = fullName.split(/\s+/);
          const studentRecord = {
            id: `stu-${b.id || prof.id}`,
            bookingId: b.id,
            bookingNumber: b.booking_number,
            customerId: b.customer_id,
            tierName: b.tier_name || '',
            name: fullName,
            firstName: prof.first_name || nameParts[0] || '',
            lastName: prof.last_name || nameParts.slice(1).join(' ') || '',
            nickname: prof.first_name || nameParts[0] || '',
            studentId,
            school: baseSchool,
            campus: baseCampus,
            degree: baseDegree,
            section: baseSection,
            academicYear: baseYear,
            role: isOfficer ? officerRole : 'Student',
            isOfficer,
            motto,
            honors,
            credentials: baseDegree,
            superlative: '',
            photoUrl: photo,
            photoSpecs: { zoom: 1, panX: 0, panY: 0, aspectRatio: '2x2' },
            isFromDatabase: true,
            status: b.status || 'confirmed',
          };

          studentRecord.completeness = calculateStudentCompleteness(studentRecord);
          studentRecord.validation = validateStudentRecord(studentRecord);
          studentList.push(studentRecord);
        }
      });
    }

    if (studentList.length === 0) {
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(20);

      if (Array.isArray(customerProfiles)) {
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

    const savedOverrides = (loadStoredStudents() || []).filter(
      (s) => s && ((s.id || '').startsWith('manual-') || (s.id || '').startsWith('csv-'))
    );
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
      return dedupeStudents(Array.from(map.values())).students;
    }

    return dedupeStudents(studentList).students;
  } catch (err) {
    console.error('Error fetching academic students:', err);
    return loadStoredStudents() || [];
  }
}

/**
 * Parse a CSV or TSV batch roster uploaded inside Yearbook Studio into structured student records.
 * Supports flexible headers: Name, Student ID / LRN, School, Section, Degree / Strand, Motto / Quote, Honors, Role.
 */
export function parseRosterCsvOrTsv(rawText = '', { defaultSchool = '', defaultSection = '', defaultYear = '' } = {}) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const splitLine = (line) => {
    if (delimiter === '\t') return line.split('\t').map((c) => c.trim().replace(/^"|"$/g, ''));
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const colIdx = (patterns) =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  const idxName = colIdx(['full name', 'student name', 'name']);
  const idxFirst = colIdx(['first name', 'firstname']);
  const idxLast = colIdx(['last name', 'lastname', 'surname']);
  const idxId = colIdx(['student id', 'id number', 'lrn', 'id']);
  const idxSchool = colIdx(['school', 'university', 'institution']);
  const idxSection = colIdx(['section', 'batch', 'class']);
  const idxDegree = colIdx(['degree', 'program', 'strand', 'course']);
  const idxMotto = colIdx(['motto', 'quote', 'saying']);
  const idxHonors = colIdx(['honor', 'award', 'latin', 'distinction']);
  const idxRole = colIdx(['officer', 'role', 'position']);

  const parsed = [];
  const ts = Date.now();
  for (let r = 1; r < lines.length; r += 1) {
    const cols = splitLine(lines[r]);
    const nameVal =
      (idxName >= 0 ? cols[idxName] : '') ||
      [idxFirst >= 0 ? cols[idxFirst] : '', idxLast >= 0 ? cols[idxLast] : '']
        .filter(Boolean)
        .join(' ');
    const cleanName = String(nameVal || '').trim();
    if (!cleanName) continue;

    const student = {
      id: `csv-${ts}-${r}`,
      name: cleanName,
      firstName: cleanName.split(/\s+/)[0] || '',
      lastName: cleanName.split(/\s+/).slice(1).join(' ') || '',
      nickname: cleanName.split(/\s+/)[0] || '',
      studentId: String((idxId >= 0 ? cols[idxId] : '') || `BATCH-${r}`).trim(),
      school: String((idxSchool >= 0 ? cols[idxSchool] : '') || defaultSchool || '').trim(),
      campus: '',
      section: String((idxSection >= 0 ? cols[idxSection] : '') || defaultSection || '').trim(),
      degree: String((idxDegree >= 0 ? cols[idxDegree] : '') || '').trim(),
      academicYear: String(defaultYear || '').trim(),
      motto: String((idxMotto >= 0 ? cols[idxMotto] : '') || '').trim(),
      honors: String((idxHonors >= 0 ? cols[idxHonors] : '') || '').trim(),
      role: String((idxRole >= 0 ? cols[idxRole] : '') || 'Student').trim() || 'Student',
      isOfficer: Boolean(idxRole >= 0 && cols[idxRole] && cols[idxRole].trim().toLowerCase() !== 'student'),
      credentials: String((idxDegree >= 0 ? cols[idxDegree] : '') || '').trim(),
      photoUrl: null,
      photoSpecs: { zoom: 1, panX: 0, panY: 0, aspectRatio: '2x2' },
      isFromDatabase: false,
      status: 'imported',
    };
    student.completeness = calculateStudentCompleteness(student);
    student.validation = validateStudentRecord(student);
    parsed.push(student);
  }
  return parsed;
}

/** Rasterize page 1 of an uploaded A4 PDF into a crisp high-resolution PNG File + Data URL for print & preview rendering. */
async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof Uint8Array !== 'undefined' && typeof Uint8Array.prototype.toHex !== 'function') {
    Uint8Array.prototype.toHex = function () {
      let hex = '';
      for (let i = 0; i < this.length; i += 1) {
        hex += this[i].toString(16).padStart(2, '0');
      }
      return hex;
    };
  }
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

async function rasterizePdfFirstPageToPng(file, safeSlot = 'interior') {
  const pdfjsLib = await loadPdfJs();

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdfDoc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const targetScale = Math.min(3, Math.max(1.8, 2200 / Math.max(baseViewport.height, 1)));
  const viewport = page.getViewport({ scale: targetScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const pngFile = blob
    ? new File([blob], `${safeSlot}.png`, { type: 'image/png' })
    : file;

  return { uploadFile: pngFile, fallbackDataUrl: dataUrl };
}

/** Extract clean multi-line text from an uploaded PDF (VMGO, Graduation Programme, or Official Message). */
export async function extractTextFromPdf(file) {
  if (!file) return '';
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return file.text();
  }

  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagesText = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = [];
    let currentY = null;
    let currentLine = [];

    for (const item of content.items || []) {
      const str = typeof item.str === 'string' ? item.str : '';
      if (!str.trim() && !item.hasEOL) {
        if (currentLine.length > 0 && currentLine[currentLine.length - 1] !== ' ') {
          currentLine.push(' ');
        }
        continue;
      }
      const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
      if (currentY !== null && y !== null && Math.abs(y - currentY) > 4) {
        const flushed = currentLine.join('').replace(/\s+/g, ' ').trim();
        if (flushed) lines.push(flushed);
        currentLine = [];
      }
      currentY = y;
      currentLine.push(str);
      if (item.hasEOL) {
        const flushed = currentLine.join('').replace(/\s+/g, ' ').trim();
        if (flushed) lines.push(flushed);
        currentLine = [];
        currentY = null;
      }
    }

    const tail = currentLine.join('').replace(/\s+/g, ' ').trim();
    if (tail) lines.push(tail);
    if (lines.length > 0) pagesText.push(lines.join('\n'));
  }

  return pagesText.join('\n\n').trim();
}

/** Upload a Canva-exported image or PDF background directly to Supabase `studio-assets`, falling back to Data URL. */
export async function uploadYearbookTemplateAsset(file, slot = 'interior') {
  if (!file) return '';
  const safeSlot = String(slot || 'interior').replace(/[^a-z0-9_-]/gi, '');
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

  const readAsDataUrl = (targetFile) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(String(ev.target?.result || ''));
      reader.onerror = () => reject(new Error('Failed to read template file'));
      reader.readAsDataURL(targetFile);
    });

  let uploadTarget = file;
  let fallbackUrl = '';

  if (isPdf) {
    const rendered = await rasterizePdfFirstPageToPng(file, safeSlot);
    uploadTarget = rendered.uploadFile;
    fallbackUrl = rendered.fallbackDataUrl;
  }

  if (!supabase) return fallbackUrl || readAsDataUrl(uploadTarget);

  try {
    const ext = isPdf
      ? 'png'
      : ((uploadTarget.name?.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png');
    const objectPath = `yearbook-templates/${safeSlot}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('studio-assets')
      .upload(objectPath, uploadTarget, {
        contentType: isPdf ? 'image/png' : (uploadTarget.type || 'image/png'),
        upsert: true,
      });

    if (!error && data?.path) {
      const { data: pub } = supabase.storage.from('studio-assets').getPublicUrl(data.path);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch (err) {
    console.warn('[Yearbook Template Upload Fallback]', err);
  }

  return fallbackUrl || readAsDataUrl(uploadTarget);
}

export function detectDuplicateRecords(students = []) {
  if (!Array.isArray(students)) return [];
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

export function runPreflightQualityCheck(config, students = [], context = {}) {
  const safeStudents = Array.isArray(students)
    ? students
    : (Array.isArray(config) ? config : []);
  const issues = [];
  const warnings = [];

  const invalid = safeStudents.filter((s) => !(s.validation || validateStudentRecord(s)).valid);
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

  const missingPhotos = safeStudents.filter((s) => !s.photoUrl);
  if (missingPhotos.length > 0) {
    issues.push({
      level: 'critical',
      code: 'MISSING_PORTRAITS',
      title: `${missingPhotos.length} Student${missingPhotos.length === 1 ? '' : 's'} Missing Portrait Photo`,
      description: 'These records have no portrait photo attached. They will print with an empty photo frame.',
      affectedStudents: missingPhotos.map((s) => s.name),
    });
  }

  const missingQuotes = safeStudents.filter((s) => !s.motto || s.motto.trim() === '');
  if (missingQuotes.length > 0) {
    warnings.push({
      level: 'warning',
      code: 'MISSING_QUOTES',
      title: `${missingQuotes.length} Student${missingQuotes.length === 1 ? '' : 's'} Without Motto / Quote`,
      description: 'Entries without a motto will print name, ID, and program only.',
      affectedStudents: missingQuotes.map((s) => s.name),
    });
  }

  const duplicates = detectDuplicateRecords(safeStudents);
  if (duplicates.length > 0) {
    issues.push({
      level: 'critical',
      code: 'DUPLICATE_ENTRIES',
      title: `${duplicates.length} Duplicate Student${duplicates.length === 1 ? '' : 's'} Must Be Removed`,
      description: 'Records sharing identical names or student ID numbers. Use Remove Duplicates.',
      affectedStudents: duplicates.map((d) => d.student.name),
    });
  }

  const totalStudents = safeStudents.length;
  if (totalStudents === 0) {
    issues.push({
      level: 'critical',
      code: 'ZERO_STUDENTS',
      title: 'No Students Included',
      description: 'The roster is empty. Sync database records or import/add candidates before exporting.',
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

export const PRINT_SHEET_COUNT_OFFSET = 4;

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

const STORAGE_KEY_STUDENTS = 'ekodak_yearbook_roster';
const STORAGE_KEY_PROJECT = 'ekodak_yearbook_active_project';
const STORAGE_KEY_ALL_PROJECTS = 'ekodak_yearbook_all_projects';
const STORAGE_KEY_TEMPLATE_PRESETS = 'ekodak_yearbook_template_presets_v1';

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
    if (Array.isArray(parsed)) return parsed.map(sanitizeStoredStudent);
    if (parsed && Array.isArray(parsed.students)) {
      const recovered = parsed.students.map(sanitizeStoredStudent);
      saveStoredStudents(recovered);
      return recovered;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredStudents(students) {
  try {
    const list = Array.isArray(students)
      ? students
      : (Array.isArray(students?.students) ? students.students : []);
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save students to localStorage:', e);
  }
}

export function loadStoredProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    const stored = raw ? JSON.parse(raw) : {};
    const defaultInst = createDefaultInstitutionalData();
    const storedInst = stored?.customTemplate?.institutionalData || {};
    const mergedInst = Object.fromEntries(
      Object.keys(defaultInst).map((k) => [
        k,
        {
          ...defaultInst[k],
          ...(storedInst[k] || {}),
        },
      ])
    );
    const merged = {
      ...DEFAULT_PUBLICATION_CONFIG,
      ...stored,
      customTemplate: {
        ...DEFAULT_CUSTOM_TEMPLATE,
        ...(stored?.customTemplate || {}),
        institutionalData: mergedInst,
      },
    };
    ['institutionName', 'campus', 'sectionName', 'programName', 'curatorName'].forEach((k) => {
      if (k in merged) merged[k] = sanitizeLegacy(merged[k]);
    });
    return merged;
  } catch {
    return {
      ...DEFAULT_PUBLICATION_CONFIG,
      customTemplate: { ...DEFAULT_CUSTOM_TEMPLATE },
    };
  }
}

export function saveStoredProject(project) {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(project));
  } catch (e) {
    console.warn('Failed to save project to localStorage:', e);
  }
}

export function listSavedTemplatePresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATE_PRESETS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplatePreset(name, customTemplate, coverConfig = {}) {
  const existing = listSavedTemplatePresets();
  const cleanName = String(name || 'Custom Preset').trim() || 'Custom Preset';
  const entry = {
    id: `preset-${Date.now()}`,
    name: cleanName,
    updatedAt: new Date().toISOString(),
    customTemplate: { ...DEFAULT_CUSTOM_TEMPLATE, ...(customTemplate || {}) },
    coverBgUrl: coverConfig.coverBgUrl || '',
    coverLogoUrl: coverConfig.coverLogoUrl || '',
    coverColor: coverConfig.coverColor || 'midnight',
  };
  const updated = [entry, ...existing.filter((p) => p.name.toLowerCase() !== cleanName.toLowerCase())].slice(0, 12);
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATE_PRESETS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save template preset:', e);
  }
  return updated;
}

export function deleteCustomTemplatePreset(presetId) {
  const updated = listSavedTemplatePresets().filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATE_PRESETS, JSON.stringify(updated));
  } catch {
    // Ignore storage error
  }
  return updated;
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
  } catch {
    // Graceful fallback if restricted
  }
}
