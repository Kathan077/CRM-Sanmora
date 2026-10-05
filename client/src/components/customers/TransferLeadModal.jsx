import React, { useState } from 'react';
import {
  ArrowRightLeft, X, UserCheck, ShieldAlert,
  Building2, Hash, User, FileText, CheckCircle2
} from 'lucide-react';
import './TransferLeadModal.css';

const getInitials = (name) => {
  if (!name) return 'EM';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function TransferLeadModal({
  isOpen,
  onClose,
  customer,
  customers = [],
  employees = [],
  currentUser,
  onTransferConfirm
}) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [transferNote, setTransferNote]   = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');

  const bulkList = Array.isArray(customers) && customers.length > 0 ? customers : (customer ? [customer] : []);
  const isBulk = bulkList.length > 1;
  const primaryCustomer = bulkList[0] || null;

  if (!isOpen || bulkList.length === 0) return null;

  const currentAssigneeName = primaryCustomer.assignedTo || primaryCustomer.createdBy || 'Staff';
  const customerDisplayName = primaryCustomer.customerName || primaryCustomer.contactPerson || primaryCustomer.name || 'Unnamed Client';
  const displayCompany      = primaryCustomer.company || primaryCustomer.companyName || 'Enterprise Account';

  const currentAssigneeId       = String(primaryCustomer.assignedToId || primaryCustomer.createdById || '').trim();
  const currentAssigneeNameNorm = String(primaryCustomer.assignedTo || primaryCustomer.createdBy || '').trim().toLowerCase();
  const currentUserId           = String(currentUser?.id || currentUser?._id || '').trim();
  const currentUserName         = String(currentUser?.name || currentUser?.username || '').trim().toLowerCase();

  // Filter out current logged-in user & current lead owner from target options
  const validEmployees = employees.filter(emp => {
    const eId = String(emp._id || emp.id || '').trim();
    const eName = String(emp.name || emp.username || '').trim().toLowerCase();

    if (!eId || eId === 'default-admin') return false;

    // Filter out logged-in user (user cannot transfer to themselves)
    if (currentUserId && eId === currentUserId) return false;
    if (currentUserName && eName === currentUserName) return false;

    // Filter out current lead owner if single mode
    if (!isBulk) {
      if (currentAssigneeId && eId === currentAssigneeId) return false;
      if (currentAssigneeNameNorm && eName === currentAssigneeNameNorm) return false;
    }

    return true;
  });

  const selectedEmployee = validEmployees.find(emp => String(emp._id || emp.id) === String(selectedEmpId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedEmployee) {
      setErrorMsg('Please select a recipient employee from the list.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      if (isBulk) {
        const leadIds = bulkList.map(c => c.id || c._id);
        await onTransferConfirm(leadIds, selectedEmployee, transferNote);
      } else {
        await onTransferConfirm(primaryCustomer.id || primaryCustomer._id, selectedEmployee, transferNote);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to transfer lead. Please try again.');
    }
  };

  return (
    <div className="tlm-overlay" onClick={onClose}>
      <div className="tlm-modal" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="tlm-header">
          <div className="tlm-hdr-left">
            <div className="tlm-hdr-icon">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="tlm-hdr-title">{isBulk ? `Bulk Transfer (${bulkList.length} Leads)` : 'Transfer Lead Ownership'}</h3>
              <p className="tlm-hdr-sub">{isBulk ? `Reassign ${bulkList.length} selected leads & follow-ups to another team member` : 'Reassign lead and all associated follow-ups to another team member'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="tlm-close-btn" title="Close Modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tlm-body">
          {errorMsg && (
            <div className="tlm-error-alert">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CUSTOMER PREVIEW CARD */}
          <div className="tlm-cust-card">
            {isBulk ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60A5FA' }}>
                    📦 Transferring {bulkList.length} Selected Leads
                  </span>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#A78BFA', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                    {bulkList.length} Accounts
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {bulkList.map(c => (
                    <span key={c.id || c._id} style={{ fontSize: '0.76rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#F1F5F9', padding: '3px 9px', borderRadius: '16px', fontWeight: 600 }}>
                      {c.customerName || c.name || 'Client'} ({c.inquiryNo || 'No #'})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="tlm-cust-row">
                  <div className="tlm-cust-avatar">{getInitials(customerDisplayName)}</div>
                  <div className="tlm-cust-details">
                    <h4 className="tlm-cust-name">{customerDisplayName}</h4>
                    <div className="tlm-cust-meta">
                      <span><Building2 size={12} /> {displayCompany}</span>
                      <span><Hash size={12} /> {primaryCustomer.inquiryNo || '#JUL26-000'}</span>
                    </div>
                  </div>
                </div>
                <div className="tlm-current-owner">
                  <span className="tlm-owner-lbl">Current Owner:</span>
                  <span className="tlm-owner-pill"><User size={12} /> {currentAssigneeName}</span>
                </div>
              </>
            )}
          </div>

          {/* SELECT TARGET EMPLOYEE */}
          <div className="tlm-field-group">
            <label className="tlm-label">
              <UserCheck size={14} /> Select Recipient Employee <span className="tlm-req">*</span>
            </label>
            <select
              className="tlm-select"
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setErrorMsg('');
              }}
              required
            >
              <option value="">-- Choose Employee to Transfer Lead --</option>
              {validEmployees.map((emp) => {
                const empName = emp.name || emp.username || 'Employee';
                const empRole = typeof emp.role === 'object' ? (emp.role?.name || emp.role?.title || 'Staff') : (emp.role || 'Staff');
                return (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {empName} ({empRole}) - {emp.email || 'No email'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* RECIPIENT PREVIEW CARD */}
          {selectedEmployee && (
            <div className="tlm-recipient-card">
              <div className="tlm-rec-avatar">
                {getInitials(selectedEmployee.name || selectedEmployee.username)}
              </div>
              <div>
                <div className="tlm-rec-name">{selectedEmployee.name || selectedEmployee.username}</div>
                <div className="tlm-rec-email">{selectedEmployee.email || 'Team Member'}</div>
              </div>
              <div className="tlm-rec-check">
                <CheckCircle2 size={18} />
              </div>
            </div>
          )}

          {/* OPTIONAL TRANSFER NOTE */}
          <div className="tlm-field-group">
            <label className="tlm-label">
              <FileText size={14} /> Transfer Notes / Reason (Optional)
            </label>
            <textarea
              className="tlm-textarea"
              placeholder="Add reason for transferring this lead (e.g. Territory change, workload balancing)..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* NOTICE */}
          <div className="tlm-notice">
            <ShieldAlert size={15} className="tlm-notice-icon" />
            <p>
              {isBulk
                ? `Once transferred, all ${bulkList.length} selected leads and their history will instantly belong to the selected employee.`
                : 'Once transferred, this lead and all its past history will instantly belong to the selected employee. It will automatically leave your active list.'
              }
            </p>
          </div>

          {/* MODAL FOOTER */}
          <div className="tlm-footer">
            <button type="button" onClick={onClose} className="tlm-cancel-btn" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="tlm-submit-btn" disabled={isSubmitting || !selectedEmpId}>
              {isSubmitting ? (
                <>
                  <div className="tlm-spinner" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} />
                  <span>{isBulk ? `Confirm Transfer (${bulkList.length} Leads)` : 'Confirm Lead Transfer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
