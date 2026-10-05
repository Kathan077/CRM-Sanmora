'use client';

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import {
  getStoredLeads,
  getStoredLedgerAccounts,
  saveLedgerAccount,
  deleteLedgerTransaction,
  calculateRunningBalanceEntries
} from '../../utils/crmStore';
import SelectWithOther from '../../components/common/SelectWithOther';
import {
  Wallet, Plus, Trash2, Printer, Search, Pencil,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
  FileText, ArrowDownLeft, ArrowUpRight, MessageSquare,
  Calendar, ShieldCheck, User, Sparkles, X, ChevronRight,
  Phone, Mail, Building2, Pin, CreditCard
} from 'lucide-react';
import './ledger.css';

export default function LedgerPage() {
  const { user, can, sidebarCollapsed } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  const [clients, setClients]               = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [ledgerStore, setLedgerStore]       = useState({});
  const [search, setSearch]                 = useState('');
  const deferredSearch = useDeferredValue(search);
  const [tabFilter, setTabFilter]           = useState('all'); // 'all' | 'pending' | 'settled'
  const [visibleClientLimit, setVisibleClientLimit] = useState(60);

  // Modal states
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isEditMode, setIsEditMode]             = useState(false);
  const [validationError, setValidationError]   = useState('');
  const [modalProjectName, setModalProjectName] = useState('Project Development');
  const [modalAgreedCost, setModalAgreedCost]   = useState(50000);
  const [modalContractDate, setModalContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalInstalments, setModalInstalments] = useState([
    {
      id: 'inst-1',
      title: 'Part 1 (Advance)',
      amount: 10000,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI / GPay',
      utrNo: '',
      status: 'Record Payment'
    }
  ]);

  const formatDateDisplay = useCallback((dateStr) => {
    if (!dateStr || dateStr === '—') return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }, []);

  // Load clients and ledger store
  const refreshData = useCallback(() => {
    const rawLeads = getStoredLeads();
    const store = getStoredLedgerAccounts();

    // Filter leads to ONLY show real clients whose deal is done ('Deal Done' / 'Won' / active ledger entries)
    const dealDoneLeads = rawLeads.filter(l => {
      const isDealDone = l.leadStatus === 'Deal Done' || 
                         l.status === 'Deal Done' || 
                         l.leadStatus === 'Won' || 
                         l.status === 'Won' ||
                         (store[l.id] && store[l.id].agreedProjectCost > 0);
      return isDealDone;
    });

    const clientList = dealDoneLeads.map(l => ({
      id: l.id,
      name: l.customerName || l.contactPerson || 'Unnamed Client',
      phone: l.phone || l.primaryContact || '—',
      email: l.email || `${(l.customerName || 'client').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      company: l.company || l.companyName || 'Corporate Client',
      city: l.city || 'Ahmedabad',
      leadStatus: l.leadStatus || l.status || 'Deal Done'
    }));

    setClients(clientList);
    setLedgerStore(store);

    if (clientList.length > 0) {
      setSelectedClientId(prev => {
        if (!prev || !clientList.some(c => c.id === prev)) {
          return clientList[0].id;
        }
        return prev;
      });
    } else {
      setSelectedClientId(null);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, [refreshData]);

  // ⚡ OPTIMIZATION 1: High-speed Single-Pass Client Calculations Cache Map
  const clientCalcMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < clients.length; i++) {
      const cId = clients[i].id;
      const accData = ledgerStore[cId] || {};
      map.set(cId, calculateRunningBalanceEntries(accData.agreedProjectCost || 0, accData.instalments || []));
    }
    return map;
  }, [clients, ledgerStore]);

  // ⚡ OPTIMIZATION 2: Filter clients by search & tab using pre-computed calc map + deferred search
  const filteredClients = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    return clients.filter(client => {
      const matchSearch = !query || 
                          client.name.toLowerCase().includes(query) ||
                          client.phone.includes(query) ||
                          (client.company && client.company.toLowerCase().includes(query));
      
      if (!matchSearch) return false;

      const calc = clientCalcMap.get(client.id);
      if (!calc) return true;

      if (tabFilter === 'pending') return calc.remainingDues > 0;
      if (tabFilter === 'settled') return calc.totalAgreed > 0 && calc.remainingDues === 0;
      return true;
    });
  }, [clients, deferredSearch, tabFilter, clientCalcMap]);

  // Visible sliced client cards for 0-lag rendering with huge datasets
  const visibleClients = useMemo(() => {
    return filteredClients.slice(0, visibleClientLimit);
  }, [filteredClients, visibleClientLimit]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  const selectedAccount = useMemo(() => {
    return selectedClient ? (ledgerStore[selectedClient.id] || {}) : {};
  }, [selectedClient, ledgerStore]);

  const currentCalc = useMemo(() => {
    if (!selectedClient) {
      return { totalAgreed: 0, totalClearedPaid: 0, remainingDues: 0, processedEntries: [] };
    }
    return clientCalcMap.get(selectedClient.id) || calculateRunningBalanceEntries(
      selectedAccount.agreedProjectCost || 0,
      selectedAccount.instalments || []
    );
  }, [selectedClient, selectedAccount, clientCalcMap]);

  // ⚡ OPTIMIZATION 3: Fast $O(N)$ System-Wide Overview Totals
  const systemTotals = useMemo(() => {
    let agreed = 0, received = 0, pending = 0;
    for (let i = 0; i < clients.length; i++) {
      const cCalc = clientCalcMap.get(clients[i].id);
      if (cCalc) {
        agreed += cCalc.totalAgreed;
        received += cCalc.totalClearedPaid;
        pending += cCalc.remainingDues;
      }
    }
    return { agreed, received, pending };
  }, [clients, clientCalcMap]);

  const collectionRate = useMemo(() => {
    return systemTotals.agreed > 0
      ? Math.round((systemTotals.received / systemTotals.agreed) * 100)
      : 100;
  }, [systemTotals]);

  // Modal actions
  const handleOpenRecordModal = useCallback((targetClient = selectedClient) => {
    if (!targetClient) return;
    setValidationError('');
    setIsEditMode(false);
    const existing = ledgerStore[targetClient.id] || {};
    setModalProjectName(existing.projectName || 'Project Development');
    setModalAgreedCost(existing.agreedProjectCost !== undefined ? existing.agreedProjectCost : 50000);
    setModalContractDate(existing.contractDate || new Date().toISOString().split('T')[0]);
    
    if (Array.isArray(existing.instalments) && existing.instalments.length > 0) {
      setModalInstalments(existing.instalments.map(i => ({ ...i })));
    } else {
      setModalInstalments([
        {
          id: `inst-${Date.now()}-1`,
          title: 'Part 1 (Advance)',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'UPI / GPay',
          utrNo: '',
          deductionNotes: '',
          status: 'Record Payment'
        }
      ]);
    }
    setShowRecordModal(true);
  }, [selectedClient, ledgerStore]);

  const handleAddInstalmentPart = useCallback(() => {
    setValidationError('');
    setModalInstalments(prev => {
      const nextNum = prev.length + 1;
      const currentSum = prev.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const suggestedAmount = Math.max(0, (Number(modalAgreedCost) || 0) - currentSum);

      return [
        ...prev,
        {
          id: `inst-${Date.now()}-${nextNum}`,
          title: `Part ${nextNum}`,
          amount: suggestedAmount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'UPI / GPay',
          utrNo: '',
          deductionNotes: '',
          status: 'Record Payment'
        }
      ];
    });
  }, [modalAgreedCost]);

  const handleRemoveInstalmentPart = useCallback((index) => {
    setValidationError('');
    setModalInstalments(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  const handleUpdateInstalmentField = useCallback((index, field, value) => {
    setValidationError('');
    setModalInstalments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleSaveLedger = (e) => {
    e.preventDefault();
    setValidationError('');
    if (!selectedClient) return;

    // Validation 1: Project Name
    if (!modalProjectName || !modalProjectName.trim()) {
      setValidationError('Please enter a valid Project / Service Name.');
      return;
    }

    // Validation 2: Total Agreed Cost
    const agreedCostNum = Number(modalAgreedCost);
    if (isNaN(agreedCostNum) || agreedCostNum <= 0) {
      setValidationError('Total Agreed Project Cost must be a valid number greater than ₹0.');
      return;
    }

    // Validation 3: Contract Date
    if (!modalContractDate) {
      setValidationError('Please select a valid Contract / Agreement Start Date.');
      return;
    }

    // Validation 4: Instalments field checks
    for (let i = 0; i < modalInstalments.length; i++) {
      const inst = modalInstalments[i];
      if (!inst.title || !inst.title.trim()) {
        setValidationError(`Instalment Part #${i + 1} must have a valid title.`);
        return;
      }
      const amt = Number(inst.amount);
      if (isNaN(amt) || amt < 0) {
        setValidationError(`Instalment Part #${i + 1} (${inst.title}) amount cannot be negative or invalid.`);
        return;
      }
      if (!inst.date) {
        setValidationError(`Please select a valid payment date for ${inst.title}.`);
        return;
      }
    }

    // Validation 5: Total sum vs Agreed cost
    const totalInstalmentsSum = modalInstalments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (totalInstalmentsSum > agreedCostNum) {
      setValidationError(`Total payment instalments sum (₹${totalInstalmentsSum.toLocaleString('en-IN')}) cannot exceed Total Agreed Cost (₹${agreedCostNum.toLocaleString('en-IN')}).`);
      return;
    }

    saveLedgerAccount(selectedClient.id, {
      projectName: modalProjectName.trim(),
      agreedProjectCost: agreedCostNum,
      contractDate: modalContractDate,
      instalments: modalInstalments
    });

    refreshData();
    setShowRecordModal(false);
  };

  const handleDeleteEntry = useCallback((txId) => {
    if (!selectedClient) return;
    if (confirm('Are you sure you want to delete this payment transaction?')) {
      deleteLedgerTransaction(selectedClient.id, txId);
      refreshData();
    }
  }, [selectedClient, refreshData]);

  const handlePrintStatement = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const handleWhatsAppShare = useCallback(() => {
    if (!selectedClient) return;
    const phone = selectedClient.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${selectedClient.name},\n\nHere is your Payment Statement summary from Sanmora CRM:\n` +
      `Project: ${selectedAccount.projectName || 'Project Development'}\n` +
      `Total Contract Cost: ₹${currentCalc.totalAgreed.toLocaleString('en-IN')}\n` +
      `Payments Cleared: ₹${currentCalc.totalClearedPaid.toLocaleString('en-IN')}\n` +
      `Remaining Dues Balance: ₹${currentCalc.remainingDues.toLocaleString('en-IN')}\n\n` +
      `Thank you!`
    );
    window.open(`https://wa.me/91${phone}?text=${text}`, '_blank');
  }, [selectedClient, selectedAccount, currentCalc]);

  const modalTotalPlan = Number(modalAgreedCost) || 0;
  const modalTotalCollected = useMemo(() => {
    return modalInstalments.reduce((sum, inst) => {
      return sum + (inst.status === 'Record Payment' || inst.status === 'Cleared' ? (Number(inst.amount) || 0) : 0);
    }, 0);
  }, [modalInstalments]);

  const modalTotalPending = Math.max(0, modalTotalPlan - modalTotalCollected);

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Customer Payment Ledger (Khata)" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="ledger-page-container printable-statement-area">
          
          {/* 1. HERO HEADER CARD */}
          <div className="ledger-hero-card">
            <div className="ledger-hero-left">
              <span className="ledger-module-badge">
                <Wallet size={12} /> KHATA & FINANCIAL STATEMENTS
              </span>
              <h1 className="ledger-hero-title">Customer Payment Ledger</h1>
              <p className="ledger-hero-sub">
                Date-wise payment transactions, total project agreed amounts, received credits & pending balance dues.
              </p>
            </div>

            <div className="ledger-hero-actions">
              <button onClick={() => handleOpenRecordModal(selectedClient)} className="btn-record-main">
                <Plus size={16} /> Record Payment / Bill
              </button>
            </div>
          </div>

          {/* 2. TOP OVERVIEW METRIC CARDS (4 GRID) */}
          <div className="ledger-overview-grid">
            <div className="overview-card">
              <div className="overview-left">
                <span className="overview-label">TOTAL AGREED PROJECTS</span>
                <span className="overview-val">₹{systemTotals.agreed.toLocaleString('en-IN')}</span>
                <span className="overview-desc">Overall contract value</span>
              </div>
              <div className="overview-icon-box box-purple">
                <FileText size={20} />
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-left">
                <span className="overview-label">TOTAL RECEIVED (CREDITS)</span>
                <span className="overview-val val-green">₹{systemTotals.received.toLocaleString('en-IN')}</span>
                <span className="overview-desc">Cleared customer payments</span>
              </div>
              <div className="overview-icon-box box-green">
                <ArrowDownLeft size={20} />
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-left">
                <span className="overview-label">PENDING DUES BALANCE</span>
                <span className="overview-val val-red">₹{systemTotals.pending.toLocaleString('en-IN')}</span>
                <span className="overview-desc">Outstanding receivable</span>
              </div>
              <div className="overview-icon-box box-red">
                <AlertCircle size={20} />
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-left">
                <span className="overview-label">COLLECTION RATE</span>
                <span className="overview-val val-blue">{collectionRate}%</span>
                <span className="overview-desc">Settlement progress</span>
              </div>
              <div className="overview-icon-box box-blue">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>

          {/* 3. TWO-COLUMN MAIN CONTENT */}
          <div className="ledger-main-columns">
            
            {/* LEFT COLUMN: SELECT CLIENT ACCOUNT */}
            <div className="client-selector-panel">
              <div className="selector-header">
                <h3 className="selector-title">DEAL DONE CLIENTS</h3>
                <span className="selector-count-badge">{filteredClients.length} Clients</span>
              </div>

              <div className="selector-search-wrap">
                <Search size={14} className="search-icn" />
                <input
                  type="text"
                  placeholder="Search deal done clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="selector-search-inp"
                />
              </div>

              <div className="selector-tabs">
                <button
                  onClick={() => setTabFilter('all')}
                  className={`selector-tab-btn ${tabFilter === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTabFilter('pending')}
                  className={`selector-tab-btn ${tabFilter === 'pending' ? 'active' : ''}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setTabFilter('settled')}
                  className={`selector-tab-btn ${tabFilter === 'settled' ? 'active' : ''}`}
                >
                  Fully Paid
                </button>
              </div>

              <div className="client-cards-scroll">
                {filteredClients.length === 0 ? (
                  <div style={{ padding: '20px', textTransform: 'none', color: '#94A3B8', textAlign: 'center', fontSize: '0.8rem' }}>
                    No converted 'Deal Done' client accounts found.
                  </div>
                ) : (
                  <>
                    {visibleClients.map(c => {
                      const cCalc = clientCalcMap.get(c.id) || { totalAgreed: 0, remainingDues: 0 };
                      const isSelected = c.id === selectedClientId;

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClientId(c.id)}
                          className={`client-card-item ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="client-item-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="client-item-name">{c.name}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#DCFCE7', color: '#16A34A', padding: '1px 6px', borderRadius: '999px' }}>
                                Deal Done
                              </span>
                            </div>
                            <span className="client-item-sub">{c.company || 'Client Account'}</span>
                            <span className="client-item-phone">{c.phone}</span>
                          </div>

                          <div className="client-item-right">
                            {cCalc.totalAgreed === 0 ? (
                              <span className="dues-badge no-tx">No transactions</span>
                            ) : cCalc.remainingDues > 0 ? (
                              <span className="dues-badge unpaid">₹{cCalc.remainingDues.toLocaleString('en-IN')} Dues</span>
                            ) : (
                              <span className="dues-badge settled">Fully Paid</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredClients.length > visibleClientLimit && (
                      <button
                        onClick={() => setVisibleClientLimit(prev => prev + 50)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '12px',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          marginTop: '6px'
                        }}
                      >
                        Load More Clients ({filteredClients.length - visibleClientLimit} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SELECTED CLIENT LEDGER DETAILS & TRANSACTIONS */}
            <div className="client-ledger-panel">
              {selectedClient ? (
                <>
                  {/* CLIENT DETAILS HEADER CARD */}
                  <div className="client-detail-card">
                    <div className="client-detail-left">
                      <div className="client-avatar-circle">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="client-info-box">
                        <div className="client-title-row">
                          <h2 className="client-full-name">{selectedClient.name}</h2>
                          {currentCalc.remainingDues > 0 ? (
                            <span className="status-pill-unpaid">
                              <AlertCircle size={12} /> ₹{currentCalc.remainingDues.toLocaleString('en-IN')} Unpaid Dues
                            </span>
                          ) : (
                            <span className="status-pill-settled">
                              <CheckCircle2 size={12} /> Account Fully Settled
                            </span>
                          )}
                        </div>

                        <div className="client-sub-meta">
                          {selectedClient.company && (
                            <span className="meta-item">
                              <Building2 size={13} /> {selectedClient.company}
                            </span>
                          )}
                          {selectedClient.city && <span>• {selectedClient.city}</span>}
                          <span className="meta-item">
                            <Phone size={13} /> {selectedClient.phone}
                          </span>
                          <span className="meta-item">
                            <Mail size={13} /> {selectedClient.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="client-detail-right">
                      <button onClick={() => handleOpenRecordModal(selectedClient)} className="btn-act-schedule">
                        <Clock size={14} /> Schedule Plan
                      </button>

                      <button onClick={handleWhatsAppShare} className="btn-act-whatsapp">
                        <MessageSquare size={14} /> WhatsApp
                      </button>

                      <button onClick={() => handleOpenRecordModal(selectedClient)} className="btn-act-add-entry">
                        <Plus size={14} /> Add Entry
                      </button>
                    </div>
                  </div>

                  {/* 3 CLIENT METRIC BOXES ROW */}
                  <div className="client-boxes-row">
                    <div className="client-metric-box box-purple-outline">
                      <div>
                        <span className="box-m-label">AGREED PROJECT COST</span>
                        <div className="box-m-val">₹{currentCalc.totalAgreed.toLocaleString('en-IN')}</div>
                        <span className="box-m-sub">Total Contract Value</span>
                      </div>
                      <FileText size={22} style={{ color: '#8B5CF6' }} />
                    </div>

                    <div className="client-metric-box box-green-outline">
                      <div>
                        <span className="box-m-label">TOTAL PAID (CREDITS)</span>
                        <div className="box-m-val val-green">₹{currentCalc.totalClearedPaid.toLocaleString('en-IN')}</div>
                        <span className="box-m-sub">Cleared Payments</span>
                      </div>
                      <ArrowDownLeft size={22} style={{ color: '#10B981' }} />
                    </div>

                    <div className="client-metric-box box-cyan-outline">
                      <div>
                        <span className="box-m-label">REMAINING DUES BALANCE</span>
                        <div className="box-m-val">
                          ₹{currentCalc.remainingDues.toLocaleString('en-IN')}
                        </div>
                        <span className="box-m-sub">
                          {currentCalc.remainingDues === 0 ? '✓ Account Fully Settled' : 'Outstanding Receivable'}
                        </span>
                      </div>
                      <CheckCircle2 size={22} style={{ color: '#0EA5E9' }} />
                    </div>
                  </div>

                  {/* STATEMENT LEDGER BANNER & TRANSACTION TABLE */}
                  <div className="statement-ledger-container">
                    <div className="statement-banner-header">
                      <div className="banner-header-left">
                        <span className="banner-badge">FINANCIAL STATEMENT AUDIT LOG</span>
                        <h3 className="banner-title">Date-Wise Account Transactions</h3>
                        <p className="banner-sub">Chronological log of contract bills, payments received & running balances</p>
                      </div>

                      <div className="banner-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="banner-summary-pill paid">
                           Paid: ₹{currentCalc.totalClearedPaid.toLocaleString('en-IN')}
                        </span>
                        <span className={`banner-summary-pill dues ${currentCalc.remainingDues === 0 ? 'settled' : ''}`}>
                          {currentCalc.remainingDues === 0 ? '✓ Fully Settled' : `Remaining Dues: ₹${currentCalc.remainingDues.toLocaleString('en-IN')}`}
                        </span>
                        <span className="banner-entries-count">
                          {currentCalc.processedEntries.length} Entries
                        </span>
                      </div>
                    </div>

                    {currentCalc.processedEntries.length === 0 && currentCalc.totalAgreed === 0 ? (
                      <div className="ledger-empty-box">
                        <div className="empty-icn-circle">
                          <FileText size={28} />
                        </div>
                        <h4 className="empty-title">No Ledger Transactions Found</h4>
                        <p className="empty-sub">
                          There are no payment or invoice records logged for {selectedClient.name} yet. Click "+ Record Payment / Bill" to add an entry.
                        </p>
                        <button onClick={() => handleOpenRecordModal(selectedClient)} className="btn-add-first-tx">
                          <Plus size={16} /> Add First Transaction
                        </button>
                      </div>
                    ) : (
                      <div className="statement-table-responsive">
                        <table className="statement-table">
                          <thead>
                            <tr>
                              <th style={{ width: '15%', textAlign: 'left' }}>DATE & TIME</th>
                              <th style={{ width: '25%', textAlign: 'left' }}>ENTRY TITLE / INSTALMENT</th>
                              <th style={{ width: '14%', textAlign: 'center' }}>TOTAL DEBIT (AGREED)</th>
                              <th style={{ width: '16%', textAlign: 'center' }}>AMOUNT PAID</th>
                              <th style={{ width: '13%', textAlign: 'center' }}>METHOD & REF</th>
                              <th style={{ width: '17%', textAlign: 'center' }}>REMAINING BALANCE</th>
                              <th style={{ width: '6%', textAlign: 'center' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Project Contract Baseline Row */}
                            {currentCalc.totalAgreed > 0 && (
                              <tr className="contract-baseline-row">
                                <td style={{ textAlign: 'left' }}>
                                  <div className="cell-align-start">
                                    <span className="date-pill">
                                      <Calendar size={14} style={{ color: '#8B5CF6' }} />
                                      {formatDateDisplay(selectedAccount.contractDate || new Date().toISOString().split('T')[0])}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', justifyContent: 'center' }}>
                                    <span className="contract-name" style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                                      {selectedAccount.projectName || 'Project Development'}
                                    </span>

                                    <span className="pin-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Pin size={11} /> Initial Contract Baseline</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className="tx-debit-val">₹{currentCalc.totalAgreed.toLocaleString('en-IN')}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span style={{ color: '#CBD5E1' }}>—</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className="tx-method-pill contract-type">
                                      <FileText size={14} /> Contract
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className="tx-running-balance-pill dues-active prominent">
                                      ₹{currentCalc.totalAgreed.toLocaleString('en-IN')} Initial Baki
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <button
                                      onClick={() => handleOpenRecordModal(selectedClient)}
                                      className="tx-act-circle-btn edit"
                                      title="Edit Contract & Agreed Cost"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {currentCalc.processedEntries.map((entry) => (
                              <tr key={entry.id} className="tx-entry-row">
                                <td style={{ textAlign: 'left' }}>
                                  <div className="cell-align-start">
                                    <span className="date-pill">
                                      <Calendar size={14} style={{ color: '#64748B' }} />
                                      {formatDateDisplay(entry.date)}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <div className="cell-align-start" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                                    <span className="entry-title-text">{entry.partTitle}</span>
                                    {entry.deductionNotes && (
                                      <span className="deduction-note-pill" style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(100, 116, 139, 0.08)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(100, 116, 139, 0.18)' }}>
                                        📝 {entry.deductionNotes}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span style={{ color: '#CBD5E1' }}>—</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className="credit-tag prominent">
                                      + ₹{entry.amount.toLocaleString('en-IN')} Paid
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className="tx-method-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <CreditCard size={11} /> {entry.paymentMethod || 'UPI / GPay'} {entry.utrNo ? `• ${entry.utrNo}` : ''}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="cell-align-center">
                                    <span className={`tx-running-balance-pill ${entry.runningDuesBalance === 0 ? 'settled' : 'dues-active'} prominent`}>
                                      {entry.runningDuesBalance === 0 ? '✓ ₹0 (Fully Settled)' : `₹${entry.runningDuesBalance.toLocaleString('en-IN')} Remaining`}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="tx-actions-wrap cell-align-center">
                                    <button
                                      onClick={() => handleOpenRecordModal(selectedClient)}
                                      className="tx-act-circle-btn edit"
                                      title="Edit Transaction Entry"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="tx-act-circle-btn delete"
                                      title="Delete Entry"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="statement-ledger-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div className="ledger-empty-box">
                    <div className="empty-icn-circle">
                      <FileText size={28} />
                    </div>
                    <h4 className="empty-title">No 'Deal Done' Converted Clients Found</h4>
                    <p className="empty-sub">
                      There are no customer accounts with 'Deal Done' status in your CRM yet. When you convert a lead/customer to 'Deal Done', their ledger statement will automatically appear here!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 4. PAYMENT ENTRIES & INSTALMENTS MODAL */}
      {showRecordModal && (
        <div className="modal-backdrop-ledger">
          <div className="modal-card-ledger">
            <div className="modal-header-banner">
              <span className="header-banner-badge">PAYMENT ENTRY SYSTEM</span>
              <h3 className="header-banner-title">Payment Entries & Instalments</h3>
              <p className="header-banner-sub">
                {selectedClient?.name} • Record & manage payment entries for customer ledger
              </p>

              <button onClick={() => setShowRecordModal(false)} className="modal-close-icon-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLedger}>
              <div className="modal-body-ledger">
                {validationError && (
                  <div className="modal-validation-banner">
                    <AlertCircle size={18} style={{ shrink: 0 }} />
                    <span>{validationError}</span>
                  </div>
                )}
                
                {/* SECTION 1: PROJECT DETAILS */}
                <div>
                  <div className="section-label-hdr">PROJECT DETAILS</div>
                  <div className="form-grid-2-ledger">
                    <div className="ledger-inp-group">
                      <label className="ledger-inp-label">PROJECT / SERVICE NAME *</label>
                      <input
                        type="text"
                        required
                        value={modalProjectName}
                        onChange={(e) => setModalProjectName(e.target.value)}
                        className="ledger-inp-field"
                        placeholder="e.g. Project Development"
                      />
                    </div>

                    <div className="ledger-inp-group">
                      <label className="ledger-inp-label">TOTAL AGREED PROJECT COST (₹) *</label>
                      <input
                        type="number"
                        required
                        value={modalAgreedCost}
                        onChange={(e) => setModalAgreedCost(e.target.value)}
                        className="ledger-inp-field"
                        placeholder="e.g. 50000"
                      />
                    </div>

                    <div className="ledger-inp-group" style={{ gridColumn: 'span 2' }}>
                      <label className="ledger-inp-label">CONTRACT / AGREEMENT START DATE *</label>
                      <input
                        type="date"
                        required
                        value={modalContractDate}
                        onChange={(e) => setModalContractDate(e.target.value)}
                        className="ledger-inp-field"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PAYMENT INSTALMENTS */}
                <div style={{ marginTop: '20px' }}>
                  {modalTotalPlan > 0 && modalTotalCollected === modalTotalPlan && (
                    <div className="all-payment-done-card" style={{ marginBottom: '20px' }}>
                      <div className="done-badge-ring">
                        <CheckCircle2 size={32} style={{ color: '#16A34A' }} />
                      </div>
                      <h3 className="done-card-title">All Payment is Done!</h3>
                      <p className="done-card-sub">
                        Total agreed contract cost of <strong>₹{modalTotalPlan.toLocaleString('en-IN')}</strong> has been 100% collected & settled across {modalInstalments.length} payment instalments. No pending dues remain.
                      </p>

                      <div className="done-summary-strip">
                        <div className="strip-item">
                          <span className="lbl">Agreed Contract Cost</span>
                          <span className="val purple">₹{modalTotalPlan.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="strip-item">
                          <span className="lbl">Total Collected</span>
                          <span className="val green">₹{modalTotalCollected.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="strip-item">
                          <span className="lbl">Account Status</span>
                          <span className="val green-badge">✓ 100% Fully Settled</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="section-label-hdr">
                    <span>PAYMENT INSTALMENTS ({modalInstalments.length})</span>
                    <button
                      type="button"
                      onClick={handleAddInstalmentPart}
                      className="btn-add-part-row"
                    >
                      <Plus size={12} /> Add Part
                    </button>
                  </div>

                  <div className="instalment-parts-list">
                    {modalInstalments.map((inst, idx) => (
                      <div key={inst.id || idx} className="instalment-row-card">
                        <div className="card-row-top">
                          <div className="top-left-wrap">
                            <div className="part-num-badge">{idx + 1}</div>
                            <input
                              type="text"
                              value={inst.title || `Part ${idx + 1}`}
                              onChange={(e) => handleUpdateInstalmentField(idx, 'title', e.target.value)}
                              className="part-name-input"
                              placeholder={`Part ${idx + 1}`}
                            />
                          </div>

                          {modalInstalments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInstalmentPart(idx)}
                              className="btn-remove-part"
                              title="Remove Part"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          )}
                        </div>

                        <div className="card-inputs-grid">
                          <div className="field-box">
                            <label className="field-micro-label">AMOUNT (₹)</label>
                            <div className="inp-amt-wrap">
                              <span>₹</span>
                              <input
                                type="number"
                                value={inst.amount}
                                onChange={(e) => handleUpdateInstalmentField(idx, 'amount', e.target.value)}
                                className="ledger-inp-field"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="field-box">
                            <label className="field-micro-label">PAYMENT DATE</label>
                            <input
                              type="date"
                              value={inst.date}
                              onChange={(e) => handleUpdateInstalmentField(idx, 'date', e.target.value)}
                              className="ledger-inp-field"
                            />
                          </div>

                          <div className="field-box">
                            <label className="field-micro-label">METHOD</label>
                            <SelectWithOther
                              value={inst.paymentMethod}
                              onChange={(e) => handleUpdateInstalmentField(idx, 'paymentMethod', e.target.value)}
                              inputClassName="ledger-inp-field"
                              name="paymentMethod"
                            >
                              <option value="UPI / GPay">UPI / GPay</option>
                              <option value="Bank Transfer">Bank Transfer / NEFT</option>
                              <option value="Cash">Cash</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Card">Credit/Debit Card</option>
                            </SelectWithOther>
                          </div>

                          <div className="field-box">
                            <label className="field-micro-label">REF / UTR NO</label>
                            <input
                              type="text"
                              placeholder="e.g. UTR12345"
                              value={inst.utrNo}
                              onChange={(e) => handleUpdateInstalmentField(idx, 'utrNo', e.target.value)}
                              className="ledger-inp-field"
                            />
                          </div>

                          <div className="field-box field-full-width" style={{ gridColumn: 'span 4' }}>
                            <label className="field-micro-label">DEDUCTION / PAYMENT NOTES</label>
                            <input
                              type="text"
                              placeholder="e.g. TDS Deduction ₹500, GST / Bank adjustment, discount or payment remarks..."
                              value={inst.deductionNotes || ''}
                              onChange={(e) => handleUpdateInstalmentField(idx, 'deductionNotes', e.target.value)}
                              className="ledger-inp-field"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER SUMMARY BAR */}
              <div className="modal-footer-ledger">
                <div className="footer-totals-pills">
                  <span className="total-pill-box pill-plan">Agreed Plan: ₹{modalTotalPlan.toLocaleString('en-IN')}</span>
                  <span className="total-pill-box pill-collected">✓ Collected: ₹{modalTotalCollected.toLocaleString('en-IN')}</span>
                  {modalTotalPlan === 0 ? (
                    <span className="total-pill-box pill-pending" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>
                      Enter Agreed Cost Above
                    </span>
                  ) : modalTotalCollected > modalTotalPlan ? (
                    <span className="total-pill-box pill-pending" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                      Exceeds Agreed Cost by ₹{(modalTotalCollected - modalTotalPlan).toLocaleString('en-IN')}
                    </span>
                  ) : modalTotalCollected === modalTotalPlan ? (
                    <span className="total-pill-box pill-collected" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: 800 }}>
                      ✓ Payment All Done & Fully Settled
                    </span>
                  ) : (
                    <span className="total-pill-box pill-pending">
                      ! Pending Dues: ₹{modalTotalPending.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <button type="submit" className="btn-save-ledger-modal">
                  Save & Record Payment Entries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
