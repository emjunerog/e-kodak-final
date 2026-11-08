import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'ekodak_customer_audit_';

/**
 * Retrieves customer audit logs from persistent localStorage.
 * Filters out any legacy synthetic seed entries (`cust_seed_*`) so only authentic customer actions are returned.
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
      if (Array.isArray(parsed)) {
        const realLogs = parsed.filter((entry) => !String(entry?.id || '').startsWith('cust_seed_'));
        if (realLogs.length !== parsed.length) {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(realLogs));
        }
        return realLogs;
      }
    }
    return [];
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

    // 2. Persist customer audit event to central database admin_activity_logs so admins have full visibility
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('admin_activity_logs').insert([{
          admin_id: userId,
          admin_name: 'Client Portal',
          admin_role: 'customer',
          action_type: category || 'CUSTOMER_ACTION',
          entity_type: bookingId ? 'booking' : 'customer',
          entity_id: bookingId || userId,
          entity_label: bookingNumber || title,
          description: `${title}${description && description !== title ? ` — ${description}` : ''}`,
          details: {
            changes: event.changes,
            booking_id: bookingId,
            booking_number: bookingNumber,
            ...metadata,
          },
          created_at: event.timestamp,
        }]);
      } catch (dbErr) {
        // Non-blocking fallback if RLS or network restricts direct insert
        console.warn('Customer audit DB sync notice:', dbErr?.message || dbErr);
      }
    }

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
