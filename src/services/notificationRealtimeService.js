/**
 * E-Kodak Studio — Realtime & Notification Service
 * =================================================
 * Provides:
 *  1. Zero-dependency Web Audio API luxury studio chime
 *  2. Native Browser Desktop Notifications (Web Notification API)
 *  3. Supabase Realtime subscription for instant multi-device sync
 *  4. Direct 1-click Email client URL generator (Gmail / default mail client)
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── 1. Luxury Studio Notification Sound Chime ───────────────────────────────
let audioCtx = null;

export function playStudioNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContext();
    }

    const now = audioCtx.currentTime;

    // Harmonic warm double-tone chime (F#5 -> C#6: 740Hz -> 1108Hz)
    const notes = [
      { freq: 739.99, time: now,        duration: 0.35, gain: 0.12 },
      { freq: 1108.73, time: now + 0.12, duration: 0.55, gain: 0.16 }
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      // Smooth attack and exponential warm decay
      gainNode.gain.setValueAtTime(0.001, time);
      gainNode.gain.linearRampToValueAtTime(gain, time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(time);
      osc.stop(time + duration);
    });
  } catch {
    // AudioContext blocked or not supported — fails gracefully with no console errors
  }
}

// ─── 2. Native Desktop Notification (Web Notification API) ───────────────────

export async function requestDesktopNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export function showDesktopNotification({ title, message, url = '/dashboard/notifications', icon = '/favicon.ico' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title || 'E-Kodak Studio Notification', {
      body: message || '',
      icon: icon,
      badge: icon,
      tag: `ekodak_${Date.now()}`
    });

    notif.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      notif.close();
    };
  } catch (e) {
    console.warn('Desktop notification error:', e);
  }
}

// ─── 3. 1-Click Email Client Link Generator ──────────────────────────────────
export function getDirectEmailUrl({ to, subject, body = '', preferGmail = true }) {
  const encTo = encodeURIComponent(to || '');
  const encSub = encodeURIComponent(subject || '');
  const encBody = encodeURIComponent(body || '');

  if (preferGmail) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSub}&body=${encBody}`;
  }
  return `mailto:${encTo}?subject=${encSub}&body=${encBody}`;
}

/**
 * Copies rich formatted HTML email to clipboard.
 * When pasted into Gmail / Outlook / Apple Mail, it pastes the full visual design
 * with colors, fonts, buttons, logos, and borders!
 */
export async function copyRichHtmlToClipboard(htmlString, plainFallbackText = '') {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('Clipboard API not supported in this browser');
    }

    // Modern ClipboardItem with text/html and text/plain
    const blobHtml = new Blob([htmlString], { type: 'text/html' });
    const blobText = new Blob([plainFallbackText || htmlString.replace(/<[^>]+>/g, ' ')], { type: 'text/plain' });

    const item = new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText
    });

    await navigator.clipboard.write([item]);
    return { success: true };
  } catch (err) {
    console.warn('Rich clipboard write failed, falling back to execCommand:', err);
    // Fallback using invisible contenteditable div
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.opacity = '0';
      container.contentEditable = 'true';
      container.innerHTML = htmlString;
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      const success = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);

      if (success) return { success: true };
    } catch (e2) {
      console.warn('execCommand copy error:', e2);
    }

    // Ultimate fallback: plain text copy
    try {
      await navigator.clipboard.writeText(plainFallbackText || htmlString.replace(/<[^>]+>/g, ' '));
      return { success: true, isPlainText: true };
    } catch (e3) {
      return { success: false, error: err.message };
    }
  }
}

// ─── 4. Realtime Subscription for Customers / Individual Users ───────────────
export function subscribeCustomerRealtimeNotifications(userId, onNewNotification) {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channelName = `realtime:customer-notifs:${userId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notif = payload.new;
        if (!notif) return;

        // 1. Play luxury audio chime
        playStudioNotificationChime();

        // 2. Trigger native desktop alert if permitted
        showDesktopNotification({
          title: notif.title || 'Studio Notification',
          message: notif.message || '',
          url: notif.booking_id ? `/dashboard/bookings/${notif.booking_id}` : '/dashboard/notifications'
        });

        // 3. Inform listeners & components
        window.dispatchEvent(new CustomEvent('ekodak:customer_notifications_updated', { detail: notif }));
        if (typeof onNewNotification === 'function') {
          onNewNotification(notif);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── 5. Realtime Subscription for Admin / Staff / Finance / Photographer ────
export function subscribeAdminRealtimeNotifications(onNewNotification) {
  if (!isSupabaseConfigured) return () => {};

  const channelName = `realtime:admin-notifs:${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      },
      async (payload) => {
        const notif = payload.new;
        if (!notif) return;

        // 1. Ignore customer preference updates and audit logs completely
        if (
          notif.notification_type === 'CUSTOMER_AUDIT' || 
          notif.notification_type === 'PREFERENCE_UPDATE' ||
          notif.notification_type === 'SPEC_UPDATE'
        ) {
          return;
        }

        // 2. Do not toggle admin notification for outbound messages dispatched to customers
        try {
          const { data: { user } } = await supabase.auth.getUser();
          // If the notification was addressed to a customer and not to staff, skip admin alert
          if (notif.created_by && user?.id && notif.created_by === user.id) {
            return;
          }
        } catch {}

        // Play chime for staff
        playStudioNotificationChime();

        // Inform admin components
        window.dispatchEvent(new CustomEvent('ekodak:admin_notifications_updated', { detail: notif }));
        if (typeof onNewNotification === 'function') {
          onNewNotification(notif);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
