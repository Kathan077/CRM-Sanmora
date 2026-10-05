'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function ParticleCanvas() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;


    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracker
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 180,
      active: false
    };

    // Shockwaves on click
    const shockwaves = [];

    const colors = [
      'rgba(124, 58, 237, ', // Electric Royal Purple
      'rgba(37, 99, 235, ',  // Vivid Indigo Blue
      'rgba(6, 182, 212, ',  // Electric Cyan
      'rgba(244, 63, 94, ',  // Neon Coral Pink
      'rgba(16, 185, 129, '  // Cyber Emerald
    ];

    // Responsive particle density
    const getParticleCount = () => {
      if (window.innerWidth < 640) return 45;
      if (window.innerWidth < 1024) return 65;
      return 95;
    };


    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = (Math.random() - 0.5) * 0.7;
        this.baseRadius = Math.random() * 2.2 + 1.2;
        this.radius = this.baseRadius;
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.3;
        this.pulseSpeed = Math.random() * 0.02 + 0.008;
        this.pulseAngle = Math.random() * Math.PI * 2;
      }

      update() {
        // Natural movement
        this.x += this.vx;
        this.y += this.vy;

        // Screen bounce with soft margin
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Subtle pulsing
        this.pulseAngle += this.pulseSpeed;
        this.radius = this.baseRadius + Math.sin(this.pulseAngle) * 0.8;

        // Mouse gravity & interaction
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            // Magnetic drift towards mouse
            this.x += Math.cos(angle) * force * 1.2;
            this.y += Math.sin(angle) * force * 1.2;
            // Radius grow on cursor hover
            this.radius = this.baseRadius + force * 2.5;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.radius), 0, Math.PI * 2);
        
        // Soft glowing particle effect
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, Math.max(1, this.radius * 2.5)
        );
        gradient.addColorStop(0, this.colorBase + this.alpha + ')');
        gradient.addColorStop(0.5, this.colorBase + (this.alpha * 0.4) + ')');
        gradient.addColorStop(1, this.colorBase + '0)');

        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    let particles = Array.from({ length: getParticleCount() }, () => new Particle());

    // Resize handler
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      particles = Array.from({ length: getParticleCount() }, () => new Particle());
    };

    // Mouse Event Handlers
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleClick = (e) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 5,
        maxRadius: 140,
        alpha: 0.75,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    handleResize();

    // Main 60fps Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections (Constellation Neural Grid)
      const maxConnectDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const lineAlpha = (1 - dist / maxConnectDist) * 0.25;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Connect to mouse if active
      if (mouse.active) {
        for (let i = 0; i < particles.length; i++) {
          const dx = mouse.x - particles[i].x;
          const dy = mouse.y - particles[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const lineAlpha = (1 - dist / mouse.radius) * 0.45;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // Update & draw particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Render Click Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 4.5;
        sw.alpha -= 0.02;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color + sw.alpha + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 1
      }}
    />
  );
}


