'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff, Zap, ShieldAlert } from 'lucide-react';
import ParticleCanvas from '../../components/common/ParticleCanvas';
import { playLoginAudio } from '../../utils/loginAudio';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [infoNotice, setInfoNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(false);
  const { login } = useAuth();
  
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const notice = sessionStorage.getItem('crm_idle_logout_notice');
      if (notice === '1_hour_inactivity') {
        setInfoNotice('You were automatically logged out due to 1 hour of cursor/keyboard inactivity.');
        sessionStorage.removeItem('crm_idle_logout_notice');
      } else if (notice === 'app_closed') {
        setInfoNotice('You were automatically logged out because the browser or application software was closed.');
        sessionStorage.removeItem('crm_idle_logout_notice');
      }
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / rect.height) * -8,
      y: (x / rect.width) * 8
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.success) {
        sessionStorage.setItem('crm_login_audio_start_time', Date.now().toString());
        playLoginAudio(60000);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setEmail('admin@sanmoracrm.com');
    setPassword('Admin@123456');
    setError('');
    setFilled(true);
    setTimeout(() => setFilled(false), 2000);
  };

  return (
    <main className="login-container">
      {/* Interactive Background Particle Canvas - Exclusive to Login */}
      <ParticleCanvas />

      {/* Background Floating Ambient Elements */}
      <div className="login-ambient-orb orb-1"></div>
      <div className="login-ambient-orb orb-2"></div>


      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="login-glass-card"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
        }}
      >
        <div className="card-top-shine"></div>

        <div className="login-header">
          <div className="brand-badge-icon">
            <Sparkles className="sparkle-icon" />
            <div className="badge-ring-pulse"></div>
          </div>
          <h1 className="login-title">
            Welcome to <span className="shimmer-text">Sanmora CRM</span>
          </h1>
          <p className="login-subtitle">
            Enterprise CRM & Sales Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="error-alert animate-shake">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {infoNotice && (
          <div className="info-alert animate-fadeIn" style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#b45309',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: 500
          }}>
            <ShieldAlert size={18} color="#d97706" />
            <span>{infoNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className={`input-icon-wrap ${email ? 'active' : ''}`}>
              <Mail className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
              <div className="input-focus-border"></div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={`input-icon-wrap ${password ? 'active' : ''}`}>
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
              />
              <button
                type="button"
                className="toggle-pass-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <div className="input-focus-border"></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary submit-btn god-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <span className="loading-content">
                <span className="spinner"></span> Authenticating...
              </span>
            ) : (
              <>
                <span className="btn-text">Sign In to Workspace</span>
                <ArrowRight size={18} className="arrow-icon" />
              </>
            )}
          </button>
        </form>

        <div className="demo-credentials-box">
          <div className="demo-header">
            <ShieldCheck size={16} className="demo-icon" />
            <span>Quick Test Access</span>
          </div>
          <button
            type="button"
            onClick={handleQuickFillAdmin}
            className={`demo-btn ${filled ? 'filled-success' : ''}`}
          >
            {filled ? (
              <>
                <CheckCircle2 size={16} className="check-icon animate-bounce" />
                <span>Credentials Auto-Filled!</span>
              </>
            ) : (
              <>
                <Zap size={15} className="zap-icon" />
                <span>Fill Super Admin (admin@sanmoracrm.com)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          z-index: 10;
        }

        .login-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
          animation: floatOrb 12s ease-in-out infinite alternate;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #7C3AED 0%, rgba(124, 58, 237, 0) 70%);
          top: 15%;
          left: 20%;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #06B6D4 0%, rgba(6, 182, 212, 0) 70%);
          bottom: 15%;
          right: 20%;
          animation-delay: -6s;
        }

        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -30px) scale(1.15); }
        }

        .login-glass-card {
          width: 100%;
          max-width: 450px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(124, 58, 237, 0.2);
          box-shadow: 
            0 25px 60px -15px rgba(124, 58, 237, 0.2),
            0 10px 30px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          border-radius: 28px;
          padding: 44px;
          position: relative;
          overflow: hidden;
          will-change: transform;
          animation: cardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .card-top-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(124, 58, 237, 0.8) 30%, 
            rgba(6, 182, 212, 0.8) 70%, 
            transparent 100%
          );
          animation: shimmerLine 3s infinite linear;
        }

        @keyframes cardEntrance {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes shimmerLine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .brand-badge-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          margin-bottom: 18px;
          position: relative;
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.4);
          animation: badgeFloat 4s ease-in-out infinite;
        }

        .badge-ring-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 22px;
          border: 2px solid rgba(124, 58, 237, 0.4);
          animation: ringPulse 2.5s infinite ease-out;
        }

        @keyframes badgeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(3deg); }
        }

        @keyframes ringPulse {
          0% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1.25); opacity: 0; }
        }

        :global(.sparkle-icon) {
          width: 26px;
          height: 26px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          animation: sparkleSpin 8s linear infinite;
        }

        @keyframes sparkleSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .login-title {
          font-family: var(--font-heading);
          font-size: 1.7rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
        }

        .shimmer-text {
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 50%, #06B6D4 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textGradientSweep 4s linear infinite;
        }

        @keyframes textGradientSweep {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }

        .login-subtitle {
          font-size: 0.88rem;
          color: #64748B;
          font-weight: 500;
          line-height: 1.4;
        }

        .error-alert {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #E11D48;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .animate-shake {
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-form :global(.form-group) {
          margin-bottom: 0 !important;
        }

        .form-label {
          display: block;
          font-size: 0.96rem;
          font-weight: 750;
          color: #1E293B;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }


        .input-icon-wrap {
          position: relative;
          width: 100%;
          transition: all 0.3s ease;
        }


        :global(.input-icon) {
          position: absolute;
          left: 17px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          pointer-events: none;
          width: 22px;
          height: 22px;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        .input-icon-wrap:focus-within :global(.input-icon),
        .input-icon-wrap.active :global(.input-icon) {
          color: #7C3AED;
          transform: translateY(-50%) scale(1.1);
        }

        .form-input {
          width: 100%;
          height: 54px;
          padding: 14px 48px 14px 52px;
          border-radius: 16px;
          border: 1.5px solid rgba(124, 58, 237, 0.18);
          background: rgba(255, 255, 255, 0.95);
          color: #0F172A;
          font-size: 1.05rem;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }


        .form-input:focus {
          border-color: #7C3AED;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.16), 0 10px 22px -5px rgba(124, 58, 237, 0.12);
        }

        .toggle-pass-btn {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          transition: all 0.2s ease;
        }


        .toggle-pass-btn:hover {
          color: #7C3AED;
          background: rgba(124, 58, 237, 0.08);
        }

        .god-btn {
          width: 100%;
          padding: 15px;
          margin-top: 6px;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 16px;
          background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #2563EB 100%);
          background-size: 200% auto;
          color: #FFFFFF;
          border: none;
          box-shadow: 0 12px 30px -6px rgba(124, 58, 237, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .god-btn:hover:not(:disabled) {
          background-position: 100% center;
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 18px 40px -4px rgba(124, 58, 237, 0.6);
        }

        .god-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        :global(.arrow-icon) {
          transition: transform 0.3s ease;
        }

        .god-btn:hover :global(.arrow-icon) {
          transform: translateX(5px);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .demo-credentials-box {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px dashed rgba(124, 58, 237, 0.2);
        }

        .demo-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 0.78rem;
          font-weight: 800;
          color: #64748B;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        :global(.demo-icon) {
          color: #7C3AED;
        }

        .demo-btn {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(124, 58, 237, 0.06);
          border: 1px solid rgba(124, 58, 237, 0.18);
          color: #7C3AED;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .demo-btn:hover {
          background: rgba(124, 58, 237, 0.14);
          border-color: rgba(124, 58, 237, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.2);
        }

        .demo-btn.filled-success {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.4);
          color: #059669;
        }

        :global(.zap-icon) {
          color: #7C3AED;
          transition: transform 0.3s ease;
        }

        .demo-btn:hover :global(.zap-icon) {
          transform: scale(1.2) rotate(10deg);
        }

        :global(.check-icon) {
          color: #10B981;
        }
      `}</style>
    </main>
  );
}
