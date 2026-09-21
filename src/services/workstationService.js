/**
 * workstationService.js
 * =====================
 * Manages cross-departmental workstation transfers, approvals, issue logging,
 * and operational handoffs between Admin, Staff, Photographer, and Finance.
 */

import { supabase } from '../lib/supabase';

export const TRANSFER_TYPES = {
  ORDER_HANDOFF:        { label: 'Order Handoff',        color: 'blue',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  PAYMENT_VERIFICATION: { label: 'Payment Verification', color: 'emerald', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ISSUE_ESCALATION:     { label: 'Issue Escalation',     color: 'red',    badge: 'bg-red-50 text-red-700 border-red-200' },
  OUTPUT_SUBMISSION:    { label: 'Output Submission',    color: 'purple', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  DISPATCH_CLEARANCE:   { label: 'Dispatch Clearance',   color: 'amber',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  GENERAL_NOTE:         { label: 'Department Note',      color: 'neutral', badge: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
};

export const PRIORITY_CONFIG = {
  LOW:    { label: 'Low',    badge: 'bg-neutral-100 text-neutral-600' },
  NORMAL: { label: 'Normal', badge: 'bg-blue-50 text-blue-700' },
  HIGH:   { label: 'High',   badge: 'bg-amber-50 text-amber-700 font-semibold' },
  URGENT: { label: 'Urgent', badge: 'bg-red-50 text-red-700 font-bold animate-pulse' },
};

/**
 * Creates a new cross-departmental transfer log
 */
export async function createTransferLog({
  bookingId,
  senderId,
  senderRole,
  targetRole,
  transferType,
  priority = 'NORMAL',
  title,
  message,
  payload = {},
}) {
  try {
    const { data, error } = await supabase
      .from('workstation_transfers')
      .insert({
        booking_id:    bookingId,
        sender_id:     senderId,
        sender_role:   senderRole,
        target_role:   targetRole,
        transfer_type: transferType,
        priority,
        title:         title?.trim() || 'Workstation Transfer',
        message:       message?.trim() || '',
        payload,
        status:        'PENDING',
      })
      .select(`
        *,
        booking:booking_id (
          id,
          booking_number,
          event_date,
          status,
          customer:customer_id (first_name, last_name, phone)
        ),
        sender:sender_id (first_name, last_name, role)
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error creating workstation transfer log:', err);
    return { data: null, error: err };
  }
}

/**
 * Retrieves incoming transfers/handoffs for a specific role's workstation inbox
 */
export async function getWorkstationInbox({ role, status = null, limit = 50 }) {
  try {
    let query = supabase
      .from('workstation_transfers')
      .select(`
        *,
        booking:booking_id (
          id,
          booking_number,
          event_date,
          status,
          remaining_balance,
          total_amount,
          customer:customer_id (first_name, last_name, email, phone)
        ),
        sender:sender_id (first_name, last_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by role: Admins see everything; others see items targeted to them or 'all'
    if (role && role !== 'admin') {
      query = query.or(`target_role.eq.${role},target_role.eq.all`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching workstation inbox:', err);
    return { data: [], error: err };
  }
}

/**
 * Retrieves the complete departmental chain of custody for a single booking
 */
export async function getTransfersByBooking(bookingId) {
  try {
    const { data, error } = await supabase
      .from('workstation_transfers')
      .select(`
        *,
        sender:sender_id (first_name, last_name, role),
        resolver:resolved_by (first_name, last_name, role)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching booking transfer history:', err);
    return { data: [], error: err };
  }
}

/**
 * Acknowledges an incoming transfer handoff
 */
export async function acknowledgeTransfer(transferId, userId) {
  try {
    const { data, error } = await supabase
      .from('workstation_transfers')
      .update({
        status:      'ACKNOWLEDGED',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error acknowledging transfer:', err);
    return { data: null, error: err };
  }
}

/**
 * Resolves an issue or completes a transfer
 */
export async function resolveTransfer(transferId, userId, resolutionRemarks = '') {
  try {
    // Fetch current payload first to append remarks safely
    const { data: current } = await supabase
      .from('workstation_transfers')
      .select('payload')
      .eq('id', transferId)
      .single();

    const updatedPayload = {
      ...(current?.payload || {}),
      resolution_remarks: resolutionRemarks,
      resolved_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('workstation_transfers')
      .update({
        status:      'RESOLVED',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        payload:     updatedPayload,
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error resolving transfer:', err);
    return { data: null, error: err };
  }
}

/**
 * Returns summary counts of pending items per role
 */
export async function getWorkstationMetrics(role) {
  try {
    let query = supabase
      .from('workstation_transfers')
      .select('id, transfer_type, priority, status, target_role');

    if (role && role !== 'admin') {
      query = query.or(`target_role.eq.${role},target_role.eq.all`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const all = data || [];
    const pending = all.filter(t => t.status === 'PENDING');
    const urgent = pending.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
    const issues = pending.filter(t => t.transfer_type === 'ISSUE_ESCALATION');

    return {
      totalPending: pending.length,
      urgentCount:  urgent.length,
      issueCount:   issues.length,
      resolvedCount: all.filter(t => t.status === 'RESOLVED').length,
    };
  } catch (err) {
    console.error('Error fetching workstation metrics:', err);
    return {
      totalPending: 0,
      urgentCount: 0,
      issueCount: 0,
      resolvedCount: 0,
    };
  }
}

/**
 * fetchAdminActivityLogs
 * ---------------------
 * Fetches real administrator activity logs directly from Supabase PostgreSQL.
 * Supports filtering by adminId, actionType, search query, and pagination limit.
 */
export async function fetchAdminActivityLogs({
  adminId = null,
  actionType = null,
  search = null,
  limit = 50,
  offset = 0,
} = {}) {
  try {
    let query = supabase
      .from('admin_activity_logs')
      .select(`
        id,
        admin_id,
        admin_name,
        admin_role,
        action_type,
        entity_type,
        entity_id,
        entity_label,
        description,
        details,
        ip_address,
        created_at,
        admin_profile:admin_id (
          id,
          first_name,
          last_name,
          avatar_url,
          role,
          phone
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (adminId && adminId !== 'all') {
      query = query.eq('admin_id', adminId);
    }

    if (actionType && actionType !== 'all') {
      query = query.eq('action_type', actionType);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`description.ilike.%${s}%,entity_label.ilike.%${s}%,admin_name.ilike.%${s}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0, error: null };
  } catch (err) {
    console.error('fetchAdminActivityLogs error:', err);
    return { data: [], count: 0, error: err };
  }
}

/**
 * recordAdminActivity
 * -------------------
 * Inserts an administrative activity log into public.admin_activity_logs.
 */
export async function recordAdminActivity({
  adminId,
  adminName,
  adminRole = 'admin',
  actionType,
  entityType = 'booking',
  entityId = null,
  entityLabel = null,
  description,
  details = {},
}) {
  try {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .insert([{
        admin_id: adminId || null,
        admin_name: adminName || 'Studio Staff',
        admin_role: adminRole,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        entity_label: entityLabel ? String(entityLabel) : null,
        description,
        details: typeof details === 'object' ? details : {},
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.warn('recordAdminActivity insert error:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    console.warn('recordAdminActivity exception:', err);
    return { data: null, error: err };
  }
}

/**
 * fetchAdministratorsList
 * -----------------------
 * Returns all administrator, staff, and finance profiles from database for filter dropdowns.
 */
export async function fetchAdministratorsList() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url, is_active')
      .in('role', ['admin', 'staff', 'finance'])
      .eq('is_active', true)
      .not('first_name', 'is', null)
      .order('role', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('fetchAdministratorsList error:', err);
    return { data: [], error: err };
  }
}

/**
 * getAdminActivityStats
 * ---------------------
 * Computes high-level counts across all database activity logs.
 */
export async function getAdminActivityStats() {
  try {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('id, action_type, created_at, admin_id');

    if (error) throw error;
    const logs = data || [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayCount = logs.filter(l => new Date(l.created_at).getTime() >= todayStart).length;
    const uniqueAdmins = new Set(logs.map(l => l.admin_id).filter(Boolean)).size;
    const criticalCount = logs.filter(l => 
      ['BOOKING_SOFT_DELETED', 'BOOKING_PURGED', 'ISSUE_ESCALATION'].includes(l.action_type)
    ).length;

    return {
      totalLogs: logs.length,
      todayCount,
      activeAdminsCount: uniqueAdmins,
      criticalCount,
    };
  } catch (err) {
    console.error('getAdminActivityStats error:', err);
    return {
      totalLogs: 0,
      todayCount: 0,
      activeAdminsCount: 0,
      criticalCount: 0,
    };
  }
}

