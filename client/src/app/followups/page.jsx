'use client';

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import LeadCustomerModal from '../../components/customers/LeadCustomerModal';
import ManageFollowUpModal from '../../components/customers/ManageFollowUpModal';
import ProFilterDropdown from '../../components/common/ProFilterDropdown';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import {
  getStoredFollowups,
  saveFollowup,
  updateFollowupStatus,
  deleteFollowup,
  deleteAllFollowups,
  saveLead,
  filterByRole,
  getSubordinateUsers,
  resolveEffectiveAssignee,
  syncCrmStoreWithBackendApi,
  getNextInquiryNo,
  matchExecutiveFilter,
  isAdminUser
} from '../../utils/crmStore';
import {
  PhoneCall,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  Filter,
  Download,
  UserPlus,
  Activity,
  AlertCircle,
  CheckCircle,
  X,
  Phone,
  MessageSquare,
  Mail,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Table,
  FileSpreadsheet,
  UploadCloud,
  History,
  Flame,
  Check,
  Zap,
  Lightbulb,
  Snowflake,
  XCircle,
  RotateCcw
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   MEMOIZED FOLLOWUP TABLE ROW - ZERO RE-RENDER LAG FOR 100,000+ ITEMS
   ══════════════════════════════════════════════════════════════════════ */
const FollowUpTableRow = React.memo(function FollowUpTableRow({
  f,
  todayStr,
  onOpenManageModal
}) {
  const isClosed = f.status === 'No FollowUp' || f.status === 'Closed' || f.status === 'Completed';
  const isOverdue = f.nextFollowupDate < todayStr && f.status === 'Active';
  const initials = f.customerName
    ? f.customerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'C';

  const eff = resolveEffectiveAssignee(f, todayStr);

  return (
    <tr className="fup-table-row">
      {/* ACTION */}
      <td>
        <div className="row-action-btns">
          <button
            onClick={() => onOpenManageModal(f)}
            className="circle-act-btn btn-edit"
            title="Edit & Manage Followup"
            type="button"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onOpenManageModal(f)}
            className="circle-act-btn btn-add-fup"
            title="Manage TeleCaller External FollowUp & Timeline History"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
      </td>

      {/* FOLLOWUP DATE */}
      <td>
        <div className="date-badge">
          <Calendar size={13} className="dt-icon" />
          <span>{f.followupDate}</span>
        </div>
      </td>

      {/* FOLLOWUP TYPE */}
      <td>
        <span className="type-pill-badge">
          <Phone size={11} /> {f.followupType || 'Telephonic'}
        </span>
      </td>

      {/* CUSTOMER NAME & ASSIGNEE */}
      <td>
        <div className="customer-cell">
          <div className="cust-avatar">{initials}</div>
          <div className="cust-info">
            <div className="cust-name-txt">{f.customerName}</div>
            <div className="cust-exec-txt" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>Exec: <strong>{eff.assignedTo || f.assignedTo || 'Staff'}</strong></span>
              {eff.isExpired && (
                <span style={{ color: '#DC2626', fontWeight: 600, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <RotateCcw size={11} /> Reverted to Manager (Expired {eff.expiryDate})
                </span>
              )}
              {!eff.isExpired && f.assignedUntilDate && (
                <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={11} /> Temp Assigned Until: {f.assignedUntilDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* MOBILE NO */}
      <td>
        <div className="mobile-cell">
          <Phone size={12} className="mob-icon" />
          <a href={`tel:${f.phone}`} className="mobile-link">
            {f.phone}
          </a>
        </div>
      </td>

      {/* NEXT FOLLOWUP */}
      <td>
        {f.nextFollowupDate && f.nextFollowupDate !== '—' ? (
          <div className={`next-fup-pill ${isOverdue ? 'overdue-glow' : ''}`}>
            <Clock size={12} />
            <span>{f.nextFollowupDate}</span>
          </div>
        ) : (
          <span className="dash-text">—</span>
        )}
      </td>

      {/* NOTES */}
      <td className="fup-td-notes">
        {f.notes ? (
          <div className="notes-bubble" title={f.notes}>
            "{f.notes}"
          </div>
        ) : (
          <span className="dash-text">—</span>
        )}
      </td>

      {/* LEAD / INQUIRY NO */}
      <td>
        <span className="inquiry-pill">{f.inquiryNo || '#INQ-0000'}</span>
      </td>

      {/* STATUS */}
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {f.status === 'Active' ? (
            <span className="status-badge-active">
              <span className="dot-green" /> Active
            </span>
          ) : (
            <span className="status-badge-closed">
              <span className="dot-red" /> No FollowUp
            </span>
          )}
          {f.leadStatus && (
            <span className={`lead-status-pill st-${(f.leadStatus || '').toLowerCase().replace(/\s+/g, '-')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {f.leadStatus === 'Hot' ? <><Flame size={11} /> Hot Lead</> :
               f.leadStatus === 'Warm' ? <><Zap size={11} /> Warm Lead</> :
               f.leadStatus === 'Prospect' ? <><Lightbulb size={11} /> Prospect</> :
               f.leadStatus === 'Cold' ? <><Snowflake size={11} /> Cold Lead</> :
               f.leadStatus === 'Deal Done' ? <><CheckCircle2 size={11} /> Won</> :
               f.leadStatus === 'Deal Cancelled' ? <><XCircle size={11} /> Lost</> : f.leadStatus}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
});

export default function FollowupsPage() {
  const { user, can, sidebarCollapsed } = useAuth();
  const isAdmin = isAdminUser(user);

  const [followups, setFollowups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'today', 'missed', 'upcoming', 'closed'
  const [viewMode, setViewMode] = useState('table'); // 'table', 'date', 'excel'
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Bulk Excel & CSV Import State
  const [importFileName, setImportFileName] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    const headers = [
      'Customer Name',
      'Phone',
      'Email',
      'Company',
      'Followup Type',
      'Lead Status',
      'Followup Date',
      'Next Followup Date',
      'Assigned Executive',
      'Notes',
      'Inquiry No'
    ];

    const todayString = new Date().toISOString().split('T')[0];
    const sampleRows = [
      [
        'Rohan Sharma',
        '9876543210',
        'rohan@example.com',
        'Sharma Tech',
        'Telephonic',
        'Hot',
        todayString,
        todayString,
        user?.name || user?.username || 'Myself',
        'Interested in CRM Enterprise license. Wants quote tomorrow.',
        'INQ-1001'
      ],
      [
        'Priya Patel',
        '9822334455',
        'priya@patel.com',
        'Patel Traders',
        'WhatsApp',
        'Warm',
        todayString,
        todayString,
        user?.name || user?.username || 'Myself',
        'Requested brochure and pricing tiers via WhatsApp.',
        'INQ-1002'
      ],
      [
        'Vikram Malhotra',
        '9988776655',
        'vikram@malhotra.org',
        'Malhotra Corp',
        'Email',
        'Cold',
        todayString,
        '—',
        user?.name || user?.username || 'Myself',
        'Not interested right now. Save to directory for future follow up.',
        'INQ-1003'
      ],
      [
        'Ananya Gupta',
        '9711223344',
        'ananya@gupta.in',
        'Gupta Designs',
        'In-Person Meeting',
        'Deal Done',
        todayString,
        '—',
        user?.name || user?.username || 'Myself',
        'Deal closed successfully! Initial payment received.',
        'INQ-1004'
      ]
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sanmora_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Parsing Helper
  const parseCSVFile = (text) => {
    const todayString = new Date().toISOString().split('T')[0];
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase());
    
    const getIndex = (possibleNames) => {
      return rawHeaders.findIndex(h => possibleNames.some(p => h.includes(p)));
    };

    const idxName = getIndex(['customer name', 'name', 'client', 'customer']);
    const idxPhone = getIndex(['phone', 'mobile', 'contact', 'number']);
    const idxEmail = getIndex(['email', 'mail']);
    const idxCompany = getIndex(['company', 'organization', 'org']);
    const idxType = getIndex(['followup type', 'type', 'interaction']);
    const idxStatus = getIndex(['lead status', 'status', 'priority', 'lead']);
    const idxFupDate = getIndex(['followup date', 'date', 'created']);
    const idxNextDate = getIndex(['next followup date', 'next date', 'scheduled']);
    const idxExec = getIndex(['assigned executive', 'executive', 'assigned', 'agent', 'staff']);
    const idxNotes = getIndex(['notes', 'remark', 'comment', 'description']);
    const idxInquiry = getIndex(['inquiry no', 'inquiry', 'inq']);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || !cols.some(c => c.trim())) continue;

      const customerName = (idxName >= 0 ? cols[idxName] : '') || cols[0] || 'Unknown Client';
      const phone = (idxPhone >= 0 ? cols[idxPhone] : '') || cols[1] || '';
      const email = (idxEmail >= 0 ? cols[idxEmail] : '') || '';
      const company = (idxCompany >= 0 ? cols[idxCompany] : '') || '';
      const followupType = (idxType >= 0 ? cols[idxType] : '') || 'Telephonic';
      const rawLeadStatus = (idxStatus >= 0 ? cols[idxStatus] : '') || 'Warm';
      const followupDate = (idxFupDate >= 0 ? cols[idxFupDate] : '') || todayString;
      const nextFollowupDate = (idxNextDate >= 0 ? cols[idxNextDate] : '') || todayString;
      const assignedExecName = (idxExec >= 0 ? cols[idxExec] : '') || user?.name || user?.username || 'Staff';
      const notes = (idxNotes >= 0 ? cols[idxNotes] : '') || 'Imported via Bulk Excel/CSV';
      const inquiryNo = (idxInquiry >= 0 ? cols[idxInquiry] : '') || getNextInquiryNo();

      let leadStatus = 'Warm';
      const normStatus = rawLeadStatus.toLowerCase();
      if (normStatus.includes('hot')) leadStatus = 'Hot';
      else if (normStatus.includes('warm')) leadStatus = 'Warm';
      else if (normStatus.includes('prospect')) leadStatus = 'Prospect';
      else if (normStatus.includes('cold')) leadStatus = 'Cold';
      else if (normStatus.includes('done') || normStatus.includes('won')) leadStatus = 'Deal Done';
      else if (normStatus.includes('cancel') || normStatus.includes('lost')) leadStatus = 'Deal Cancelled';

      const isColdOrClosed = leadStatus === 'Cold' || leadStatus === 'Deal Done' || leadStatus === 'Deal Cancelled';

      rows.push({
        id: `imp-${i}-${Date.now()}`,
        customerName,
        phone,
        email,
        company,
        followupType,
        leadStatus,
        followupDate,
        nextFollowupDate: isColdOrClosed ? '—' : nextFollowupDate,
        assignedTo: assignedExecName,
        notes,
        inquiryNo,
        isColdOrClosed
      });
    }

    return rows;
  };

  const handleFileProcess = (file) => {
    if (!file) return;
    setImportFileName(file.name);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const rows = parseCSVFile(content);
      setParsedImportRows(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedImportRows.length === 0) return;
    setImporting(true);

    let importedCount = 0;
    let directoryOnlyCount = 0;

    for (const row of parsedImportRows) {
      // 1. Create/Update Customer Record in Directory (`leads` store)
      const leadPayload = {
        name: row.customerName,
        company: row.company || 'N/A',
        phone: row.phone,
        email: row.email,
        assignedTo: row.assignedTo,
        leadStatus: row.leadStatus,
        notes: row.notes,
        status: row.isColdOrClosed ? 'Closed' : 'Active'
      };
      saveLead(leadPayload, user);

      // 2. Routing logic: If Cold / Deal Done / Deal Cancelled -> DO NOT create active follow-up board item
      if (!row.isColdOrClosed) {
        const followupPayload = {
          customerName: row.customerName,
          phone: row.phone,
          assignedTo: row.assignedTo,
          assignedToId: String(user?.id || user?._id || ''),
          assignedToUsername: user?.username || '',
          followupDate: row.followupDate,
          followupType: row.followupType,
          leadStatus: row.leadStatus,
          nextFollowupDate: row.nextFollowupDate,
          notes: row.notes,
          inquiryNo: row.inquiryNo,
          status: 'Active'
        };
        saveFollowup(followupPayload, user);
        importedCount++;
      } else {
        directoryOnlyCount++;
      }
    }

    loadFollowups(employees);
    setImporting(false);
    setImportSuccessMsg(`Successfully imported ${parsedImportRows.length} records! (${importedCount} Active Board Follow-ups created, ${directoryOnlyCount} saved exclusively to Customer Directory).`);
    setParsedImportRows([]);
    setImportFileName('');
  };

  // Calendar State for Date-Wise View
  const todayStr = new Date().toISOString().split('T')[0];
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = useCallback(() => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showLogActivityModal, setShowLogActivityModal] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);

  // Dedicated Manage External FollowUp Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);

  const handleOpenManageModal = (fupItem) => {
    setManageTarget(fupItem);
    setShowManageModal(true);
  };

  const handleDeleteFollowup = (fupId) => {
    if (window.confirm('Are you sure you want to delete this follow-up record?')) {
      deleteFollowup(fupId);
      loadFollowups(employees);
    }
  };

  // Quick Activity Form
  const [activityForm, setActivityForm] = useState({
    customerName: '',
    phone: '',
    assignedToId: String(user?.id || user?._id || ''),
    assignedTo: user?.name || user?.username || 'Staff',
    assignedToUsername: user?.username || '',
    followupDate: todayStr,
    followupType: 'Telephonic',
    leadStatus: 'Warm',
    nextFollowupDate: todayStr,
    preferredTime: '12:00',
    notes: '',
    status: 'Active'
  });

  const employeesRef = useRef(employees);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const loadFollowups = useCallback((empList = null) => {
    const rawData = getStoredFollowups();
    const effectiveEmployees = empList || employeesRef.current || [];
    // Filter followups according to User Role & Manager Hierarchy
    const scopedData = filterByRole(rawData, user, effectiveEmployees);

    // Defensive Deduplication: Collapse multiple records for the exact same inquiry or lead into 1 unique row
    const uniqueMap = new Map();
    for (const item of scopedData) {
      const key = (item.inquiryNo && String(item.inquiryNo).trim())
        ? `inq_${String(item.inquiryNo).trim().toLowerCase()}`
        : (item.leadId && String(item.leadId).trim())
          ? `lead_${String(item.leadId).trim()}`
          : (item.customerName && item.phone)
            ? `cp_${String(item.customerName).toLowerCase().trim()}_${String(item.phone).trim()}`
            : `id_${item._id || item.id}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      } else {
        const existing = uniqueMap.get(key);
        // Prefer the record that has a real MongoDB _id
        if (item._id && !existing._id) {
          uniqueMap.set(key, { ...existing, ...item });
        }
      }
    }
    const deduplicatedList = Array.from(uniqueMap.values());

    // Ultra-fast Pre-indexing for 100,000+ items (Single Pass)
    const indexed = deduplicatedList.map(f => {
      const rawStatus = String(f.status || '').toLowerCase();
      const rawLeadStatus = String(f.leadStatus || '').toLowerCase();
      const rawNotes = String(f.notes || '').toLowerCase();

      const isClosed = (
        rawStatus === 'no followup' ||
        rawStatus === 'closed' ||
        rawStatus === 'completed' ||
        rawLeadStatus.includes('cold') ||
        rawLeadStatus.includes('cancel') ||
        rawLeadStatus.includes('done') ||
        rawNotes.includes('deal done') ||
        rawNotes.includes('deal cancelled') ||
        rawNotes.includes('cold lead')
      );

      return {
        ...f,
        _isClosed: isClosed,
        _searchIndex: [
          f.customerName,
          f.notes,
          f.phone,
          f.inquiryNo,
          f.assignedTo,
          f.company,
          f.email
        ].filter(Boolean).join(' ').toLowerCase()
      };
    });

    setFollowups(indexed);
  }, [user]);

  useEffect(() => {
    loadFollowups();

    // Background sync with MongoDB
    syncCrmStoreWithBackendApi().then(() => {
      loadFollowups();
    });

    let debounceTimer = null;
    const handleStoreUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadFollowups();
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
          loadFollowups(res.data);
        }
      } catch (e) {
        // Quiet fallback if backend authorization or token missing
      }
    }
    loadEmployees();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_store_updated', handleStoreUpdate);
      }
    };
  }, [user, loadFollowups]);

  const searchDeferred = useDeferredValue(search);

  // Set of dates that have active follow-ups scheduled (Single-pass O(N))
  const scheduledDatesSet = useMemo(() => {
    const dates = new Set();
    for (let i = 0; i < followups.length; i++) {
      const f = followups[i];
      if (f.status === 'Active') {
        const d = f.nextFollowupDate || f.followupDate;
        if (d && d !== '—') {
          dates.add(d);
        }
      }
    }
    return dates;
  }, [followups]);

  const selectedDateFollowups = useMemo(() => {
    if (!selectedDateStr) return [];
    const res = [];
    for (let i = 0; i < followups.length; i++) {
      const f = followups[i];
      if (f.nextFollowupDate === selectedDateStr || f.followupDate === selectedDateStr) {
        res.push(f);
      }
    }
    return res;
  }, [followups, selectedDateStr]);

  const formatSelectedDateHeader = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  const isFollowupClosed = useCallback((f) => {
    const rawStatus = String(f.status || '').toLowerCase();
    const rawLeadStatus = String(f.leadStatus || '').toLowerCase();
    const rawNotes = String(f.notes || '').toLowerCase();

    return (
      rawStatus === 'no followup' ||
      rawStatus === 'closed' ||
      rawStatus === 'completed' ||
      rawLeadStatus.includes('cold') ||
      rawLeadStatus.includes('cancel') ||
      rawLeadStatus.includes('done') ||
      rawNotes.includes('deal done') ||
      rawNotes.includes('deal cancelled') ||
      rawNotes.includes('cold lead')
    );
  }, []);

  // Single-pass ultra-optimized filter & counts computation (O(N) vs O(6N))
  const { counts, filteredFollowups } = useMemo(() => {
    let allCount = 0;
    let todayCount = 0;
    let missedCount = 0;
    let upcomingCount = 0;
    let closedCount = 0;
    const filtered = [];

    const q = searchDeferred ? searchDeferred.toLowerCase().trim() : '';
    const typeFilter = selectedType;
    const execFilter = selectedExecutive !== 'all' ? selectedExecutive.toLowerCase() : 'all';
    const statusFilter = selectedStatusFilter !== 'all' ? selectedStatusFilter.toLowerCase() : 'all';

    for (let i = 0; i < followups.length; i++) {
      const f = followups[i];
      const isClosedItem = typeof f._isClosed === 'boolean' ? f._isClosed : isFollowupClosed(f);

      if (isClosedItem) {
        closedCount++;
      } else {
        allCount++;
        if (f.nextFollowupDate === todayStr) todayCount++;
        else if (f.nextFollowupDate < todayStr) missedCount++;
        else if (f.nextFollowupDate > todayStr) upcomingCount++;
      }

      // Tab Filter fast exit
      if (activeTab === 'all' && isClosedItem) continue;
      if (activeTab === 'today' && (f.nextFollowupDate !== todayStr || isClosedItem)) continue;
      if (activeTab === 'missed' && (f.nextFollowupDate >= todayStr || isClosedItem)) continue;
      if (activeTab === 'upcoming' && (f.nextFollowupDate <= todayStr || isClosedItem)) continue;
      if (activeTab === 'closed' && !isClosedItem) continue;

      // Search Filter fast exit
      if (q) {
        const match = f._searchIndex ? f._searchIndex.includes(q) :
          (f.customerName && f.customerName.toLowerCase().includes(q)) ||
          (f.notes && f.notes.toLowerCase().includes(q)) ||
          (f.phone && f.phone.includes(q)) ||
          (f.inquiryNo && f.inquiryNo.toLowerCase().includes(q)) ||
          (f.assignedTo && f.assignedTo.toLowerCase().includes(q));
        if (!match) continue;
      }

      // Type Filter fast exit
      if (typeFilter !== 'all' && f.followupType !== typeFilter) continue;

      // Executive Filter fast exit
      if (execFilter !== 'all' && !matchExecutiveFilter(f, selectedExecutive, employees)) continue;

      // Lead Status Filter fast exit
      if (statusFilter !== 'all') {
        const rawLeadStatus = String(
          f.leadStatus ||
          (f.history && f.history[0] && f.history[0].leadStatus) ||
          (f.status === 'Active' ? 'Warm' : f.status) ||
          ''
        ).toLowerCase();

        if (statusFilter === 'hot') {
          if (!rawLeadStatus.includes('hot')) continue;
        } else if (statusFilter === 'warm') {
          if (!rawLeadStatus.includes('warm') && !rawLeadStatus.includes('process') && !rawLeadStatus.includes('active')) continue;
        } else if (statusFilter === 'prospect') {
          if (!rawLeadStatus.includes('prospect')) continue;
        } else if (statusFilter === 'cold') {
          if (!rawLeadStatus.includes('cold')) continue;
        } else {
          if (!rawLeadStatus.includes(statusFilter)) continue;
        }
      }

      filtered.push(f);
    }

    return {
      counts: {
        all: allCount,
        today: todayCount,
        missed: missedCount,
        upcoming: upcomingCount,
        closed: closedCount
      },
      filteredFollowups: filtered
    };
  }, [followups, searchDeferred, activeTab, selectedType, selectedExecutive, selectedStatusFilter, todayStr, isFollowupClosed]);

  // Reset page index whenever filter conditions change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDeferred, activeTab, selectedType, selectedExecutive, selectedStatusFilter, pageSize]);

  // Pagination calculation
  const totalEntries = filteredFollowups.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFollowups = filteredFollowups.slice(startIndex, startIndex + pageSize);

  // Grouping for Date-Wise View (Memoized O(N))
  const dateGroupedFollowups = useMemo(() => {
    const acc = {};
    for (let i = 0; i < filteredFollowups.length; i++) {
      const fup = filteredFollowups[i];
      const d = fup.nextFollowupDate && fup.nextFollowupDate !== '—' ? fup.nextFollowupDate : fup.followupDate || 'Unscheduled';
      if (!acc[d]) acc[d] = [];
      acc[d].push(fup);
    }
    return acc;
  }, [filteredFollowups]);

  const handleExportCSV = () => {
    if (!filteredFollowups || filteredFollowups.length === 0) return;
    const headers = ["Customer Name", "Phone", "Followup Date", "Type", "Next Followup", "Executive", "Status", "Notes", "Inquiry No"];
    const rows = filteredFollowups.map(f => [
      `"${f.customerName || ''}"`,
      `"${f.phone || ''}"`,
      `"${f.followupDate || ''}"`,
      `"${f.followupType || ''}"`,
      `"${f.nextFollowupDate || ''}"`,
      `"${f.assignedTo || ''}"`,
      `"${f.status || ''}"`,
      `"${(f.notes || '').replace(/"/g, '""')}"`,
      `"${f.inquiryNo || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_followups_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveTab('all');
    setSelectedType('all');
    setSelectedExecutive('all');
    setSelectedStatusFilter('all');
  };

  const handleAddLeadSubmit = (payload) => {
    saveLead(payload, user);
    setShowAddLeadModal(false);
    loadFollowups(employees);
  };

  const handleCreateActivity = (e) => {
    e.preventDefault();
    const isInactive =
      activityForm.leadStatus === 'Cold' ||
      activityForm.leadStatus === 'Deal Cancelled' ||
      activityForm.leadStatus === 'Deal Done';

    const payload = {
      ...(editingFollowup || {}),
      ...activityForm,
      nextFollowupDate: isInactive ? '—' : (activityForm.nextFollowupDate || todayStr),
      status: isInactive ? 'Closed' : 'Active'
    };

    saveFollowup(payload, user);
    setShowLogActivityModal(false);
    setEditingFollowup(null);
    setActivityForm({
      customerName: '',
      phone: '',
      assignedToId: String(user?.id || user?._id || ''),
      assignedTo: user?.name || user?.username || 'Staff',
      assignedToUsername: user?.username || '',
      followupDate: todayStr,
      followupType: 'Telephonic',
      leadStatus: 'Warm',
      nextFollowupDate: todayStr,
      preferredTime: '12:00',
      notes: '',
      status: 'Active'
    });
    loadFollowups();
  };

  const handleToggleStatus = (fup) => {
    const nextStatus = fup.status === 'Active' ? 'No FollowUp' : 'Active';
    updateFollowupStatus(fup.id, nextStatus, nextStatus === 'No FollowUp' ? 'Closed' : '—');
    loadFollowups();
  };

  const handleDelete = (id) => {
    deleteFollowup(id);
    loadFollowups();
  };

  const handleDeleteAllFollowups = () => {
    if (confirm('Are you sure you want to delete ALL follow-up data across dashboard, customer directory, and follow-up center? This action cannot be undone.')) {
      deleteAllFollowups();
      loadFollowups();
    }
  };

  const handleEditClick = (fup) => {
    setEditingFollowup(fup);
    setActivityForm({
      customerName: fup.customerName || '',
      phone: fup.phone || '',
      assignedToId: fup.assignedToId || String(user?.id || user?._id || ''),
      assignedTo: fup.assignedTo || user?.name || 'Staff',
      assignedToUsername: fup.assignedToUsername || '',
      followupDate: fup.followupDate,
      followupType: fup.followupType || 'Telephonic',
      leadStatus: fup.leadStatus || fup.status || 'Warm',
      nextFollowupDate: fup.nextFollowupDate !== '—' ? fup.nextFollowupDate : todayStr,
      preferredTime: fup.preferredTime || '',
      notes: fup.notes || '',
      status: fup.status || 'Active'
    });
    setShowLogActivityModal(true);
  };

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Customer Follow-Ups" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* HERO HEADER CARD MATCHING USER REFERENCE SCREENSHOT */}
        <div className="fup-hero-card">
          <div className="fup-hero-left">
            <span className="fup-module-badge">
              <Sparkles size={12} /> SALES CRM MODULE
            </span>
            <h1 className="fup-hero-title">Customer Follow-Up Center</h1>
            <p className="fup-hero-sub">
              Track calls, meeting notes, generate quotations and view all follow-ups date-wise.
            </p>
          </div>

          <div className="fup-hero-right">
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="fup-hero-btn btn-add-cust"
            >
              <UserPlus size={16} /> Add New Customer
            </button>

            <button
              onClick={handleDeleteAllFollowups}
              className="fup-hero-btn btn-delete-all-fups"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={15} /> Clear All Follow-ups
            </button>

            {/* Segmented View Switcher */}
            <div className="fup-view-switcher">
              <button
                onClick={() => setViewMode('table')}
                className={`fup-switch-tab ${viewMode === 'table' ? 'active' : ''}`}
              >
                <Table size={14} /> Followup Table
              </button>

              <button
                onClick={() => setViewMode('date')}
                className={`fup-switch-tab ${viewMode === 'date' ? 'active' : ''}`}
              >
                <Calendar size={14} /> Date-Wise View
              </button>

              <button
                onClick={() => setViewMode('excel')}
                className={`fup-switch-tab ${viewMode === 'excel' ? 'active' : ''}`}
              >
                <FileSpreadsheet size={14} /> Bulk Excel Import
              </button>
            </div>
          </div>
        </div>

        {/* STAT METRIC CARDS ROW MATCHING USER SCREENSHOT */}
        <div className="fup-stats-grid">
          {/* Card 1: Total Follow-ups */}
          <div
            onClick={() => setActiveTab('all')}
            className={`fup-stat-card card-purple ${activeTab === 'all' ? 'active-stat' : ''}`}
          >
            <div className="fup-stat-left">
              <span className="fup-stat-label">TOTAL FOLLOW-UPS</span>
              <span className="fup-stat-value">{counts.all}</span>
              <span className="fup-stat-desc">All logged inquiries</span>
            </div>
            <div className="fup-stat-icn-box icn-box-purple">
              <Phone size={22} />
            </div>
          </div>

          {/* Card 2: Today's Schedule */}
          <div
            onClick={() => setActiveTab('today')}
            className={`fup-stat-card card-blue ${activeTab === 'today' ? 'active-stat' : ''}`}
          >
            <div className="fup-stat-left">
              <span className="fup-stat-label">TODAY'S SCHEDULE</span>
              <span className="fup-stat-value">{counts.today}</span>
              <span className="fup-stat-desc">Due for action today</span>
            </div>
            <div className="fup-stat-icn-box icn-box-blue">
              <Clock size={22} />
            </div>
          </div>

          {/* Card 3: Missed / Overdue */}
          <div
            onClick={() => setActiveTab('missed')}
            className={`fup-stat-card card-red ${activeTab === 'missed' ? 'active-stat' : ''}`}
          >
            <div className="fup-stat-left">
              <span className="fup-stat-label">MISSED / OVERDUE</span>
              <span className="fup-stat-value">{counts.missed}</span>
              <span className="fup-stat-desc">Action required</span>
            </div>
            <div className="fup-stat-icn-box icn-box-red">
              <AlertCircle size={22} />
            </div>
          </div>

          {/* Card 4: Upcoming Future */}
          <div
            onClick={() => setActiveTab('upcoming')}
            className={`fup-stat-card card-green ${activeTab === 'upcoming' ? 'active-stat' : ''}`}
          >
            <div className="fup-stat-left">
              <span className="fup-stat-label">UPCOMING FUTURE</span>
              <span className="fup-stat-value">{counts.upcoming}</span>
              <span className="fup-stat-desc">Future scheduled</span>
            </div>
            <div className="fup-stat-icn-box icn-box-green">
              <TrendingUp size={22} />
            </div>
          </div>

          {/* Card 5: Closed / No-F/U */}
          <div
            onClick={() => setActiveTab('closed')}
            className={`fup-stat-card card-slate ${activeTab === 'closed' ? 'active-stat' : ''}`}
          >
            <div className="fup-stat-left">
              <span className="fup-stat-label">CLOSED / NO-F/U</span>
              <span className="fup-stat-value">{counts.closed}</span>
              <span className="fup-stat-desc">Closed & completed</span>
            </div>
            <div className="fup-stat-icn-box icn-box-slate">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        {/* DYNAMIC VIEW CONTENT (TABLE vs DATE-WISE vs BULK EXCEL) */}
        {viewMode === 'table' && (
          <div className="fup-table-section">
            {/* LIGHT ULTRA-PREMIUM CONTROL CARD MATCHING USER SCREENSHOT */}
            {/* LIGHT ULTRA-PREMIUM CONTROL CARD WITH 2 WELL-STRUCTURED ROWS */}
            <div className="fup-control-card-light">
              {/* ROW 1: STATUS TRACK & SEARCH INPUT */}
              <div className="fup-subrow">
                <div className="fup-status-track">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`fup-status-pill ${activeTab === 'all' ? 'active-pill-blue' : ''}`}
                  >
                    All Records <span className="tab-cnt">{counts.all}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('today')}
                    className={`fup-status-pill ${activeTab === 'today' ? 'active-pill-purple' : ''}`}
                  >
                    <Clock size={14} className="pill-icn-clock" />
                    Today's Due <span className="tab-cnt">{counts.today}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('missed')}
                    className={`fup-status-pill ${activeTab === 'missed' ? 'active-pill-red' : ''}`}
                  >
                    <AlertCircle size={14} className="pill-icn-alert" />
                    Missed / Overdue <span className="tab-cnt">{counts.missed}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`fup-status-pill ${activeTab === 'upcoming' ? 'active-pill-cyan' : ''}`}
                  >
                    <Calendar size={14} className="pill-icn-calendar" />
                    Upcoming Future <span className="tab-cnt">{counts.upcoming}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('closed')}
                    className={`fup-status-pill ${activeTab === 'closed' ? 'active-pill-gray' : ''}`}
                  >
                    <CheckCircle2 size={14} className="pill-icn-closed" />
                    Closed / Completed <span className="tab-cnt">{counts.closed}</span>
                  </button>
                </div>

                <div className="fup-search-wrap">
                  <Search size={15} className="search-icn" />
                  <input
                    type="text"
                    placeholder="Search customer, note, phone, inquiry..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="fup-search-inp"
                  />
                  {search && (
                    <button
                      className="fup-clear-btn"
                      onClick={() => setSearch('')}
                      title="Clear Search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* ROW 2: CATEGORY FILTERS & PAGINATION METADATA + ADD CUSTOMER */}
              <div className="fup-subrow">
                <div className="fup-subrow-left">
                  <ProFilterDropdown
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Followup Types', icon: <PhoneCall size={14} /> },
                      { value: 'Telephonic', label: 'Telephonic', icon: <Phone size={14} /> },
                      { value: 'WhatsApp', label: 'WhatsApp', icon: <MessageSquare size={14} /> },
                      { value: 'Email', label: 'Email', icon: <Mail size={14} /> },
                      { value: 'In-Person Meeting', label: 'In-Person Meeting', icon: <User size={14} /> },
                      { value: 'Online Demo', label: 'Online Demo', icon: <Sparkles size={14} /> },
                    ]}
                    iconLeft={<Phone size={14} />}
                  />

                  <ProFilterDropdown
                    value={selectedExecutive}
                    onChange={(e) => setSelectedExecutive(e.target.value)}
                    options={[
                       { value: 'all', label: 'All Executives', icon: <User size={14} /> },
                       ...(isAdmin ? employees : getSubordinateUsers(user, employees))
                         .map((emp) => {
                           const name = emp.name || emp.username;
                           if (!name) return null;
                           const isYou = String(emp._id || emp.id) === String(user?.id || user?._id);
                           return {
                             value: name,
                             label: isYou ? `${name} (You)` : name,
                             icon: <User size={14} />
                           };
                         })
                         .filter(Boolean)
                     ]}
                    iconLeft={<User size={14} />}
                  />

                  <CustomBarStatusFilter
                    value={selectedStatusFilter}
                    onChange={setSelectedStatusFilter}
                  />
                </div>

                <div className="fup-subrow-right">
                  <span className="p-pill-light">
                    PAGE <strong>{currentPage}</strong> of {totalPages}
                  </span>
                  <span className="p-pill-light count-pill-teal">
                    • Total Entries: {filteredFollowups.length}
                  </span>

                  <div className="rows-select-light-wrap">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rows-select-light"
                    >
                      <option value={10}>ROWS 10</option>
                      <option value={25}>ROWS 25</option>
                      <option value={50}>ROWS 50</option>
                      <option value={100}>ROWS 100</option>
                      <option value={250}>ROWS 250</option>
                      <option value={500}>ROWS 500</option>
                    </select>
                    <ChevronDown size={12} className="rows-select-light-icon" />
                  </div>

                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="fup-tool-btn btn-add-cust-pill"
                  >
                    <UserPlus size={16} /> Add New Customer
                  </button>
                </div>
              </div>
            </div>

            {/* Follow-Up Table */}
            <div className="table-card glass-card">
              <div className="table-responsive">
                <table className="fup-pro-table">
                  <thead>
                    <tr>
                      <th>ACTION</th>
                      <th>FOLLOWUP DATE</th>
                      <th>FOLLOWUP TYPE</th>
                      <th>CUSTOMER NAME</th>
                      <th>MOBILE NO</th>
                      <th>NEXT FOLLOWUP</th>
                      <th className="fup-th-notes">NOTES</th>
                      <th>LEAD / INQUIRY NO</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFollowups.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="empty-row-td">
                          No follow-up records found for selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedFollowups.map((f) => (
                        <FollowUpTableRow
                          key={f.id}
                          f={f}
                          todayStr={todayStr}
                          onOpenManageModal={handleOpenManageModal}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Pagination */}
              <div className="table-pagination-footer">
                <span className="showing-entries-txt">
                  Showing <strong>{filteredFollowups.length > 0 ? startIndex + 1 : 0}</strong> to{' '}
                  <strong>{Math.min(startIndex + pageSize, filteredFollowups.length)}</strong> of{' '}
                  <strong>{filteredFollowups.length}</strong> total records
                </span>

                <div className="pg-buttons">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`pg-btn ${currentPage === 1 ? 'disabled' : ''}`}
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`pg-btn ${currentPage === pg ? 'active-pg' : ''}`}
                    >
                      Page {pg}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`pg-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: DATE-WISE TIMELINE VIEW (INTERACTIVE CALENDAR & SCHEDULE PANEL) */}
        {viewMode === 'date' && (
          <div className="fup-date-view-grid">
            {/* LEFT COLUMN: INTERACTIVE MONTHLY CALENDAR PICKER */}
            <div className="fup-cal-card">
              <div className="fup-cal-hdr">
                <button type="button" onClick={handlePrevMonth} className="fup-cal-nav-btn" title="Previous Month">
                  <ChevronLeft size={16} />
                </button>
                <h3 className="fup-cal-month-title">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <button type="button" onClick={handleNextMonth} className="fup-cal-nav-btn" title="Next Month">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="fup-cal-weekdays">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>

              <div className="fup-cal-days-grid">
                {/* Offset cells for month start day */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="fup-cal-day-cell empty" />
                ))}

                {/* Day cells for current month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dayStr === todayStr;
                  const isSelected = dayStr === selectedDateStr;
                  const hasFollowup = scheduledDatesSet.has(dayStr);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDateStr(dayStr)}
                      className={`fup-cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <span className="day-num">{day}</span>
                      {hasFollowup && <span className="fup-dot-indicator" />}
                    </button>
                  );
                })}
              </div>

              <div className="fup-cal-legend">
                <span className="legend-item">
                  <span className="legend-dot has-fup" /> Has Follow-Up
                </span>
                <span className="legend-item">
                  <span className="legend-ring is-today" /> Today
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: SELECTED DATE SCHEDULE DETAILS PANEL */}
            <div className="fup-schedule-panel">
              <div className="fup-schedule-hdr">
                <div className="fup-schedule-hdr-left">
                  <span className="fup-tag-badge">
                    {selectedDateStr === todayStr ? 'TODAY' : 'SELECTED DATE'}
                  </span>
                  <h3 className="fup-schedule-date-txt">
                    {formatSelectedDateHeader(selectedDateStr)}
                  </h3>
                </div>

                <div className="fup-schedule-count-pill">
                  {selectedDateFollowups.length} {selectedDateFollowups.length === 1 ? 'Entry' : 'Entries'}
                </div>
              </div>

              {selectedDateFollowups.length === 0 ? (
                <div className="fup-schedule-empty-card">
                  <div className="empty-icon-wrap">
                    <Calendar size={42} className="empty-icn-svg" />
                  </div>
                  <h4 className="empty-title">No follow-ups on this date</h4>
                  <p className="empty-sub">Select a highlighted date or add a new entry</p>
                </div>
              ) : (
                <div className="fup-schedule-cards-grid">
                  {selectedDateFollowups.map((item) => (
                    <div key={item.id} className="fup-date-item-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="type-pill-badge">
                          <Phone size={11} /> {item.followupType || 'Telephonic'}
                        </span>
                        <span className={item.status === 'Active' ? 'status-badge-active' : 'status-badge-closed'}>
                          {item.status}
                        </span>
                      </div>

                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0F172A' }}>
                        {item.customerName}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} style={{ color: '#2563EB' }} /> <a href={`tel:${item.phone}`} style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>{item.phone}</a> | Exec: {item.assignedTo || 'Unassigned'}
                      </div>

                      <div className="notes-bubble" style={{ maxWidth: '100%' }}>
                        "{item.notes}"
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenManageModal(item)}
                          className="fup-timeline-btn"
                        >
                          <History size={15} />
                          <span>Timeline History</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 3: BULK EXCEL IMPORT VIEW */}
        {viewMode === 'excel' && (
          <div className="fup-excel-view-container animate-fade-in">
            {/* TOP HEADER WITH DOWNLOAD TEMPLATE BUTTON */}
            <div className="fup-excel-hdr-flex">
              <div className="fup-excel-hdr-info">
                <div className="fup-excel-icon-circle">
                  <UploadCloud size={30} />
                </div>
                <div>
                  <h3 className="fup-excel-title">Pro-Level Bulk Excel & CSV Import Engine</h3>
                  <p className="fup-excel-desc">
                    Parse customer leads, executive assignments, and scheduled follow-ups. System automatically routes Cold/Closed leads to the Customer Directory without cluttering active boards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="fup-sample-dl-btn"
                title="Download CSV Format Template with sample data"
              >
                <Download size={15} /> Download Sample CSV Template
              </button>
            </div>

            {/* SUCCESS NOTIFICATION */}
            {importSuccessMsg && (
              <div className="fup-import-success-banner animate-slide-down" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#065F46',
                padding: '14px 20px',
                borderRadius: '12px',
                margin: '16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: 600
              }}>
                <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0 }} />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* DROPZONE AREA */}
            <div
              className={`fup-excel-dropzone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileProcess(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                type="file"
                accept=".csv,.txt"
                id="excel-file-input"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <FileSpreadsheet size={44} className="dropzone-icn" />
              <h4 className="dropzone-text">
                {importFileName ? `Selected: ${importFileName}` : 'Drag & Drop CSV or Excel File Here'}
              </h4>
              <p className="dropzone-sub">
                Supports standard <strong>.CSV</strong> format (Comma Separated Values)
              </p>
              <button
                type="button"
                onClick={() => document.getElementById('excel-file-input').click()}
                className="fup-excel-upload-btn"
              >
                <UploadCloud size={16} /> {importFileName ? 'Change Selected File' : 'Browse File on Computer'}
              </button>
            </div>

            {/* PREVIEW & CONFIRMATION PANEL */}
            {parsedImportRows.length > 0 && (
              <div className="fup-import-preview-section animate-scale-up" style={{ marginTop: '24px' }}>
                {/* SUMMARY CARDS */}
                <div className="fup-import-summary-grid">
                  <div className="summary-card">
                    <span className="card-lbl">Total Parsed Rows</span>
                    <strong className="card-val val-blue">{parsedImportRows.length}</strong>
                  </div>
                  <div className="summary-card">
                    <span className="card-lbl">Active Follow-up Board</span>
                    <strong className="card-val val-green">
                      {parsedImportRows.filter(r => !r.isColdOrClosed).length}
                    </strong>
                  </div>
                  <div className="summary-card">
                    <span className="card-lbl">Customer Directory Only</span>
                    <strong className="card-val val-amber">
                      {parsedImportRows.filter(r => r.isColdOrClosed).length}
                    </strong>
                  </div>
                </div>

                {/* TABLE PREVIEW */}
                <div className="table-card glass-card" style={{ marginTop: '16px' }}>
                  <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="fup-pro-table">
                      <thead>
                        <tr>
                          <th>ROW #</th>
                          <th>CUSTOMER NAME</th>
                          <th>PHONE</th>
                          <th>LEAD STATUS</th>
                          <th>FOLLOWUP TYPE</th>
                          <th>NEXT DATE</th>
                          <th>ASSIGNED TO</th>
                          <th>SYSTEM ROUTING DESTINATION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedImportRows.map((r, idx) => (
                          <tr key={r.id}>
                            <td><strong>#{idx + 1}</strong></td>
                            <td>
                              <strong>{r.customerName}</strong>
                              {r.company && <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{r.company}</div>}
                            </td>
                            <td>{r.phone || '—'}</td>
                            <td>
                              <span className={`lead-status-pill st-${(r.leadStatus || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                {r.leadStatus}
                              </span>
                            </td>
                            <td>{r.followupType}</td>
                            <td>{r.nextFollowupDate}</td>
                            <td>{r.assignedTo}</td>
                            <td>
                              {r.isColdOrClosed ? (
                                <span className="import-dest-badge dest-directory">
                                  <Snowflake size={12} /> Customer Directory Only
                                </span>
                              ) : (
                                <span className="import-dest-badge dest-active">
                                  <CheckCircle2 size={12} /> Active Board + Directory
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedImportRows([]);
                      setImportFileName('');
                    }}
                    className="btn btn-outline"
                    disabled={importing}
                  >
                    Clear & Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="btn btn-primary"
                    disabled={importing}
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}
                  >
                    {importing ? 'Processing & Saving Records...' : `Confirm & Save ${parsedImportRows.length} Records`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- ADD CUSTOMER LEAD MODAL --- */}
      <LeadCustomerModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onSubmit={handleAddLeadSubmit}
        employees={employees.length > 0 ? employees : (user ? [user] : [])}
        currentUser={user}
      />

      {/* --- DEDICATED MANAGE EXTERNAL FOLLOWUP & TIMELINE HISTORY MODAL --- */}
      <ManageFollowUpModal
        isOpen={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          setManageTarget(null);
        }}
        followup={manageTarget}
        customer={manageTarget}
        employees={employees}
        currentUser={user}
        onSaved={() => {
          loadFollowups();
        }}
      />

      {/* --- QUICK LOG ACTIVITY / EDIT FOLLOWUP MODAL --- */}
      {showLogActivityModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card animate-fade-in" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Activity size={20} className="modal-icon" />
                <h3>{editingFollowup ? 'Edit Follow-Up Record' : 'Log New Activity / Call'}</h3>
              </div>
              <button
                onClick={() => {
                  setShowLogActivityModal(false);
                  setEditingFollowup(null);
                }}
                className="close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Client / Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={activityForm.customerName}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, customerName: e.target.value })
                    }
                    placeholder="e.g. Kathan Patel"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Contact # *</label>
                  <input
                    type="text"
                    required
                    value={activityForm.phone}
                    onChange={(e) => setActivityForm({ ...activityForm, phone: e.target.value })}
                    placeholder="+91-9875270319"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Follow-up Type *</label>
                  <select
                    value={activityForm.followupType}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, followupType: e.target.value })
                    }
                    className="form-input"
                  >
                    <option value="Telephonic">Telephonic</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="In-Person Meeting">In-Person Meeting</option>
                    <option value="Online Demo">Online Demo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Executive</label>
                  <select
                    value={activityForm.assignedToId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedEmp = employees.find((emp) => String(emp._id || emp.id) === String(selectedId));
                      setActivityForm({
                        ...activityForm,
                        assignedToId: selectedId,
                        assignedTo: selectedEmp ? (selectedEmp.name || selectedEmp.username) : (user?.name || user?.username || 'Staff'),
                        assignedToUsername: selectedEmp ? (selectedEmp.username || '') : (user?.username || '')
                      });
                    }}
                    className="form-input"
                  >
                    <option value={String(user?.id || user?._id || '')}>
                      {user?.name || user?.username || 'Myself'} (Myself)
                    </option>
                    {employees.map((emp) => {
                      const empId = String(emp._id || emp.id || '');
                      const currentUserId = String(user?.id || user?._id || '');
                      if (empId === currentUserId) return null;
                      return (
                        <option key={empId} value={empId}>
                          {emp.name || emp.username} ({emp.role?.name || 'Staff'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lead Status / Priority *</label>
                  <select
                    value={activityForm.leadStatus || 'Warm'}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, leadStatus: e.target.value })
                    }
                    className="form-input"
                  >
                    <option value="Hot">Hot Lead</option>
                    <option value="Warm">Warm Lead</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Cold">Cold Lead</option>
                    <option value="Deal Done">Deal Done</option>
                    <option value="Deal Cancelled">Deal Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Followup Date *</label>
                  <input
                    type="date"
                    required
                    value={activityForm.followupDate}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, followupDate: e.target.value })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Next Scheduled Date</label>
                  <input
                    type="date"
                    value={activityForm.nextFollowupDate}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, nextFollowupDate: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Interaction Notes & Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  placeholder="Enter interaction notes..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogActivityModal(false);
                    setEditingFollowup(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFollowup ? 'Update Log' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomBarStatusFilter({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const filterOptions = [
    { value: 'all', label: 'All Lead Statuses', icon: Flame, colorClass: 'st-all' },
    { value: 'Hot', label: 'Hot Lead', icon: Flame, colorClass: 'st-hot' },
    { value: 'Warm', label: 'Warm Lead', icon: Zap, colorClass: 'st-warm' },
    { value: 'Prospect', label: 'Prospect', icon: Lightbulb, colorClass: 'st-prospect' },
    { value: 'Cold', label: 'Cold Lead', icon: Snowflake, colorClass: 'st-cold' },
    { value: 'Deal Done', label: 'Deal Done', icon: CheckCircle2, colorClass: 'st-deal-done' },

  ];

  const selectedOpt = filterOptions.find((o) => o.value === value) || filterOptions[0];
  const SelectedIcon = selectedOpt.icon;

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
    <div className="custom-filter-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-filter-trigger-btn ${selectedOpt.colorClass}`}
      >
        <div className="trigger-label-wrap">
          <SelectedIcon size={15} className="filter-svg-ico" />
          <span className="trigger-label">{selectedOpt.label}</span>
        </div>
        <ChevronDown size={14} className={`trigger-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-filter-popover animate-scale-up">
          {filterOptions.map((opt) => {
            const isSelected = opt.value === value;
            const OptIcon = opt.icon;

            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`custom-filter-option-item ${opt.colorClass} ${isSelected ? 'selected' : ''}`}
              >
                <div className="option-label-wrap">
                  <OptIcon size={15} className="filter-svg-ico" />
                  <span className="option-label">{opt.label}</span>
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

