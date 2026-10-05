'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import LeadCustomerModal from '../../components/customers/LeadCustomerModal';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import { getStoredLeads, saveLead, createOrUpdateFollowupThreadFromLead, filterByRole, clearCrmStoreCache } from '../../utils/crmStore';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  UserCheck,
  Building2,
  Mail,
  Phone,
  DollarSign,
  UserPlus,
  CheckCircle2,
  Clock,
  XCheck,
  X,
  Flame,
  Snowflake,
  Target
} from 'lucide-react';

const STAGES = [
  { key: 'cold', title: 'Cold / New Leads', color: 'purple' },
  { key: 'warm', title: 'Warm (In Follow-up)', color: 'blue' },
  { key: 'hot', title: 'Hot Opportunities', color: 'amber' },
  { key: 'prospect', title: 'Prospect / Closing', color: 'green' }
];

export default function LeadsPage() {
  const { user, can, sidebarCollapsed } = useAuth();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);
  const [selectedAssignEmployee, setSelectedAssignEmployee] = useState('');

  const loadLeads = useCallback((empList = employees) => {
    const rawData = getStoredLeads();
    const scoped = filterByRole(rawData, user, empList);
    setLeads(scoped);
  }, [user, employees]);

  useEffect(() => {
    loadLeads(employees);

    async function loadEmployees() {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('crm_token') || localStorage.getItem('token') || sessionStorage.getItem('crm_token'))
        : null;
      if (!token) return;

      try {
        const res = await userService.getAllUsers();
        if (res && res.success) {
          const empData = res.data || [];
          setEmployees(empData);
          if (empData.length > 0) {
            setSelectedAssignEmployee(empData[0]._id);
          }
          loadLeads(empData);
        }
      } catch (e) {
        // Quiet fallback if backend token is missing
      }
    }
    loadEmployees();
  }, [user, loadLeads]);

  const handleOpenAssign = (lead) => {
    setSelectedLeadForAssign(lead);
    setShowAssignModal(true);
  };

  const handleSaveAssignment = () => {
    if (!selectedLeadForAssign) return;
    const empObj = employees.find((emp) => String(emp._id || emp.id) === String(selectedAssignEmployee));
    let targetLead = null;
    const updated = leads.map((l) => {
      if (l.id === selectedLeadForAssign.id) {
        targetLead = {
          ...l,
          assignedTo: empObj ? (empObj.name || empObj.username) : l.assignedTo,
          assignedToId: empObj ? String(empObj._id || empObj.id) : l.assignedToId,
          assignedToUsername: empObj ? (empObj.username || '') : (l.assignedToUsername || '')
        };
        return targetLead;
      }
      return l;
    });
    setLeads(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanmora_crm_leads_v1', JSON.stringify(updated));
      clearCrmStoreCache();
    }
    if (targetLead) {
      createOrUpdateFollowupThreadFromLead(targetLead, user);
    }
    setShowAssignModal(false);
  };

  const handleMoveStage = (leadId, nextStatus) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) return { ...l, status: nextStatus };
      return l;
    });
    setLeads(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanmora_crm_leads_v1', JSON.stringify(updated));
      clearCrmStoreCache();
    }
  };

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return leads;
    return leads.filter(
      (l) =>
        (l.customerName || '').toLowerCase().includes(query) ||
        (l.company || '').toLowerCase().includes(query) ||
        (l.assignedTo || '').toLowerCase().includes(query)
    );
  }, [leads, search]);

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Lead Pipeline & Customer Management" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="page-action-header glass-card">
          <div className="header-info">
            <h2>Customer Lead Pipeline</h2>
            <p>Track deal progress, assign leads to team members, and close opportunities</p>
          </div>

          {can('leads:create') && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>Add New Lead</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar glass-panel">
          <div className="search-filter-input">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search leads by customer, company name, or assigned executive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Kanban Board */}
        <div className="kanban-board">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage.key);
            return (
              <div key={stage.key} className="kanban-column glass-card">
                <div className="col-header">
                  <div className={`col-title-badge ${stage.color}`}>
                    <span>{stage.title}</span>
                    <span className="count-pill">{stageLeads.length}</span>
                  </div>
                </div>

                <div className="kanban-cards-list">
                  {stageLeads.map((l) => (
                    <div key={l.id} className="lead-card glass-panel animate-fade-in">
                      <div className="lead-card-header">
                        <div>
                          <h4 className="customer-name">{l.customerName}</h4>
                          <div className="company-tag">
                            <Building2 size={13} />
                            <span>{l.company}</span>
                          </div>
                        </div>
                        <div className="lead-value">₹{(l.value || 0).toLocaleString('en-IN')}</div>
                      </div>

                      <div className="lead-contact-info">
                        <div className="info-item">
                          <Mail size={13} /> <span>{l.email || '—'}</span>
                        </div>
                        <div className="info-item">
                          <Phone size={13} /> <span>{l.phone || '—'}</span>
                        </div>
                      </div>

                      {l.nextFollowupDate && l.nextFollowupDate !== '—' && (
                        <div className="fup-remind-tag">
                          <Clock size={12} />
                          <span>Followup: {l.nextFollowupDate} ({l.followupType || 'Telephonic'})</span>
                        </div>
                      )}

                      <div className="lead-card-footer">
                        <div className="assignee-badge" title="Assigned Owner">
                          <UserCheck size={13} />
                          <span>{l.assignedTo || 'smit'}</span>
                        </div>

                        {can('leads:assign') && (
                          <button
                            onClick={() => handleOpenAssign(l)}
                            className="act-btn assign-btn"
                            title="Reassign Lead"
                          >
                            <UserPlus size={14} />
                          </button>
                        )}
                      </div>

                      <div className="stage-move-bar">
                        {STAGES.filter((s) => s.key !== l.status).map((s) => (
                          <button
                            key={s.key}
                            onClick={() => handleMoveStage(l.id, s.key)}
                            className="move-pill"
                          >
                            → {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* --- ADD LEAD MODAL --- */}
      <LeadCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(payload) => {
          saveLead(payload, user);
          loadLeads();
          setShowAddModal(false);
        }}
        employees={employees.length > 0 ? employees : [{ _id: '1', name: 'smit', role: { name: 'Admin' } }]}
        currentUser={user}
      />

      {/* --- REASSIGN LEAD MODAL --- */}
      {showAssignModal && selectedLeadForAssign && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <UserPlus size={22} className="modal-icon" />
                <h3>Assign Lead Ownership</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="lead-summary-box">
              <div className="lead-name-text">{selectedLeadForAssign.customerName}</div>
              <div className="lead-company-text">{selectedLeadForAssign.company}</div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Select Employee / Executive</label>
              <select
                value={selectedAssignEmployee}
                onChange={(e) => setSelectedAssignEmployee(e.target.value)}
                className="form-input"
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role?.name || 'User'})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="button" onClick={handleSaveAssignment} className="btn btn-primary">
                Reassign Owner
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .crm-layout {
          display: flex;
          min-height: 100vh;
        }

        .crm-main-content {
          margin-left: var(--sidebar-width);
          margin-top: calc(var(--header-height, 70px) + var(--announcement-height, 0px) + 8px);
          padding: 32px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transition: margin-top 0.25s ease, margin-left 0.3s ease;
        }

        .page-action-header {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-info h2 {
          font-family: var(--font-heading);
          font-size: 1.5rem;
        }

        .header-info p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .filter-bar {
          padding: 16px 20px;
          display: flex;
          align-items: center;
        }

        .search-filter-input {
          position: relative;
          width: 100%;
        }

        .search-filter-input :global(.search-icon) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
        }

        .search-filter-input :global(.form-input) {
          padding-left: 44px;
        }

        .kanban-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 20px;
        }

        .kanban-column {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 280px;
        }

        .col-title-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.88rem;
        }

        .col-title-badge.purple {
          background: rgba(124, 58, 237, 0.1);
          color: var(--primary);
        }

        .col-title-badge.blue {
          background: rgba(245, 158, 11, 0.1);
          color: #D97706;
        }

        .col-title-badge.amber {
          background: rgba(225, 29, 72, 0.1);
          color: #E11D48;
        }

        .col-title-badge.green {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .count-pill {
          background: #FFFFFF;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .kanban-cards-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .lead-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
        }

        .lead-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .customer-name {
          font-family: var(--font-heading);
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .company-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .lead-value {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--success);
        }

        .lead-contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.78rem;
          color: var(--text-tertiary);
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fup-remind-tag {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.74rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lead-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px dashed var(--border-light);
        }

        .assignee-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--primary);
          background: rgba(124, 58, 237, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .assign-btn {
          background: rgba(37, 99, 235, 0.1);
          color: var(--secondary);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stage-move-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding-top: 6px;
        }

        .move-pill {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(124, 58, 237, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
          transition: var(--transition-smooth);
          cursor: pointer;
        }

        .move-pill:hover {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .lead-summary-box {
          background: rgba(124, 58, 237, 0.05);
          padding: 14px;
          border-radius: 12px;
        }

        .lead-name-text {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1rem;
        }

        .lead-company-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* MODAL STYLES */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          background: #FFFFFF;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title-wrap h3 {
          font-family: var(--font-heading);
          font-size: 1.25rem;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        @media (max-width: 1200px) {
          .kanban-board {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .kanban-board {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
