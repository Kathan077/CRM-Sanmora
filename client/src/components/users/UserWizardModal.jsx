'use client';

import React, { useState, useEffect } from 'react';
import SelectWithOther from '../common/SelectWithOther';
import { isAdminUser } from '../../utils/crmStore';
import './UserWizardModal.css';
import {
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  LayoutDashboard,
  Users,
  PhoneCall,
  CheckSquare,
  Wallet,
  UserCheck,
  Settings,
  Sparkles,
  CheckCircle,
  PlusCircle,
  Edit,
  Trash2,
  Zap,
  Lock,
  User,
  Mail,
  Building2,
  Shield,
  Activity,
  Megaphone
} from 'lucide-react';

const MODULES_CATALOG = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    subtitle: 'Command center & sales metrics',
    icon: LayoutDashboard,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)'
  },
  {
    id: 'customers',
    name: 'Customer Directory',
    subtitle: 'Profiles, contacts & history',
    icon: Users,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)'
  },
  {
    id: 'all_customers',
    name: 'All Customers Confidential',
    subtitle: 'Master confidential directory',
    icon: ShieldCheck,
    color: '#0284C7',
    bg: 'rgba(2, 132, 199, 0.1)'
  },
  {
    id: 'followups',
    name: 'Customer Follow-Ups',
    subtitle: 'Sales pipeline & tracking',
    icon: PhoneCall,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)'
  },
  {
    id: 'tasks',
    name: 'To-Do & Tasks',
    subtitle: 'Daily checklists & team to-dos',
    icon: CheckSquare,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)'
  },
  {
    id: 'ledger',
    name: 'Customer Ledger',
    subtitle: 'Financial transactions & balances',
    icon: Wallet,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)'
  },
  {
    id: 'activity_logs',
    name: 'Team Activity Logs',
    subtitle: 'Activity logs, leaderboard & calendar',
    icon: Activity,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)'
  },
  {
    id: 'announcements',
    name: 'Announcements & News',
    subtitle: 'Company-wide broadcasts',
    icon: Megaphone,
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.1)'
  },
  {
    id: 'users',
    name: 'User Management',
    subtitle: 'Employee profiles & staff',
    icon: UserCheck,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.1)'
  },
  {
    id: 'roles',
    name: 'Roles & Privileges',
    subtitle: 'Granular permission matrix',
    icon: Key,
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.1)'
  },
  {
    id: 'settings',
    name: 'System Settings',
    subtitle: 'System configuration',
    icon: Settings,
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.1)'
  }
];

const ACTIONS = ['view', 'add', 'edit', 'delete'];

