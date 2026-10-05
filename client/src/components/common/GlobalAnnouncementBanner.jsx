'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { announcementService } from '../../services/announcement.service';
import { getActiveAnnouncementsStore } from '../../utils/crmStore';
import {
  Sparkles, PartyPopper, Megaphone, Trophy, Target,
  X, Eye
} from 'lucide-react';
import './GlobalAnnouncementBanner.css';

export default function GlobalAnnouncementBanner({ onToggleDismiss }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const bannerRef = useRef(null);

  // Function to load active announcements
  const fetchActiveAnnouncements = useCallback(async () => {
    try {
      const res = await announcementService.getActiveAnnouncements();
      const list = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      if (list.length > 0) {
        setAnnouncements(list);
        return;
      }
    } catch (err) {
      // Fallback to offline store
    }
    const localActive = getActiveAnnouncementsStore();
    setAnnouncements(localActive);
  }, []);

  useEffect(() => {
    fetchActiveAnnouncements();

    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 30000);

    const handleStorageUpdate = () => {
      fetchActiveAnnouncements();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('announcement_updated', handleStorageUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('announcement_updated', handleStorageUpdate);
    };
  }, [fetchActiveAnnouncements]);

  const isVisible = Boolean(announcements && announcements.length > 0 && !dismissed);

  const updateAnnouncementHeight = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (isVisible && bannerRef.current) {
      // Use rAF to measure after browser has painted the element
      requestAnimationFrame(() => {
        const h = bannerRef.current ? bannerRef.current.offsetHeight : 0;
        document.documentElement.style.setProperty('--announcement-height', `${Math.max(h, 48)}px`);
      });
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    }
  }, [isVisible]);

  useEffect(() => {
    updateAnnouncementHeight();

    if (!bannerRef.current) return;

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateAnnouncementHeight();
      });
      ro.observe(bannerRef.current);
    }

    window.addEventListener('resize', updateAnnouncementHeight);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateAnnouncementHeight);
      // Always reset on unmount so layout doesn't get stuck
      document.documentElement.style.setProperty('--announcement-height', '0px');
    };
  }, [updateAnnouncementHeight, isVisible, announcements]);

  // Sync canvas size to full viewport
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // PRO 60 FPS Full-Page Festive Celebration Confetti & Party Popper Engine Trigger
  const triggerSparkles = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    let origins = [];
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      origins.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, burstType: 'radial' });
    }

    // Festive Multi-Cannon Blast Points (Bottom-Left, Bottom-Right, Top Fans)
    origins.push({ x: w * 0.08, y: h, burstType: 'up_right' });
    origins.push({ x: w * 0.92, y: h, burstType: 'up_left' });
    origins.push({ x: w * 0.35, y: 30, burstType: 'top_fan' });
    origins.push({ x: w * 0.65, y: 30, burstType: 'top_fan' });

    // Vivid Festive Celebration Colors (Gold, Pink, Violet, Cyan, Emerald, Orange, Coral)
    const festiveColors = [
      '#FFD700', '#FFC107', // Electric Gold
      '#FF007F', '#EC4899', // Vivid Magenta Pink
      '#7C3AED', '#8B5CF6', // Royal Purple
      '#00E5FF', '#06B6D4', // Neon Cyan
      '#00E676', '#10B981', // Vivid Emerald
      '#FF3D00', '#FF6D00', // Bright Coral & Orange
      '#FFFFFF'             // Pure White Highlight
    ];

    const types = ['confetti_strip', 'confetti_strip', 'gold_star', 'party_dot', 'sparkle_flare'];
    const newParticles = [];

    origins.forEach(origin => {
      const countPerOrigin = origin.burstType === 'radial' ? 60 : 45; // ~230 festive particles total

      for (let i = 0; i < countPerOrigin; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const color = festiveColors[Math.floor(Math.random() * festiveColors.length)];

        let vx = 0;
        let vy = 0;

        if (origin.burstType === 'up_right') {
          const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6;
          const speed = 14 + Math.random() * 12;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        } else if (origin.burstType === 'up_left') {
          const angle = (-Math.PI * 3) / 4 + (Math.random() - 0.5) * 0.6;
          const speed = 14 + Math.random() * 12;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        } else if (origin.burstType === 'top_fan') {
          const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          const speed = 6 + Math.random() * 10;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        } else {
          // Radial explosive burst from button click
          const angle = (Math.PI * 2 * i) / countPerOrigin + (Math.random() - 0.5) * 0.5;
          const speed = 6 + Math.random() * 14;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed - 4;
        }

        newParticles.push({
          x: origin.x + (Math.random() - 0.5) * 40,
          y: origin.y + (Math.random() - 0.5) * 20,
          vx,
          vy,
          gravity: 0.2 + Math.random() * 0.12, // Realistic festive gravity fall
          drag: 0.982,
          size: type === 'confetti_strip' ? 8 + Math.random() * 8 : (type === 'gold_star' ? 7 + Math.random() * 7 : 5 + Math.random() * 6),
          color,
          type,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.25,
          flipAngle: Math.random() * Math.PI,
          vFlip: 0.08 + Math.random() * 0.14, // 3D Flutter speed
          opacity: 1,
          decay: 0.005 + Math.random() * 0.006,
          maxLife: 160 + Math.random() * 100,
          age: 0,
          swayPhase: Math.random() * Math.PI * 2
        });
      }
    });

    particlesRef.current.push(...newParticles);

    if (!animFrameRef.current) {
      runAnimationLoop();
    }
  }, []);

  // Main Canvas Render Loop for Festive Confetti & Party Poppers
  const runAnimationLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += 1;
        p.x += p.vx + Math.sin(p.age * 0.06 + p.swayPhase) * 1.2; // Festive side-to-side air flutter
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.rotation += p.vr;
        p.flipAngle += p.vFlip;

        if (p.age > p.maxLife - 35) {
          p.opacity -= 0.03;
        } else {
          p.opacity -= p.decay;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 60) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.translate(p.x, p.y);

        if (p.type === 'confetti_strip') {
          // 3D Fluttering Metallic Confetti Ribbon
          ctx.rotate(p.rotation);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = p.color;
          const currentW = Math.sin(p.flipAngle) * p.size * 1.2;
          ctx.fillRect(-currentW / 2, -p.size * 0.35, currentW, p.size * 0.7);

        } else if (p.type === 'gold_star') {
          // 5-Pointed Popping Celebration Star
          ctx.rotate(p.rotation);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = p.color;

          ctx.beginPath();
          const spikes = 5;
          const outerR = p.size;
          const innerR = p.size * 0.42;
          for (let s = 0; s < spikes * 2; s++) {
            const r = s % 2 === 0 ? outerR : innerR;
            const a = (Math.PI / spikes) * s - Math.PI / 2;
            const sx = Math.cos(a) * r;
            const sy = Math.sin(a) * r;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();

          // White center highlight
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
          ctx.fill();

        } else if (p.type === 'party_dot') {
          // Festive Popping Circular Confetti
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.85, 0, Math.PI * 2);
          ctx.fill();

        } else if (p.type === 'sparkle_flare') {
          // High-Energy Popping Cross Flare
          ctx.rotate(p.rotation);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;

          const R = p.size * 1.2;
          const r = R * 0.2;
          ctx.beginPath();
          ctx.moveTo(0, -R);
          ctx.lineTo(r, -r);
          ctx.lineTo(R, 0);
          ctx.lineTo(r, r);
          ctx.lineTo(0, R);
          ctx.lineTo(-r, r);
          ctx.lineTo(-R, 0);
          ctx.lineTo(-r, -r);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (onToggleDismiss) onToggleDismiss(true);
  };

  const handleExpand = () => {
    setDismissed(false);
    if (onToggleDismiss) onToggleDismiss(false);
  };

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const primaryAnn = announcements[0];

  const formatBadge = (category) => {
    switch (category) {
      case 'Celebration':
        return { label: 'Celebration', icon: PartyPopper, class: 'celebration' };
      case 'Important':
        return { label: 'Notice Alert', icon: Megaphone, class: 'important' };
      case 'Achievement':
        return { label: 'Milestone', icon: Trophy, class: 'achievement' };
      case 'Sales Target':
        return { label: 'Target Alert', icon: Target, class: 'salestarget' };
      default:
        return { label: 'Announcement', icon: Sparkles, class: 'celebration' };
    }
  };

  const badgeInfo = formatBadge(primaryAnn.category);
  const BadgeIcon = badgeInfo.icon;

  if (dismissed) {
    return (
      <div className="announcement-header-trigger" onClick={handleExpand} title="Click to view Active Celebration Announcement">
        <PartyPopper size={14} className="announcement-sparkle-icn" />
        <span>Celebration Announcement</span>
        <Eye size={13} />
      </div>
    );
  }

  const marqueeItems = announcements.length === 1 ? [primaryAnn, primaryAnn, primaryAnn] : announcements;

  return (
    <>
      {/* 60 FPS Canvas Celebration Sparkle Engine Layer across FULL Viewport */}
      <canvas
        ref={canvasRef}
        className="celebration-sparkles-canvas"
      />

      <div className="global-announcement-wrapper" ref={bannerRef}>
        <div className="global-announcement-bar">
          
          {/* Clean Category Pill with Click Sparkle Cannon Trigger */}
          <div
            className={`announcement-category-badge ${badgeInfo.class}`}
            onClick={triggerSparkles}
            title="Click to launch Full-Screen Celebration Sparkles! 🎉"
          >
            <BadgeIcon size={15} />
            <span>{badgeInfo.label}</span>
          </div>

          {/* Dynamic Scrolling Ticker */}
          <div className="announcement-ticker-container">
            <div className="announcement-ticker-track">
              {marqueeItems.concat(marqueeItems).map((item, idx) => (
                <span key={`${item.id || item._id || idx}-${idx}`} className="announcement-item-text">
                  <Sparkles
                    size={16}
                    className="announcement-sparkle-icn"
                    onClick={triggerSparkles}
                    style={{ cursor: 'pointer' }}
                    title="Click for Full-Screen Sparkles!"
                  />
                  <span>{item.text}</span>
                  <span className="announcement-publisher-tag">Posted by {item.createdByName || 'Admin'}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="announcement-actions">
            <button
              className="announcement-dismiss-btn"
              onClick={handleDismiss}
              title="Minimize Announcement Bar"
            >
              <X size={15} />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

