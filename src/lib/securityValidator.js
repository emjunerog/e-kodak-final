/**
 * securityValidator.js
 * ====================
 * Comprehensive data validation, file sanitation, and tamper-prevention utilities.
 * Implements controls recommended in the E-KODAK Threat-Model Risk Assessment.
 */

// Strict list of allowed MIME types for user media uploads
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// Dangerous extensions strictly blocked from upload
export const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'html', 'htm', 'js',
  'vbs', 'scr', 'msi', 'dll', 'com', 'jar', 'apk', 'svg'
];

export const FILE_SECURITY_POLICIES = {
  REFERENCE_PEG: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    allowedExts: ALLOWED_IMAGE_EXTENSIONS,
  },
  PHOTO_OUTPUT: {
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimes: [...ALLOWED_IMAGE_MIME_TYPES, 'application/pdf'],
    allowedExts: [...ALLOWED_IMAGE_EXTENSIONS, 'pdf'],
  },
};

/**
 * Validates an uploaded file for MIME type, file extension, and size limit.
 * Addresses Threat #6 (Unsafe File Upload) & Threat #4 (Media Disclosure).
 *
 * @param {File} file 
 * @param {Object} options
 * @returns {{ valid: boolean, error: string | null, message: string }}
 */
export function validateUploadFile(file, {
  maxSizeBytes = 10 * 1024 * 1024, // default 10MB
  allowedMimes = ALLOWED_IMAGE_MIME_TYPES,
  allowedExts = ALLOWED_IMAGE_EXTENSIONS
} = {}) {
  if (!file) {
    return { valid: false, error: 'No file provided.', message: 'No file provided.' };
  }

  // 1. Check size limit
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    const msg = `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${maxMb}MB.`;
    return {
      valid: false,
      error: msg,
      message: msg,
    };
  }

  // 2. Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    const msg = `Executable and script files (.${ext}) are strictly blocked for security.`;
    return {
      valid: false,
      error: msg,
      message: msg,
    };
  }

  if (allowedExts && allowedExts.length > 0 && !allowedExts.includes(ext)) {
    const msg = `File extension .${ext} is not allowed. Permitted types: ${allowedExts.join(', ')}`;
    return {
      valid: false,
      error: msg,
      message: msg,
    };
  }

  // 3. Check MIME type
  if (allowedMimes && allowedMimes.length > 0 && file.type && !allowedMimes.includes(file.type)) {
    const msg = `File format '${file.type}' is not supported. Please upload a valid image.`;
    return {
      valid: false,
      error: msg,
      message: msg,
    };
  }

  return { valid: true, error: null, message: 'File passes all security validation criteria.' };
}

/**
 * Sanitizes a filename to prevent directory traversal and path injection attacks.
 * Strips "..", "/", "\", null bytes, and non-alphanumeric characters.
 *
 * @param {string} fileName
 * @returns {string} Safe filename
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return `file_${Date.now()}`;
  }

  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const rawBase = parts.join('_');

  // Strip path separators, null bytes, and non-safe characters
  const cleanBase = rawBase
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50); // limit base length

  return `${cleanBase || 'upload'}_${Date.now()}.${ext}`;
}

/**
 * Sanitizes a text string to prevent HTML/script injection (XSS).
 * Addresses Threat #2 (Transaction Tampering) & Threat #3 (Client Information Disclosure).
 *
 * @param {string} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Strip HTML markup
    .trim()
    .substring(0, maxLength);
}

/**
 * Validates booking financial and scheduling fields before persistence.
 * Prevents client-side price tampering or negative balance manipulation.
 *
 * @param {Object} bookingData
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateBookingSecurity(bookingData) {
  if (!bookingData) {
    return { valid: false, error: 'Empty booking data.' };
  }

  // Prevent negative totals
  if (typeof bookingData.total_amount === 'number' && bookingData.total_amount < 0) {
    return { valid: false, error: 'Invalid total amount: Price cannot be negative.' };
  }

  if (typeof bookingData.down_payment_amount === 'number' && bookingData.down_payment_amount < 0) {
    return { valid: false, error: 'Invalid downpayment: Amount cannot be negative.' };
  }

  // Ensure customer ID is present
  if (!bookingData.customer_id) {
    return { valid: false, error: 'Security authorization check failed: Missing customer identity.' };
  }

  // Validate scheduled date if provided
  if (bookingData.event_date) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (bookingData.event_date < todayStr) {
      return { valid: false, error: 'Event date cannot be scheduled in the past.' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates password complexity against high-security standard:
 * - At least 8 characters (12+ recommended)
 * - Uppercase & Lowercase letters
 * - At least 1 number
 * - At least 1 special symbol
 */
export function validatePasswordStrength(password = '') {
  const rules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (rules.minLength) score += 1;
  if (rules.hasUpper && rules.hasLower) score += 1;
  if (rules.hasNumber) score += 1;
  if (rules.hasSpecial) score += 1;

  let label = 'Weak';
  let color = 'text-red-500';
  let barColor = 'bg-red-500';

  if (score >= 4 && password.length >= 12) {
    label = 'Bulletproof';
    color = 'text-emerald-700';
    barColor = 'bg-emerald-600';
  } else if (score >= 4) {
    label = 'Strong';
    color = 'text-emerald-600';
    barColor = 'bg-emerald-500';
  } else if (score >= 3) {
    label = 'Moderate';
    color = 'text-amber-600';
    barColor = 'bg-amber-500';
  }

  return {
    score,
    label,
    color,
    barColor,
    rules,
    isValid: score >= 3 && rules.minLength,
  };
}

/**
 * Masks Personally Identifiable Information (PII) according to Least Privilege
 * principle for non-admin viewers or privacy-protected views.
 */
