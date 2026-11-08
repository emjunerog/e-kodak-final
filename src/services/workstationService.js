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
 * Supports filtering by adminId, role, actionType, search query, and pagination limit.
 * Uses profiles!inner to enforce that accounts that no longer exist are excluded.
 */
export async function fetchAdminActivityLogs({
  adminId = null,
  role = null,
  actionType = null,
  search = null,
  limit = 50,
  offset = 0,
} = {}) {
  try {
    const profileJoin = role && role !== 'all' ? 'profiles!inner' : 'profiles';
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
        admin_profile:${profileJoin} (
          id,
          first_name,
          last_name,
          avatar_url,
          role,
          phone,
          email,
          is_active
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (adminId && adminId !== 'all') {
      query = query.eq('admin_id', adminId);
    }

    if (role && role !== 'all') {
      query = query.eq('admin_profile.role', role);
    }

    if (actionType && actionType !== 'all') {
      query = query.eq('action_type', actionType);
    }

    if (search && search.trim()) {
      const s = search.trim().replace(/[,()*\\]/g, '');
      if (s) {
        query = query.or(`description.ilike.%${s}%,entity_label.ilike.%${s}%,admin_name.ilike.%${s}%`);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    // Dynamically resolve the administrator's real name and role from their active profile
    const cleaned = (data || []).map((log) => {
      const prof = log.admin_profile;
      const resolvedName = prof
        ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email
        : log.admin_name;
      const resolvedRole = prof?.role || log.admin_role || 'admin';

      return {
        ...log,
        admin_name: resolvedName,
        admin_role: resolvedRole,
        admin_avatar: prof?.avatar_url || null,
      };
    });

    return { data: cleaned, count: count || 0, error: null };
  } catch (err) {
    console.error('fetchAdminActivityLogs error:', err);
    return { data: [], count: 0, error: err };
  }
}

/**
 * recordAdminActivity
 * -------------------
 * Inserts an administrative activity log into public.admin_activity_logs.
 * Automatically resolves the logged-in administrator from Supabase Auth if adminId is not provided.
 */
export async function recordAdminActivity({
  adminId = null,
  adminName = null,
  adminRole = 'admin',
  actionType,
  entityType = 'booking',
  entityId = null,
  entityLabel = null,
  description,
  details = {},
}) {
  try {
    let resolvedId = adminId;
    let resolvedName = adminName;
    let resolvedRole = adminRole;

    // Auto-detect current authenticated user if not provided
    if (!resolvedId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          resolvedId = user.id;
          const { data: prof } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, email')
            .eq('id', user.id)
            .maybeSingle();

          if (prof) {
            resolvedName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email;
            resolvedRole = prof.role || resolvedRole;
          }
        }
      } catch (authErr) {
        console.warn('Could not auto-resolve auth user for activity log:', authErr);
      }
    }

    const { data, error } = await supabase
      .from('admin_activity_logs')
      .insert([{
        admin_id: resolvedId || null,
        admin_name: resolvedName || 'Studio Administrator',
        admin_role: resolvedRole || 'admin',
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        entity_label: entityLabel ? String(entityLabel) : null,
        description,
        details: typeof details === 'object' && details !== null ? details : {},
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
 * Returns all active administrator, staff, finance, and photographer profiles
 * currently existing in the database for filter dropdowns.
 */
export async function fetchAdministratorsList() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url, is_active, email')
      .in('role', ['admin', 'photographer'])
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
      .select(`
        id,
        action_type,
        created_at,
        admin_id,
        admin_profile:profiles!inner(id, role, is_active)
      `);

    if (error) throw error;
    const logs = data || [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayCount = logs.filter(l => new Date(l.created_at).getTime() >= todayStart).length;
    const uniqueAdmins = new Set(logs.map(l => l.admin_id).filter(Boolean)).size;
    const criticalCount = logs.filter(l => 
      ['BOOKING_SOFT_DELETED', 'BOOKING_PURGED', 'ISSUE_ESCALATION'].includes(l.action_type)
    ).length;

    // Counts by role
    const adminActions = logs.filter(l => l.admin_profile?.role === 'admin').length;
    const staffActions = logs.filter(l => l.admin_profile?.role === 'staff').length;
    const financeActions = logs.filter(l => l.admin_profile?.role === 'finance').length;
    const photographerActions = logs.filter(l => l.admin_profile?.role === 'photographer').length;

    return {
      totalLogs: logs.length,
      todayCount,
      activeAdminsCount: uniqueAdmins,
      criticalCount,
      adminActions,
      staffActions,
      financeActions,
      photographerActions,
    };
  } catch (err) {
    console.error('getAdminActivityStats error:', err);
    return {
      totalLogs: 0,
      todayCount: 0,
      activeAdminsCount: 0,
      criticalCount: 0,
      adminActions: 0,
      staffActions: 0,
      financeActions: 0,
      photographerActions: 0,
    };
  }
}

