'use client';

/**
 * Universal Login Entrance Audio Engine
 * Plays background audio ringtone (/Woops-2-Downringtone.com.mp3) on login
 */

let globalAudio = null;
let globalTimer = null;

export function isAudioPlaying() {
  if (typeof window === 'undefined') return false;
  const audio = globalAudio || window.__crmLoginAudio;
  return !!(audio && !audio.paused && !audio.ended);
}

export function playLoginAudio(durationMs = 60000) {
  if (typeof window === 'undefined') return;
  if (durationMs <= 0) {
    stopLoginAudio();
    return;
  }

  try {
    if (!globalAudio) {
      globalAudio = new Audio('/Woops-2-Downringtone.com.mp3');
      globalAudio.loop = true;
      globalAudio.volume = 0.7;
    }

    window.__crmLoginAudio = globalAudio;

    if (globalAudio.paused) {
      const playPromise = globalAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[Audio Autoplay Deferred]: Waiting for user interaction', err.message);
        });
      }
    }

    if (globalTimer) clearTimeout(globalTimer);
    globalTimer = setTimeout(() => {
      stopLoginAudio();
    }, Math.min(durationMs, 60000));

  } catch (err) {
    console.error('[Login Audio Trigger Error]:', err);
  }
}

export function stopLoginAudio() {
  if (globalTimer) {
    clearTimeout(globalTimer);
    globalTimer = null;
  }
  
  const audio = globalAudio || (typeof window !== 'undefined' ? window.__crmLoginAudio : null);
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }
  
  globalAudio = null;
  if (typeof window !== 'undefined') {
    delete window.__crmLoginAudio;
    sessionStorage.removeItem('crm_login_audio_start_time');
  }
}

export function checkAndResumeLoginAudio() {
  if (typeof window === 'undefined') return;
  
  const audio = globalAudio || window.__crmLoginAudio;
  if (audio && audio.paused) {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }
}