const ACTION_CONFIG = {
  view:   { label: 'VIEW',   icon: Eye,        color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', gradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', shadow: 'rgba(2, 132, 199, 0.35)' },
  add:    { label: 'ADD',    icon: PlusCircle, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', shadow: 'rgba(5, 150, 105, 0.35)' },
  edit:   { label: 'EDIT',   icon: Edit,       color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', shadow: 'rgba(99, 102, 241, 0.35)' },
  delete: { label: 'DELETE', icon: Trash2,     color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3', gradient: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', shadow: 'rgba(225, 29, 72, 0.35)' }
};

const LEGACY_KEY_MAP = {
  'leads:view_all': 'customers:view',
  'leads:view_assigned': 'customers:view',
  'leads:create': 'customers:add',
  'leads:update': 'customers:edit',
  'leads:delete': 'customers:delete',
  'leads:assign': 'customers:edit',
  'leads:change_status': 'customers:edit',
  'followups:create': 'followups:add',
  'followups:update': 'followups:edit',
  'users:create': 'users:add',
  'users:update': 'users:edit',
  'users:toggle_status': 'users:edit',
  'reports:view': 'dashboard:view',
  'settings:manage': 'settings:edit'
};

const normalizePermissionKey = (key) => LEGACY_KEY_MAP[key] || key;

export default function UserWizardModal({
  isOpen,
  onClose,
  onSubmit,
  roles = [],
  users = [],
  editingUser = null,
  submitting = false,
  currentUser = null
}) {
  const isNonAdmin = currentUser && !isAdminUser(currentUser);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('Sales & Business Development');
  const [roleId, setRoleId] = useState('');
  const [reportingTo, setReportingTo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [matrix, setMatrix] = useState({});

  const totalKeys = MODULES_CATALOG.length * ACTIONS.length;
  const activeCount = Object.values(matrix).filter(Boolean).length;
  const activePct = Math.round((activeCount / (totalKeys || 1)) * 100);

  const getRoleIdString = (roleInput) => {
    if (!roleInput) return '';
    if (typeof roleInput === 'string') return roleInput;
    if (typeof roleInput === 'object') return roleInput._id || roleInput.id || roleInput.name || '';
    return String(roleInput);
  };

  const populateMatrixFromRole = (targetRoleInput, customUserPerms = null, deniedUserPerms = null) => {
    const targetIdStr = getRoleIdString(targetRoleInput);
    const selectedRole = roles.find((r) => {
      const rId = String(r._id || r.id || '');
      return rId === targetIdStr || r.name === targetIdStr || (targetRoleInput && typeof targetRoleInput === 'object' && r.name === targetRoleInput.name);
    });

    const rolePerms = (selectedRole?.permissions || []).map(normalizePermissionKey);
    const isSuperAdmin = selectedRole?.name === 'Super Admin';
    const normCustom = (customUserPerms || []).map(normalizePermissionKey);
    const normDenied = (deniedUserPerms || []).map(normalizePermissionKey);

    const newMatrix = {};
    MODULES_CATALOG.forEach((mod) => {
      ACTIONS.forEach((act) => {
        const key = `${mod.id}:${act}`;
        if (isSuperAdmin) {
          newMatrix[key] = true;
        } else if (normDenied.includes(key)) {
          // Explicitly unselected / revoked from the role for this user
          newMatrix[key] = false;
        } else {
          // Granted if in base role OR granted as extra permission
          newMatrix[key] = rolePerms.includes(key) || normCustom.includes(key);
        }
      });
    });
    setMatrix(newMatrix);
  };

  const handleRoleSelectChange = (newRoleId) => {
    setRoleId(newRoleId);
    populateMatrixFromRole(newRoleId);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep(1);
      setShowPassword(false);

      const defaultRole = roles.find(r => r.name === 'Sales Executive') ||
                          roles.find(r => r.name !== 'Super Admin') ||
                          roles[0];
      const targetRoleInput = editingUser?.role || defaultRole;
      const targetRoleId = getRoleIdString(targetRoleInput);

      setRoleId(targetRoleId);

      if (editingUser) {
        setUsername(editingUser.email || '');
        setEmail(editingUser.email || '');
        setPassword('');
        setDisplayName(editingUser.name || '');
        setDepartment(editingUser.department || 'Sales & Business Development');
        setReportingTo(editingUser.reportingTo?._id || editingUser.reportingTo || '');
        setIsActive(editingUser.isActive !== undefined ? editingUser.isActive : true);

        const customPerms = Array.isArray(editingUser.customPermissions)
          ? editingUser.customPermissions
          : [];
        const deniedPerms = Array.isArray(editingUser.deniedPermissions)
          ? editingUser.deniedPermissions
          : [];

        populateMatrixFromRole(targetRoleInput, customPerms, deniedPerms);
      } else {
        setUsername('');
        setEmail('');
        setPassword('');
        setDisplayName('');
        setDepartment('Sales & Business Development');
        setReportingTo('');
        setIsActive(true);

        populateMatrixFromRole(targetRoleInput);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, editingUser?._id, roles]);

  if (!isOpen) return null;

  const handleAutoGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleToggleMatrixKey = (modId, act) => {
    const key = `${modId}:${act}`;
    setMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleColumnAll = (act) => {
    const allChecked = MODULES_CATALOG.every((mod) => matrix[`${mod.id}:${act}`]);
    const updated = { ...matrix };
    MODULES_CATALOG.forEach((mod) => {
      updated[`${mod.id}:${act}`] = !allChecked;
    });
    setMatrix(updated);
  };

  const handleGrantAllAccess = () => {
    const updated = { ...matrix };
    MODULES_CATALOG.forEach(mod => {
      ACTIONS.forEach(act => { updated[`${mod.id}:${act}`] = true; });
    });
    setMatrix(updated);
  };

  const handleReadOnlyAccess = () => {
    const updated = { ...matrix };
    MODULES_CATALOG.forEach(mod => {
      ACTIONS.forEach(act => { updated[`${mod.id}:${act}`] = (act === 'view'); });
    });
    setMatrix(updated);
  };

  const handleClearAllAccess = () => {
    const updated = { ...matrix };
    MODULES_CATALOG.forEach(mod => {
      ACTIONS.forEach(act => { updated[`${mod.id}:${act}`] = false; });
    });
    setMatrix(updated);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!displayName || !username || (!editingUser && !password)) {
      alert('Please fill all required identity & credential fields.');
      return;
    }
    setStep(2);
  };

  const handleFormSubmit = () => {
    const selectedPerms = Object.keys(matrix).filter((key) => matrix[key]);
    const unselectedPerms = Object.keys(matrix).filter((key) => !matrix[key]);

    // Find selected role's base permissions
    const selectedRoleObj = roles.find((r) => String(r._id || r.id) === String(roleId) || r.name === roleId);
    const rolePerms = (selectedRoleObj?.permissions || []).map(normalizePermissionKey);
    const isSuperAdmin = selectedRoleObj?.name === 'Super Admin';

    // Extra permissions = selected by admin, but NOT in base role ("kuch jyada")
    let extraUserPerms = [];
    // Denied permissions = UNSELECTED by admin, but WAS in base role ("kuch kam")
    let deniedUserPerms = [];

    if (!isSuperAdmin && selectedRoleObj) {
      extraUserPerms = selectedPerms.filter((p) => !rolePerms.includes(p));
      deniedUserPerms = unselectedPerms.filter((p) => rolePerms.includes(p));
    } else if (!selectedRoleObj) {
      extraUserPerms = selectedPerms;
    }

    const resolvedEmail = (username.includes('@') ? username : email || `${username}@sanmora.com`).trim().toLowerCase();
    const payload = {
      name: displayName.trim(),
      email: resolvedEmail,
      roleId: roleId || (roles[0]?._id || ''),
      department: department?.trim() || 'Sales',
      designation: department?.trim() || 'Executive',
      reportingTo: reportingTo || null,
      isActive,
      customPermissions: extraUserPerms,
      deniedPermissions: deniedUserPerms
    };
    if (password) payload.password = password.trim();
    onSubmit(payload);
  };

  return (
    <div className="wz-backdrop">
      <div className="wz-card">

        {/* ── TOP RAINBOW ACCENT ── */}
        <div className="wz-rainbow-bar" />

        {/* ── HEADER NAV ── */}
        <div className="wz-header">
          <div className="wz-header-left">
            <div className="wz-brand-icon">
              <UserPlus size={20} />
            </div>
            <div>
              <div className="wz-title">{editingUser ? 'Edit User Account' : 'Create New User'}</div>
              <div className="wz-subtitle">Sanmora CRM — User Wizard</div>
            </div>
          </div>

          <div className="wz-step-tabs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`wz-step-btn ${step === 1 ? 'wz-step-active' : ''}`}
            >
              <UserPlus size={14} />
              <span>Account Details</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`wz-step-btn ${step === 2 ? 'wz-step-active' : ''}`}
            >
              <ShieldCheck size={14} />
              <span>Permissions</span>
            </button>
          </div>

          <div className="wz-header-right">
            <span className="wz-step-pill">Step {step} / 2</span>
            <button type="button" onClick={onClose} className="wz-close-btn" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="wz-progress-track">
          <div className="wz-progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>

        {/* ══════════════ STEP 1 ══════════════ */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="wz-body">

            {/* Section Header */}
            <div className="wz-section-header">
              <div className="wz-section-icon">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="wz-section-title">Employee Identity & Authentication</div>
                <div className="wz-section-desc">Enter employee credentials, account status, and system role</div>
              </div>
            </div>

            {/* Row 1: Name + Username */}
            <div className="wz-grid-2">
              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">Full Display Name <span className="wz-required">*</span></label>
                </div>
                <div className="wz-input-wrap">
                  <User size={15} className="wz-input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full employee name"
                    value={displayName}
                    disabled={isNonAdmin}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="wz-input"
                  />
                </div>
              </div>

              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">Login Username / Email <span className="wz-required">*</span></label>
                </div>
                <div className="wz-input-wrap">
                  <Mail size={15} className="wz-input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. kathan@sanmoracrm.com"
                    value={username}
                    disabled={isNonAdmin}
                    onChange={(e) => setUsername(e.target.value)}
                    className="wz-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Password + Department */}
            <div className="wz-grid-2">
              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">
                    Login Password {editingUser ? <span className="wz-optional">(Optional)</span> : <span className="wz-required">*</span>}
                  </label>
                  <button type="button" onClick={handleAutoGeneratePassword} className="wz-autogen-btn">
                    <Key size={11} /> Auto-Generate
                  </button>
                </div>
                <div className="wz-input-wrap">
                  <Lock size={15} className="wz-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep existing' : 'Enter secure password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="wz-input wz-input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="wz-eye-btn"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">Department / Division <span className="wz-required">*</span></label>
                </div>
                <div className="wz-input-wrap">
                  <Building2 size={15} className="wz-input-icon" />
                  <SelectWithOther
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isNonAdmin}
                    inputClassName="wz-input wz-select"
                    name="department"
                  >
                    <option value="Sales & Business Development">Sales & Business Development</option>
                    <option value="Customer Support & Accounts">Customer Support & Accounts</option>
                    <option value="Operations & Logistics">Operations & Logistics</option>
                    <option value="Executive Management">Executive Management</option>
                  </SelectWithOther>
                </div>
              </div>
            </div>

            {/* Row 2.5: System Access Role + Reporting Manager */}
            <div className="wz-grid-2" style={{ marginTop: '12px' }}>
              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">System Access Role <span className="wz-required">*</span></label>
                </div>
                <div className="wz-input-wrap">
                  <ShieldCheck size={15} className="wz-input-icon" />
                  <select
                    value={roleId}
                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                    disabled={isNonAdmin}
                    className="wz-input wz-select"
                    required
                  >
                    {roles.map((r, idx) => (
                      <option key={r._id || r.id || r.name || `role-wiz-${idx}`} value={r._id || r.id || r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="wz-field">
                <div className="wz-label-row">
                  <label className="wz-label">
                    Reporting Manager / Parent User
                  </label>
                </div>
                <div className="wz-input-wrap">
                  <UserCheck size={15} className="wz-input-icon" />
                  <select
                    value={reportingTo}
                    onChange={(e) => setReportingTo(e.target.value)}
                    disabled={isNonAdmin}
                    className="wz-input wz-select"
                  >
                    <option value="">-- No Manager (Independent) --</option>
                    {users
                      .filter((u) => String(u._id || u.id) !== String(editingUser?._id || editingUser?.id))
                      .filter((u) => {
                        const rName = String(u.role?.name || u.roleName || u.role || '').toLowerCase();
                        return !rName.includes('admin');
                      })
                      .map((u, idx) => (
                        <option key={u._id || u.id || u.email || `mgr-opt-${idx}`} value={u._id || u.id}>
                          {u.name} ({u.role?.name || u.department || 'Staff'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 3: Status Toggle */}
            <div className="wz-field">
              <div className="wz-label-row">
                <label className="wz-label">Account Access Status</label>
              </div>
              <div className={`wz-status-card ${isActive ? 'wz-status-active' : 'wz-status-inactive'}`}>
                <div className="wz-status-info">
                  <span className={`wz-status-badge ${isActive ? 'wz-badge-active' : 'wz-badge-inactive'}`}>
                    {isActive ? 'Active' : 'Disabled'}
                  </span>
                  <div>
                    <span className="wz-status-title">
                      {isActive ? 'Account Active' : 'Account Deactivated'}
                    </span>
                    <span className="wz-status-desc">
                      {isActive ? 'User can authenticate & access CRM' : 'User authentication blocked'}
                    </span>
                  </div>
                </div>
                <label className="wz-toggle">
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={isNonAdmin}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="wz-toggle-slider" />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="wz-footer">
              <button type="button" onClick={onClose} className="wz-btn-ghost">
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button type="submit" className="wz-btn-primary">
                <span>Proceed to Permissions</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ══════════════ STEP 2 ══════════════ */}
        {step === 2 && (
          <div className="wz-body">

            {/* Section Header */}
            <div className="wz-section-header">
              <div className="wz-section-icon wz-section-icon-shield">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="wz-section-title">Module Permission Matrix</div>
                <div className="wz-section-desc">Configure granular access rights for each CRM module</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="wz-toolbar">
              <div className="wz-toolbar-left">
                <span className="wz-toolbar-label">Quick Presets:</span>
                <button type="button" disabled={isNonAdmin} onClick={handleGrantAllAccess} className="wz-preset-btn wz-preset-grant">
                  <Zap size={12} /> Full Access
                </button>
                <button type="button" disabled={isNonAdmin} onClick={handleReadOnlyAccess} className="wz-preset-btn wz-preset-readonly">
                  <Eye size={12} /> Read-Only
                </button>
                <button type="button" disabled={isNonAdmin} onClick={() => populateMatrixFromRole(roleId)} className="wz-preset-btn wz-preset-role" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                  <ShieldCheck size={12} /> Revert to Role
                </button>
                <button type="button" disabled={isNonAdmin} onClick={handleClearAllAccess} className="wz-preset-btn wz-preset-clear">
                  <Lock size={12} /> Revoke All
                </button>
              </div>
              <div className="wz-stat-pill">
                <span className="wz-stat-num">{activeCount}</span>
                <span className="wz-stat-sep">/</span>
                <span className="wz-stat-total">{totalKeys}</span>
                <span className="wz-stat-label">active ({activePct}%)</span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="wz-matrix-wrap">
              <table className="wz-matrix-table">
                <thead>
                  <tr>
                    <th className="wz-th-module">
                      <div className="wz-th-label">
                        <Key size={13} /> Module
                      </div>
                    </th>
                    {ACTIONS.map((act) => {
                      const cfg = ACTION_CONFIG[act];
                      const ActIcon = cfg.icon;
                      const allColChecked = MODULES_CATALOG.every((mod) => matrix[`${mod.id}:${act}`]);
                      const activeColCount = MODULES_CATALOG.filter((mod) => matrix[`${mod.id}:${act}`]).length;

                      return (
                        <th key={act} className="wz-th-action">
                          <div
                            className={`wz-act-header ${allColChecked ? 'wz-act-complete' : ''}`}
                            style={{
                              '--act-color': cfg.color,
                              '--act-bg': cfg.bg,
                              '--act-border': cfg.border,
                              '--act-gradient': cfg.gradient,
                              '--act-shadow': cfg.shadow
                            }}
                          >
                            <div className="wz-act-top">
                              <div className="wz-act-name-row">
                                <ActIcon size={13} style={{ color: cfg.color }} />
                                <span className="wz-act-name" style={{ color: cfg.color }}>{cfg.label}</span>
                              </div>
                              <span className="wz-act-count" style={{ color: cfg.color, borderColor: cfg.border }}>
                                {activeColCount}/{MODULES_CATALOG.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={isNonAdmin}
                              onClick={() => !isNonAdmin && handleToggleColumnAll(act)}
                              className={`wz-col-toggle ${allColChecked ? 'wz-col-checked' : ''}`}
                              title={`Toggle all ${cfg.label} permissions`}
                            >
                              {allColChecked ? (
                                <><CheckCircle size={11} /><span>All On</span></>
                              ) : (
                                <><Sparkles size={11} /><span>Toggle</span></>
                              )}
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {MODULES_CATALOG.map((mod) => {
                    const ModIcon = mod.icon;
                    return (
                      <tr key={mod.id} className="wz-matrix-row">
                        <td className="wz-td-module">
                          <div className="wz-mod-cell">
                            <div
                              className="wz-mod-icon"
                              style={{ background: mod.bg, color: mod.color }}
                            >
                              <ModIcon size={16} />
                            </div>
                            <div>
                              <span className="wz-mod-name">{mod.name}</span>
                              <span className="wz-mod-sub">{mod.subtitle}</span>
                            </div>
                          </div>
                        </td>
                        {ACTIONS.map((act) => {
                          const key = `${mod.id}:${act}`;
                          const isChecked = !!matrix[key];
                          const cfg = ACTION_CONFIG[act];
                          return (
                            <td key={act} className="wz-td-action">
                              <button
                                type="button"
                                disabled={isNonAdmin}
                                onClick={() => !isNonAdmin && handleToggleMatrixKey(mod.id, act)}
                                className={`wz-check-btn ${isChecked ? 'wz-checked' : ''}`}
                                style={{
                                  '--act-color': cfg.color,
                                  '--act-gradient': cfg.gradient,
                                  '--act-shadow': cfg.shadow
                                }}
                                title={`${cfg.label} — ${mod.name}`}
                              >
                                {isChecked && <Check size={14} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="wz-footer">
              <button type="button" onClick={() => setStep(1)} className="wz-btn-ghost">
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={submitting}
                className="wz-btn-primary"
              >
                {submitting ? 'Saving...' : 'Save & Activate User'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
