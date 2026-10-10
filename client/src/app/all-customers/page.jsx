'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customer.service';
import { apiRequest } from '../../services/api';
import './all-customers.css';
import {
  ShieldAlert,
  Users,
  Search,
  RefreshCw,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  UserCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Flame,
  Snowflake,
  Target,
  Sparkles,
  Hash,
  Key,
  Copy
} from 'lucide-react';

// Mask Phone Number Helper: 5948895484 -> 594•••••84
const maskPhone = (phone) => {
  if (!phone || phone === '-') return '-';
  const str = String(phone).trim();
  if (str.length <= 4) return '••••••••';
  return `${str.slice(0, 3)}•••••${str.slice(-2)}`;
};

// Mask Email Helper: sanmora.techno@gmail.com -> sa••••@gmail.com
const maskEmail = (email) => {
  if (!email || email === '-') return '-';
  const str = String(email).trim();
  const parts = str.split('@');
  if (parts.length < 2) return '••••••••';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.slice(0, 2)}••••` : '••••';
  return `${maskedName}@${domain}`;
};

// Status Badge Config
const getStatusConfig = (statusStr) => {
  const st = String(statusStr || 'cold').toLowerCase();
  if (st.includes('hot')) return { label: 'HOT', cls: 'hot', icon: TrendingUp };
  if (st.includes('warm')) return { label: 'WARM', cls: 'warm', icon: Flame };
  if (st.includes('prospect')) return { label: 'PROSPECT', cls: 'prospect', icon: Target };
  if (st.includes('convert') || st.includes('won') || st.includes('closed')) return { label: 'CONVERTED', cls: 'converted', icon: CheckCircle };
  return { label: 'COLD', cls: 'cold', icon: Snowflake };
};

export default function AllCustomersPage() {
  const router = useRouter();
  const { user, sidebarCollapsed } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [executiveFilter, setExecutiveFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const isSuperAdmin = user?.role?.name === 'Super Admin' || user?.role === 'Super Admin' || user?.email === 'admin@sanmoracrm.com';

  // DATA MASKING STATE (Enterprise Data Leak Prevention)
  const [isDataMasked, setIsDataMasked] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassText, setShowUnlockPassText] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [autoRelockSeconds, setAutoRelockSeconds] = useState(0);

  // ADMIN RANDOM ACCESS PIN FOR "VIEW" ACTION
  const [adminAccessPin, setAdminAccessPin] = useState('849201');
  const [showAdminPinText, setShowAdminPinText] = useState(false);
  const [showViewPinModal, setShowViewPinModal] = useState(false);
  const [targetCustomerForView, setTargetCustomerForView] = useState(null);
  const [enteredViewPin, setEnteredViewPin] = useState('');
  const [viewPinError, setViewPinError] = useState('');

  // Restore or initialize random PIN on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = localStorage.getItem('crm_customer_view_pin');
      if (savedPin && savedPin.length >= 4) {
        setAdminAccessPin(savedPin);
      } else {
        const initialPin = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem('crm_customer_view_pin', initialPin);
        setAdminAccessPin(initialPin);
      }
    }
  }, []);

  const handleGenerateNewPin = () => {
    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    setAdminAccessPin(newPin);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_customer_view_pin', newPin);
    }
    triggerSecurityAlert(`New Customer View Access PIN Generated: ${newPin}`);
  };

  const handleCopyPin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(adminAccessPin);
      triggerSecurityAlert(`Access PIN [${adminAccessPin}] copied to clipboard!`);
    }
  };

  const handleInitiateViewCustomer = (cust) => {
    if (isSuperAdmin) {
      setSelectedCustomer(cust);
      return;
    }
    setTargetCustomerForView(cust);
    setEnteredViewPin('');
    setViewPinError('');
    setShowViewPinModal(true);
  };

  const handleVerifyViewPin = (e) => {
    e.preventDefault();
    if (!enteredViewPin || enteredViewPin.trim().length === 0) {
      setViewPinError('Please enter the access PIN provided by Admin.');
      return;
    }

    if (enteredViewPin.trim() === adminAccessPin.trim()) {
      setShowViewPinModal(false);
      setSelectedCustomer(targetCustomerForView);
      setEnteredViewPin('');
      setViewPinError('');
      triggerSecurityAlert('Access Authorized: Customer record opened.');
    } else {
      setViewPinError('Invalid Access PIN. Please request the current authorization PIN from Admin.');
    }
  };

  // ULTRA SECURITY STATES
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [securityToast, setSecurityToast] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // Show security toast alert
  const triggerSecurityAlert = useCallback((msg) => {
    setSecurityToast(msg);
    setTimeout(() => {
      setSecurityToast(null);
    }, 4000);
  }, []);

  // Auto-Relock Countdown Timer (60s Data Leak Prevention)
  useEffect(() => {
    if (isDataMasked || autoRelockSeconds <= 0) return;

    const timer = setInterval(() => {
      setAutoRelockSeconds((prev) => {
        if (prev <= 1) {
          setIsDataMasked(true);
          triggerSecurityAlert('Security Policy: Sensitive contact info automatically re-masked.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDataMasked, autoRelockSeconds, triggerSecurityAlert]);

  const handleToggleMasking = () => {
    if (!isSuperAdmin) {
      triggerSecurityAlert('Access Denied: Only Super Admin can unlock sensitive customer data.');
      return;
    }

    if (!isDataMasked) {
      setIsDataMasked(true);
      setAutoRelockSeconds(0);
      triggerSecurityAlert('Security Enabled: Sensitive contact info masked.');
      return;
    }

    setShowUnlockModal(true);
    setUnlockPassword('');
    setUnlockError('');
    setShowUnlockPassText(false);
  };

  const handleVerifyUnlock = async (e) => {
    e.preventDefault();
    if (!unlockPassword) {
      setUnlockError('Please enter your Super Admin password.');
      return;
    }

    setUnlockSubmitting(true);
    setUnlockError('');

    try {
      const res = await apiRequest('/auth/login', 'POST', {
        email: user?.email || 'admin@sanmoracrm.com',
        password: unlockPassword
      });

      if (res && res.success) {
        setIsDataMasked(false);
        setShowUnlockModal(false);
        setUnlockPassword('');
        setUnlockError('');
        setAutoRelockSeconds(60);
        triggerSecurityAlert('Super Admin Verified: Confidential contact details unlocked for 60 seconds.');
      } else {
        setUnlockError(res?.message || 'Incorrect Super Admin password. Access denied.');
      }
    } catch (err) {
      setUnlockError(err.message || 'Verification failed. Incorrect Super Admin password.');
    } finally {
      setUnlockSubmitting(false);
    }
  };

  // FETCH ALL UNFILTERED CUSTOMERS
  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerService.getAllCustomersUnfiltered();
      if (res && res.success) {
        setCustomers(res.data || []);
      } else {
        setCustomers(res || []);
      }
    } catch (err) {
      console.error('Error fetching all customers:', err);
      setError('Failed to load full customer directory. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  // ULTRA HARDENED ANTI-SCREENSHOT & FOCUS MONITOR (10ms FAST POLLING)
  useEffect(() => {
    const checkFocus = () => {
      if (!document.hasFocus() || document.visibilityState !== 'visible') {
        setIsWindowBlurred(true);
      }
    };

    const handleBlur = () => {
      setIsWindowBlurred(true);
      setIsDataMasked(true);
      setAutoRelockSeconds(0);
    };

    const handleFocus = () => {
      if (document.hasFocus() && document.visibilityState === 'visible') {
        setIsWindowBlurred(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsWindowBlurred(true);
        setIsDataMasked(true);
        setAutoRelockSeconds(0);
      }
    };

    const handleMouseLeave = () => {
      setIsWindowBlurred(true);
    };

    const handleMouseEnter = () => {
      if (document.hasFocus()) {
        setIsWindowBlurred(false);
      }
    };

    const interval = setInterval(checkFocus, 10);

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      clearInterval(interval);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  // AGGRESSIVE KEYBOARD SHORTCUT & SCREEN CAPTURE INTERCEPTION
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // Catch OS Meta / Windows key press (Snipping Tool trigger)
      if (e.key === 'Meta' || e.key === 'OS' || e.code?.includes('Meta') || e.code?.includes('OS')) {
        setIsWindowBlurred(true);
        triggerSecurityAlert('Security Alert: OS System Key Pressed — Data Hidden.');
      }

      // Catch Win+Shift+S or Cmd+Shift+3/4/5
      if ((isCtrlOrCmd || e.key === 'Meta') && e.shiftKey && ['s', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        setIsWindowBlurred(true);
        triggerSecurityAlert('Security Alert: Screen Capture Shortcut Blocked & Data Hidden.');
        return false;
      }

      // Catch Copy/Cut/Print/Save/Source shortcuts
      if (isCtrlOrCmd && ['c', 'x', 'p', 's', 'u'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert(`Security Policy: Shortcut [Ctrl+${key.toUpperCase()}] is disabled on All Customers page.`);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('SANMORA CRM SECURITY POLICY: CONFIDENTIAL DATA CANNOT BE COPIED.');
        }
        return false;
      }

      // Catch F12 & DevTools shortcuts
      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Security Policy: Developer tools inspection is restricted.');
        return false;
      }

      // Catch PrintScreen Key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setIsWindowBlurred(true);
        triggerSecurityAlert('Security Alert: PrintScreen Key Intercepted — Data Hidden.');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('SANMORA CRM SECURITY POLICY: CONFIDENTIAL DATA CANNOT BE COPIED.');
        }
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [triggerSecurityAlert]);

  // DISABLERS FOR RIGHT-CLICK & COPY
  const handleContextMenu = (e) => {
    e.preventDefault();
    triggerSecurityAlert('Security Alert: Right-click menu disabled.');
  };

  const handleCopyCut = (e) => {
    e.preventDefault();
    triggerSecurityAlert('Security Alert: Copying customer data is prohibited.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('SANMORA CRM SECURITY POLICY: CONFIDENTIAL DATA CANNOT BE COPIED.');
    }
  };

  // UNIQUE EXECUTIVE NAMES FOR FILTER DROPDOWN
  const executiveOptions = useMemo(() => {
    const names = new Set();
    customers.forEach(c => {
      if (c.assignedTo) names.add(c.assignedTo);
      if (c.createdBy) names.add(c.createdBy);
    });
    return Array.from(names).sort();
  }, [customers]);

  // LIVE SEARCH & MULTI-FIELD FILTERING
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (statusFilter !== 'all') {
        const cStatus = String(c.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fStatus = String(statusFilter).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cStatus !== fStatus) return false;
      }

      if (executiveFilter !== 'all') {
        const matchesAssignee = String(c.assignedTo || '').toLowerCase() === executiveFilter.toLowerCase();
        const matchesCreator = String(c.createdBy || '').toLowerCase() === executiveFilter.toLowerCase();
        if (!matchesAssignee && !matchesCreator) return false;
      }

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const searchableText = [
          c.name,
          c.customerName,
          c.company,
          c.companyName,
          c.phone,
          c.mobile,
          c.email,
          c.city,
          c.state,
          c.address,
          c.status,
          c.assignedTo,
          c.createdBy,
          c.inquiryNo,
          c.inquiryNumber,
          c.service,
          c.product
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [customers, searchQuery, statusFilter, executiveFilter]);

  // SUMMARY KPI METRICS
  const kpis = useMemo(() => {
    const total = customers.length;
    let converted = 0;
    let inProgress = 0;
    let newLeads = 0;

    customers.forEach(c => {
      const st = String(c.status || '').toLowerCase();
      if (st.includes('convert') || st.includes('won') || st.includes('closed')) {
        converted++;
      } else if (st.includes('progress') || st.includes('contact') || st.includes('warm')) {
        inProgress++;
      } else {
        newLeads++;
      }
    });

    return { total, converted, inProgress, newLeads };
  }, [customers]);

  // DYNAMIC WATERMARK TEXT
  const userInfoStr = user ? `${user.name || 'User'} (${user.email || 'Authorized Staff'})` : 'SANMORA AUTHORIZED USER';
  const watermarkText = `SANMORA CRM • CONFIDENTIAL • ACCESSED BY: ${userInfoStr} • ${currentTime}`;

  return (
    <div className="crm-layout">
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar />

      {/* 2. HEADER BAR */}
      <Header title="All Customers Directory" />

      {/* 3. MAIN CONTENT WRAPPER */}
      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div
          className={`all-customers-container ${isWindowBlurred ? 'blur-active' : ''}`}
          onContextMenu={handleContextMenu}
          onCopy={handleCopyCut}
          onCut={handleCopyCut}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* SECURITY WATERMARK OVERLAY */}
          <div className="security-watermark-overlay" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="watermark-item">
                {watermarkText}
              </div>
            ))}
          </div>

          {/* OPAQUE WINDOW BLUR SECURITY SHIELD */}
          {isWindowBlurred && (
            <div className="window-blur-shield">
              <div className="blur-shield-card">
                <div className="blur-shield-icon">
                  <Lock size={38} />
                </div>
                <div className="blur-shield-title">🔒 Data Shield Active</div>
                <div className="blur-shield-desc">
                  Customer directory is completely hidden while the browser window is out of focus or screen capture is triggered. Click back inside this window to view data.
                </div>
                <div className="blur-shield-badge">
                  <ShieldAlert size={16} />
                  CONFIDENTIAL DATA SHIELD ACTIVE
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TOAST ALERT */}
          {securityToast && (
            <div className="security-toast-alert">
              <AlertTriangle size={20} />
              <span>{securityToast}</span>
            </div>
          )}

          {/* MAIN DATA SECTION */}
          <div className="ac-main-content-area">
            {/* 1. HERO ACTION BANNER (MATCHING CUSTOMERS.CSS) */}
            <div className="ac-header-card">
              <div className="ac-hdr-left">
                <div className="ac-hdr-icon">
                  <Users size={26} />
                </div>
                <div>
                  <div className="ac-hdr-badge-row">
                    <span className="ac-badge-sec">
                      <ShieldCheck size={12} /> HIGH SECURITY ACCELERATED VIEW
                    </span>
                    <span className="ac-count-pill">{customers.length} Accounts Registered</span>
                  </div>
                  <h2 className="ac-hdr-title">All Customers Directory</h2>
                  <p className="ac-hdr-sub">Complete organization-wide customer database across all team members and departments.</p>
                </div>
              </div>

              <div className="ac-hdr-actions">
                <Link href="/customers" className="ac-back-btn">
                  <ArrowLeft size={16} /> Back to Customer Directory
                </Link>
                <button className="ac-btn-refresh" onClick={fetchAllCustomers} disabled={loading}>
                  <RefreshCw size={15} className={loading ? 'spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh Records'}
                </button>
              </div>
            </div>

            {/* 2. METRICS CARDS GRID */}
            <div className="ac-metrics-grid" style={{ marginTop: '20px' }}>
              <div className="ac-stat-card">
                <div className="ac-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
                  <Users size={24} />
                </div>
                <div className="ac-stat-info">
                  <h4>{kpis.total}</h4>
                  <p>Total Customers</p>
                </div>
              </div>

              <div className="ac-stat-card">
                <div className="ac-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                  <CheckCircle size={24} />
                </div>
                <div className="ac-stat-info">
                  <h4>{kpis.converted}</h4>
                  <p>Converted / Deals</p>
                </div>
              </div>

              <div className="ac-stat-card">
                <div className="ac-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
                  <Clock size={24} />
                </div>
                <div className="ac-stat-info">
                  <h4>{kpis.inProgress}</h4>
                  <p>In Progress / Active</p>
                </div>
              </div>

              <div className="ac-stat-card">
                <div className="ac-stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>
                  <UserCheck size={24} />
                </div>
                <div className="ac-stat-info">
                  <h4>{kpis.newLeads}</h4>
                  <p>New / Enquiries</p>
                </div>
              </div>
            </div>

            {/* 3. TOOLBAR & DATA MASKING CONTROLS */}
            <div className="ac-control-bar" style={{ marginTop: '20px' }}>
              <div className="ac-search-box">
                <Search size={18} />
                <input
                  type="text"
                  className="ac-search-input"
                  placeholder="Search by customer name, phone, email, company, location, assigned to..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="ac-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="ac-filters-row">
                {/* DATA MASKING TOGGLE BUTTON */}
                {!isSuperAdmin ? (
                  <div
                    className="ac-mask-toggle-btn masked"
                    style={{
                      cursor: 'not-allowed',
                      opacity: 0.9,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      userSelect: 'none'
                    }}
                    title="Sensitive customer data is strictly protected under enterprise privacy policy"
                  >
                    <Lock size={15} /> Sensitive Info Masked (Always Protected)
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`ac-mask-toggle-btn ${isDataMasked ? 'masked' : 'unmasked'}`}
                    onClick={handleToggleMasking}
                    title={isDataMasked ? 'Super Admin: Click to verify master password and unlock' : 'Click to lock and re-mask immediately'}
                  >
                    {isDataMasked ? (
                      <>
                        <Lock size={15} /> Sensitive Info Masked (Unlock)
                      </>
                    ) : (
                      <>
                        <Eye size={15} /> Sensitive Info Unmasked ({autoRelockSeconds}s)
                      </>
                    )}
                  </button>
                )}

                <select
                  className="ac-select-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="prospect">Prospect</option>
                  <option value="cold">Cold</option>
                  <option value="converted">Converted</option>
                </select>

                <select
                  className="ac-select-filter"
                  value={executiveFilter}
                  onChange={(e) => setExecutiveFilter(e.target.value)}
                >
                  <option value="all">All Executives</option>
                  {executiveOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                {/* ADMIN DYNAMIC ACCESS PIN GENERATOR & CONTROLLER (Super Admin Exclusive) */}
                {isSuperAdmin && (
                  <div
                    className="ac-admin-pin-bar"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#4F46E5',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Key size={14} style={{ color: '#6366F1' }} />
                    <span style={{ color: '#6366F1' }}>View PIN:</span>
                    <strong style={{ fontFamily: 'monospace', letterSpacing: '1.5px', fontSize: '0.92rem', color: '#1E1B4B' }}>
                      {showAdminPinText ? adminAccessPin : '••••••'}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowAdminPinText(!showAdminPinText)}
                      title={showAdminPinText ? "Hide PIN" : "Reveal PIN"}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6366F1', display: 'flex', alignItems: 'center' }}
                    >
                      {showAdminPinText ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPin}
                      title="Copy PIN to clipboard"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6366F1', display: 'flex', alignItems: 'center' }}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateNewPin}
                      title="Generate a new random PIN"
                      style={{
                        background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                        border: 'none',
                        color: '#FFF',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                        marginLeft: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Generate New PIN
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '14px 20px', borderRadius: '12px', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* 4. PRO-LEVEL SECURE TABLE */}
            <div className="ac-table-card" style={{ marginTop: '20px' }}>
              <div className="ac-table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer / Company</th>
                      <th>Contact Info</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Assigned Executive</th>
                      <th>Created By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '48px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#94A3B8' }}>
                            <RefreshCw size={26} className="spin" />
                            <span>Loading organization-wide customer database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="9">
                          <div className="ac-empty-state">
                            <FileText size={42} />
                            <h3>No Customer Records Found</h3>
                            <p>Try adjusting your search criteria or filter options.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust, idx) => {
                        const name = cust.name || cust.customerName || 'Unnamed Customer';
                        const company = cust.company || cust.companyName || '-';
                        const rawPhone = cust.phone || cust.mobile || '-';
                        const rawEmail = cust.email || '-';

                        // Display masked or unmasked contact data
                        const displayPhone = isDataMasked ? maskPhone(rawPhone) : rawPhone;
                        const displayEmail = isDataMasked ? maskEmail(rawEmail) : rawEmail;

                        const location = [cust.city, cust.state].filter(Boolean).join(', ') || cust.address || '-';
                        const statusCfg = getStatusConfig(cust.status);
                        const StatusIcon = statusCfg.icon;
                        const dateStr = cust.createdAt ? new Date(cust.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

                        const getInitials = (n) => {
                          if (!n) return 'CU';
                          const p = n.trim().split(' ');
                          if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
                          return n.slice(0, 2).toUpperCase();
                        };

                        return (
                          <tr key={cust.id || cust._id || idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <div className="ac-cust-info">
                                <div className="ac-avatar-circle">
                                  {getInitials(name)}
                                </div>
                                <div className="ac-cust-names">
                                  <span className="ac-name-primary">{name}</span>
                                  {company !== '-' && <span className="ac-company-sub">{company}</span>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.82rem' }}>
                                <span>
                                  <Phone size={12} style={{ display: 'inline', marginRight: '6px', color: '#94A3B8' }} />
                                  {isDataMasked ? (
                                    <span className="masked-data-pill"><Lock size={10} /> {displayPhone}</span>
                                  ) : (
                                    <span className="unmasked-data-text">{displayPhone}</span>
                                  )}
                                </span>
                                {rawEmail !== '-' && (
                                  <span style={{ color: '#94A3B8' }}>
                                    <Mail size={12} style={{ display: 'inline', marginRight: '6px' }} />
                                    {isDataMasked ? (
                                      <span className="masked-data-pill"><Lock size={10} /> {displayEmail}</span>
                                    ) : (
                                      <span className="unmasked-data-text">{displayEmail}</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                                <MapPin size={12} style={{ display: 'inline', marginRight: '6px', color: '#94A3B8' }} />
                                {location}
                              </span>
                            </td>
                            <td>
                              <span className={`ac-status-badge ${statusCfg.cls}`}>
                                <StatusIcon size={11} />
                                {statusCfg.label}
                              </span>
                            </td>
                            <td>
                              <div className="ac-assignee-box">
                                <div className="ac-assignee-initial">
                                  {(cust.assignedTo || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span>{cust.assignedTo || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                                {cust.createdBy || 'System'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                                {dateStr}
                              </span>
                            </td>
                            <td>
                              <button
                                className="ac-action-btn"
                                onClick={() => handleInitiateViewCustomer(cust)}
                                title={isSuperAdmin ? "View customer details" : "View confidential record (Requires Admin PIN)"}
                              >
                                <Eye size={13} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CUSTOMER DETAIL MODAL */}
          {selectedCustomer && (
            <div className="ac-modal-overlay" onClick={() => setSelectedCustomer(null)}>
              <div className="ac-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="ac-modal-header">
                  <h3>Customer Confidential Details</h3>
                  <button className="ac-modal-close" onClick={() => setSelectedCustomer(null)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="ac-modal-grid">
                  <div className="ac-modal-item">
                    <label>Customer Name</label>
                    <span>{selectedCustomer.name || selectedCustomer.customerName || '-'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Company / Business</label>
                    <span>{selectedCustomer.company || selectedCustomer.companyName || '-'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Phone Number</label>
                    <span style={{ fontFamily: isDataMasked ? 'monospace' : 'inherit', letterSpacing: isDataMasked ? '1px' : 'normal' }}>
                      {isDataMasked
                        ? maskPhone(selectedCustomer.phone || selectedCustomer.mobile)
                        : (selectedCustomer.phone || selectedCustomer.mobile || '-')}
                    </span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Email Address</label>
                    <span style={{ fontFamily: isDataMasked ? 'monospace' : 'inherit' }}>
                      {isDataMasked
                        ? maskEmail(selectedCustomer.email)
                        : (selectedCustomer.email || '-')}
                    </span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Status</label>
                    <span>{selectedCustomer.status || 'New'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Service / Product</label>
                    <span>{selectedCustomer.service || selectedCustomer.product || '-'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Assigned Executive</label>
                    <span>{selectedCustomer.assignedTo || 'Unassigned'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Created By</label>
                    <span>{selectedCustomer.createdBy || 'Staff'}</span>
                  </div>

                  <div className="ac-modal-item" style={{ gridColumn: 'span 2' }}>
                    <label>Address / Location</label>
                    <span>{[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ') || '-'}</span>
                  </div>

                  {selectedCustomer.notes && (
                    <div className="ac-modal-item" style={{ gridColumn: 'span 2' }}>
                      <label>Notes / Remarks</label>
                      <span>{selectedCustomer.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN SECURITY VERIFICATION MODAL */}
          {showUnlockModal && (
            <div className="ac-modal-overlay" onClick={() => setShowUnlockModal(false)}>
              <div
                className="ac-modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '440px', padding: '26px', borderRadius: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#EF4444'
                    }}>
                      <Lock size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#0F172A' }}>
                        Security Verification
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                        Super Admin Master Authentication
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUnlockModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
                  Sensitive customer contact details are protected under corporate privacy policy. Please enter your <strong>Super Admin master password</strong> to unlock contact info for 60 seconds.
                </p>

                <form onSubmit={handleVerifyUnlock}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Master Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showUnlockPassText ? 'text' : 'password'}
                        required
                        autoFocus
                        value={unlockPassword}
                        onChange={(e) => {
                          setUnlockPassword(e.target.value);
                          setUnlockError('');
                        }}
                        placeholder="Enter Super Admin password"
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 14px',
                          borderRadius: '10px',
                          border: unlockError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                          fontSize: '0.9rem',
                          outline: 'none',
                          background: '#F8FAFC',
                          color: '#0F172A'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPassText(!showUnlockPassText)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        {showUnlockPassText ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {unlockError && (
                      <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '6px', marginBottom: 0 }}>
                        {unlockError}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnlockModal(false)}
                      disabled={unlockSubmitting}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={unlockSubmitting}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: unlockSubmitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {unlockSubmitting ? <RefreshCw size={14} className="spin" /> : <Lock size={14} />}
                      {unlockSubmitting ? 'Verifying...' : 'Verify & Unlock (60s)'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CUSTOMER VIEW ACCESS PIN MODAL (Protected Customer View) */}
          {showViewPinModal && (
            <div
              className="ac-modal-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '20px'
              }}
              onClick={() => {
                setShowViewPinModal(false);
                setEnteredViewPin('');
                setViewPinError('');
              }}
            >
              <div
                className="ac-modal-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '440px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '10px' }}>
                      <Key size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                        Customer Record Protected
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85, color: '#E0E7FF' }}>
                        Authorization Required to View Details
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewPinModal(false);
                      setEnteredViewPin('');
                      setViewPinError('');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleVerifyViewPin} style={{ padding: '24px' }}>
                  {targetCustomerForView && (
                    <div
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        marginBottom: '18px'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Requested Customer Record
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        {targetCustomerForView.customerName || targetCustomerForView.name || 'Customer Record'}
                      </div>
                      {(targetCustomerForView.companyName || targetCustomerForView.company) && (
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                          Company: {targetCustomerForView.companyName || targetCustomerForView.company}
                        </div>
                      )}
                    </div>
                  )}

                  <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                    Viewing customer confidential information requires the single-use authorization PIN generated by your Administrator.
                  </p>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Enter Admin Authorization PIN
                    </label>
                    <input
                      type="text"
                      autoFocus
                      maxLength={10}
                      value={enteredViewPin}
                      onChange={(e) => {
                        setEnteredViewPin(e.target.value.replace(/\s+/g, ''));
                        if (viewPinError) setViewPinError('');
                      }}
                      placeholder="e.g. 849201"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: viewPinError ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        letterSpacing: '3px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        outline: 'none',
                        color: '#1E1B4B',
                        backgroundColor: '#F8FAFC',
                        boxSizing: 'border-box'
                      }}
                    />
                    {viewPinError && (
                      <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '6px', marginBottom: 0, fontWeight: 500 }}>
                        {viewPinError}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowViewPinModal(false);
                        setEnteredViewPin('');
                        setViewPinError('');
                      }}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '9px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <Key size={14} />
                      Verify & View Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
