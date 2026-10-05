'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, PhoneCall, Calendar, Clock, User, Building2, Phone, MessageSquare,
  Mail, Handshake, Video, Sparkles, CheckCircle2, History, AlertCircle,
  Plus, RotateCcw, Save, ShieldCheck, Tag, FileText, ArrowRight, UserCheck,
  ChevronDown, Check, Flame, Zap, Lightbulb, Snowflake, XCircle
} from 'lucide-react';
import { getCustomerFollowupHistory, addCustomerFollowup } from '../../utils/crmStore';
import { userService } from '../../services/user.service';
import SelectWithOther from '../common/SelectWithOther';
import './ManageFollowUpModal.css';

export default function ManageFollowUpModal({
  isOpen,
  onClose,
  customer = null,
  followup = null,
  onSaved = () => {},
  employees = [],
  currentUser = null
}) {
  const [mounted, setMounted] = useState(false);
  const [staff, setStaff] = useState(employees);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (Array.isArray(employees) && employees.length > 0) {
      setStaff(employees);
    }
  }, [employees]);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchStaff() {
      try {
        const res = await userService.getAllUsers();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setStaff(res.data);
        }
      } catch (e) {
        // Quiet fallback
      }
    }

    fetchStaff();
  }, [isOpen]);

  const todayStr = new Date().toISOString().split('T')[0];

  const targetCustomer = customer || followup || {};
  const customerName = targetCustomer.customerName || targetCustomer.contactPerson || targetCustomer.name || 'Unnamed Client';
  const phone = targetCustomer.phone || targetCustomer.primaryContact || '—';
  const inquiryNo = targetCustomer.inquiryNo || '#INQ-0000';
  const company = targetCustomer.company || targetCustomer.companyName || 'Enterprise Account';

  const currentUserName = currentUser?.name || currentUser?.username || 'Sanmora Main Admin';
  const currentUserId = String(currentUser?.id || currentUser?._id || 'default-admin');
  const currentUserUsername = currentUser?.username || '';

  // Use backend employees (either passed prop or self-fetched staff list)
  const rawEmployees = Array.isArray(staff) && staff.length > 0
    ? [...staff]
    : (Array.isArray(employees) && employees.length > 0 ? [...employees] : []);
  const isCurrentInList = rawEmployees.some(
    (e) => String(e._id || e.id) === currentUserId ||
           (e.username && currentUserUsername && e.username === currentUserUsername)
  );
  const selectEmployees = isCurrentInList
    ? rawEmployees
    : [
        ...rawEmployees,
        {
          _id: currentUserId, id: currentUserId,
          name: currentUserName, username: currentUserUsername,
          role: currentUser?.role || { name: 'Staff' }
        }
      ];

  const currentUserOption = selectEmployees.find(
    (emp) => String(emp._id || emp.id) === currentUserId ||
             (emp.username && currentUserUsername && emp.username === currentUserUsername) ||
             (emp.name || '').toLowerCase() === currentUserName.toLowerCase()
  ) || selectEmployees[0];

  const defaultAssignedId = currentUserOption ? String(currentUserOption._id || currentUserOption.id) : currentUserId;
  const defaultAssignedName = currentUserOption ? (currentUserOption.name || currentUserOption.username) : currentUserName;

  const [form, setForm] = useState({
    followupType: 'Telephonic',
    followupDate: todayStr,
    notes: '',
    nextFollowupDate: todayStr,
    preferredTime: '14:00',
    leadStatus: targetCustomer.leadStatus || targetCustomer.status || 'In-Process',
    assignedToId: defaultAssignedId,
    assignedTo: defaultAssignedName,
    assignedUntilDate: ''
  });

  const [history, setHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load history whenever modal opens or customer changes
  useEffect(() => {
    if (isOpen && targetCustomer) {
      const historyRecords = getCustomerFollowupHistory(
        targetCustomer.id || targetCustomer.leadId,
        customerName,
        inquiryNo
      );
      setHistory(historyRecords);

      const existingAssignedId = targetCustomer.assignedToId || followup?.assignedToId || defaultAssignedId;
      const existingAssignedName = targetCustomer.assignedTo || followup?.assignedTo || defaultAssignedName;

      setForm({
        followupType: followup?.followupType || 'Telephonic',
        followupDate: todayStr,
        notes: '',
        nextFollowupDate: followup?.nextFollowupDate && followup.nextFollowupDate !== '—' ? followup.nextFollowupDate : todayStr,
        preferredTime: followup?.preferredTime || '14:00',
        leadStatus: targetCustomer.status || targetCustomer.leadStatus || 'In-Process',
        assignedToId: existingAssignedId,
        assignedTo: existingAssignedName,
        assignedUntilDate: followup?.assignedUntilDate || targetCustomer?.assignedUntilDate || ''
      });
      setErrorMsg('');
    }
  }, [isOpen, customer, followup, currentUser]);

  if (!isOpen || !mounted) return null;

  const handleClear = () => {
    setForm({
      followupType: 'Telephonic',
      followupDate: todayStr,
      notes: '',
      nextFollowupDate: todayStr,
      preferredTime: '14:00',
      leadStatus: 'In-Process',
      assignedToId: defaultAssignedId,
      assignedTo: defaultAssignedName,
      assignedUntilDate: ''
    });
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.notes.trim()) {
      setErrorMsg('Meeting Notes & Discussion remarks are required');
      return;
    }

    setIsSubmitting(true);
    // Find the selected employee — match by _id, id, username, or name
    const assignedEmp = selectEmployees.find(
      (emp) =>
        String(emp._id || emp.id) === String(form.assignedToId) ||
        (emp.username && emp.username === form.assignedToId) ||
        (emp.name && emp.name === form.assignedToId)
    );
    const assignedName = assignedEmp ? (assignedEmp.name || assignedEmp.username) : form.assignedTo || defaultAssignedName;
    // Store BOTH the real backend ID (if available) and the name/username for reliable matching
    const assignedId   = assignedEmp ? String(assignedEmp._id || assignedEmp.id || '') : form.assignedToId;
    const assignedUsername = assignedEmp ? (assignedEmp.username || '') : '';

    const isColdOrClosed = form.leadStatus === 'Cold' || form.leadStatus === 'Deal Cancelled' || form.leadStatus === 'Deal Done' || form.leadStatus === 'Closed';

    const payload = {
      leadId: targetCustomer.id || targetCustomer.leadId || `lead-${Date.now()}`,
      inquiryNo: inquiryNo,
      customerName: customerName,
      phone: phone,
      followupType: form.followupType,
      followupDate: form.followupDate,
      nextFollowupDate: isColdOrClosed ? '—' : form.nextFollowupDate,
      preferredTime: isColdOrClosed ? '' : form.preferredTime,
      notes: form.notes,
      leadStatus: form.leadStatus,
      status: isColdOrClosed ? 'No FollowUp' : 'Active',
      assignedTo: assignedName,
      assignedToId: assignedId,
      assignedToUsername: assignedUsername,
      assignedUntilDate: form.assignedUntilDate ? form.assignedUntilDate : null,
      originalAssignerId: currentUserId,
      originalAssignerName: currentUserName,
      createdBy: currentUserName,
      createdById: currentUserId
    };

    const savedRecord = addCustomerFollowup(payload, currentUser);
    setIsSubmitting(false);

    // Refresh local history
    const updatedHistory = getCustomerFollowupHistory(
      targetCustomer.id || targetCustomer.leadId,
      customerName,
      inquiryNo
    );
    setHistory(updatedHistory);
    handleClear();
    onSaved(savedRecord);
  };

  const FOLLOWUP_TYPES = [
    { value: 'Telephonic', label: 'Telephonic', icon: Phone },
    { value: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'Email', label: 'Email', icon: Mail },
    { value: 'In-Person Meeting', label: 'In-Person Meeting', icon: Handshake },
    { value: 'Online Demo', label: 'Online Demo', icon: Video }
  ];

  const LEAD_STATUSES = [
    { value: 'Hot', label: 'Hot Lead', icon: Flame, color: '#EF4444' },
    { value: 'Warm', label: 'Warm Lead', icon: Zap, color: '#F59E0B' },
    { value: 'Prospect', label: 'Prospect', icon: Lightbulb, color: '#8B5CF6' },
    { value: 'Cold', label: 'Cold Lead (Archive)', icon: Snowflake, color: '#64748B' },
    { value: 'Deal Done', label: 'Deal Done (Won)', icon: CheckCircle2, color: '#10B981' },

  ];

  return createPortal(
    <div className="mfu-backdrop">
      <div className="mfu-card animate-scale-up">

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <div className="mfu-header">
          <div className="mfu-header-left">
            <div className="mfu-hdr-icon">
              <PhoneCall size={22} />
            </div>
            <div>
              <div className="mfu-hdr-badges">
                <span className="mfu-badge-pro"><Sparkles size={11} /> TELECALLER CRM</span>
                <span className="mfu-badge-inquiry">{inquiryNo}</span>
              </div>
              <h2 className="mfu-hdr-title">Manage TeleCaller External FollowUp</h2>
              <p className="mfu-hdr-sub">Record call outcomes, schedule next actions, and trace communication logs</p>
            </div>
          </div>

          <button onClick={onClose} className="mfu-close-btn" type="button" title="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* ══ DUAL COLUMN CONTENT ═════════════════════════════ */}
        <div className="mfu-body">

          {/* ── LEFT COLUMN: LOG FOLLOW-UP FORM ─────────────── */}
          <div className="mfu-col-left">
            <div className="mfu-sec-title">
              <Plus size={16} className="mfu-sec-ico" />
              <span>Log New Interaction</span>
            </div>

            {errorMsg && (
              <div className="mfu-err-banner">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mfu-form">

              {/* FOLLOWUP TYPE & DATE */}
              <div className="mfu-grid-2">
                <div className="mfu-field">
                  <label className="mfu-label">
                    <span>Followup Type</span>
                    <span className="mfu-req">*</span>
                  </label>
                  <div className="mfu-input-wrap">
                    <SelectWithOther
                      value={form.followupType}
                      onChange={(e) => setForm({ ...form, followupType: e.target.value })}
                      inputClassName="mfu-select"
                      name="followupType"
                    >
                      {FOLLOWUP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectWithOther>
                  </div>
                </div>

                <div className="mfu-field">
                  <label className="mfu-label">
                    <span>FollowUp Date</span>
                    <span className="mfu-req">*</span>
                  </label>
                  <div className="mfu-input-wrap">
                    <input
                      type="date"
                      required
                      value={form.followupDate}
                      onChange={(e) => setForm({ ...form, followupDate: e.target.value })}
                      className="mfu-input"
                    />
                  </div>
                </div>
              </div>

              {/* MEETING NOTES */}
              <div className="mfu-field">
                <div className="mfu-label-row">
                  <label className="mfu-label">
                    <span>Meeting Notes & Discussion</span>
                    <span className="mfu-req">*</span>
                  </label>
                  <span className="mfu-char-cnt">{form.notes.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  required
                  placeholder="Maximum 500 Characters... Enter discussion highlights, customer feedback or quotation terms"
                  value={form.notes}
                  onChange={(e) => {
                    setForm({ ...form, notes: e.target.value });
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="mfu-textarea"
                />
              </div>

              {/* NEXT FOLLOWUP & PREFERRED TIME */}
              {form.leadStatus === 'Cold' || form.leadStatus === 'Deal Cancelled' || form.leadStatus === 'Deal Done' ? (
                <div className="mfu-cold-notice-box animate-fade-in">
                  <AlertCircle size={16} className="mfu-notice-ico" />
                  <span>
                    <strong>{form.leadStatus} Lead Selected:</strong> Next Follow-Up date is disabled for Cold/Closed leads. This customer will be safely archived in Customer Directory.
                  </span>
                </div>
              ) : (
                <div className="mfu-grid-2">
                  <div className="mfu-field">
                    <label className="mfu-label">
                      <span>Next Followup Date</span>
                      <span className="mfu-req">*</span>
                    </label>
                    <div className="mfu-input-wrap">
                      <input
                        type="date"
                        required
                        value={form.nextFollowupDate}
                        onChange={(e) => setForm({ ...form, nextFollowupDate: e.target.value })}
                        className="mfu-input"
                      />
                    </div>
                  </div>

                  <div className="mfu-field">
                    <label className="mfu-label">
                      <span>Preferred Time</span>
                    </label>
                    <div className="mfu-input-wrap">
                      <input
                        type="time"
                        value={form.preferredTime}
                        onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                        className="mfu-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LEAD STATUS & ASSIGN TO */}
              <div className="mfu-grid-2">
                <div className="mfu-field">
                  <label className="mfu-label">Lead Status</label>
                  <CustomLeadStatusDropdown
                    value={form.leadStatus}
                    onChange={(newVal) => setForm({ ...form, leadStatus: newVal })}
                    statuses={LEAD_STATUSES}
                  />
                </div>

                <div className="mfu-field">
                  <label className="mfu-label">Assign Next Follow-Up To</label>
                  <div className="mfu-input-wrap">
                    <select
                      value={form.assignedToId}
                      onChange={(e) => {
                        const selectedEmp = selectEmployees.find((emp) => String(emp._id || emp.id) === String(e.target.value));
                        setForm({
                          ...form,
                          assignedToId: e.target.value,
                          assignedTo: selectedEmp ? selectedEmp.name : defaultAssignedName
                        });
                      }}
                      className="mfu-select"
                    >
                      {selectEmployees.map((emp) => {
                        const empId = String(emp._id || emp.id || '');
                        const isCurrent = empId === currentUserId ||
                          (emp.username && currentUser?.username && emp.username === currentUser.username) ||
                          (emp.name && emp.name === currentUserName);
                        return (
                          <option key={empId || emp.name} value={empId}>
                            {emp.name || emp.username} {isCurrent ? '(You)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* TEMPORARY ASSIGNMENT EXPIRY DATE (Only visible when assigning to someone else) */}
              {(() => {
                const isSelfAssigned =
                  String(form.assignedToId) === String(currentUserId) ||
                  (currentUserOption && String(form.assignedToId) === String(currentUserOption._id || currentUserOption.id)) ||
                  (currentUser?.username && form.assignedTo?.toLowerCase() === currentUser.username.toLowerCase()) ||
                  (currentUser?.name && form.assignedTo?.toLowerCase() === currentUser.name.toLowerCase());

                if (isSelfAssigned) return null;

                return (
                  <div className="mfu-field" style={{ marginTop: '12px' }}>
                    <label className="mfu-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} style={{ color: '#8B5CF6' }} />
                      <span>Temporary Assignment Valid Until <span className="mfu-optional">(Optional Expiry Date)</span></span>
                    </label>
                    <div className="mfu-input-wrap">
                      <input
                        type="date"
                        min={todayStr}
                        value={form.assignedUntilDate || ''}
                        onChange={(e) => setForm({ ...form, assignedUntilDate: e.target.value })}
                        className="mfu-input"
                      />
                    </div>
                    <span className="mfu-helper-text" style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                       After this date, the follow-up automatically reverts back to your account.
                    </span>
                  </div>
                );
              })()}

              {/* ACTIONS */}
              <div className="mfu-form-actions">
                <button
                  type="button"
                  onClick={handleClear}
                  className="mfu-btn mfu-btn-clear"
                >
                  <RotateCcw size={15} />
                  <span>Clear &amp; Reset</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mfu-btn mfu-btn-save"
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Follow-Up'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ── RIGHT COLUMN: TIMELINE HISTORY ──────────────── */}
          <div className="mfu-col-right">
            {/* CLIENT SUMMARY CARD */}
            <div className="mfu-client-card">
              <div className="mfu-cc-hdr">
                <div className="mfu-cc-avatar">
                  {customerName
                    ? customerName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'CL'}
                </div>
                <div className="mfu-cc-info">
                  <h4 className="mfu-cc-name">{customerName}</h4>
                  <div className="mfu-cc-meta">
                    <Building2 size={12} />
                    <span>{company}</span>
                    <span className="mfu-cc-sep">•</span>
                    <Phone size={12} />
                    <span className="mfu-mono">{phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TIMELINE LIST HEADER */}
            <div className="mfu-timeline-hdr">
              <History size={16} className="mfu-tl-ico" />
              <span>Follow-Up Interaction Timeline ({history.length})</span>
            </div>

            {/* TIMELINE STREAM */}
            <div className="mfu-timeline-stream">
              {history.length === 0 ? (
                <div className="mfu-tl-empty">
                  <History size={32} className="mfu-empty-ico" />
                  <p>No prior follow-up interaction history recorded for this customer.</p>
                  <span>Submit the form on the left to add the first follow-up note.</span>
                </div>
              ) : (
                history.map((h, index) => {
                  const FTypeIcon =
                    FOLLOWUP_TYPES.find((t) => t.value === h.followupType)?.icon || Phone;

                  return (
                    <div key={h.id ? `${h.id}-${index}` : index} className="mfu-tl-item animate-fade-in">
                      <div className="mfu-tl-node">
                        <div className="mfu-tl-dot" />
                        {index !== history.length - 1 && <div className="mfu-tl-line" />}
                      </div>

                      <div className="mfu-tl-card">
                        <div className="mfu-tl-card-hdr">
                          <div className="mfu-tl-hdr-badges-left">
                            <div className="mfu-tl-type-badge">
                              <FTypeIcon size={12} />
                              <span>{h.followupType || 'Telephonic'}</span>
                            </div>

                            {(() => {
                              const rawStatus = h.leadStatus || h.status || targetCustomer?.leadStatus || targetCustomer?.status || 'Warm';
                              const stObj = LEAD_STATUSES.find(
                                (s) => s.value === rawStatus || s.value.toLowerCase() === String(rawStatus).toLowerCase()
                              ) || LEAD_STATUSES[1];
                              const StIcon = stObj.icon || Flame;

                              return (
                                <span className={`mfu-tl-status-badge st-${stObj.value.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <StIcon size={12} className="status-svg-ico" />
                                  <span>{stObj.label.split('(')[0].trim()}</span>
                                </span>
                              );
                            })()}
                          </div>

                          <div className="mfu-tl-dates-row">
                            <span className="mfu-tl-dt">
                              <Calendar size={11} /> {h.followupDate}
                            </span>
                          </div>
                        </div>

                        <div className="mfu-tl-notes">"{h.notes || h.meetingNotes}"</div>

                        <div className="mfu-tl-footer-chips">
                          <div className="mfu-chip mfu-chip-logged" title={`Logged by ${h.createdBy || 'smit'}`}>
                            <User size={11} className="mfu-chip-ico" />
                            <span className="mfu-chip-lbl">Logged By:</span>
                            <span className="mfu-chip-val">{h.createdBy || 'smit'}</span>
                          </div>

                          <div className="mfu-chip mfu-chip-next" title={`Next Followup Date: ${h.nextFollowupDate || '—'}`}>
                            <Clock size={11} className="mfu-chip-ico" />
                            <span className="mfu-chip-lbl">Next Followup:</span>
                            <span className="mfu-chip-val">{h.nextFollowupDate || '—'}</span>
                          </div>

                          <div className="mfu-chip mfu-chip-assigned" title={`Next assigned to ${h.assignedTo || 'smit'}`}>
                            <UserCheck size={11} className="mfu-chip-ico" />
                            <span className="mfu-chip-lbl">Next Assigned To:</span>
                            <span className="mfu-chip-val">{h.assignedTo || 'smit'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CustomLeadStatusDropdown({ value, onChange, statuses }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedStatus = statuses.find((s) => s.value === value) || statuses[0];
  const SelectedIcon = selectedStatus.icon || Flame;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-status-trigger-btn st-${selectedStatus.value.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="trigger-label-wrap">
          <SelectedIcon size={15} className="status-svg-ico" />
          <span className="trigger-label">{selectedStatus.label}</span>
        </div>
        <ChevronDown size={14} className={`trigger-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-status-popover animate-scale-up">
          {statuses.map((st) => {
            const isSelected = st.value === value;
            const StIcon = st.icon || Flame;

            return (
              <div
                key={st.value}
                onClick={() => {
                  onChange(st.value);
                  setIsOpen(false);
                }}
                className={`custom-status-option-item st-${st.value.toLowerCase().replace(/\s+/g, '-')} ${isSelected ? 'selected' : ''}`}
              >
                <div className="option-label-wrap">
                  <StIcon size={15} className="status-svg-ico" />
                  <span className="option-label">{st.label}</span>
                </div>
                {isSelected && <Check size={14} className="option-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
