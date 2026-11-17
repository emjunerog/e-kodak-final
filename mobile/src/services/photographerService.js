/**
 * photographerService.js — Mobile
 * Real-time Supabase service layer for the E-Kodak Photographer Portal:
 *  - Assigned shoots query & stats
 *  - Assignment acceptance / decline / shoot lifecycle progression / reschedule request
 *  - Daily schedule & shift availability (photographer_availability)
 *  - Profile, specialties & general duty status
 *  - Studio workstation alerts for the photographer
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { getPhotographerQRToken, savePhotographerSessionData } from './storageService';

// ── Date & Time Helpers ──────────────────────────────────────────────────────

export function toLocalISODate(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val.includes('T')) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return toLocalISODate(d);
    }
    return val.slice(0, 10);
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return toLocalISODate(val);
  }
  return String(val).slice(0, 10);
}

export function extractTimeHM(t, fallback = '08:00') {
  if (!t) return fallback;
  const parts = String(t).trim().split(':');
  if (parts.length < 2) return fallback;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

export function formatTime12(timeStr) {
  if (!timeStr) return 'Time TBD';
  try {
    const [hStr, mStr] = String(timeStr).trim().slice(0, 5).split(':');
    const hNum = parseInt(hStr, 10);
    const m = mStr || '00';
    if (Number.isNaN(hNum)) return timeStr;
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  try {
    const clean = normalizeDateStr(dateStr);
    const d = new Date(`${clean}T00:00:00`);
    if (Number.isNaN(d.getTime())) return clean;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function parseBookingNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  const details = {};
  notes.split('\n').forEach((line) => {
    const match = line.match(/^[•\-*]?\s*([^:]+):\s*(.+)$/);
    if (match) {
      details[match[1].trim()] = match[2].trim();
    }
  });
  return details;
}

function normalizeAssignedBooking(raw) {
  if (!raw) return null;
  const c = raw.customer || null;
  const fullName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
  const parsedNotes = parseBookingNotes(raw.notes);
  const loc = String(raw.location || '').toLowerCase();
  const isStudio =
    !loc ||
    loc.includes('e-kodak') ||
    loc.includes('studio') ||
    loc.includes('331 rizal') ||
    loc.includes('311 rizal');

  return {
    ...raw,
    booking_token: raw.booking_token || raw.booking_number || raw.id,
    session_date: normalizeDateStr(raw.event_date),
    session_time: raw.preferred_time || '',
    location_type: isStudio ? 'STUDIO' : 'OUTDOOR',
    location_address: raw.location || parsedNotes['Campus / Address'] || parsedNotes['School'] || 'E-Kodak Main Studio Bay',
    parsed_notes: parsedNotes,
    profile: c
      ? {
          id: c.id,
          full_name: fullName || parsedNotes['Participant Name'] || parsedNotes['Student Name'] || 'Studio Client',
          email: c.email || parsedNotes['Participant Email'] || '',
          phone: c.phone || parsedNotes['Participant Phone'] || '',
          avatar_url: c.avatar_url || null,
        }
      : {
          full_name: parsedNotes['Participant Name'] || parsedNotes['Student Name'] || 'Studio Client',
          email: parsedNotes['Participant Email'] || '',
          phone: parsedNotes['Participant Phone'] || '',
          avatar_url: null,
        },
    services: raw.service || null,
  };
}

// ── Assigned Shoots & Stats ──────────────────────────────────────────────────

export async function fetchAllAssignedShoots(photographerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_photographer_assigned_shoots_by_token',
        { lookup_token: qrToken }
      );
      if (rpcError) throw rpcError;
      const normalized = (Array.isArray(rpcData) ? rpcData : [])
        .filter((b) => !b.is_deleted)
        .map(normalizeAssignedBooking)
        .filter(Boolean);
      return { data: normalized, error: null };
    }

    if (!photographerId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_token,
        tier_name,
        status,
        payment_status,
        event_date,
        preferred_time,
        location,
        notes,
        total_amount,
        remaining_balance,
        created_at,
        updated_at,
        is_deleted,
        service:services!bookings_service_id_fkey (
          id, name, category, tagline, inclusions, tiers
        ),
        customer:profiles!bookings_customer_id_fkey (
          id, first_name, last_name, email, phone, avatar_url
        )
      `)
      .eq('photographer_id', photographerId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('event_date', { ascending: true })
      .order('preferred_time', { ascending: true });

    if (error) throw error;

    const normalized = (data || [])
      .filter((b) => !b.is_deleted)
      .map(normalizeAssignedBooking)
      .filter(Boolean);

    return { data: normalized, error: null };
  } catch (err) {
    console.warn('fetchAllAssignedShoots error:', err?.message || err);
    return { data: [], error: err };
  }
}

export function calculatePhotographerStats(bookings = []) {
  const todayStr = toLocalISODate(new Date());
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = toLocalISODate(nextWeekDate);

  const active = bookings.filter(
    (b) => !['CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase())
  );

  const todayShoots = active.filter((b) => b.session_date === todayStr).length;
  const upcomingWeek = active.filter(
    (b) =>
      b.session_date >= todayStr &&
      b.session_date <= nextWeekStr &&
      b.status !== 'COMPLETED'
  ).length;
  const inProgress = active.filter((b) =>
    ['PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS', 'EDITING', 'RETOUCHING'].includes(
      String(b.status || '').toUpperCase()
    )
  ).length;
  const completed = active.filter((b) =>
    ['FINALIZED', 'READY', 'COMPLETED'].includes(String(b.status || '').toUpperCase())
  ).length;
  const pendingConfirm = active.filter(
    (b) => String(b.status || '').toUpperCase() === 'CONFIRMED'
  ).length;

  return {
    total: active.length,
    todayShoots,
    upcomingWeek,
    inProgress,
    completed,
    pendingConfirm,
  };
}

// ── Shoot Workflow Actions ───────────────────────────────────────────────────

async function tryLogTransfer({
  bookingId,
  senderId,
  transferType = 'GENERAL_NOTE',
  priority = 'NORMAL',
  title,
  message,
  payload = {},
}) {
  if (!isSupabaseConfigured || !supabase || !bookingId || !senderId) return;
  try {
    await supabase.from('workstation_transfers').insert({
      booking_id: bookingId,
      sender_id: senderId,
      sender_role: 'photographer',
      target_role: 'admin',
      transfer_type: transferType,
      priority,
      title,
      message,
      payload,
      status: 'PENDING',
    });
  } catch {
    // Non-critical audit notification
  }
}

export async function acceptPhotographerAssignment({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
}) {
  if (!isSupabaseConfigured || !supabase || !bookingId) {
    return { data: null, error: new Error('Unable to update booking offline.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_shoot_by_token',
        {
          lookup_token: qrToken,
          target_booking_id: bookingId,
          action_type: 'accept',
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { data: rpcData?.data || null, error: null };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'PHOTOGRAPHER_ASSIGNED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    const bNum = bookingNumber || data?.booking_number || '';
    try {
      await supabase.from('booking_status_history').insert({
        booking_id: bookingId,
        status: 'PHOTOGRAPHER_ASSIGNED',
        remarks: `Assignment accepted and locked in by ${photographerName}.`,
        changed_by: photographerId || null,
      });
    } catch {}

    await tryLogTransfer({
      bookingId,
      senderId: photographerId,
      transferType: 'ORDER_HANDOFF',
      priority: 'NORMAL',
      title: `Assignment Accepted: #${bNum}`,
      message: `${photographerName} accepted shoot #${bNum}.`,
      payload: { booking_number: bNum, action: 'ASSIGNMENT_ACCEPTED' },
    });

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function declinePhotographerAssignment({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
  reason = 'Schedule conflict / Unavailable',
}) {
  if (!isSupabaseConfigured || !supabase || !bookingId) {
    return { data: null, error: new Error('Unable to update booking offline.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_shoot_by_token',
        {
          lookup_token: qrToken,
          target_booking_id: bookingId,
          action_type: 'decline',
          remarks_text: reason,
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { data: rpcData?.data || null, error: null };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        photographer_id: null,
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    const bNum = bookingNumber || data?.booking_number || '';
    const cleanReason = String(reason || '').trim() || 'Schedule conflict / Unavailable';

    try {
      await supabase.from('booking_status_history').insert({
        booking_id: bookingId,
        status: 'CONFIRMED',
        remarks: `Assignment declined by ${photographerName}. Reason: "${cleanReason}".`,
        changed_by: photographerId || null,
      });
    } catch {}

    await tryLogTransfer({
      bookingId,
      senderId: photographerId,
      transferType: 'ISSUE_ESCALATION',
      priority: 'URGENT',
      title: `Assignment Declined: #${bNum}`,
      message: `${photographerName} declined #${bNum}. Reason: "${cleanReason}".`,
      payload: { booking_number: bNum, action: 'ASSIGNMENT_DECLINED', reason: cleanReason },
    });

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updatePhotographerShootStatus({
  bookingId,
  newStatus,
  remarks = '',
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
}) {
  if (!isSupabaseConfigured || !supabase || !bookingId || !newStatus) {
    return { data: null, error: new Error('Missing booking or status.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_shoot_by_token',
        {
          lookup_token: qrToken,
          target_booking_id: bookingId,
          action_type: 'status',
          new_status: newStatus,
          remarks_text: remarks || '',
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { data: rpcData?.data || null, error: null };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    const bNum = bookingNumber || data?.booking_number || '';
    const note = String(remarks || '').trim() || `Status updated to ${newStatus} by ${photographerName}.`;

    try {
      await supabase.from('booking_status_history').insert({
        booking_id: bookingId,
        status: newStatus,
        remarks: note,
        changed_by: photographerId || null,
      });
    } catch {}

    if (['FINALIZED', 'READY'].includes(newStatus)) {
      await tryLogTransfer({
        bookingId,
        senderId: photographerId,
        transferType: 'OUTPUT_SUBMISSION',
        priority: 'NORMAL',
        title: `Shoot Finalized: #${bNum}`,
        message: `${photographerName} marked #${bNum} as ${newStatus}.`,
        payload: { booking_number: bNum, newStatus },
      });
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function requestPhotographerReschedule({
  bookingId,
  photographerId,
  photographerName = 'Studio Photographer',
  bookingNumber = '',
  proposedDate = '',
  proposedTime = '',
  reason = '',
}) {
  if (!isSupabaseConfigured || !supabase || !bookingId) {
    return { error: new Error('Unable to send request offline.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_shoot_by_token',
        {
          lookup_token: qrToken,
          target_booking_id: bookingId,
          action_type: 'reschedule',
          remarks_text: reason,
          proposed_date: proposedDate || '',
          proposed_time: proposedTime || '',
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { error: null };
    }

    const cleanReason = String(reason || '').trim() || 'Photographer schedule adjustment';
    const msg = `${photographerName} requested reschedule for #${bookingNumber}. Proposed: ${proposedDate || 'TBD'} ${proposedTime || ''}. Reason: "${cleanReason}".`;

    await supabase.from('booking_status_history').insert({
      booking_id: bookingId,
      status: 'PHOTOGRAPHER_ASSIGNED',
      remarks: msg,
      changed_by: photographerId || null,
    });

    await tryLogTransfer({
      bookingId,
      senderId: photographerId,
      transferType: 'ISSUE_ESCALATION',
      priority: 'HIGH',
      title: `Reschedule Request: #${bookingNumber}`,
      message: msg,
      payload: {
        booking_number: bookingNumber,
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        reason: cleanReason,
      },
    });

    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

// ── Schedule & Availability ──────────────────────────────────────────────────

export async function fetchPhotographerAvailability(photographerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }

  try {
    let data = [];
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_photographer_availability_by_token',
        { lookup_token: qrToken }
      );
      if (rpcError) throw rpcError;
      data = Array.isArray(rpcData) ? rpcData : [];
    } else {
      if (!photographerId) return { data: [], error: null };
      const res = await supabase
        .from('photographer_availability')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false });

      if (res.error) throw res.error;
      data = res.data || [];
    }

    const map = new Map();
    (data || []).forEach((row) => {
      const dateKey = normalizeDateStr(row.availability_date || row.date);
      if (!dateKey || map.has(dateKey)) return;

      const rawStatus = String(row.status || '').toUpperCase();
      const isOff =
        rawStatus === 'UNAVAILABLE' ||
        rawStatus === 'BLOCKED' ||
        row.is_available === false;
      const startHM = extractTimeHM(row.start_time, '08:00');
      const endHM = extractTimeHM(row.end_time, '17:00');
      const isFullDay = startHM === '08:00' && endHM === '17:00';

      map.set(dateKey, {
        ...row,
        dateKey,
        status: isOff ? 'off' : isFullDay ? 'available' : 'partial',
        startTime: startHM,
        endTime: endHM,
        notes: row.notes || '',
      });
    });

    return { data: Array.from(map.values()), error: null };
  } catch (err) {
    console.warn('fetchPhotographerAvailability error:', err?.message || err);
    return { data: [], error: err };
  }
}

export async function saveDayAvailability({
  photographerId,
  date,
  status = 'available', // 'available' | 'partial' | 'off'
  startTime = '08:00',
  endTime = '17:00',
  notes = '',
}) {
  if (!isSupabaseConfigured || !supabase || !date) {
    return { data: null, error: new Error('Missing availability data.') };
  }

  try {
    const cleanDate = normalizeDateStr(date);
    const dbStatus = status === 'off' ? 'UNAVAILABLE' : 'AVAILABLE';
    const sHM = status === 'available' ? '08:00' : extractTimeHM(startTime, '08:00');
    const eHM = status === 'available' ? '17:00' : extractTimeHM(endTime, '17:00');

    const finalNotes =
      notes?.trim() ||
      (status === 'off'
        ? 'Off Duty / Unavailable'
        : status === 'partial'
          ? `Custom hours: ${sHM}–${eHM}`
          : 'Full Day Available');

    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'save_photographer_availability_by_token',
        {
          lookup_token: qrToken,
          target_date: cleanDate,
          new_status: dbStatus,
          new_start_time: `${sHM}:00`,
          new_end_time: `${eHM}:00`,
          new_notes: finalNotes,
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { data: rpcData?.data || null, error: null };
    }

    if (!photographerId) {
      return { data: null, error: new Error('Missing availability data.') };
    }

    try {
      await supabase
        .from('photographer_availability')
        .delete()
        .eq('photographer_id', photographerId)
        .eq('availability_date', cleanDate);
    } catch {}

    // Insert only base physical columns (never insert generated columns `date` or `is_available`)
    const { data, error } = await supabase
      .from('photographer_availability')
      .insert([
        {
          photographer_id: photographerId,
          availability_date: cleanDate,
          status: dbStatus,
          start_time: `${sHM}:00`,
          end_time: `${eHM}:00`,
          notes: finalNotes,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── Profile & General Duty Status ────────────────────────────────────────────

export async function fetchPhotographerProfile(photographerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: null };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'login_photographer_by_qr_token',
        { lookup_token: qrToken }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.authorized && rpcData?.profile) {
        const cleanBio = String(rpcData.profile.bio || '').replace(/\[TOOLS:.*?\]/g, '').trim();
        const normalized = {
          ...rpcData.profile,
          full_name:
            rpcData.profile.full_name ||
            `${rpcData.profile.first_name || ''} ${rpcData.profile.last_name || ''}`.trim(),
          specialization: rpcData.profile.specialization || 'Studio Photographer',
          bio: cleanBio,
          is_available: rpcData.profile.is_available ?? true,
          qr_login_token: rpcData.qr_login_token || qrToken,
        };
        await savePhotographerSessionData(normalized.qr_login_token, normalized);
        return { data: normalized, error: null };
      }
    }

    if (!photographerId) {
      return { data: null, error: null };
    }

    const [{ data: profile, error: pErr }, { data: ph }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url, role, is_active')
        .eq('id', photographerId)
        .single(),
      supabase
        .from('photographer_profiles')
        .select('specialization, bio, is_available, qr_login_token')
        .eq('id', photographerId)
        .maybeSingle(),
    ]);

    if (pErr) throw pErr;

    const cleanBio = String(ph?.bio || '').replace(/\[TOOLS:.*?\]/g, '').trim();

    return {
      data: {
        ...profile,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        specialization: ph?.specialization || 'Studio Photographer',
        bio: cleanBio,
        is_available: ph?.is_available ?? true,
        qr_login_token: ph?.qr_login_token || null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function toggleGeneralDutyAvailability(photographerId, isAvailable) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase unavailable.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'toggle_photographer_duty_by_token',
        { lookup_token: qrToken, next_available: Boolean(isAvailable) }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { error: null };
    }

    if (!photographerId) {
      return { error: new Error('Supabase unavailable.') };
    }

    const { error } = await supabase
      .from('photographer_profiles')
      .upsert({
        id: photographerId,
        is_available: Boolean(isAvailable),
        updated_at: new Date().toISOString(),
      });
    return { error };
  } catch (err) {
    return { error: err };
  }
}

export async function updatePhotographerProfile(
  photographerId,
  { first_name, last_name, phone, specialization, bio }
) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase unavailable.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_profile_by_token',
        {
          lookup_token: qrToken,
          new_first_name: String(first_name || '').trim(),
          new_last_name: String(last_name || '').trim(),
          new_phone: String(phone || '').trim(),
          new_specialization: String(specialization || '').trim() || 'Studio Photographer',
          new_bio: String(bio || '').trim(),
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { error: null };
    }

    if (!photographerId) {
      return { error: new Error('Supabase unavailable.') };
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        first_name: String(first_name || '').trim(),
        last_name: String(last_name || '').trim(),
        phone: String(phone || '').trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', photographerId);

    if (pErr) throw pErr;

    const { error: phErr } = await supabase
      .from('photographer_profiles')
      .upsert({
        id: photographerId,
        specialization: String(specialization || '').trim() || 'Studio Photographer',
        bio: String(bio || '').trim(),
        updated_at: new Date().toISOString(),
      });

    if (phErr) throw phErr;
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

export async function updatePhotographerAvatar(photographerId, avatarDataUri) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase unavailable.') };
  }

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_photographer_avatar_by_token',
        {
          lookup_token: qrToken,
          new_avatar_url: avatarDataUri || '',
        }
      );
      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);
      return { error: null };
    }

    if (!photographerId) {
      return { error: new Error('Supabase unavailable.') };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarDataUri || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photographerId);
    return { error };
  } catch (err) {
    return { error: err };
  }
}

// ── Studio Alerts / Transfers ────────────────────────────────────────────────

export async function fetchPhotographerAlerts() {
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null };

  try {
    const qrToken = await getPhotographerQRToken();
    if (qrToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_photographer_alerts_by_token',
        { lookup_token: qrToken }
      );
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData, error: null };
      }
    }

    const { data, error } = await supabase
      .from('workstation_transfers')
      .select('id, title, message, priority, transfer_type, status, created_at')
      .in('target_role', ['photographer', 'all'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: null };
  }
}
