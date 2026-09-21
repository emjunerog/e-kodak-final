/**
 * Official E-Kodak Studio Recognitions & Milestone Badges
 * --------------------------------------------------------
 * Grounded in authentic studio photography milestones.
 * Awarded and verified directly by studio administrators and staff.
 */

export const OFFICIAL_STUDIO_BADGES = [
  {
    id: 'id_verified',
    title: 'Student ID & Enrollment Verified',
    category: 'Academic Verification',
    badgeLabel: 'Enrollment Verified',
    description: 'Official university enrollment and student identification verified by studio frontdesk staff.',
    requirement: 'Submit valid student ID or certificate of matriculation.',
    color: 'from-amber-600 to-amber-700',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textColor: 'text-amber-800',
    iconName: 'GraduationCap',
  },
  {
    id: 'toga_confirmed',
    title: 'Toga & Attire Specifications Confirmed',
    category: 'Wardrobe Calibration',
    badgeLabel: 'Wardrobe Ready',
    description: 'Academic toga size, university velvet hood discipline color, and inner wear specifications confirmed.',
    requirement: 'Set accurate toga measurements and academic discipline in profile.',
    color: 'from-blue-600 to-indigo-700',
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    textColor: 'text-blue-800',
    iconName: 'Scissors',
  },
  {
    id: 'terms_signed',
    title: 'Studio Agreement Acknowledged',
    category: 'Studio Protocol',
    badgeLabel: 'Policy Acknowledged',
    description: 'Call-time punctuality protocol, session etiquette, and image release preferences acknowledged.',
    requirement: 'Review and accept studio client service terms & agreements.',
    color: 'from-emerald-600 to-teal-700',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textColor: 'text-emerald-800',
    iconName: 'ShieldCheck',
  },
  {
    id: 'session_completed',
    title: 'Studio Pictorial Completed',
    category: 'Session Milestone',
    badgeLabel: 'Session Attended',
    description: 'Successfully attended scheduled camera bay photoshoot session with official studio photographer.',
    requirement: 'Complete pictorial appointment at E-Kodak Studio Cebu.',
    color: 'from-purple-600 to-violet-700',
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    textColor: 'text-purple-800',
    iconName: 'Camera',
  },
  {
    id: 'proofing_approved',
    title: 'Portrait Proofs Approved',
    category: 'Lab Processing',
    badgeLabel: 'Proofs Approved',
    description: 'Client reviewed soft copy proofs and selected final poses for lab retouching and color grading.',
    requirement: 'Select and approve final graduation portrait proofs.',
    color: 'from-sky-600 to-cyan-700',
    bgLight: 'bg-sky-50',
    borderLight: 'border-sky-200',
    textColor: 'text-sky-800',
    iconName: 'CheckCircle',
  },
  {
    id: 'balance_settled',
    title: 'Package Balance Cleared',
    category: 'Billing & Cashier',
    badgeLabel: 'Account Cleared',
    description: 'Photoshoot package downpayment and remaining balance verified and settled in full.',
    requirement: 'Full package payment settlement recorded by studio cashier.',
    color: 'from-green-600 to-emerald-700',
    bgLight: 'bg-green-50',
    borderLight: 'border-green-200',
    textColor: 'text-green-800',
    iconName: 'Award',
  },
  {
    id: 'prints_released',
    title: 'Official Prints & Frames Released',
    category: 'Final Dispatch',
    badgeLabel: 'Prints Released',
    description: 'Official hardcopy portraits, crystal wood frames, and commemorative wallet prints released to client.',
    requirement: 'Claim physical prints in-studio or via verified courier dispatch.',
    color: 'from-rose-600 to-red-700',
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textColor: 'text-rose-800',
    iconName: 'Printer',
  },
];

/**
 * Check if a badge is awarded in the customer's badges list.
 */
export function hasBadge(customerBadges, badgeId) {
  if (!Array.isArray(customerBadges)) return false;
  return customerBadges.some(b => (typeof b === 'string' ? b === badgeId : b?.id === badgeId));
}

/**
 * Get formatted awarded date for a customer's badge if available.
 */
export function getBadgeAwardedDate(customerBadges, badgeId) {
  if (!Array.isArray(customerBadges)) return null;
  const match = customerBadges.find(b => (typeof b === 'string' ? b === badgeId : b?.id === badgeId));
  if (match && typeof match === 'object' && match.awarded_at) {
    try {
      return new Date(match.awarded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  }
  return null;
}
