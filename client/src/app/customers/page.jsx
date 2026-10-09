'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import LeadCustomerModal from '../../components/customers/LeadCustomerModal';
import ManageFollowUpModal from '../../components/customers/ManageFollowUpModal';
import TransferLeadModal from '../../components/customers/TransferLeadModal';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import { getStoredLeads, getStoredFollowups, saveLead, updateLead, deleteLead, transferLead, bulkTransferLeads, filterByRole, getSubordinateUsers, isAdminUser, syncCrmStoreWithBackendApi } from '../../utils/crmStore';
import {
  Users, Plus, Search, Mail, Phone, Building2, Trash2, Edit,
  CheckCircle, CheckCircle2, Sparkles, Filter, RefreshCw, X, Hash, MapPin,
  TrendingUp, Flame, Snowflake, Target, ChevronRight, UserCheck, ChevronDown, Check,
  ShieldCheck, LayoutGrid, List, Globe, ExternalLink,
  Calendar, Clock, Tag, FileText, RotateCcw, ArrowRightLeft
} from 'lucide-react';

// Get Initials for Avatar
const getInitials = (name) => {
  if (!name) return 'CU';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Status Badge Config
const getStatusBadge = (statusKey) => {
  const st = (statusKey || 'cold').toLowerCase();
  switch (st) {
    case 'hot':
      return { label: 'HOT', icon: TrendingUp, cls: 'badge-hot' };
    case 'warm':
      return { label: 'WARM', icon: Flame, cls: 'badge-warm' };
    case 'prospect':
      return { label: 'PROSPECT', icon: Target, cls: 'badge-prospect' };
    default:
      return { label: 'COLD', icon: Snowflake, cls: 'badge-cold' };
  }
};

/* ══════════════════════════════════════════════════════════════════════
   CUSTOM PRO EMPLOYEE FILTER DROPDOWN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
function CustomEmployeeFilterDropdown({
  selectedEmpFilter,
  setSelectedEmpFilter,
  customers,
  allowedEmployees
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  let selectedLabel = `All Employees (${customers.length})`;
  if (selectedEmpFilter !== 'all') {
    const foundEmp = allowedEmployees.find(emp => String(emp._id || emp.id) === String(selectedEmpFilter));
    if (foundEmp) {
      const empName = foundEmp.name || foundEmp.username || 'Employee';
      const count = customers.filter(c =>
        String(c.assignedToId || '') === String(foundEmp._id || foundEmp.id) ||
        String(c.createdById || '') === String(foundEmp._id || foundEmp.id) ||
        String(c.assignedTo || '').toLowerCase() === empName.toLowerCase()
      ).length;
      selectedLabel = `${empName} (${count} leads)`;
    }
  }

  return (
    <div className="cp-emp-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`cp-emp-filter-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Filter Customers by Assigned Employee"
      >
        <UserCheck size={16} className="cp-emp-filter-ico" />
        <span className="cp-emp-trigger-text">{selectedLabel}</span>
        <ChevronDown size={14} className={`cp-emp-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="cp-emp-dropdown-menu">
          <div className="cp-emp-dropdown-header">
            <span>Filter by Employee</span>
          </div>

          <div className="cp-emp-dropdown-list">
            <div
              className={`cp-emp-dropdown-item ${selectedEmpFilter === 'all' ? 'selected' : ''}`}
              onClick={() => {
                setSelectedEmpFilter('all');
                setIsOpen(false);
              }}
            >
              <div className="cp-emp-item-left">
                <div className="cp-emp-avatar all">
                  <Users size={14} />
                </div>
                <span className="cp-emp-name">All Employees</span>
              </div>
              <span className="cp-emp-badge">{customers.length}</span>
            </div>

            {allowedEmployees.map((emp) => {
              const empId = emp._id || emp.id;
              const empName = emp.name || emp.username || 'Employee';
              const count = customers.filter(c =>
                String(c.assignedToId || '') === String(empId) ||
                String(c.createdById || '') === String(empId) ||
                String(c.assignedTo || '').toLowerCase() === empName.toLowerCase()
              ).length;
              const isSelected = String(selectedEmpFilter) === String(empId);
              const initial = empName.charAt(0).toUpperCase();

              return (
                <div
                  key={empId}
                  className={`cp-emp-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedEmpFilter(empId);
                    setIsOpen(false);
                  }}
                >
                  <div className="cp-emp-item-left">
                    <div className="cp-emp-avatar">
                      {initial}
                    </div>
                    <span className="cp-emp-name">{empName}</span>
                  </div>
                  <div className="cp-emp-item-right">
                    <span className="cp-emp-badge">{count} {count === 1 ? 'lead' : 'leads'}</span>
                    {isSelected && <Check size={14} className="cp-emp-check-ico" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MEMOIZED CUSTOMER CARD (GRID VIEW) - ZERO RE-RENDER LAG
   ══════════════════════════════════════════════════════════════════════ */
const CustomerCard = React.memo(function CustomerCard({
  c,
  isFlipped,
  isNoteExpanded,
  matchingFup,
  canEdit,
  canDelete,
  canTransfer,
  isSelected,
  onFlip,
  onToggleNote,
  onOpenNoteModal,
  onEdit,
  onDelete,
  onManageFollowup,
  onTransfer,
  onToggleSelect
}) {
  const sBadge = getStatusBadge(c.status);
  const StatusIcon = sBadge.icon;
  const displayName = c.customerName || c.contactPerson || c.name || 'Unnamed Client';
  const displayCompany = c.company || c.companyName || 'Individual Client';

  const dynamicNextDate = matchingFup?.nextFollowupDate && matchingFup.nextFollowupDate !== '—'
    ? matchingFup.nextFollowupDate
    : (c.nextFollowupDate && c.nextFollowupDate !== '—' ? c.nextFollowupDate : new Date().toISOString().split('T')[0]);

  const dynamicTime = matchingFup?.preferredTime || c.preferredTime || '14:00';
  const dynamicType = matchingFup?.followupType || c.followupType || 'Telephonic';
  const dynamicNotes = matchingFup?.notes || c.followupNotes || 'Follow-up interaction scheduled.';

  return (
    <div className={`cp-card${isFlipped ? ' is-flipped' : ''}${isSelected ? ' is-selected' : ''}`}>
      <div className="cp-card-inner">
        {/* ── FRONT FACE (CUSTOMER DETAILS) ──────────────── */}
        <div className="cp-card-front">
          {/* CARD HEADER */}
          <div className="cp-card-hdr">
            <div
              className={`cp-card-select-wrap ${isSelected ? 'selected' : ''}`}
              onClick={(e) => onToggleSelect(c.id, e)}
              title={isSelected ? "Deselect Lead" : "Select Lead for Bulk Transfer"}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="cp-card-checkbox"
              />
            </div>
            <div className="cp-card-avatar">{getInitials(displayName)}</div>
            <div className="cp-card-hdr-info">
              <h3 className="cp-card-name">{displayName}</h3>
              <div className="cp-card-company">
                <Building2 size={13} className="cp-card-ico" />
                <span>{displayCompany}</span>
              </div>
            </div>
            <span className={`cp-status-badge ${sBadge.cls}`}>
              <StatusIcon size={12} />
              <span>{sBadge.label}</span>
            </span>
          </div>

          <div className="cp-card-divider" />

          {/* CARD BODY DETAILS */}
          <div className="cp-card-body">
            {/* INQUIRY NO BADGE */}
            <div className="cp-card-row">
              <span className="cp-card-lbl"><Hash size={13} /> Inquiry No:</span>
              <span className="cp-inquiry-pill">{c.inquiryNo || '#JUL26-000'}</span>
            </div>

            {/* EMAIL */}
            <div className="cp-card-row">
              <span className="cp-card-lbl"><Mail size={13} /> Email:</span>
              <span className="cp-card-val text-ellipsis">{c.email || '—'}</span>
            </div>

            {/* PHONE */}
            <div className="cp-card-row">
              <span className="cp-card-lbl"><Phone size={13} /> Phone:</span>
              <span className="cp-card-val font-mono">{c.phone || c.primaryContact || '—'}</span>
            </div>

            {/* LOCATION */}
            {(c.city || c.state) && (
              <div className="cp-card-row">
                <span className="cp-card-lbl"><MapPin size={13} /> Location:</span>
                <span className="cp-card-val">{[c.city, c.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* CARD FOOTER ACTIONS */}
          <div className="cp-card-ftr">
            <button
              type="button"
              onClick={(e) => onFlip(c.id, e)}
              className="cp-card-btn cp-card-fup-trigger"
              title="Click to flip and view Next FollowUp Schedule & Notes"
            >
              <Sparkles size={13} className="cp-fup-btn-sparkle" />
              <span>Followup Details</span>
            </button>
            {canTransfer && (
              <button
                onClick={(e) => { e.stopPropagation(); onTransfer(c); }}
                className="cp-card-btn cp-card-transfer"
                type="button"
                title="Transfer Lead Ownership to another Employee"
              >
                <ArrowRightLeft size={13} />
                <span>Transfer</span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(c)}
                className="cp-card-btn cp-card-edit"
                type="button"
                title="Edit Customer Details"
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(c.id, displayName)}
                className="cp-card-btn cp-card-del"
                type="button"
                title="Delete Customer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── BACK FACE (3D FLIP REVEAL: NEXT ACTION SCHEDULE) ── */}
        <div className="cp-card-back">
          <div className="cp-back-hdr">
            <div className="cp-back-title">
              <Calendar size={15} className="cp-back-ico" />
              <span>Next Action Schedule</span>
            </div>
            <span className={`cp-status-badge ${sBadge.cls}`}>
              <span>{sBadge.label}</span>
            </span>
          </div>

          {/* INNER SCROLL BODY (CONTAINED WITHIN CARD BOUNDARIES) */}
          <div className="cp-back-body-scroll">
            <div className="cp-back-grid">
              <div className="cp-back-item">
                <span className="cp-back-lbl"><Calendar size={12} /> REMINDER DATE</span>
                <span className="cp-back-val">{dynamicNextDate}</span>
              </div>
              <div className="cp-back-item">
                <span className="cp-back-lbl"><Clock size={12} /> PREFERRED TIME</span>
                <span className="cp-back-val">{dynamicTime}</span>
              </div>
            </div>

            <div className="cp-back-sec">
              <span className="cp-back-lbl"><Tag size={12} /> FOLLOWUP CHANNEL</span>
              <span className="cp-back-channel-pill">{dynamicType}</span>
            </div>

            <div className="cp-back-sec">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span className="cp-back-lbl"><FileText size={12} /> FOLLOWUP NOTES</span>
                {dynamicNotes && dynamicNotes.length > 50 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNoteModal({
                          customerName: displayName,
                          inquiryNo: c.inquiryNo,
                          date: dynamicNextDate,
                          time: dynamicTime,
                          notes: dynamicNotes,
                          channel: dynamicType
                        });
                      }}
                      className="cp-notes-toggle-btn"
                      title="Open Dedicated Full Note Window"
                    >
                      Modal View ↗
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onToggleNote(c.id, e)}
                      className="cp-notes-toggle-btn"
                      title="Expand inline note"
                    >
                      {isNoteExpanded ? 'Less ▲' : 'Expand ▾'}
                    </button>
                  </div>
                )}
              </div>
              <p
                className={`cp-back-notes ${isNoteExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  if (dynamicNotes && dynamicNotes.length > 50) {
                    onToggleNote(c.id, e);
                  }
                }}
                title={dynamicNotes}
                style={{ cursor: dynamicNotes && dynamicNotes.length > 50 ? 'pointer' : 'default' }}
              >
                "{dynamicNotes}"
              </p>
            </div>
          </div>

          <div className="cp-back-ftr">
            <button
              type="button"
              onClick={(e) => onFlip(c.id, e)}
              className="cp-back-flip-btn"
            >
              <RotateCcw size={12} />
              <span>Click to flip back</span>
            </button>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onManageFollowup(c); }}
                className="cp-back-edit-btn"
                type="button"
                title="Manage & Log Next Follow-Up Schedule"
              >
                <RefreshCw size={13} />
                <span>Update Schedule</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.c === nextProps.c &&
    prevProps.isFlipped === nextProps.isFlipped &&
    prevProps.isNoteExpanded === nextProps.isNoteExpanded &&
    prevProps.matchingFup === nextProps.matchingFup &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.canTransfer === nextProps.canTransfer &&
    prevProps.isSelected === nextProps.isSelected
  );
});

/* ══════════════════════════════════════════════════════════════════════
   MEMOIZED CUSTOMER TABLE ROW (LIST VIEW) - ZERO RE-RENDER LAG
   ══════════════════════════════════════════════════════════════════════ */
const CustomerTableRow = React.memo(function CustomerTableRow({
  c,
  canEdit,
  canDelete,
  canTransfer,
  isSelected,
  onEdit,
  onDelete,
  onTransfer,
  onToggleSelect
}) {
  const sBadge = getStatusBadge(c.status);
  const StatusIcon = sBadge.icon;
  const displayName = c.customerName || c.contactPerson || c.name || 'Unnamed Client';
  const displayCompany = c.company || c.companyName || 'Individual Client';

  return (
    <tr className={`cp-tr${isSelected ? ' is-selected' : ''}`}>
      {/* SELECT CHECKBOX */}
      <td className="cp-td-select" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(c.id, e)}
          className="cp-table-checkbox"
          title={isSelected ? "Deselect lead" : "Select lead for bulk transfer"}
        />
      </td>

      {/* CUSTOMER NAME WITH AVATAR */}
      <td>
        <div className="cp-name-cell">
          <div className="cp-avatar">{getInitials(displayName)}</div>
          <div>
            <div className="cp-cust-name">{displayName}</div>
            {c.contactPerson && c.contactPerson !== displayName && (
              <div className="cp-cust-sub">Contact: {c.contactPerson}</div>
            )}
          </div>
        </div>
      </td>

      {/* COMPANY */}
      <td>
        <div className="cp-company-cell">
          <Building2 size={14} className="cp-cell-ico" />
          <span className="cp-comp-name">{displayCompany}</span>
        </div>
      </td>

      {/* EMAIL */}
      <td>
        <div className="cp-email-cell">
          <Mail size={14} className="cp-cell-ico" />
          <span className="cp-email-txt">{c.email || '—'}</span>
        </div>
      </td>

      {/* PHONE */}
      <td>
        <div className="cp-phone-cell">
          <Phone size={14} className="cp-cell-ico" />
          <span className="cp-phone-txt">{c.phone || c.primaryContact || '—'}</span>
        </div>
      </td>

      {/* INQUIRY NO */}
      <td>
        <div className="cp-center-cell">
          <span className="cp-inquiry-pill">
            {c.inquiryNo || '#JUL26-000'}
          </span>
        </div>
      </td>

      {/* STATUS */}
      <td>
        <div className="cp-center-cell">
          <span className={`cp-status-badge ${sBadge.cls}`}>
            <StatusIcon size={12} className="cp-st-ico" />
            <span>{sBadge.label}</span>
          </span>
        </div>
      </td>

      {/* ACTIONS */}
      <td>
        <div className="cp-actions">
          {canTransfer && (
            <button
              onClick={() => onTransfer(c)}
              className="cp-act-btn cp-transfer-btn"
              title="Transfer Lead Ownership to another Employee"
              type="button"
            >
              <ArrowRightLeft size={15} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => onEdit(c)}
              className="cp-act-btn cp-edit-btn"
              title="Edit Customer Profile"
              type="button"
            >
              <Edit size={15} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(c.id, displayName)}
              className="cp-act-btn cp-del-btn"
              title="Delete Customer Profile"
              type="button"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.c === nextProps.c &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.canTransfer === nextProps.canTransfer &&
    prevProps.isSelected === nextProps.isSelected
  );
});

/* ══════════════════════════════════════════════════════════════════════
   MAIN CUSTOMERS PAGE CONTAINER
   ══════════════════════════════════════════════════════════════════════ */
export default function CustomersPage() {
  const { user, can, sidebarCollapsed } = useAuth();
  const [customers, setCustomers]         = useState([]);
  const [employees, setEmployees]         = useState([]);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [viewMode, setViewMode]           = useState('grid'); // 'grid' | 'list'
  
  // Modal states
  const [showModal, setShowModal]         = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Manage External FollowUp Modal state
  const [showManageFupModal, setShowManageFupModal] = useState(false);
  const [manageFupTarget, setManageFupTarget]       = useState(null);

  // Transfer Lead Modal state & Employee Filter state
  const [showTransferModal, setShowTransferModal]   = useState(false);
  const [transferTarget, setTransferTarget]         = useState(null);
  const [selectedEmpFilter, setSelectedEmpFilter]   = useState('all');

  // Bulk Lead Selection state
  const [selectedLeadIds, setSelectedLeadIds]       = useState(new Set());

  // Compute allowed employees for the logged-in user (Admins see all; Non-Admins see hierarchy team)
  const allowedEmployees = useMemo(() => {
    if (isAdminUser(user)) {
      return employees;
    }
    return getSubordinateUsers(user, employees);
  }, [user, employees]);

  // Flipped Card & Expanded Notes state
  const [flippedCardIds, setFlippedCardIds]          = useState({});
  const [expandedNotes, setExpandedNotes]            = useState({});
  const [noteModalData, setNoteModalData]            = useState(null);
  const [followupVersion, setFollowupVersion]        = useState(0);

  // Infinite virtual scrolling chunk size for rendering 10,000+ items smoothly
  const [displayLimit, setDisplayLimit]              = useState(36);
  const scrollSentinelRef = useRef(null);

  const toggleFlip = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setFlippedCardIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const toggleNoteExpand = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const employeesRef = useRef(employees);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const loadData = useCallback((empList = null) => {
    const rawLeads = getStoredLeads();
    const effectiveEmployees = empList || employeesRef.current || [];
    // Scope customer records according to User Role & Manager Hierarchy
    const scopedLeads = filterByRole(rawLeads, user, effectiveEmployees);

    // Pre-index normalized search string for ultra-fast matching
    const preparedLeads = scopedLeads.map(c => ({
      ...c,
      _searchIndex: [
        c.customerName,
        c.contactPerson,
        c.name,
        c.company,
        c.companyName,
        c.email,
        c.phone,
        c.primaryContact,
        c.inquiryNo
      ].filter(Boolean).join(' ').toLowerCase()
    }));

    setCustomers(preparedLeads);
    setFollowupVersion(prev => prev + 1);
  }, [user]);

  const followupsMap = useMemo(() => {
    const fupList = getStoredFollowups();
    const map = new Map();
    fupList.forEach(f => {
      if (f.leadId) map.set(String(f.leadId), f);
      if (f.inquiryNo) map.set(String(f.inquiryNo), f);
      if (f.phone) map.set(String(f.phone), f);
    });
    return map;
  }, [followupVersion]);

  useEffect(() => {
    loadData();

    // Background sync with MongoDB
    syncCrmStoreWithBackendApi().then(() => {
      loadData();
    });

    let debounceTimer = null;
    const handleStoreUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData();
      }, 50);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm_store_updated', handleStoreUpdate);
    }

    async function loadEmployees() {
      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('crm_token') || sessionStorage.getItem('token') || localStorage.getItem('crm_token') || localStorage.getItem('token'))
        : null;
      if (!token) return;

      try {
        const res = await userService.getStaffDirectory();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setEmployees(prev => {
            if (prev.length === res.data.length && prev[0]?._id === res.data[0]?._id) {
              return prev;
            }
            return res.data;
          });
          employeesRef.current = res.data;
          loadData(res.data);
        }
      } catch (e) {
        // Quiet fallback if backend token is missing
      }
    }
    loadEmployees();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_store_updated', handleStoreUpdate);
      }
    };
  }, [user, loadData]);

  const handleCreateOrUpdateSubmit = useCallback((payload) => {
    if (editingCustomer) {
      updateLead(editingCustomer.id, payload);
    } else {
      saveLead(payload, user);
    }
    loadData();
    setShowModal(false);
    setEditingCustomer(null);
  }, [editingCustomer, user, loadData]);

  const openManageFollowup = useCallback((cust) => {
    setManageFupTarget(cust);
    setShowManageFupModal(true);
  }, []);

  const toggleSelectLead = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      const idStr = String(id);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  const openTransferModal = useCallback((cust) => {
    setTransferTarget(cust);
    setShowTransferModal(true);
  }, []);

  const handleTransferConfirm = useCallback((leadIdOrIds, targetEmployee, transferNote) => {
    if (Array.isArray(leadIdOrIds)) {
      bulkTransferLeads(leadIdOrIds, targetEmployee, user, transferNote);
      setSelectedLeadIds(new Set());
    } else {
      transferLead(leadIdOrIds, targetEmployee, user, transferNote);
    }
    loadData();
  }, [user, loadData]);

  const handleDelete = useCallback((id, name) => {
    if (confirm(`Are you sure you want to delete "${name || 'this customer'}"?`)) {
      deleteLead(id);
      loadData();
    }
  }, [loadData]);

  const openAddModal = useCallback(() => {
    setEditingCustomer(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  }, []);

  // Filtering (Ultra-fast memoized)
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch = !query || (c._searchIndex && c._searchIndex.includes(query));
      const matchStatus = statusFilter === 'all' || (c.status || 'cold').toLowerCase() === statusFilter.toLowerCase();
      
      let matchEmp = true;
      if (selectedEmpFilter && selectedEmpFilter !== 'all') {
        const targetStr = String(selectedEmpFilter).toLowerCase().trim();
        const assignedId = String(c.assignedToId || '').toLowerCase().trim();
        const assignedName = String(c.assignedTo || '').toLowerCase().trim();
        const createdId = String(c.createdById || '').toLowerCase().trim();
        const createdName = String(c.createdBy || '').toLowerCase().trim();

        matchEmp = (assignedId === targetStr || createdId === targetStr || assignedName === targetStr || createdName === targetStr);
      }

      return matchSearch && matchStatus && matchEmp;
    });
  }, [customers, search, statusFilter, selectedEmpFilter]);

  const toggleSelectAll = useCallback(() => {
    if (selectedLeadIds.size >= filtered.length && filtered.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      const allIds = new Set(filtered.map(c => String(c.id)));
      setSelectedLeadIds(allIds);
    }
  }, [filtered, selectedLeadIds.size]);

  // Reset display limit when filter/search changes
  useEffect(() => {
    setDisplayLimit(36);
  }, [search, statusFilter, viewMode]);

  // Infinite scroll observer for virtual chunk loading
  useEffect(() => {
    if (!scrollSentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit((prev) => Math.min(prev + 36, filtered.length));
      }
    }, { rootMargin: '300px' });

    observer.observe(scrollSentinelRef.current);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleCustomers = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  const canEdit = can('customers:edit');
  const canDelete = can('customers:delete');

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Customer Directory" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* ══ PAGE ACTION HEADER ════════════════════════════════ */}
        <div className="cp-header-card">
          <div className="cp-hdr-left">
            <div className="cp-hdr-icon">
              <Users size={24} />
            </div>
            <div>
              <div className="cp-hdr-badge-row">
                <span className="cp-badge-pro"><Sparkles size={11} /> SANMORA CRM</span>
                <span className="cp-count-pill">{customers.length} Accounts Registered</span>
              </div>
              <h2 className="cp-hdr-title">Customer Directory</h2>
              <p className="cp-hdr-sub">Manage client profiles, contact history, and enterprise accounts</p>
            </div>
          </div>

          <div className="cp-hdr-actions">
            {/* GRID / LIST VIEW TOGGLE SWITCH */}
            <div className="cp-view-toggle">
              <button
                type="button"
                className={`cp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                className={`cp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Table List View"
              >
                <List size={17} />
              </button>
            </div>

            {can('customers:add') && (
              <button onClick={openAddModal} className="cp-btn-add" type="button">
                <Plus size={18} />
                <span>Add New Customer</span>
                <div className="cp-btn-shimmer" />
              </button>
            )}
          </div>
        </div>

        {/* ══ FILTER & SEARCH CONTROL BAR ══════════════════════ */}
        <div className="cp-control-bar">
          {/* SEARCH INPUT */}
          <div className="cp-search-wrap">
            <Search size={20} className="cp-search-ico" />
            <input
              type="text"
              placeholder="Search by customer name, company, email, phone or inquiry #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cp-search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="cp-search-clear" type="button">
                <X size={14} />
              </button>
            )}
          </div>

          {/* STATUS FILTER PILLS */}
          <div className="cp-filter-pills">
            {[
              { key: 'all', label: 'All Accounts' },
              { key: 'warm', label: 'Warm' },
              { key: 'hot', label: 'Hot' },
              { key: 'prospect', label: 'Prospect' },
              { key: 'cold', label: 'Cold' },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`cp-filter-pill ${active ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* SELECT ALL BULK FILTER TOGGLE PILL */}
            <button
              type="button"
              className={`cp-filter-pill cp-select-all-pill ${selectedLeadIds.size > 0 ? 'active' : ''}`}
              onClick={toggleSelectAll}
              title="Select or Deselect All Visible Customer Leads"
            >
              <CheckCircle2 size={13} />
              <span>
                {selectedLeadIds.size >= filtered.length && filtered.length > 0
                  ? 'Deselect All'
                  : `Select All (${filtered.length})`}
              </span>
            </button>
          </div>

          {/* EMPLOYEE FILTER SELECTOR */}
          <CustomEmployeeFilterDropdown
            selectedEmpFilter={selectedEmpFilter}
            setSelectedEmpFilter={setSelectedEmpFilter}
            customers={customers}
            allowedEmployees={allowedEmployees}
          />
        </div>

        {/* ══ CONDITIONAL RENDER: GRID VIEW VS TABLE LIST VIEW ═ */}
        {viewMode === 'grid' ? (
          /* ── GRID CARDS VIEW ─────────────────────────────── */
          <div className="cp-grid-container">
            {filtered.length === 0 ? (
              <div className="cp-empty-card">
                <Users size={38} className="cp-empty-ico" />
                <h4>No Customer Records Found</h4>
                <p>Try adjusting your search query or filter settings</p>
                {search && (
                  <button onClick={() => setSearch('')} className="cp-btn-reset" type="button">
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              visibleCustomers.map((c) => {
                const matchingFup = followupsMap.get(String(c.id)) || (c.inquiryNo && followupsMap.get(String(c.inquiryNo))) || (c.phone && followupsMap.get(String(c.phone)));
                return (
                  <CustomerCard
                    key={c.id}
                    c={c}
                    isFlipped={!!flippedCardIds[c.id]}
                    isNoteExpanded={!!expandedNotes[c.id]}
                    matchingFup={matchingFup}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canTransfer={canEdit || true}
                    isSelected={selectedLeadIds.has(String(c.id))}
                    onFlip={toggleFlip}
                    onToggleNote={toggleNoteExpand}
                    onOpenNoteModal={setNoteModalData}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onManageFollowup={openManageFollowup}
                    onTransfer={openTransferModal}
                    onToggleSelect={toggleSelectLead}
                  />
                );
              })
            )}
          </div>
        ) : (
          /* ── TABLE LIST VIEW ─────────────────────────────── */
          <div className="cp-table-card">
            <table className="cp-table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedLeadIds.size >= filtered.length}
                      onChange={toggleSelectAll}
                      title="Select / Deselect All Filtered Leads"
                      className="cp-table-checkbox"
                    />
                  </th>
                  <th style={{ width: '22%' }}>
                    <div className="cp-th-wrap">
                      <Users size={14} className="cp-th-ico" />
                      <span>CUSTOMER NAME</span>
                    </div>
                  </th>
                  <th style={{ width: '18%' }}>
                    <div className="cp-th-wrap">
                      <Building2 size={14} className="cp-th-ico" />
                      <span>COMPANY</span>
                    </div>
                  </th>
                  <th style={{ width: '20%' }}>
                    <div className="cp-th-wrap">
                      <Mail size={14} className="cp-th-ico" />
                      <span>EMAIL ADDRESS</span>
                    </div>
                  </th>
                  <th style={{ width: '15%' }}>
                    <div className="cp-th-wrap">
                      <Phone size={14} className="cp-th-ico" />
                      <span>PHONE NUMBER</span>
                    </div>
                  </th>
                  <th style={{ width: '12%' }}>
                    <div className="cp-th-wrap center">
                      <Hash size={14} className="cp-th-ico" />
                      <span>INQUIRY NO</span>
                    </div>
                  </th>
                  <th style={{ width: '11%' }}>
                    <div className="cp-th-wrap center">
                      <ShieldCheck size={14} className="cp-th-ico" />
                      <span>STATUS</span>
                    </div>
                  </th>
                  <th style={{ width: '8%' }}>
                    <div className="cp-th-wrap center">
                      <span>ACTIONS</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="cp-empty-td">
                      <div className="cp-empty-box">
                        <Users size={36} className="cp-empty-ico" />
                        <h4>No Customer Records Found</h4>
                        <p>Try adjusting your search query or filter settings</p>
                        {search && (
                          <button onClick={() => setSearch('')} className="cp-btn-reset" type="button">
                            Clear Search Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleCustomers.map((c) => (
                    <CustomerTableRow
                      key={c.id}
                      c={c}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      canTransfer={canEdit || true}
                      isSelected={selectedLeadIds.has(String(c.id))}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onTransfer={openTransferModal}
                      onToggleSelect={toggleSelectLead}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Scroll Sentinel for virtual infinite loading */}
        {visibleCustomers.length < filtered.length && (
          <div ref={scrollSentinelRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.82rem' }}>
            <span>Loading additional records... ({visibleCustomers.length} of {filtered.length})</span>
          </div>
        )}
      </main>

      {/* LEAD & CUSTOMER MODAL */}
      <LeadCustomerModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleCreateOrUpdateSubmit}
        initialData={editingCustomer}
        isEdit={!!editingCustomer}
        employees={employees}
        currentUser={user}
      />

      {/* DEDICATED MANAGE FOLLOWUP & TIMELINE HISTORY MODAL */}
      <ManageFollowUpModal
        isOpen={showManageFupModal}
        onClose={() => {
          setShowManageFupModal(false);
          setManageFupTarget(null);
        }}
        customer={manageFupTarget}
        followup={manageFupTarget}
        employees={employees}
        currentUser={user}
        onSaved={() => {
          loadData();
        }}
      />

      {/* TRANSFER LEAD MODAL */}
      <TransferLeadModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferTarget(null);
        }}
        customer={Array.isArray(transferTarget) ? null : transferTarget}
        customers={Array.isArray(transferTarget) ? transferTarget : []}
        employees={employees}
        currentUser={user}
        onTransferConfirm={handleTransferConfirm}
      />

      {/* ══ FLOATING BULK ACTION BAR ════════════════════════════ */}
      {selectedLeadIds.size > 0 && (
        <div className="cp-bulk-bar-overlay">
          <div className="cp-bulk-bar">
            <div className="cp-bulk-left">
              <div className="cp-bulk-count-badge">
                {selectedLeadIds.size}
              </div>
              <div className="cp-bulk-info-text">
                <span className="cp-bulk-title">
                  {selectedLeadIds.size === 1 ? '1 Customer Selected' : `${selectedLeadIds.size} Customers Selected`}
                </span>
                <span className="cp-bulk-subtitle">
                  Ready for batch lead transfer across team members
                </span>
              </div>
            </div>

            <div className="cp-bulk-actions">
              <button
                type="button"
                className="cp-bulk-btn cp-bulk-secondary"
                onClick={toggleSelectAll}
              >
                {selectedLeadIds.size >= filtered.length ? 'Deselect All' : `Select All (${filtered.length})`}
              </button>

              <button
                type="button"
                className="cp-bulk-btn cp-bulk-primary"
                onClick={() => {
                  const selectedCustomers = customers.filter(c => selectedLeadIds.has(String(c.id)));
                  setTransferTarget(selectedCustomers);
                  setShowTransferModal(true);
                }}
              >
                <ArrowRightLeft size={16} />
                <span>Transfer Selected ({selectedLeadIds.size})</span>
              </button>

              <button
                type="button"
                className="cp-bulk-btn cp-bulk-close"
                onClick={clearSelection}
                title="Clear Selection"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED FULL NOTE VIEW POPUP MODAL */}
      {noteModalData && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-card glass-card animate-fade-in" style={{ maxWidth: '580px', width: '92%', padding: '24px', borderRadius: '20px', background: '#0F172A', border: '1.5px solid #3B82F6', color: '#FFFFFF', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: '#38BDF8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {noteModalData.customerName || 'Customer Follow-Up Note'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                    Inquiry {noteModalData.inquiryNo || ''} • Channel: {noteModalData.channel || 'Telephonic'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalData(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#CBD5E1', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>REMINDER DATE</span>
                <div style={{ fontWeight: 700, color: '#38BDF8' }}>{noteModalData.date || '—'}</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>PREFERRED TIME</span>
                <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{noteModalData.time || '—'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                FULL FOLLOW-UP NOTES CONTENT
              </label>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px', fontSize: '0.88rem', lineHeight: '1.6', color: '#E2E8F0', maxHeight: '250px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {noteModalData.notes}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(noteModalData.notes || '');
                  alert('Full note copied to clipboard!');
                }}
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Copy Text
              </button>
              <button
                type="button"
                onClick={() => setNoteModalData(null)}
                style={{ background: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── CUSTOMER DIRECTORY PRO PAGE STYLING ────────────── */
        .crm-layout {
          display: flex;
          min-height: 100vh;
          background: transparent;
        }

        .crm-main-content {
          margin-left: var(--sidebar-width);
          margin-top: calc(var(--header-height, 70px) + var(--announcement-height, 0px) + 8px);
          padding: 32px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
          transition: margin-top 0.25s ease, margin-left 0.3s ease;
        }

        .crm-main-content.collapsed {
          margin-left: 80px;
        }

        /* ── PAGE HEADER CARD ───────────────────────────────── */
        .cp-header-card {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(6, 182, 212, 0.06) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 26px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.45);
          box-shadow: 
            0 10px 40px -10px rgba(15, 23, 42, 0.05), 
            0 1px 3px rgba(0, 0, 0, 0.01),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          position: relative;
          overflow: hidden;
        }

        .cp-header-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #7C3AED 0%, #3B82F6 40%, #06B6D4 75%, #10B981 100%);
        }

        .cp-hdr-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .cp-hdr-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.3);
          flex-shrink: 0;
        }

        .cp-hdr-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .cp-badge-pro {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 5px 14px;
          border-radius: 999px;
          background: #F3E8FF;
          border: none;
          color: #7C3AED;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .cp-count-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #2563EB;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          padding: 4px 12px;
          border-radius: 999px;
        }

        .cp-hdr-title {
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-size: 2.1rem;
          font-weight: 600;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        .cp-hdr-sub {
          color: #64748B;
          font-size: 0.86rem;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .cp-hdr-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        /* ── GRID / LIST VIEW TOGGLE SWITCH ── */
        .cp-view-toggle {
          background: #F1F5F9;
          border: 1.5px solid #E2E8F0;
          padding: 4px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .cp-view-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cp-view-btn:hover {
          color: #7C3AED;
        }

        .cp-view-btn.active {
          background: #FFFFFF;
          color: #7C3AED;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
        }

        .cp-btn-add {
          padding: 12px 24px;
          border-radius: 999px;
          background: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%);
          color: #FFFFFF;
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 0.88rem;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cp-btn-add:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
        }

        /* ── CONTROL BAR ────────────────────────────────────── */
        .cp-control-bar {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1.5px solid #E2E8F0;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
          position: relative;
          z-index: 9999;
          overflow: visible;
        }

        .cp-search-wrap {
          position: relative;
          flex: 1;
          max-width: 460px;
          display: flex;
          align-items: center;
        }

        .cp-search-wrap :global(.cp-search-ico) {
          position: absolute;
          left: 14px;
          color: #2563EB;
          pointer-events: none;
        }

        .cp-search-input {
          width: 100%;
          padding: 10px 38px 10px 42px;
          border-radius: 12px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0F172A;
          outline: none;
          transition: all 0.2s ease;
        }

        .cp-search-input:focus {
          border-color: #2563EB;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .cp-search-clear {
          position: absolute;
          right: 12px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }

        .cp-filter-pills {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cp-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 999px;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cp-filter-pill:hover {
          background: #EFF6FF;
          border-color: #93C5FD;
          color: #2563EB;
        }

        .cp-filter-pill.active {
          background: #2563EB;
          border-color: #1D4ED8;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        /* ── GRID VIEW CARDS ────────────────────────────────── */
        .cp-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .cp-card {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1.5px solid #E2E8F0;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cp-card:hover {
          transform: translateY(-4px);
          border-color: #93C5FD;
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
        }

        .cp-card-hdr {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cp-card-avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          flex-shrink: 0;
        }

        .cp-card-hdr-info {
          flex: 1;
          min-width: 0;
        }

        .cp-card-name {
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 1.05rem;
          color: #0F172A;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cp-card-company {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #64748B;
          font-weight: 600;
          margin-top: 2px;
        }

        .cp-card-company :global(.cp-card-ico) {
          color: #2563EB;
        }

        .cp-card-divider {
          height: 1px;
          background: #F1F5F9;
          width: 100%;
        }

        .cp-card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.84rem;
        }

        .cp-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cp-card-lbl {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748B;
          font-weight: 700;
          font-size: 0.76rem;
          text-transform: uppercase;
        }

        .cp-card-val {
          font-weight: 600;
          color: #1E293B;
        }

        .cp-card-ftr {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }

        .cp-card-btn {
          flex: 1;
          padding: 9px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1.5px solid;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .cp-card-edit {
          background: #EEF2FF;
          border-color: #C7D2FE;
          color: #4F46E5;
        }

        .cp-card-edit:hover {
          background: #4F46E5;
          border-color: #4338CA;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
        }

        .cp-card-del {
          flex: 0 0 40px;
          background: #FEF2F2;
          border-color: #FECDD3;
          color: #E11D48;
        }

        .cp-card-del:hover {
          background: #E11D48;
          border-color: #BE123C;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(225, 29, 72, 0.25);
        }

        .cp-empty-card {
          grid-column: 1 / -1;
          background: #FFFFFF;
          border-radius: 20px;
          border: 1.5px dashed #CBD5E1;
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .cp-empty-card :global(.cp-empty-ico) {
          color: #94A3B8;
        }

        .cp-empty-card h4 {
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 1.1rem;
          color: #1E293B;
          margin: 0;
        }

        .cp-empty-card p {
          color: #64748B;
          font-size: 0.84rem;
          margin: 0;
        }

        /* ── TABLE CARD & PIXEL-PERFECT COLUMN ALIGNMENT ───── */
        .cp-table-card {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1.5px solid #E2E8F0;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }

        .cp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .cp-table th {
          background: #F8FAFC;
          padding: 16px 20px;
          border-bottom: 1.5px solid #E2E8F0;
        }

        .cp-th-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cp-th-wrap.center {
          justify-content: center;
        }

        .cp-th-wrap :global(.cp-th-ico) {
          color: #2563EB;
          flex-shrink: 0;
        }

        .cp-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          font-size: 0.88rem;
        }

        .cp-tr {
          transition: background-color 0.18s ease;
        }

        .cp-tr:hover {
          background-color: #F8FAFC;
        }

        .cp-tr:last-child td {
          border-bottom: none;
        }

        /* ── NAME CELL WITH AVATAR ──────────────────────────── */
        .cp-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cp-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 0.86rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22);
          flex-shrink: 0;
        }

        .cp-cust-name {
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 700;
          font-size: 0.94rem;
          color: #0F172A;
        }

        .cp-cust-sub {
          font-size: 0.75rem;
          color: #64748B;
          font-weight: 500;
        }

        /* ── CELLS WITH MATCHING ICON LAYOUT ────────────────── */
        .cp-company-cell,
        .cp-email-cell,
        .cp-phone-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-weight: 600;
        }

        .cp-company-cell :global(.cp-cell-ico),
        .cp-email-cell :global(.cp-cell-ico),
        .cp-phone-cell :global(.cp-cell-ico) {
          color: #2563EB;
          flex-shrink: 0;
        }

        .cp-comp-name {
          color: #0F172A;
          font-weight: 700;
        }

        .cp-email-txt {
          color: #475569;
        }

        .cp-phone-txt {
          color: #334155;
          font-family: var(--font-mono, monospace);
          font-size: 0.86rem;
        }

        .cp-center-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── INQUIRY BADGE ──────────────────────────────────── */
        .cp-inquiry-pill {
          display: inline-block;
          font-family: var(--font-mono, monospace);
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          background: #EEF2FF;
          border: 1px solid #C7D2FE;
          color: #4338CA;
        }

        /* ── STATUS BADGES ──────────────────────────────────── */
        .cp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .badge-hot {
          background: #FFE4E6;
          border: 1px solid #FECDD3;
          color: #BE123C;
        }

        .badge-warm {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          color: #B45309;
        }

        .badge-prospect {
          background: #D1FAE5;
          border: 1px solid #A7F3D0;
          color: #047857;
        }

        .badge-cold {
          background: #E0F2FE;
          border: 1px solid #7DD3FC;
          color: #0369A1;
        }

        /* ── ACTION BUTTONS ─────────────────────────────────── */
        .cp-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .cp-act-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cp-edit-btn {
          background: #EEF2FF;
          border-color: #C7D2FE;
          color: #4F46E5;
        }

        .cp-edit-btn:hover {
          background: #4F46E5;
          border-color: #4338CA;
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        }

        .cp-del-btn {
          background: #FEF2F2;
          border-color: #FECDD3;
          color: #E11D48;
        }

        .cp-del-btn:hover {
          background: #E11D48;
          border-color: #BE123C;
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);
        }

        /* ── EMPTY STATE ────────────────────────────────────── */
        .cp-empty-td {
          padding: 60px 20px !important;
          text-align: center;
        }

        .cp-empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          max-width: 320px;
          margin: 0 auto;
        }

        .cp-empty-box :global(.cp-empty-ico) {
          color: #94A3B8;
        }

        .cp-empty-box h4 {
          font-family: var(--font-hd, 'Metropolis', sans-serif);
          font-weight: 600;
          font-size: 1.1rem;
          color: #1E293B;
          margin: 0;
        }

        .cp-empty-box p {
          color: #64748B;
          font-size: 0.84rem;
          margin: 0;
        }

        .cp-btn-reset {
          margin-top: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          background: #EEF2FF;
          border: 1px solid #C7D2FE;
          color: #4F46E5;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }

        .text-ellipsis {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .font-mono {
          font-family: var(--font-mono, monospace);
        }

        /* ── BULK SELECTION & CHECKBOX STYLING ───────────────── */
        .cp-card-select-wrap {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(241, 245, 249, 0.9);
          border: 1.5px solid #CBD5E1;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .cp-card-select-wrap:hover {
          border-color: #3B82F6;
          background: rgba(59, 130, 246, 0.1);
        }

        .cp-card-select-wrap.selected {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          border-color: #2563EB;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .cp-card-checkbox {
          width: 14px;
          height: 14px;
          accent-color: #2563EB;
          cursor: pointer;
        }

        .cp-card.is-selected {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35), 0 12px 30px -10px rgba(59, 130, 246, 0.2) !important;
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%) !important;
        }

        .cp-table-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #2563EB;
          cursor: pointer;
          border-radius: 4px;
        }

        .cp-tr.is-selected {
          background: rgba(59, 130, 246, 0.08) !important;
        }

        .cp-tr.is-selected td {
          border-bottom-color: rgba(59, 130, 246, 0.2) !important;
        }

        .cp-select-all-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(37, 99, 235, 0.08);
          border: 1.5px solid rgba(37, 99, 235, 0.25);
          color: #2563EB;
        }

        .cp-select-all-pill:hover {
          background: rgba(37, 99, 235, 0.15);
          border-color: #3B82F6;
          color: #1D4ED8;
        }

        .cp-select-all-pill.active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #1D4ED8 !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
        }

        /* ── FLOATING BULK BAR STYLING ──────────────────────── */
        .cp-bulk-bar-overlay {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 900;
          width: calc(100% - 64px);
          max-width: 860px;
          animation: slideUpBulk 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUpBulk {
          from {
            opacity: 0;
            transform: translate(-50%, 40px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        .cp-bulk-bar {
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1.5px solid rgba(59, 130, 246, 0.45);
          box-shadow: 
            0 20px 50px -10px rgba(0, 0, 0, 0.55),
            0 0 30px rgba(59, 130, 246, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 12px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #FFFFFF;
        }

        .cp-bulk-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cp-bulk-count-badge {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.5);
        }

        .cp-bulk-info-text {
          display: flex;
          flex-direction: column;
        }

        .cp-bulk-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #F8FAFC;
          letter-spacing: -0.01em;
        }

        .cp-bulk-subtitle {
          font-size: 0.74rem;
          color: #94A3B8;
        }

        .cp-bulk-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cp-bulk-btn {
          border: none;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 9px 18px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cp-bulk-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #FFFFFF;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
        }

        .cp-bulk-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(37, 99, 235, 0.6);
        }

        .cp-bulk-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #E2E8F0;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .cp-bulk-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }

        .cp-bulk-close {
          background: rgba(239, 68, 68, 0.15);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.3);
          width: 36px;
          height: 36px;
          padding: 0;
          justify-content: center;
        }

        .cp-bulk-close:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #FFFFFF;
        }

        @media (max-width: 1100px) {
          .cp-control-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .cp-search-wrap {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
