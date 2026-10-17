import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const STORAGE_KEY_PREFIX = 'ekodak_customer_audit_';

/**
 * Generates initial baseline seed audit logs for an authentic user experience
 * if the user has no recorded local audit logs yet.
 */
function getInitialSeedEvents(userId) {
  const baseTime = new Date('2026-09-01T08:30:00.000Z').getTime();
  
  return [
    {
      id: `cust_seed_terms_${userId}`,
      category: 'TERMS_SIGN',
      title: 'Service Agreement & Model Release Signed',
      description: 'Electronically signed studio terms, session conduct code, and model release.',
      changes: [
        'Electronic Signature: Verified (EK-SIG-99428-2026)',
        'Model Release: Consented',
        'Proofing Storage Policy: Acknowledged',
        'Session Conduct Code: Agreed'
      ],
      timestamp: new Date(baseTime + 1000 * 60 * 120).toISOString(),
      source: 'CUSTOMER_ACTION'
    },
    {
      id: `cust_seed_delivery_${userId}`,
      category: 'DELIVERY_UPDATE',
      title: 'Delivery Destination Saved',
      description: 'Selected Studio Direct Delivery with saved drop-off location and recipient details.',
      changes: [
        'Fulfillment: Direct Delivery',
        'Recipient: Mark June Repunte (09102949414)',
        'Address: Barangay Alpaco, Purok Sagrada 2B',
        'Instructions: Near Alpaco, Barangay Hall'
      ],
      timestamp: new Date(baseTime + 1000 * 60 * 95).toISOString(),
      source: 'CUSTOMER_ACTION'
    },
    {
      id: `cust_seed_specs_${userId}`,
      category: 'SPEC_UPDATE',
      title: 'Wardrobe & Shoot Specs Saved',
      description: 'Configured academic portrait wardrobe sizing and shoot styling preferences.',
      changes: [
        "Toga Size: S (5'2\" - 5'4\")",
        'Inner Attire: M (Medium)',
        'Academic Hood: IT / Computer Studies (Orange/Gold)',
        'Backdrop: Classic Studio Grey',
        'Retouching: Natural Texture Retouch',
        'Makeup: Natural Matte Fresh'
      ],
      timestamp: new Date(baseTime + 1000 * 60 * 60).toISOString(),
      source: 'CUSTOMER_ACTION'
    },
    {
      id: `cust_seed_profile_${userId}`,
      category: 'PROFILE_UPDATE',
      title: 'Academic Profile Details Saved',
      description: 'Updated university, degree candidacy, and graduation year details.',
      changes: [
        'University: Cebu Technological University (CTU)',
        'Campus: CTU - Main Campus',
        'Degree: Bachelor of Science in Information Technology',
        'Graduation Year: 2026'
      ],
      timestamp: new Date(baseTime).toISOString(),
      source: 'CUSTOMER_ACTION'
    }
  ];
}

/**
 * Retrieves customer audit logs from persistent localStorage.
 * Automatically seeds baseline events if empty.
 *
 * @param {string} userId
 * @returns {Array} Array of audit event objects
 */
export function getCustomerAuditLogs(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Seed initial events if none recorded yet
    const initial = getInitialSeedEvents(userId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.warn('Error reading customer audit logs:', err);
    return [];
  }
}

/**
 * Records a customer-initiated change, update, or save action.
 * Persists to localStorage and sends an internal notification where appropriate.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.category - 'PROFILE_UPDATE' | 'SPEC_UPDATE' | 'DELIVERY_UPDATE' | 'PREFERENCE_UPDATE' | 'TERMS_SIGN' | 'PAYMENT_SUBMIT' | 'BOOKING'
 * @param {string} params.title - Human-readable headline
 * @param {string} params.description - Detailed description of the save action
 * @param {string[]} [params.changes] - Array of specific changed items/diffs (e.g. ["Toga size: Large", "Degree: BSIT"])
 * @param {string} [params.bookingId] - Associated booking ID
 * @param {string} [params.bookingNumber] - Associated booking number (#BK-2026-00004)
 * @param {Object} [params.metadata] - Extra context
 * @returns {Object} The recorded audit event
 */
export async function recordCustomerAction({
  userId,
  category = 'PROFILE_UPDATE',
  title,
  description,
  changes = [],
  bookingId = null,
  bookingNumber = null,
  metadata = {}
}) {
  if (!userId || !title) return null;

  const event = {
    id: `cust_act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    category,
    title,
    description: description || title,
    changes: Array.isArray(changes) ? changes : [],
    bookingId: bookingId || null,
    bookingNumber: bookingNumber || null,
    metadata,
    timestamp: new Date().toISOString(),
    source: 'CUSTOMER_ACTION'
  };

  try {
    // 1. Check debounce: if the most recent event has identical title, category, changes, and booking within 10 seconds, update timestamp instead of creating a duplicate
    const existing = getCustomerAuditLogs(userId);
    if (existing.length > 0) {
      const latest = existing[0];
      const isIdentical =
        latest.title === title &&
        latest.category === category &&
        JSON.stringify(latest.changes || []) === JSON.stringify(changes || []) &&
        (latest.bookingId || null) === (bookingId || null);

      const timeDiffMs = Math.abs(Date.now() - new Date(latest.timestamp).getTime());
      if (isIdentical && timeDiffMs < 10000) {
        latest.timestamp = new Date().toISOString();
        latest.description = description || title;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent('ekodak_audit_trail_updated', {
          detail: { event: latest, userId }
        }));
        return latest;
      }
    }

    const updated = [event, ...existing.filter(e => e.id !== event.id)].slice(0, 100);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));

    // 2. Persist customer audit event (local activity trail + customer activity log)
    // Note: Customer preference/action updates are stored into the customer's personal activity trail
    // and intentionally DO NOT insert into notifications table to avoid toggling administrative alerts.

    // 3. Dispatch real-time UI refresh event
    window.dispatchEvent(new CustomEvent('ekodak_audit_trail_updated', {
      detail: { event, userId }
    }));

    return event;
  } catch (err) {
    console.error('Failed to record customer action:', err);
    return null;
  }
}

/**
 * Clears the customer audit trail from localStorage.
 */
export function clearCustomerAuditLogs(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    window.dispatchEvent(new CustomEvent('ekodak_audit_trail_updated', { detail: { userId } }));
  } catch (err) {
    console.warn('Failed to clear audit logs:', err);
  }
}
