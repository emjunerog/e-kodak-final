/**
 * presenceService.js
 * ===================
 * Supabase Realtime Presence Service for E-Kodak Studio.
 *
 * Tracks live customer & worker portal presence so studio administrators can see
 * in real-time who is actively browsing the portal (/dashboard/*, /admin/*).
 *
 * Channel: 'customer-presence'
 *
 * ARCHITECTURAL GUARANTEE:
 * Uses a single unified RealtimeChannel coordinator. Ensures presence callbacks
 * (.on('presence', ...)) are attached ONCE before .subscribe() is called, preventing
 * the "cannot add presence callbacks after subscribe()" error across all admin pages.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CHANNEL_NAME = 'customer-presence';

// ── Singleton Presence Coordinator State ─────────────────────────────────────
let sharedChannel = null;
let isChannelSubscribed = false;
let syncListeners = new Set();
let activeTrackers = new Map(); // key: userId, value: { user, profile }
let lastOnlineMap = new Map();
let heartbeatInterval = null;
let teardownTimeout = null;

/**
 * Extracts and normalizes the online presence map from the Supabase presence state.
 * Indexes by both presence key and user_id to ensure fast O(1) lookups.
 */
function extractOnlineMap(channel) {
  if (!channel) return new Map();
  try {
    const state = channel.presenceState();
    const onlineMap = new Map();

    Object.entries(state || {}).forEach(([key, presences]) => {
      if (Array.isArray(presences) && presences.length > 0) {
        const latest = presences[presences.length - 1];
        if (latest) {
          onlineMap.set(key, latest);
          if (latest.user_id) {
            onlineMap.set(latest.user_id, latest);
          }
        }
      }
    });

    return onlineMap;
  } catch (err) {
    console.warn('[Presence] Error extracting presence state:', err);
    return new Map();
  }
}

/**
 * Dispatches presence map to all registered listener callbacks.
 */
function broadcastToListeners(onlineMap) {
  lastOnlineMap = onlineMap;
  syncListeners.forEach((listener) => {
    try {
      listener(onlineMap);
    } catch (err) {
      console.warn('[Presence] Error executing presence sync listener:', err);
    }
  });
}

/**
 * Broadcasts all active tracking payloads to the channel.
 */
async function syncAllActiveTrackers() {
  if (!sharedChannel || !isChannelSubscribed) return;

  for (const [userId, { user, profile }] of activeTrackers.entries()) {
    try {
      await sharedChannel.track({
        user_id: userId,
        email: user.email || '',
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Valued User',
        role: profile?.role || 'customer',
        online_at: new Date().toISOString(),
        current_path: typeof window !== 'undefined' ? window.location.pathname : '',
      });
    } catch (err) {
      console.warn(`[Presence] Failed to track presence for user ${userId}:`, err);
    }
  }
}

/**
 * Lazily creates or returns the singleton channel, configuring presence events
 * strictly BEFORE .subscribe() is invoked.
 */
function getOrCreateChannel() {
  if (teardownTimeout) {
    clearTimeout(teardownTimeout);
    teardownTimeout = null;
  }

  if (sharedChannel) {
    return sharedChannel;
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  // Clean up any stale orphaned channels with the same name in Supabase client
  try {
    const existingChannels = supabase.getChannels ? supabase.getChannels() : [];
    const stale = existingChannels.filter(
      (ch) => ch.topic === `realtime:${CHANNEL_NAME}` || ch.topic === CHANNEL_NAME
    );
    stale.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
  } catch {}

  // Create unified channel
  sharedChannel = supabase.channel(CHANNEL_NAME);

  // Attach presence event listeners BEFORE subscribe()
  sharedChannel
    .on('presence', { event: 'sync' }, () => {
      const map = extractOnlineMap(sharedChannel);
      broadcastToListeners(map);
    })
    .on('presence', { event: 'join' }, () => {
      const map = extractOnlineMap(sharedChannel);
      broadcastToListeners(map);
    })
    .on('presence', { event: 'leave' }, () => {
      const map = extractOnlineMap(sharedChannel);
      broadcastToListeners(map);
    });

  // Now subscribe
  sharedChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      isChannelSubscribed = true;
      const map = extractOnlineMap(sharedChannel);
      broadcastToListeners(map);
      await syncAllActiveTrackers();
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      isChannelSubscribed = false;
    }
  });

  // Start heartbeat
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      if (sharedChannel && isChannelSubscribed && activeTrackers.size > 0) {
        syncAllActiveTrackers();
      }
    }, 45000);
  }

  return sharedChannel;
}

/**
 * Checks if the channel can be torn down when there are no observers or trackers.
 * Debounced by 10 seconds to avoid websocket reconnection churn during route navigation.
 */
function scheduleChannelTeardownIfIdle() {
  if (syncListeners.size > 0 || activeTrackers.size > 0) {
    return;
  }

  if (teardownTimeout) {
    clearTimeout(teardownTimeout);
  }

  teardownTimeout = setTimeout(() => {
    if (syncListeners.size === 0 && activeTrackers.size === 0 && sharedChannel) {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      try {
        sharedChannel.untrack().catch(() => {});
        supabase?.removeChannel(sharedChannel);
      } catch {}
      sharedChannel = null;
      isChannelSubscribed = false;
      lastOnlineMap = new Map();
    }
  }, 10000);
}

/**
 * Broadcasts customer/staff active presence while browsing.
 * 
 * @param {Object} user Current authenticated user object
 * @param {Object} profile User profile object
 * @returns {Function} Cleanup unsubscribe function
 */
export function trackCustomerPresence(user, profile) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return () => {};
  }

  const userId = user.id;
  activeTrackers.set(userId, { user, profile });

  // Ensure channel exists and is subscribed
  const channel = getOrCreateChannel();

  if (channel && isChannelSubscribed) {
    syncAllActiveTrackers();
  }

  return () => {
    activeTrackers.delete(userId);
    if (sharedChannel && isChannelSubscribed) {
      try {
        sharedChannel.untrack().catch(() => {});
      } catch {}
    }
    scheduleChannelTeardownIfIdle();
  };
}

/**
 * Subscribes to live presence updates for administrative observation.
 * Safe to call from multiple components simultaneously (e.g. Customers, Staff, Photographers).
 * 
 * @param {Function} onPresenceSync Callback receiving a Map of { [userId]: presenceData }
 * @returns {Function} Cleanup unsubscribe function
 */
export function subscribeToCustomerPresence(onPresenceSync) {
  if (!isSupabaseConfigured || !supabase || typeof onPresenceSync !== 'function') {
    if (typeof onPresenceSync === 'function') {
      onPresenceSync(new Map());
    }
    return () => {};
  }

  // Register listener
  syncListeners.add(onPresenceSync);

  // Immediately feed last known presence map if available
  if (lastOnlineMap && lastOnlineMap.size > 0) {
    try {
      onPresenceSync(new Map(lastOnlineMap));
    } catch {}
  }

  // Ensure shared channel is running
  getOrCreateChannel();

  return () => {
    syncListeners.delete(onPresenceSync);
    scheduleChannelTeardownIfIdle();
  };
}
