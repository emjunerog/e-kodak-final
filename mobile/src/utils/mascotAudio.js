/**
 * mascotAudio.js
 * Fail-safe audio playback for Kodak the Fox mascot in E-Kodak mobile app.
 *
 * Automatically adapts across:
 * 1. expo-audio (modern Expo SDK 52/53/57)
 * 2. Web HTML5 Audio (if running in browser)
 * 3. Haptic feedback (expo-haptics) as universal zero-crash tactile sound
 *
 * Guaranteed ZERO crashes even if native modules are not linked in Expo Go!
 */

import * as Haptics from 'expo-haptics';

const SOUND_FILES = {
  alert: require('../../assets/sounds/mascot_alert.wav'),
  success: require('../../assets/sounds/mascot_success.wav'),
  pop: require('../../assets/sounds/mascot_pop.wav'),
};

let expoAudioModule = null;
let expoAudioChecked = false;

function getExpoAudio() {
  if (expoAudioChecked) return expoAudioModule;
  expoAudioChecked = true;
  try {
    expoAudioModule = require('expo-audio');
  } catch {
    expoAudioModule = null;
  }
  return expoAudioModule;
}

export async function playMascotSound(type = 'pop') {
  // 1. Coordinated haptic response corresponding to the sound emotion
  try {
    if (type === 'alert') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Safe fallback if device does not support haptics
  }

  // 2. Try expo-audio if available in the current runtime
  try {
    const AudioLib = getExpoAudio();
    if (AudioLib && typeof AudioLib.createAudioPlayer === 'function') {
      const source = SOUND_FILES[type] || SOUND_FILES.pop;
      const player = AudioLib.createAudioPlayer(source);
      if (player) {
        player.play();
        setTimeout(() => {
          try {
            if (typeof player.release === 'function') {
              player.release();
            }
          } catch {
            // Ignore release errors
          }
        }, 1800);
        return;
      }
    }
  } catch {
    // Native audio unavailable or unlinked in host Expo Go client
  }

  // 3. Web Audio fallback if running in a web browser
  try {
    if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
      const source = SOUND_FILES[type] || SOUND_FILES.pop;
      const audioUrl = typeof source === 'string' ? source : (source?.uri || source?.default);
      if (audioUrl) {
        const htmlAudio = new window.Audio(audioUrl);
        htmlAudio.volume = 0.85;
        htmlAudio.play().catch(() => {});
      }
    }
  } catch {
    // Ignore web audio errors
  }
}
