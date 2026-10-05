'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import PhoneDetectionGuard from '../../components/common/PhoneDetectionGuard';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customer.service';
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
  Hash
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

  // DATA MASKING STATE (Enterprise Data Leak Prevention)
  const [isDataMasked, setIsDataMasked] = useState(true);

  // ULTRA SECURITY STATES
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [securityToast, setSecurityToast] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // Live clock for security watermark
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show security toast alert
  const triggerSecurityAlert = useCallback((msg) => {
    setSecurityToast(msg);
    setTimeout(() => {
      setSecurityToast(null);
    }, 4000);
  }, []);

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
    };

    const handleFocus = () => {
      if (document.hasFocus() && document.visibilityState === 'visible') {
        setIsWindowBlurred(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsWindowBlurred(true);
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
        {/* 🛡️ AI REAL-TIME MOBILE CAMERA DETECTION GUARD */}
        <PhoneDetectionGuard pageName="All Customers Directory" />

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
                <button
                  className={`ac-mask-toggle-btn ${isDataMasked ? 'masked' : 'unmasked'}`}
                  onClick={() => {
                    setIsDataMasked(!isDataMasked);
                    triggerSecurityAlert(isDataMasked ? 'Warning: Sensitive contact info unmasked.' : 'Security Enabled: Sensitive contact info masked.');
                  }}
                  title={isDataMasked ? 'Click to unmask contact details' : 'Click to mask contact details'}
                >
                  {isDataMasked ? (
                    <>
                      <Lock size={15} /> Sensitive Info Masked (Protected)
                    </>
                  ) : (
                    <>
                      <Eye size={15} /> Sensitive Info Unmasked
                    </>
                  )}
                </button>

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
              <div style={{ width: '100%', overflowX: 'auto' }}>
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
                                onClick={() => setSelectedCustomer(cust)}
                                title="View details"
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
                    <span>{selectedCustomer.phone || selectedCustomer.mobile || '-'}</span>
                  </div>

                  <div className="ac-modal-item">
                    <label>Email Address</label>
                    <span>{selectedCustomer.email || '-'}</span>
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
        </div>
      </main>
    </div>
  );
}