export function maskClientPII(value, type = 'text') {
  if (!value || typeof value !== 'string') return '—';

  switch (type) {
    case 'phone': {
      // e.g. 09171234567 -> 0917 ••• 4567
      const clean = value.replace(/\s+/g, '');
      if (clean.length < 7) return '••••••';
      const start = clean.slice(0, 4);
      const end = clean.slice(-4);
      return `${start} ••• ${end}`;
    }
    case 'email': {
      // e.g. alimentomakie@gmail.com -> al•••••••@gmail.com
      const [user, domain] = value.split('@');
      if (!domain) return '•••••@••••';
      const visible = user.slice(0, 2);
      return `${visible}${'•'.repeat(Math.max(4, user.length - 2))}@${domain}`;
    }
    case 'id_number': {
      // e.g. 22104582 -> 22••-••82
      if (value.length <= 4) return '••••';
      return `${value.slice(0, 2)}••-••${value.slice(-2)}`;
    }
    default:
      return value;
  }
}

/**
 * 10-Point Role-Based Access Control (RBAC) & Least Privilege Matrix
 */
export const SECURITY_RBAC_MATRIX = [
  {
    resource: 'View Customer Bookings',
    admin: 'Full Access',
    staff: 'Full Access',
    photographer: 'Assigned Sessions Only',
    customer: 'Own Bookings Only',
    level: 'Read',
  },
  {
    resource: 'Edit Booking Schedule & Inclusions',
    admin: 'Full Access',
    staff: 'Permitted with Audit Log',
    photographer: 'Restricted',
    customer: 'Reschedule Window Only',
    level: 'Write',
  },
  {
    resource: 'Permanently Delete Bookings',
    admin: 'Full Access (Audited & Cascaded)',
    staff: 'Strictly Prohibited',
    photographer: 'Strictly Prohibited',
    customer: 'Strictly Prohibited',
    level: 'Delete',
  },
  {
    resource: 'Unmasked Client Contact Info (PII)',
    admin: 'Full Access',
    staff: 'Controlled / Masked by Default',
    photographer: 'Session Contact Only',
    customer: 'Self Only',
    level: 'Privacy',
  },
  {
    resource: 'Assign Staff / Photographers',
    admin: 'Full Access',
    staff: 'Permitted',
    photographer: 'Strictly Prohibited',
    customer: 'Strictly Prohibited',
    level: 'Write',
  },
  {
    resource: 'Record Payments & Settle Balances',
    admin: 'Full Access',
    staff: 'Permitted (Immutable Receipts)',
    photographer: 'Strictly Prohibited',
    customer: 'Own Invoices Only',
    level: 'Financial',
  },
  {
    resource: 'Upload Final Photo Outputs & Yearbooks',
    admin: 'Full Access',
    staff: 'Full Access',
    photographer: 'Assigned Sessions Only',
    customer: 'Strictly Prohibited',
    level: 'Storage',
  },
  {
    resource: 'Download High-Res Photos without Watermark',
    admin: 'Full Access',
    staff: 'Full Access',
    photographer: 'Restricted to Raw Upload',
    customer: 'Paid Balance Required',
    level: 'Media',
  },
  {
    resource: 'View Security Audit & Activity Logs',
    admin: 'Full Access',
    staff: 'Read-Only (Own Actions)',
    photographer: 'Strictly Prohibited',
    customer: 'Strictly Prohibited',
    level: 'Audit',
  },
  {
    resource: 'Manage CMS, Services & Pricing Tiers',
    admin: 'Full Access',
    staff: 'Strictly Prohibited',
    photographer: 'Strictly Prohibited',
    customer: 'Strictly Prohibited',
    level: 'Config',
  },
];

/**
 * Restricted Database Permissions & Supabase Row-Level Security (RLS) Policies
 */
export const DATABASE_RLS_POLICIES = [
  {
    table: 'bookings',
    rls: 'ENFORCED',
    select: 'Customers (own), Photographers (assigned), Admin/Staff (all)',
    insert: 'Authenticated clients & staff validation check',
    update: 'Staff/Admin with audit log triggers, Customer within 24h grace period',
    delete: 'Admin role only with cascading trigger & activity archiving',
  },
  {
    table: 'profiles',
    rls: 'ENFORCED',
    select: 'Authenticated users (own), Public photographer cards, Admin/Staff (all)',
    insert: 'Auth trigger upon signup only',
    update: 'User (own non-role fields), Admin (role & status updates)',
    delete: 'Admin only',
  },
  {
    table: 'payments',
    rls: 'ENFORCED',
    select: 'Customer (own booking payments), Admin/Staff (all)',
    insert: 'Verified checkout webhook & authenticated staff cashier',
    update: 'Immutable transaction logs — updates strictly restricted to status confirmation',
    delete: 'Prohibited — financial records are immutable',
  },
  {
    table: 'admin_activity_logs',
    rls: 'ENFORCED',
    select: 'Admin role only',
    insert: 'System triggers & authenticated staff actions',
    update: 'Strictly Prohibited (Append-only immutable audit trail)',
    delete: 'Strictly Prohibited (Retention policy: 1 year)',
  },
  {
    table: 'qr_scan_logs',
    rls: 'ENFORCED',
    select: 'Staff / Admin only',
    insert: 'Station scanner with anti-replay cryptographic debounce verification',
    update: 'Strictly Prohibited',
    delete: 'Cascade with booking deletion only',
  },
  {
    table: 'photo_outputs',
    rls: 'ENFORCED',
    select: 'Customer (watermarked previews; unwatermarked only if balance = 0)',
    insert: 'Assigned photographer & studio admin',
    update: 'Studio admin only',
    delete: 'Studio admin only',
  },
];
