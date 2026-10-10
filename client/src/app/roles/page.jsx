'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { roleService } from '../../services/role.service';
import { userService } from '../../services/user.service';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Check,
  X,
  Users,
  Sparkles,
  Info,
  Key,
  Layers,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  UserCheck,
  Search,
  User,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  LayoutDashboard,
  PhoneCall,
  CheckSquare,
  Wallet,
  Settings,
  Shield,
  Award,
  ChevronRight,
  Flame,
  CheckSquare2,
  Crown,
  Eye,
  PlusCircle,
  Edit3
} from 'lucide-react';

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

const normalizePermissionArray = (arr = []) => {
  return Array.from(new Set((arr || []).map(normalizePermissionKey)));
};

export default function RolesPage() {
  const { user: currentUser, can, sidebarCollapsed, refreshUser } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' | 'user-overrides' | 'matrix-grid'

  // Data States
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [allPermissionKeys, setAllPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Roles
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Role Form State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- USER OVERRIDES TAB STATES ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [userCustomPermissions, setUserCustomPermissions] = useState([]);
  const [userDeniedPermissions, setUserDeniedPermissions] = useState([]);
  const [userSaveSubmitting, setUserSaveSubmitting] = useState(false);
  const [userSaveSuccess, setUserSaveSuccess] = useState('');
  const [userSaveError, setUserSaveError] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permRes, usersRes] = await Promise.all([
        roleService.getAllRoles(),
        roleService.getPermissionsCatalog(),
        userService.getAllUsers()
      ]);

      if (rolesRes.success) {
        const cleanedRoles = (rolesRes.data || []).map((r) => ({
          ...r,
          permissions: normalizePermissionArray(r.permissions || [])
        }));
        setRoles(cleanedRoles);
      }
      if (permRes.success && permRes.data) {
        setPermissionGroups(permRes.data.permissionGroups || []);
        setAllPermissionKeys(permRes.data.allPermissions || []);
      }
      if (usersRes.success) {
        const fetchedUsers = (usersRes.data || []).map((u) => ({
          ...u,
          customPermissions: normalizePermissionArray(u.customPermissions || []),
          deniedPermissions: normalizePermissionArray(u.deniedPermissions || []),
          role: u.role ? { ...u.role, permissions: normalizePermissionArray(u.role.permissions || []) } : u.role
        }));
        setUsers(fetchedUsers);
        if (fetchedUsers.length > 0 && !selectedUser) {
          setSelectedUser(fetchedUsers[0]);
          setUserCustomPermissions(fetchedUsers[0].customPermissions || []);
          setUserDeniedPermissions(fetchedUsers[0].deniedPermissions || []);
        }
      }
    } catch (err) {
      console.error('Failed to load roles/permissions/users:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- ROLE MODAL HANDLERS ---
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setFormError('');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(normalizePermissionArray(role.permissions || []));
    setFormError('');
    setShowRoleModal(true);
  };

  const handleTogglePermission = (permKey) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permKey));
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
    }
  };

  const handleSelectAllInGroup = (groupPermissions) => {
    const keys = groupPermissions.map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((k) => !keys.includes(k)));
    } else {
      setSelectedPermissions(Array.from(new Set([...selectedPermissions, ...keys])));
    }
  };

  const handleSelectAllGlobal = () => {
    setSelectedPermissions([...allPermissionKeys]);
  };

  const handleClearAllGlobal = () => {
    setSelectedPermissions([]);
  };

  const handleSelectViewOnlyGlobal = () => {
    const viewKeys = allPermissionKeys.filter((k) => k.endsWith(':view'));
    setSelectedPermissions(viewKeys);
  };

  const handleSubmitRole = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions
      };

      let res;
      if (editingRole) {
        res = await roleService.updateRole(editingRole._id, payload);
      } else {
        res = await roleService.createRole(payload);
      }

      if (res.success) {
        setShowRoleModal(false);
        loadAllData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.name === 'Super Admin') {
      alert('Root Super Admin role cannot be deleted!');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    try {
      const res = await roleService.deleteRole(role._id);
      if (res.success) loadAllData();
    } catch (err) {
      alert(err.message || 'Delete role failed');
    }
  };

  // --- USER OVERRIDES HANDLERS ---
  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setUserCustomPermissions(u.customPermissions || []);
    setUserDeniedPermissions(u.deniedPermissions || []);
    setUserSaveSuccess('');
    setUserSaveError('');
  };

  const handleToggleUserCustomPermission = (permKey) => {
    if (!selectedUser) return;
    
    const baseRolePerms = (selectedUser.role?.permissions || []).map(normalizePermissionKey);
    if (baseRolePerms.includes(permKey)) {
      if (userDeniedPermissions.includes(permKey)) {
        setUserDeniedPermissions(userDeniedPermissions.filter((p) => p !== permKey));
      } else {
        setUserDeniedPermissions([...userDeniedPermissions, permKey]);
      }
    } else {
      if (userCustomPermissions.includes(permKey)) {
        setUserCustomPermissions(userCustomPermissions.filter((p) => p !== permKey));
      } else {
        setUserCustomPermissions([...userCustomPermissions, permKey]);
      }
    }
  };

  const handleResetUserCustomPermissions = () => {
    if (selectedUser) {
      setUserCustomPermissions([]);
      setUserDeniedPermissions([]);
      setUserSaveSuccess('Reset to base role permissions');
      setTimeout(() => setUserSaveSuccess(''), 3000);
    }
  };

  const handleGrantAllUserCustomPermissions = () => {
    if (selectedUser) {
      const baseRolePerms = (selectedUser.role?.permissions || []).map(normalizePermissionKey);
      const extraPerms = allPermissionKeys.filter((k) => !baseRolePerms.includes(k));
      setUserDeniedPermissions([]);
      setUserCustomPermissions(extraPerms);
    }
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    setUserSaveSubmitting(true);
    setUserSaveSuccess('');
    setUserSaveError('');

    try {
      const baseRolePerms = (selectedUser.role?.permissions || []).map(normalizePermissionKey);
      const extraPerms = userCustomPermissions.filter((p) => !baseRolePerms.includes(p));
      const deniedPerms = userDeniedPermissions.filter((p) => baseRolePerms.includes(p));

      const res = await userService.updateUser(selectedUser._id, {
        customPermissions: extraPerms,
        deniedPermissions: deniedPerms
      });

      if (res.success) {
        setUserSaveSuccess(`Custom permissions updated successfully for ${selectedUser.name}!`);
        setUsers((prev) =>
          prev.map((u) => (u._id === selectedUser._id ? { ...u, customPermissions: extraPerms, deniedPermissions: deniedPerms } : u))
        );
        setSelectedUser((prev) => ({ ...prev, customPermissions: extraPerms, deniedPermissions: deniedPerms }));
        
        if (currentUser && (currentUser.id === selectedUser._id || currentUser._id === selectedUser._id)) {
          refreshUser();
        }
        setTimeout(() => setUserSaveSuccess(''), 4000);
      }
    } catch (err) {
      setUserSaveError(err.message || 'Failed to update user custom permissions');
    } finally {
      setUserSaveSubmitting(false);
    }
  };

  // Metrics
  const systemRoleCount = roles.filter((r) => r.isSystem).length;
  const customRoleCount = roles.filter((r) => !r.isSystem).length;

  // Filtering users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = roleFilter ? u.role?._id === roleFilter || u.role?.name === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Role & Permission Matrix" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Page Hero Header */}
        <div className="page-action-header ultra-hero animate-fade-in">
          <div className="hero-top-rainbow-bar" />
          <div className="hero-glow-accent" />
          <div className="header-info">
            <div className="badge-row">
              <span className="ultra-live-badge">
                <Sparkles size={13} /> PRO RBAC 3.0 ARCHITECTURE
              </span>
            </div>
            <h2 className="hero-title-text">Role & Access Control Engine</h2>
            <p className="hero-desc">
              Manage system roles (<strong>Sales Manager</strong>, <strong>Sales Executive</strong>, etc.) and configure RBAC privileges with full edit & delete support.
            </p>
          </div>

          <div className="header-action-buttons">
            {can('roles:create') && (
              <button onClick={handleOpenCreateRole} className="btn btn-primary ultra-create-btn">
                <Plus size={18} />
                <span>Create Custom Role</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="role-tabs-bar glass-panel animate-fade-in">
          <button
            onClick={() => setActiveTab('roles')}
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          >
            <ShieldCheck size={18} />
            <span>Role Privilege Matrix ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix-grid')}
            className={`tab-btn ${activeTab === 'matrix-grid' ? 'active' : ''}`}
          >
            <SlidersHorizontal size={18} />
            <span>Full Matrix Comparison View</span>
          </button>
        </div>

        {/* ════════════════════════ TAB 1: ROLES OVERVIEW ════════════════════════ */}
        {activeTab === 'roles' && (
          <div className="tab-content animate-fade-in">
            {/* KPI Metrics Summary Grid */}
            <div className="kpi-grid">
              <div className="kpi-card kpi-purple">
                <div className="kpi-icon-wrapper">
                  <ShieldCheck size={24} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{roles.length}</span>
                  <span className="kpi-lbl">Configured System Roles</span>
                </div>
              </div>

              <div className="kpi-card kpi-blue">
                <div className="kpi-icon-wrapper">
                  <Lock size={24} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{systemRoleCount}</span>
                  <span className="kpi-lbl">System Protected Roles</span>
                </div>
              </div>

              <div className="kpi-card kpi-green">
                <div className="kpi-icon-wrapper">
                  <Sliders size={24} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{customRoleCount}</span>
                  <span className="kpi-lbl">Custom Business Roles</span>
                </div>
              </div>

              <div className="kpi-card kpi-amber">
                <div className="kpi-icon-wrapper">
                  <Key size={24} />
                </div>
                <div className="kpi-details">
                  <span className="kpi-val">{allPermissionKeys.length || 32}</span>
                  <span className="kpi-lbl">Granular Permission Keys</span>
                </div>
              </div>
            </div>

            {/* Roles Grid */}
            <div className="roles-grid">
              {loading ? (
                <div className="loading-box glass-panel">
                  <Sparkles className="spin-icon" size={26} />
                  <span>Loading system roles & permission catalog...</span>
                </div>
              ) : (
                roles.map((r) => {
                  let roleAvatarGradient = 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)';
                  if (r.name.includes('Manager')) roleAvatarGradient = 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)';
                  else if (r.name.includes('Executive')) roleAvatarGradient = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';
                  else if (r.name.includes('Support')) roleAvatarGradient = 'linear-gradient(135deg, #059669 0%, #10B981 100%)';

                  return (
                    <div key={r._id} className="role-card ultra-role-card glass-card">
                      {/* CARD HEADER */}
                      <div className="role-card-header">
                        <div className="role-title-wrap">
                          <div className="role-badge-icon" style={{ background: roleAvatarGradient }}>
                            <ShieldCheck size={22} />
                          </div>
                          <div className="role-main-meta">
                            <h3 className="role-name">{r.name}</h3>
                            <div className="role-meta-tags">
                              {r.isSystem ? (
                                <span className="pro-tag tag-system" title="System Protected Role">
                                  <Lock size={10} /> SYSTEM
                                </span>
                              ) : (
                                <span className="pro-tag tag-custom" title="Custom User Role">
                                  <Sparkles size={10} /> CUSTOM
                                </span>
                              )}
                              <span className="user-count-badge">
                                <Users size={12} /> {r.userCount || 0} Employees
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* EDIT & DELETE ACTION BUTTONS */}
                        <div className="role-actions">
                          <button
                            onClick={() => handleOpenEditRole(r)}
                            className="act-btn edit-btn"
                            title={`Edit ${r.name} Role & Permission Matrix`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(r)}
                            disabled={r.name === 'Super Admin'}
                            className={`act-btn del-btn ${r.name === 'Super Admin' ? 'disabled' : ''}`}
                            title={r.name === 'Super Admin' ? 'Root Super Admin cannot be deleted' : `Delete ${r.name} Role`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* ROLE DESCRIPTION */}
                      <p className="role-desc">
                        {r.description || 'No custom description provided for this security role.'}
                      </p>

                      {/* PRIVILEGES SUMMARY */}
                      <div className="role-perms-summary">
                        <div className="perms-header">
                          <span>BASE PRIVILEGES ({r.permissions?.length || 0})</span>
                        </div>
                        <div className="perms-tags-wrap">
                          {r.name === 'Super Admin' ? (
                            <span className="badge badge-super">
                              <Sparkles size={12} /> Full System Bypass Access
                            </span>
                          ) : r.permissions && r.permissions.length > 0 ? (
                            r.permissions.map((p) => {
                              let badgeClass = 'badge-purple';
                              if (p.endsWith(':view')) badgeClass = 'badge-view';
                              else if (p.endsWith(':add')) badgeClass = 'badge-add';
                              else if (p.endsWith(':edit')) badgeClass = 'badge-edit';
                              else if (p.endsWith(':delete')) badgeClass = 'badge-delete';

                              return (
                                <span key={p} className={`badge ${badgeClass}`}>
                                  {p}
                                </span>
                              );
                            })
                          ) : (
                            <span className="no-perm-lbl">No explicit permissions assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════ TAB 2: MATRIX COMPARISON VIEW ════════════════════════ */}
        {activeTab === 'matrix-grid' && (
          <div className="tab-content animate-fade-in">
            <div className="matrix-table-container glass-card">
              <div className="table-header-info">
                <h3>Roles vs Privilege Matrix Grid</h3>
                <p>Comprehensive side-by-side comparison of configured roles against all system module permissions</p>
              </div>

              <div className="table-responsive">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th className="th-module">System Module / Feature</th>
                      <th className="th-perm">Privilege Key</th>
                      {roles.map((r) => (
                        <th key={r._id} className="th-role">
                          <div className="th-role-wrap">
                            <span>{r.name}</span>
                            <span className="th-role-type">{r.isSystem ? 'System' : 'Custom'}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissionGroups.map((group) => (
                      <React.Fragment key={group.module}>
                        <tr className="tr-group-header">
                          <td colSpan={2 + roles.length} className="td-group-title">
                            <strong>{group.name}</strong> — <small>{group.subtitle}</small>
                          </td>
                        </tr>
                        {group.permissions.map((p) => (
                          <tr key={p.key} className="tr-perm-row">
                            <td className="td-mod-name">{group.name}</td>
                            <td className="td-perm-key">
                              <code>{p.key}</code>
                            </td>
                            {roles.map((r) => {
                              const rolePerms = (r.permissions || []).map(normalizePermissionKey);
                              const hasPerm = r.name === 'Super Admin' || rolePerms.includes(p.key);
                              return (
                                <td key={r._id} className={`td-check ${hasPerm ? 'active' : ''}`}>
                                  {hasPerm ? (
                                    <span className="check-icon-wrap" title={`${r.name} has access to ${p.key}`}>
                                      <Check size={16} />
                                    </span>
                                  ) : (
                                    <span className="cross-icon-wrap" title="Access Denied">
                                      <X size={14} />
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- CREATE / EDIT ROLE MODAL --- */}
      {showRoleModal && (
        <div className="modal-backdrop">
          <div className="modal-card role-modal-card animate-fade-in">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom System Role'}</h3>
                  <p className="modal-subtitle">Define granular module permissions for this role</p>
                </div>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="close-btn" title="Close Modal">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="error-alert">
                <ShieldAlert size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRole} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">ROLE NAME *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.name === 'Super Admin'}
                    placeholder="e.g. Sales Manager, Telecaller"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="form-input custom-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ROLE DESCRIPTION</label>
                  <input
                    type="text"
                    placeholder="Brief summary of role responsibilities"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="form-input custom-input"
                  />
                </div>
              </div>

              <div className="perms-matrix-box">
                <div className="matrix-title">
                  <div className="m-title-left">
                    <Key size={16} className="m-icon" />
                    <span>Granular Module Permission Matrix</span>
                  </div>

                  <div className="matrix-title-right">
                    <div className="preset-btn-group">
                      <button
                        type="button"
                        onClick={handleSelectAllGlobal}
                        className="preset-btn btn-all"
                        title="Select all 32 system permissions"
                      >
                        Select All (32)
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectViewOnlyGlobal}
                        className="preset-btn btn-view"
                        title="Select view-only permissions"
                      >
                        View Only
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllGlobal}
                        className="preset-btn btn-clear"
                        title="Clear all selected permissions"
                      >
                        Clear All
                      </button>
                    </div>

                    <span className="selected-count-badge">
                      Selected: <strong>{selectedPermissions.length}</strong> / {allPermissionKeys.length}
                    </span>
                  </div>
                </div>

                <div className="perm-groups-list">
                  {permissionGroups.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));

                    return (
                      <div key={group.module} className="group-matrix-row">
                        <div className="group-row-header">
                          <h4 className="group-name">{group.name}</h4>
                          <button
                            type="button"
                            onClick={() => handleSelectAllInGroup(group.permissions)}
                            className="select-all-btn"
                          >
                            {allSelected ? 'Deselect Module' : 'Select Module'}
                          </button>
                        </div>

                        <div className="checkbox-grid">
                          {group.permissions.map((p) => {
                            const isChecked = selectedPermissions.includes(p.key);
                            let actionType = 'view';
                            if (p.key.endsWith(':add')) actionType = 'add';
                            else if (p.key.endsWith(':edit')) actionType = 'edit';
                            else if (p.key.endsWith(':delete')) actionType = 'delete';

                            return (
                              <label
                                key={p.key}
                                className={`perm-card-check action-${actionType} ${isChecked ? 'active' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.key)}
                                  className="real-checkbox"
                                />
                                <div className="perm-info">
                                  <div className="p-title-row">
                                    <span className="p-title">{p.label}</span>
                                    <span className={`action-badge act-${actionType}`}>{actionType}</span>
                                  </div>
                                  <span className="p-code">{p.key}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-save">
                  <CheckCircle2 size={18} />
                  <span>{submitting ? 'Saving Role...' : editingRole ? 'Update Role Matrix' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX Styles */}
      <style jsx>{`
        .crm-layout {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
        }

        .crm-main-content {
          margin-left: var(--sidebar-width);
          margin-top: calc(var(--header-height, 70px) + var(--announcement-height, 0px) + 8px);
          padding: 26px 30px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
          transition: margin-top 0.25s ease, margin-left 0.3s ease;
        }

        /* ULTRA HERO LIGHT THEME (MATCHING SEC IMG) */
        .ultra-hero {
          position: relative;
          background: linear-gradient(135deg, rgba(239, 232, 255, 0.85) 0%, rgba(224, 242, 254, 0.85) 50%, rgba(236, 253, 245, 0.85) 100%);
          border-radius: 22px;
          padding: 24px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          overflow: hidden;
          border: 1px solid rgba(99, 102, 241, 0.18);
          box-shadow: 0 10px 30px -8px rgba(99, 102, 241, 0.12);
        }

        .hero-top-rainbow-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #6366F1 0%, #3B82F6 50%, #10B981 100%);
          border-top-left-radius: inherit;
          border-top-right-radius: inherit;
        }

        .hero-glow-accent {
          position: absolute;
          top: -50%;
          right: -10%;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%);
          filter: blur(40px);
          pointer-events: none;
        }

        .ultra-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(139, 92, 246, 0.3);
        }

        .badge-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .ultra-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 5px 14px;
          border-radius: 9999px;
          background: #FFFFFF;
          color: #6366F1;
          border: 1px solid rgba(99, 102, 241, 0.25);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hero-title-text {
          font-family: var(--font-heading);
          font-size: 1.85rem;
          font-weight: 600;
          color: #0F172A;
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .hero-desc {
          color: #475569;
          font-size: 0.92rem;
          max-width: 660px;
          line-height: 1.45;
        }

        .ultra-create-btn {
          padding: 12px 24px;
          border-radius: 999px;
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .ultra-create-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 14px 32px rgba(99, 102, 241, 0.5);
        }

        /* TABS BAR BALANCED */
        .role-tabs-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px;
          border-radius: 18px;
          background: #FFFFFF;
          border: 1px solid rgba(124, 58, 237, 0.12);
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.025);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 20px;
          border-radius: 13px;
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text-secondary);
          background: transparent;
          transition: all 0.22s ease;
          position: relative;
        }

        .tab-btn:hover {
          color: var(--primary);
          background: rgba(124, 58, 237, 0.06);
        }

        .tab-btn.active {
          color: #FFFFFF;
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          box-shadow: 0 7px 20px rgba(79, 70, 229, 0.32);
        }

        .override-pill {
          font-size: 0.68rem;
          font-weight: 600;
          background: #10B981;
          color: #FFFFFF;
          padding: 2px 8px;
          border-radius: 99px;
          text-transform: uppercase;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* KPI GRID BALANCED */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          padding: 18px 20px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.025);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.11);
        }

        .kpi-icon-wrapper {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.08);
          flex-shrink: 0;
        }

        .kpi-purple .kpi-icon-wrapper { background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: #FFFFFF; }
        .kpi-blue .kpi-icon-wrapper { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; }
        .kpi-green .kpi-icon-wrapper { background: linear-gradient(135deg, #10B981 0%, #047857 100%); color: #FFFFFF; }
        .kpi-amber .kpi-icon-wrapper { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; }

        .kpi-val {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 600;
          color: var(--text-primary);
          display: block;
          line-height: 1.1;
        }

        .kpi-lbl {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 600;
          margin-top: 2px;
        }

        /* ROLES GRID BALANCED */
        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 22px;
        }

        .ultra-role-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-radius: 22px;
          background: #FFFFFF;
          border: 1px solid rgba(124, 58, 237, 0.15);
          box-shadow: 0 10px 28px -8px rgba(124, 58, 237, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .ultra-role-card:hover {
          transform: translateY(-5px);
          border-color: rgba(124, 58, 237, 0.38);
          box-shadow: 0 18px 42px -10px rgba(124, 58, 237, 0.22);
        }

        .role-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .role-title-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .role-main-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .role-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 600;
          color: #0F172A;
          letter-spacing: -0.015em;
          line-height: 1.25;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .role-meta-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .role-badge-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #FFFFFF;
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.25);
        }

        .pro-tag {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 99px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .tag-system { background: rgba(37, 99, 235, 0.12); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.24); }
        .tag-custom { background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.24); }

        .user-count-badge {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
        }

        .role-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .act-btn {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          cursor: pointer;
        }

        .edit-btn {
          background: rgba(37, 99, 235, 0.1);
          color: #2563EB;
          border-color: rgba(37, 99, 235, 0.2);
        }

        .edit-btn:hover {
          background: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 7px 18px rgba(37, 99, 235, 0.38);
          transform: translateY(-2px);
        }

        .del-btn {
          background: rgba(244, 63, 94, 0.1);
          color: #E11D48;
          border-color: rgba(244, 63, 94, 0.2);
        }

        .del-btn:hover {
          background: #E11D48;
          color: #FFFFFF;
          box-shadow: 0 7px 18px rgba(244, 63, 94, 0.38);
          transform: translateY(-2px);
        }

        .del-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .role-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .perms-header {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-bottom: 10px;
          letter-spacing: 0.05em;
        }

        .perms-tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          max-height: 135px;
          overflow-y: auto;
          padding-right: 4px;
        }

        /* PERMISSION BADGES STYLING BALANCED */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: var(--font-heading);
          transition: all 0.18s ease;
        }

        .badge-view {
          background: rgba(2, 132, 199, 0.09);
          color: #0284C7;
          border: 1px solid rgba(2, 132, 199, 0.24);
        }

        .badge-add {
          background: rgba(5, 150, 105, 0.09);
          color: #059669;
          border: 1px solid rgba(5, 150, 105, 0.24);
        }

        .badge-edit {
          background: rgba(217, 119, 6, 0.09);
          color: #D97706;
          border: 1px solid rgba(217, 119, 6, 0.24);
        }

        .badge-delete {
          background: rgba(225, 29, 72, 0.09);
          color: #E11D48;
          border: 1px solid rgba(225, 29, 72, 0.24);
        }

        .badge-purple {
          background: rgba(124, 58, 237, 0.09);
          color: #7C3AED;
          border: 1px solid rgba(124, 58, 237, 0.24);
        }

        .badge-super {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(37, 99, 235, 0.12) 100%);
          color: #7C3AED;
          border: 1px solid rgba(124, 58, 237, 0.3);
          font-weight: 600;
        }

        /* SLEEK SCROLLBAR */
        .perms-tags-wrap::-webkit-scrollbar {
          width: 4px;
        }

        .perms-tags-wrap::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.24);
          border-radius: 99px;
        }

        /* ════ USER SPECIFIC OVERRIDES TAB BALANCED ════ */
        .user-override-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 22px;
          min-height: 560px;
        }

        .user-selector-sidebar {
          background: #FFFFFF;
          border-radius: 22px;
          padding: 20px;
          border: 1px solid rgba(124, 58, 237, 0.14);
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.02);
        }

        .sidebar-search-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .search-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .search-box {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
        }

        .search-input {
          width: 100%;
          padding: 11px 13px 11px 38px;
          border-radius: 13px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          font-size: 0.88rem;
        }

        .role-select-filter {
          padding: 11px 13px;
          border-radius: 13px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          font-size: 0.88rem;
          background: #F8FAFC;
        }

        .users-list-scroll {
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 500px;
          overflow-y: auto;
        }

        .user-list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 15px;
          border: 1px solid transparent;
          background: #F8FAFC;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .user-list-item:hover {
          background: rgba(124, 58, 237, 0.06);
          border-color: rgba(124, 58, 237, 0.2);
        }

        .user-list-item.selected {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%);
          border-color: var(--primary);
          box-shadow: 0 5px 14px rgba(124, 58, 237, 0.14);
        }

        .u-avatar-wrap {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.28);
        }

        .u-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .u-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .u-email {
          font-size: 0.74rem;
          color: var(--text-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .u-role-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          margin-top: 2px;
        }

        .override-dot-badge {
          position: absolute;
          right: 11px;
          top: 11px;
          background: #10B981;
          color: #FFFFFF;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 99px;
          box-shadow: 0 2px 7px rgba(16, 185, 129, 0.38);
        }

        /* EDITOR SIDE BALANCED */
        .user-matrix-editor {
          background: #FFFFFF;
          border-radius: 22px;
          padding: 26px;
          border: 1px solid rgba(124, 58, 237, 0.14);
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.02);
        }

        .user-profile-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 20px;
        }

        .u-banner-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-big-avatar {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 22px rgba(124, 58, 237, 0.28);
        }

        .u-banner-name {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .u-banner-name h3 {
          font-family: var(--font-heading);
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .department-tag {
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(37, 99, 235, 0.12);
          color: #2563EB;
          padding: 3px 11px;
          border-radius: 99px;
        }

        .u-banner-email {
          font-size: 0.84rem;
          color: var(--text-secondary);
        }

        .role-meta-row {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 5px;
        }

        .role-meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--primary);
          background: rgba(124, 58, 237, 0.08);
          padding: 3px 11px;
          border-radius: 9px;
        }

        .u-banner-actions {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .btn-sm {
          padding: 9px 15px;
          font-size: 0.8rem;
          border-radius: 11px;
        }

        .btn-save-user {
          padding: 10px 22px;
          border-radius: 999px;
          box-shadow: 0 7px 18px rgba(124, 58, 237, 0.28);
          font-size: 0.85rem;
        }

        .legend-and-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          background: #F8FAFC;
          padding: 16px 18px;
          border-radius: 16px;
          margin-bottom: 20px;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .stats-pills {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .stat-pill {
          display: flex;
          flex-direction: column;
        }

        .s-val {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .s-lbl {
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .permission-legend {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lg-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .dot-role { background: #7C3AED; }
        .dot-custom { background: #10B981; }
        .dot-none { background: #CBD5E1; }

        .user-perm-groups-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-height: 460px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .user-group-card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 16px;
          background: #FFFFFF;
        }

        .u-group-header {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 12px;
        }

        .u-group-header h4 {
          font-family: var(--font-heading);
          font-size: 0.96rem;
          font-weight: 600;
          color: var(--primary);
        }

        .u-group-subtitle {
          font-size: 0.76rem;
          color: var(--text-tertiary);
        }

        .u-perm-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
          gap: 11px;
        }

        .u-perm-card {
          padding: 11px 13px;
          border-radius: 13px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .u-perm-card.inherited {
          background: rgba(124, 58, 237, 0.06);
          border-color: rgba(124, 58, 237, 0.28);
          cursor: default;
        }

        .u-perm-card.override {
          background: rgba(16, 185, 129, 0.09);
          border-color: #10B981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.16);
        }

        .u-perm-card.disabled {
          background: #F8FAFC;
          opacity: 0.65;
        }

        .u-perm-card.disabled:hover {
          opacity: 1;
          border-color: #10B981;
          background: #FFFFFF;
          transform: translateY(-2px);
        }

        .u-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .p-action-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .badge-status {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 5px;
          text-transform: uppercase;
        }

        .bg-role { background: #7C3AED; color: #FFFFFF; }
        .bg-override { background: #10B981; color: #FFFFFF; }
        .bg-none { background: #E2E8F0; color: #64748B; }

        .p-key-code {
          font-size: 0.7rem;
          font-family: monospace;
          color: var(--text-tertiary);
        }

        .no-user-selected {
          padding: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 11px;
          text-align: center;
          color: var(--text-secondary);
        }

        /* ════ MATRIX COMPARISON GRID TAB BALANCED ════ */
        .matrix-table-container {
          background: #FFFFFF;
          border-radius: 22px;
          padding: 24px;
          border: 1px solid rgba(124, 58, 237, 0.14);
        }

        .table-header-info {
          margin-bottom: 20px;
        }

        .table-header-info h3 {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .table-header-info p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .matrix-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .matrix-table th, .matrix-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .matrix-table th {
          background: #F8FAFC;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .th-role-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .th-role-type {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--primary);
        }

        .tr-group-header td {
          background: rgba(124, 58, 237, 0.06);
          font-size: 0.88rem;
          color: var(--primary);
        }

        .td-mod-name {
          font-weight: 700;
          font-size: 0.86rem;
        }

        .td-perm-key code {
          font-size: 0.74rem;
          background: #F1F5F9;
          padding: 2px 7px;
          border-radius: 5px;
          color: var(--primary);
        }

        .td-check {
          text-align: center;
        }

        .check-icon-wrap {
          display: inline-flex;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #10B981;
          color: #FFFFFF;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 9px rgba(16, 185, 129, 0.28);
        }

        .cross-icon-wrap {
          display: inline-flex;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #F1F5F9;
          color: #94A3B8;
          align-items: center;
          justify-content: center;
        }

        .alert {
          padding: 12px 18px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 11px;
          font-weight: 600;
          font-size: 0.86rem;
          margin-bottom: 18px;
        }

        .alert-success { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.24); }
        .alert-danger { background: rgba(244, 63, 94, 0.1); color: var(--accent); border: 1px solid rgba(244, 63, 94, 0.24); }

        /* MODAL BALANCED */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(26px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .modal-card {
          width: 100%;
          max-width: 900px;
          max-height: 92vh;
          overflow-y: auto;
          background: #FFFFFF;
          border-radius: 26px;
          padding: 32px;
          border: 1px solid rgba(99, 102, 241, 0.18);
          box-shadow: 0 25px 70px -12px rgba(99, 102, 241, 0.28);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid #F1F5F9;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .modal-icon-badge {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 22px rgba(99, 102, 241, 0.35);
        }

        .modal-title-wrap h3 {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 600;
          color: #0F172A;
          letter-spacing: -0.01em;
        }

        .modal-subtitle {
          font-size: 0.86rem;
          color: #64748B;
          margin-top: 2px;
        }

        .close-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
          transform: rotate(90deg);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .custom-input {
          padding: 13px 18px;
          border-radius: 14px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          font-size: 0.92rem;
          font-weight: 500;
          color: #0F172A;
          transition: all 0.2s ease;
        }

        .custom-input:focus {
          outline: none;
          background: #FFFFFF;
          border-color: #6366F1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
        }

        .perms-matrix-box {
          border: 1.5px solid rgba(99, 102, 241, 0.16);
          border-radius: 20px;
          padding: 22px;
          background: #FAFAFE;
        }

        .matrix-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid #E2E8F0;
          flex-wrap: wrap;
          gap: 12px;
        }

        .m-title-left {
          display: flex;
          align-items: center;
          gap: 9px;
          font-weight: 600;
          font-size: 0.98rem;
          color: #4338CA;
        }

        .matrix-title-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .preset-btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          padding: 3px;
          border-radius: 99px;
          border: 1px solid #E2E8F0;
        }

        .preset-btn {
          font-size: 0.74rem;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 99px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: #475569;
        }

        .preset-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        .preset-btn.btn-all:hover { background: #EEF2FF; color: #4F46E5; }
        .preset-btn.btn-view:hover { background: #ECFEFF; color: #0891B2; }
        .preset-btn.btn-clear:hover { background: #FFF1F2; color: #E11D48; }

        .selected-count-badge {
          font-size: 0.8rem;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 99px;
          background: #EEF2FF;
          color: #4338CA;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .perm-groups-list {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-height: 48vh;
          overflow-y: auto;
          padding-right: 6px;
        }

        .group-matrix-row {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .group-row-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .group-name {
          font-family: var(--font-heading);
          font-size: 0.98rem;
          font-weight: 600;
          color: #1E1B4B;
        }

        .select-all-btn {
          font-size: 0.74rem;
          font-weight: 600;
          color: #6366F1;
          background: #EEF2FF;
          border: 1px solid rgba(99, 102, 241, 0.22);
          padding: 4px 13px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .select-all-btn:hover {
          background: #6366F1;
          color: #FFFFFF;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .perm-card-check {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .perm-card-check:hover {
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.08);
        }

        .real-checkbox {
          width: 17px;
          height: 17px;
          accent-color: #6366F1;
          cursor: pointer;
          margin-top: 3px;
          flex-shrink: 0;
        }

        .perm-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .p-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .p-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1E293B;
          line-height: 1.25;
        }

        .action-badge {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .act-view { background: #ECFEFF; color: #0891B2; border: 1px solid rgba(6, 182, 212, 0.2); }
        .act-add { background: #ECFDF5; color: #059669; border: 1px solid rgba(16, 185, 129, 0.2); }
        .act-edit { background: #FFFBEB; color: #D97706; border: 1px solid rgba(245, 158, 11, 0.2); }
        .act-delete { background: #FFF1F2; color: #E11D48; border: 1px solid rgba(244, 63, 94, 0.2); }

        .p-code {
          font-size: 0.72rem;
          color: #94A3B8;
          font-family: monospace;
        }

        /* Active Card Color Themes */
        .perm-card-check.action-view.active {
          background: #F0FDFF;
          border-color: #06B6D4;
          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.16);
        }

        .perm-card-check.action-add.active {
          background: #F0FDF4;
          border-color: #10B981;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.16);
        }

        .perm-card-check.action-edit.active {
          background: #FFFDF0;
          border-color: #F59E0B;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.16);
        }

        .perm-card-check.action-delete.active {
          background: #FFF5F5;
          border-color: #F43F5E;
          box-shadow: 0 4px 14px rgba(244, 63, 94, 0.16);
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
          margin-top: 6px;
        }

        .btn-save {
          padding: 13px 32px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.92rem;
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          color: #FFFFFF;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
          transition: all 0.25s ease;
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(99, 102, 241, 0.48);
        }

        /* ══════════════════════════════════════════════════════════════════════
           ROLES & PRIVILEGES RESPONSIVE RULES (ALL SCREEN SIZES)
           ══════════════════════════════════════════════════════════════════════ */
        .loading-box {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 36px 20px;
          border-radius: 18px;
          background: #FFFFFF;
          border: 1px solid rgba(99, 102, 241, 0.15);
          font-weight: 500;
          color: #64748B;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spin-icon {
          animation: spin 1.5s linear infinite;
          color: #6366F1;
        }

        @media (max-width: 1024px) {
          .crm-layout {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .crm-main-content,
          .crm-main-content.collapsed {
            margin-left: 0 !important;
            margin-top: calc(58px + var(--announcement-height, 0px) + 6px) !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding: 16px 14px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .ultra-hero {
            padding: 22px 20px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
            min-height: auto !important;
          }

          .header-action-buttons {
            flex-wrap: wrap !important;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 14px !important;
          }

          .roles-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 14px !important;
          }

          .table-responsive {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .matrix-table {
            min-width: 720px !important;
          }
        }

        @media (max-width: 768px) {
          .crm-main-content,
          .crm-main-content.collapsed {
            padding: 12px 10px !important;
            gap: 14px !important;
          }

          .ultra-hero {
            padding: 16px 14px !important;
            border-radius: 18px !important;
            gap: 14px !important;
          }

          .hero-title-text {
            font-size: 1.3rem !important;
          }

          .hero-desc {
            font-size: 0.82rem !important;
            max-width: 100% !important;
          }

          .header-action-buttons {
            flex-direction: column !important;
            width: 100% !important;
            gap: 8px !important;
            align-items: stretch !important;
          }

          .ultra-create-btn {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 11px 16px !important;
            font-size: 0.88rem !important;
            box-sizing: border-box !important;
          }

          .role-tabs-bar {
            flex-direction: column !important;
            width: 100% !important;
            padding: 6px !important;
            gap: 6px !important;
            border-radius: 16px !important;
          }

          .tab-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 14px !important;
            font-size: 0.84rem !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }

          .roles-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            width: 100% !important;
          }

          .role-card {
            padding: 16px 14px !important;
            border-radius: 18px !important;
            gap: 12px !important;
          }

          .role-card-header {
            gap: 10px !important;
            flex-wrap: wrap !important;
          }

          .role-title-wrap {
            gap: 10px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .role-badge-icon {
            width: 38px !important;
            height: 38px !important;
            border-radius: 11px !important;
          }

          .role-name {
            font-size: 1.05rem !important;
            white-space: normal !important;
            word-break: break-word !important;
          }

          .role-actions {
            gap: 6px !important;
          }

          .role-desc {
            font-size: 0.82rem !important;
          }

          .perms-tags-wrap {
            gap: 6px !important;
          }

          .badge {
            font-size: 0.68rem !important;
            padding: 4px 8px !important;
          }

          /* Tab 2 Matrix comparison */
          .matrix-table-container {
            padding: 14px 12px !important;
            border-radius: 16px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .table-header-info h3 {
            font-size: 1.15rem !important;
          }

          .table-header-info p {
            font-size: 0.78rem !important;
          }

          .matrix-table {
            min-width: 650px !important;
          }

          .matrix-table th,
          .matrix-table td {
            padding: 10px 10px !important;
          }

          .th-module {
            min-width: 160px !important;
          }

          .th-perm {
            min-width: 130px !important;
          }

          .th-role {
            min-width: 95px !important;
          }

          /* Modal Bottom-Sheet for Roles */
          .modal-backdrop {
            padding: 0 !important;
            align-items: flex-end !important;
          }

          .modal-card,
          .role-modal-card {
            width: 100vw !important;
            max-width: 100vw !important;
            max-height: 94vh !important;
            border-radius: 20px 20px 0 0 !important;
            padding: 16px 14px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }

          .modal-header {
            padding-bottom: 12px !important;
            margin-bottom: 14px !important;
          }

          .modal-title-wrap {
            gap: 10px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }

          .modal-icon-badge {
            width: 38px !important;
            height: 38px !important;
            border-radius: 12px !important;
          }

          .modal-title-wrap h3 {
            font-size: 1.15rem !important;
          }

          .modal-subtitle {
            font-size: 0.78rem !important;
          }

          .modal-form {
            gap: 16px !important;
          }

          .form-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .custom-input {
            padding: 11px 14px !important;
            font-size: 0.88rem !important;
          }

          .perms-matrix-box {
            padding: 14px 12px !important;
            border-radius: 16px !important;
          }

          .matrix-title {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            margin-bottom: 12px !important;
            padding-bottom: 10px !important;
          }

          .m-title-left {
            font-size: 0.9rem !important;
          }

          .matrix-title-right {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }

          .preset-btn-group {
            width: 100% !important;
            justify-content: space-between !important;
            display: flex !important;
          }

          .preset-btn {
            flex: 1 !important;
            text-align: center !important;
            padding: 6px 4px !important;
            font-size: 0.7rem !important;
          }

          .selected-count-badge {
            width: 100% !important;
            text-align: center !important;
            box-sizing: border-box !important;
            padding: 5px 10px !important;
            font-size: 0.75rem !important;
          }

          .perm-groups-list {
            max-height: 42vh !important;
            padding-right: 2px !important;
            gap: 14px !important;
          }

          .group-matrix-row {
            padding: 12px 10px !important;
            border-radius: 14px !important;
          }

          .group-row-header {
            gap: 8px !important;
            margin-bottom: 10px !important;
          }

          .group-name {
            font-size: 0.9rem !important;
          }

          .checkbox-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .perm-card-check {
            padding: 10px 10px !important;
            gap: 10px !important;
          }

          .p-title {
            font-size: 0.82rem !important;
          }

          .modal-footer {
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .modal-footer .btn,
          .btn-save {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 11px 16px !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 640px) {
          .kpi-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .kpi-card {
            padding: 14px 16px !important;
            min-height: auto !important;
            border-radius: 16px !important;
            gap: 14px !important;
          }

          .kpi-icon-wrapper {
            width: 44px !important;
            height: 44px !important;
            border-radius: 12px !important;
          }

          .kpi-val {
            font-size: 1.55rem !important;
          }

          .kpi-lbl {
            font-size: 0.72rem !important;
          }
        }

        @media (max-width: 480px) {
          .crm-main-content,
          .crm-main-content.collapsed {
            padding: 10px 8px !important;
            gap: 12px !important;
          }

          .ultra-hero {
            padding: 14px 12px !important;
            border-radius: 16px !important;
          }

          .hero-title-text {
            font-size: 1.18rem !important;
          }

          .hero-desc {
            font-size: 0.78rem !important;
          }

          .ultra-live-badge {
            font-size: 0.68rem !important;
            padding: 4px 12px !important;
          }

          .kpi-card {
            padding: 12px 14px !important;
            gap: 12px !important;
          }

          .kpi-val {
            font-size: 1.4rem !important;
          }

          .role-card {
            padding: 14px 12px !important;
            border-radius: 16px !important;
          }

          .role-name {
            font-size: 1rem !important;
          }

          .modal-card,
          .role-modal-card {
            padding: 14px 12px !important;
          }

          .modal-title-wrap h3 {
            font-size: 1.05rem !important;
          }
        }
      `}</style>
    </div>
  );
}
