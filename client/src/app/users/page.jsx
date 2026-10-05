'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import { roleService } from '../../services/role.service';
import { isAdminUser, getSubordinateUsers } from '../../utils/crmStore';
import UserWizardModal from '../../components/users/UserWizardModal';
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Key,
  Sparkles,
  CheckCircle2,
  Lock,
  UserPlus,
  Mail,
  LayoutGrid,
  List,
  Phone,
  Building2,
  Briefcase,
  Clock,
  LogIn,
  LogOut,
  Activity,
  AlertCircle,
  Calendar
} from 'lucide-react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
  'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #2563EB 100%)',
  'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
];

const getAvatarGradient = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '< 1 min';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs} hr ${remMins} min`;
  }
  return `${mins} min`;
};

export default function UsersPage() {
  const { user: currentUser, can, sidebarCollapsed } = useAuth();
  
  // Navigation Tabs: 'users' | 'logs'
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Users Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Activity Logs state
  const [logs, setLogs] = useState([]);
  const [logsStats, setLogsStats] = useState({
    totalActiveNow: 0,
    loginsToday: 0,
    idleTimeoutsCount: 0,
    manualLogoutsCount: 0
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('');

  // Wizard Modal State
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [selectedUserForWizard, setSelectedUserForWizard] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsersAndRoles = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedRole) params.roleId = selectedRole;

      const [usersRes, rolesRes] = await Promise.all([
        userService.getAllUsers(params),
        roleService.getAllRoles()
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  const loadActivityLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const params = {};
      if (logSearch) params.search = logSearch;
      if (logStatusFilter) params.logoutType = logStatusFilter;

      const res = await userService.getUserActivityLogs(params);
      if (res.success) {
        setLogs(res.data || []);
        if (res.stats) setLogsStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load user session activity logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [logSearch, logStatusFilter]);

  useEffect(() => {
    loadUsersAndRoles();
  }, [loadUsersAndRoles]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadActivityLogs();
    }
  }, [activeTab, loadActivityLogs]);

  const handleOpenCreateWizard = () => {
    setSelectedUserForWizard(null);
    setShowWizardModal(true);
  };

  const handleOpenEditWizard = async (u) => {
    setSelectedUserForWizard(u);
    setShowWizardModal(true);

    try {
      const res = await userService.getUserById(u._id);
      if (res.success && res.data) {
        setSelectedUserForWizard(res.data);
      }
    } catch (e) {
      console.error('Error fetching full user profile:', e);
    }
  };

  const handleSaveUserFromWizard = async (payload) => {
    setSubmitting(true);
    try {
      let res;
      if (selectedUserForWizard) {
        res = await userService.updateUser(selectedUserForWizard._id, payload);
      } else {
        res = await userService.createUser(payload);
      }

      if (res.success) {
        setShowWizardModal(false);
        loadUsersAndRoles();
      }
    } catch (err) {
      alert(err.message || 'Failed to save user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await userService.toggleUserStatus(userId);
      if (res.success) {
        loadUsersAndRoles();
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this employee account?')) return;
    try {
      const res = await userService.deleteUser(userId);
      if (res.success) loadUsersAndRoles();
    } catch (err) {
      alert(err.message || 'Delete user failed');
    }
  };

  // ⚡ ROLE HIERARCHY SCOPED USERS LIST
  const effectiveUsers = useMemo(() => {
    if (!currentUser) return users;
    if (isAdminUser(currentUser)) {
      return users; // Admin sees 100% of staff accounts
    }
    const team = getSubordinateUsers(currentUser, users);
    return team && team.length > 0 ? team : [currentUser]; // Manager sees team; Exec sees self
  }, [currentUser, users]);

  // Instant Memoized Search & Counts
  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return effectiveUsers;
    return effectiveUsers.filter(u =>
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.department || '').toLowerCase().includes(query) ||
      (u.designation || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query)
    );
  }, [effectiveUsers, search]);

  const activeCount = useMemo(() => filteredUsers.filter((u) => u.isActive).length, [filteredUsers]);
  const customMatrixCount = useMemo(() => filteredUsers.filter((u) => u.customPermissions && u.customPermissions.length > 0).length, [filteredUsers]);

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="User & Staff Management" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Page Hero Action Card */}
        <div className="page-action-header glass-hero animate-fade-in">
          <div className="header-info">
            <div className="title-with-badge">
              <h2>Team Members & Employee Activity</h2>
             
            </div>
            <p>Configure user credentials, roles, and view live login/logout session activity</p>
          </div>

          <div className="header-action-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/roles" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              <span>Roles & Privileges</span>
            </Link>

            {can('users:create') && (
              <button onClick={handleOpenCreateWizard} className="btn btn-primary">
                <Plus size={18} />
                <span>Add New User / Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* TEAM USERS GRID / TABLE */}
        {/* KPI Metrics Summary Row */}
            <div className="kpi-grid animate-fade-in">
              <div className="kpi-card kpi-purple">
                <div className="kpi-icon-wrapper">
                  <Users size={22} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{effectiveUsers.length}</span>
                  <span className="kpi-lbl">Total Employees</span>
                </div>
              </div>

              <div className="kpi-card kpi-green">
                <div className="kpi-icon-wrapper">
                  <CheckCircle2 size={22} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{activeCount}</span>
                  <span className="kpi-lbl">Active Staff Accounts</span>
                </div>
              </div>

              <div className="kpi-card kpi-blue">
                <div className="kpi-icon-wrapper">
                  <Shield size={22} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{customMatrixCount}</span>
                  <span className="kpi-lbl">Custom Matrix Privileges</span>
                </div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="filter-bar glass-panel animate-fade-in">
              <div className="search-filter-input">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by employee name, email, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="role-filter-select">
                <Filter size={16} className="filter-icon" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-input select-input"
                >
                  <option value="">All Department Roles</option>
                  {roles.map((r, idx) => (
                    <option key={r._id || r.id || r.name || `role-opt-${idx}`} value={r._id || r.id || r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="view-mode-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid Card View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* --- MAIN CONTENT AREA: GRID VIEW VS TABLE VIEW --- */}
            {loading ? (
              <div className="glass-panel py-12 text-center">
                <div className="loading-state">
                  <Sparkles className="spin-icon" size={28} />
                  <span>Loading team employee records...</span>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="glass-panel py-12 text-center">
                <div className="empty-state">
                  <Users size={36} className="empty-icon" />
                  <p>No employee records found matching your filters.</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID CARD VIEW */
              <div className="user-grid-container animate-fade-in">
                {filteredUsers.map((u, idx) => (
                  <div key={u._id || u.id || u.email || `user-grid-${idx}`} className="ucard-wrapper">
                    {/* Header Banner */}
                    <div className="ucard-banner">
                      <span className={`ucard-status-pill ${u.isActive ? 'active' : 'inactive'}`}>
                        <span className="dot"></span>
                        {u.isActive ? 'Active Staff' : 'Deactivated'}
                      </span>
                      <div className="ucard-actions">
                        <button
                          className="ucard-action-btn edit"
                          onClick={() => handleOpenEditWizard(u)}
                          title="Edit User Info & Permission Overrides"
                        >
                          <Edit2 size={14} />
                        </button>
                        {u.email !== 'admin@sanmoracrm.com' && (
                          <>
                            <button
                              className={`ucard-action-btn toggle ${u.isActive ? 'deactivate' : 'activate'}`}
                              onClick={() => handleToggleStatus(u._id)}
                              title={u.isActive ? 'Deactivate User Account' : 'Activate User Account'}
                            >
                              {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              className="ucard-action-btn delete"
                              onClick={() => handleDeleteUser(u._id)}
                              title="Delete User Account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Avatar section */}
                    <div className="ucard-avatar-section">
                      <div
                        className="ucard-avatar"
                        style={{ background: getAvatarGradient(u.name) }}
                      >
                        <div
                          className="ucard-avatar-inner"
                          style={{ background: getAvatarGradient(u.name) }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="ucard-body">
                      <div className="ucard-name-row">
                        <h3 className="ucard-name">{u.name}</h3>
                        {u.role?.name === 'Super Admin' && (
                          <span className="admin-crown-badge" title="Super Admin Privilege">
                            <Shield size={11} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="ucard-designation">
                        <Briefcase size={13} className="detail-icon" />
                        <span>{u.designation || 'Executive'}</span>
                      </p>

                      <div className="ucard-role-badge-row">
                        <span className="ucard-role-pill">
                          <Shield size={12} />
                          <span>{u.role?.name || 'Staff Member'}</span>
                        </span>
                        {u.customPermissions && u.customPermissions.length > 0 && (
                          <span className="ucard-custom-pill" title={`${u.customPermissions.length} Direct Custom Permission Overrides`}>
                            <Key size={11} />
                            <span>+{u.customPermissions.length} Custom</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Details */}
                    <div className="ucard-footer">
                      <div className="ucard-detail-row" title={u.email}>
                        <Mail size={14} className="detail-icon" />
                        <span className="detail-text">{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="ucard-detail-row">
                          <Phone size={14} className="detail-icon" />
                          <span className="detail-text">{u.phone}</span>
                        </div>
                      )}
                      <div className="ucard-detail-row">
                        <Building2 size={14} className="detail-icon" />
                        <span className="detail-text">{u.department || 'Sales & Business Development'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* TABLE LIST VIEW */
              <div className="table-container animate-fade-in">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Employee Identity</th>
                      <th>Role & Custom Matrix</th>
                      <th>Department / Division</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => (
                      <tr key={u._id || u.id || u.email || `user-row-${idx}`} className="user-table-row">
                        <td className="user-profile-cell">
                          <div className="user-profile-flex">
                            <div className="u-avatar-ring-wrapper">
                              <div
                                className="u-avatar-ring"
                                style={{ background: getAvatarGradient(u.name) }}
                              >
                                <div
                                  className="u-avatar-inner"
                                  style={{ background: getAvatarGradient(u.name) }}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <span
                                className={`u-avatar-status-dot ${u.isActive ? 'online' : 'offline'}`}
                                title={u.isActive ? 'Active Staff Account' : 'Deactivated Account'}
                              ></span>
                            </div>
                            <div className="u-info-block">
                              <div className="u-fullname-row">
                                <span className="u-fullname">{u.name}</span>
                                {u.role?.name === 'Super Admin' && (
                                  <span className="admin-crown-badge" title="Super Admin Privilege">
                                    <Shield size={11} /> Admin
                                  </span>
                                )}
                              </div>
                              <div className="u-email-sub" title={u.email}>
                                <Mail size={12} className="email-icon" />
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="role-stack">
                            <span className="badge badge-purple">
                              <Shield size={12} /> {u.role?.name || 'Default Role'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="u-dept-block">
                            <div className="u-dept-title">
                              <Building2 size={13} className="u-dept-icon" />
                              <span>{u.department || 'Sales & Business Development'}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                            <span
                              className={`status-dot-pulse ${u.isActive ? 'status-dot-green' : 'status-dot-red'}`}
                            ></span>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {can('users:update') && (
                              <button
                                onClick={() => handleOpenEditWizard(u)}
                                className="act-btn perm-btn"
                                title="Edit User Credentials & Permission Matrix"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}

                            {can('users:toggle_status') && (
                              <button
                                onClick={() => handleToggleStatus(u._id)}
                                className={`act-btn ${u.isActive ? 'deact-btn' : 'actv-btn'}`}
                                title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                              </button>
                            )}

                            {can('users:delete') && u.email !== 'admin@sanmoracrm.com' && (
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                className="act-btn del-btn"
                                title="Delete User Account"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </main>

      {/* --- 2-STEP USER CREATION & MATRIX WIZARD MODAL --- */}
      <UserWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onSubmit={handleSaveUserFromWizard}
        roles={roles}
        users={users}
        editingUser={selectedUserForWizard}
        currentUser={currentUser}
        submitting={submitting}
      />
    </div>
  );
}
