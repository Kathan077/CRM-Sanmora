'use client';

import { useEffect } from 'react';
import { playLoginAudio, checkAndResumeLoginAudio, stopLoginAudio, isAudioPlaying } from '../../utils/loginAudio';

/**
 * Pure Background Login Audio Handler
 * Plays background song seamlessly on login without any UI elements.
 */
export default function EntranceMusicPlayer({ user }) {
  useEffect(() => {
    // If not logged in, stop any playing audio immediately
    if (!user) {
      stopLoginAudio();
      sessionStorage.removeItem('crm_login_audio_start_time');
      return;
    }

    const checkAndSyncAudio = () => {
      const startTimeStr = sessionStorage.getItem('crm_login_audio_start_time');
      if (!startTimeStr) return;

      const startTime = parseInt(startTimeStr, 10);
      const elapsed = Date.now() - startTime;
      const remaining = 60000 - elapsed;

      if (remaining > 0) {
        playLoginAudio(remaining);
        checkAndResumeLoginAudio();
      } else {
        stopLoginAudio();
        sessionStorage.removeItem('crm_login_audio_start_time');
      }
    };

    // 1. Initial check on component mount (works on navigation & page refresh)
    checkAndSyncAudio();

    // 2. Multi-event listener to instantly bypass browser autoplay policies on refresh
    const handleUserInteraction = () => {
      if (user) {
        checkAndSyncAudio();
      }
    };

    const events = ['click', 'pointerdown', 'touchstart', 'keydown', 'mousemove', 'scroll'];
    events.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { capture: true, passive: true });
    });

    return () => {
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction, { capture: true });
      });
    };
  }, [user]);

  // Renders 0 UI elements
  return null;
}
