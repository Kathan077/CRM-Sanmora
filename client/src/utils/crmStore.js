import { customerService } from '../services/customer.service';
import { followupService } from '../services/followup.service';
import { taskService } from '../services/task.service';

// Local Storage Store for CRM Leads & Followups

const LEADS_KEY = 'sanmora_crm_leads_v1';
const FOLLOWUPS_KEY = 'sanmora_crm_followups_v1';
const ANNOUNCEMENTS_KEY = 'sanmora_crm_announcements_v1';

// DEFAULT_EMPLOYEES is ONLY used as fallback when backend API is unavailable.
// When backend returns real users, these are NOT added.
export const DEFAULT_EMPLOYEES = [
  { _id: 'default-admin', id: 'default-admin', name: 'Sanmora Main Admin', username: 'admin', role: { name: 'Super Admin' } }
];

/**
 * getCombinedEmployees:
 * - If backend returned real users (employees.length > 0), use ONLY them.
 * - Only add DEFAULT_EMPLOYEES entries when backend has NO users at all (offline/fallback mode).
 * - Always ensure currentUser is present in the list (passed separately if needed).
 */
export const getCombinedEmployees = (employees = []) => {
  // If backend gave us real users, return them directly — no fake data appended
  if (Array.isArray(employees) && employees.length > 0) {
    return [...employees];
  }
  // Fallback: backend offline or no users returned
  return [...DEFAULT_EMPLOYEES];
};

let _cachedLeads = null;
let _cachedFollowups = null;
let _cachedTasks = null;
let _cachedLedgerAccounts = null;

let _storeDispatchTimer = null;
export const notifyStoreUpdated = (immediate = false) => {
  if (typeof window === 'undefined') return;
  if (immediate) {
    if (_storeDispatchTimer) {
      clearTimeout(_storeDispatchTimer);
      _storeDispatchTimer = null;
    }
    window.dispatchEvent(new Event('crm_store_updated'));
    return;
  }
  if (_storeDispatchTimer) clearTimeout(_storeDispatchTimer);
  _storeDispatchTimer = setTimeout(() => {
    window.dispatchEvent(new Event('crm_store_updated'));
    _storeDispatchTimer = null;
  }, 80);
};

export const clearCrmStoreCache = () => {
  _cachedLeads = null;
  _cachedFollowups = null;
  _cachedTasks = null;
  _cachedLedgerAccounts = null;
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || [LEADS_KEY, FOLLOWUPS_KEY, ANNOUNCEMENTS_KEY, 'crm_user', 'user', 'crm_token'].includes(e.key)) {
      clearCrmStoreCache();
      notifyStoreUpdated();
    }
  });
}

export const safeLocalStorageSet = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringVal);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      console.warn(`[Storage Engine] Browser quota exceeded for key "${key}". Truncating older entries safely.`);
      try {
        if (Array.isArray(value)) {
          const trimmed = value.slice(0, 500);
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      } catch (innerErr) {
        // Retained safely in memory cache
      }
    }
  }
};

const PURGE_KEY = 'sanmora_crm_purged_v3';

const runAutoPurgeOnce = () => {
  if (typeof window !== 'undefined' && !localStorage.getItem(PURGE_KEY)) {
    safeLocalStorageSet(FOLLOWUPS_KEY, []);
    safeLocalStorageSet(LEADS_KEY, []);
    safeLocalStorageSet(PURGE_KEY, 'true');
    _cachedFollowups = [];
    _cachedLeads = [];
  }
};

export const getStoredLeads = () => {
  if (typeof window === 'undefined') return [];
  runAutoPurgeOnce();
  if (_cachedLeads !== null) return _cachedLeads;
  const stored = localStorage.getItem(LEADS_KEY);
  if (!stored) {
    localStorage.setItem(LEADS_KEY, JSON.stringify([]));
    _cachedLeads = [];
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    const cleaned = Array.isArray(parsed) ? parsed.filter(item => !['lead-1', 'lead-2', 'lead-3'].includes(item.id)) : [];
    if (Array.isArray(parsed) && cleaned.length !== parsed.length) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(cleaned));
    }
    _cachedLeads = cleaned;
    return cleaned;
  } catch (e) {
    _cachedLeads = [];
    return [];
  }
};

export const getStoredFollowups = () => {
  if (typeof window === 'undefined') return [];
  runAutoPurgeOnce();
  if (_cachedFollowups !== null) return _cachedFollowups;
  const stored = localStorage.getItem(FOLLOWUPS_KEY);
  if (!stored) {
    localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify([]));
    _cachedFollowups = [];
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      _cachedFollowups = [];
      return [];
    }

    // Filter dummy seeds and clean invalid test records
    const cleaned = parsed.filter(item => !['fup-1', 'fup-2', 'fup-3'].includes(item.id) && item.customerName !== 'Unnamed Lead');

    // CONSOLIDATION STEP: Group multiple separate entries for the same lead/customer into 1 thread
    const consolidatedMap = new Map();

    cleaned.forEach(item => {
      // Prioritize inquiryNo as the primary business key, then leadId, then customerName + phone
      const key = (item.inquiryNo && String(item.inquiryNo).trim())
        ? `inq_${String(item.inquiryNo).trim().toLowerCase()}`
        : (item.leadId && String(item.leadId).trim())
          ? `lead_${String(item.leadId).trim()}`
          : (item.customerName && item.phone ? `cp_${String(item.customerName).toLowerCase().trim()}_${String(item.phone).trim()}` : `id_${item._id || item.id}`);

      if (!consolidatedMap.has(key)) {
        const initialHistory = Array.isArray(item.history) && item.history.length > 0 ? item.history : [{
          id: `hist-${item.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          followupDate: item.followupDate || new Date().toISOString().split('T')[0],
          followupType: item.followupType || 'Telephonic',
          notes: item.notes || item.meetingNotes || 'Initial interaction',
          nextFollowupDate: item.nextFollowupDate || item.followupDate || '—',
          preferredTime: item.preferredTime || '',
          assignedTo: item.assignedTo || '',
          assignedToId: item.assignedToId || '',
          createdBy: item.createdBy || item.assignedTo || '',
          createdById: item.createdById || item.assignedToId || '',
          createdAt: item.createdAt || new Date().toISOString()
        }];

        const rawLeadStatus = String(item.leadStatus || '').toLowerCase();
        const rawNotes = String(item.notes || '').toLowerCase();
        const isInactive = 
          rawLeadStatus.includes('cold') || 
          rawLeadStatus.includes('done') || 
          rawLeadStatus.includes('cancel') || 
          rawLeadStatus.includes('closed') ||
          rawNotes.includes('deal done') ||
          rawNotes.includes('deal cancelled') ||
          rawNotes.includes('cold lead');

        let effectiveLeadStatus = item.leadStatus || 'Warm';
        if (rawNotes.includes('deal done') || rawLeadStatus.includes('done')) effectiveLeadStatus = 'Deal Done';
        else if (rawNotes.includes('deal cancelled') || rawLeadStatus.includes('cancel')) effectiveLeadStatus = 'Deal Cancelled';
        else if (rawNotes.includes('cold') || rawLeadStatus.includes('cold')) effectiveLeadStatus = 'Cold';

        const finalId = item._id || item.id || (item.leadId ? `fup-${item.leadId}` : `fup-${Date.now()}`);

        consolidatedMap.set(key, {
          ...item,
          id: finalId,
          _id: item._id || (item.id && !String(item.id).startsWith('fup-') ? item.id : undefined),
          leadId: item.leadId || item.id,
          inquiryNo: item.inquiryNo || getNextInquiryNo(),
          customerName: item.customerName || item.contactPerson || 'Unnamed Customer',
          phone: item.phone || item.primaryContact || '—',
          company: item.company || item.companyName || 'Enterprise Account',
          email: item.email || '',
          assignedTo: item.assignedTo || '',
          assignedToId: item.assignedToId || '',
          createdBy: item.createdBy || '',
          createdById: item.createdById || '',
          followupDate: item.followupDate || new Date().toISOString().split('T')[0],
          followupType: item.followupType || 'Telephonic',
          nextFollowupDate: isInactive ? '—' : (item.nextFollowupDate || item.followupDate || '—'),
          preferredTime: isInactive ? '' : (item.preferredTime || ''),
          notes: item.notes || '',
          leadStatus: effectiveLeadStatus,
          status: isInactive ? 'No FollowUp' : (item.status || 'Active'),
          closingReason: item.closingReason || '—',
          history: initialHistory
        });
      } else {
        const existing = consolidatedMap.get(key);
        
        // Merge history
        if (Array.isArray(item.history) && item.history.length > 0) {
          item.history.forEach(h => {
            if (!existing.history.some(ex => ex.id === h.id || (ex.notes === h.notes && ex.followupDate === h.followupDate))) {
              existing.history.push(h);
            }
          });
        } else {
          const isAlreadyIn = existing.history.some(h => h.id === item.id || (h.notes === item.notes && h.followupDate === item.followupDate));
          if (!isAlreadyIn) {
            existing.history.push({
              id: `hist-${item.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              followupDate: item.followupDate || new Date().toISOString().split('T')[0],
              followupType: item.followupType || 'Telephonic',
              notes: item.notes || item.meetingNotes || '',
              nextFollowupDate: item.nextFollowupDate || '—',
              preferredTime: item.preferredTime || '',
              assignedTo: item.assignedTo || existing.assignedTo || '',
              assignedToId: item.assignedToId || existing.assignedToId || '',
              createdBy: item.createdBy || item.assignedTo || '',
              createdById: item.createdById || item.assignedToId || '',
              createdAt: item.createdAt || new Date().toISOString()
            });
          }
        }

        // Update primary fields if item has newer followup date
        if (item.followupDate >= existing.followupDate) {
          existing.followupDate = item.followupDate;
          existing.followupType = item.followupType || existing.followupType;
          existing.notes = item.notes || existing.notes;
          existing.nextFollowupDate = item.nextFollowupDate || existing.nextFollowupDate;
          existing.assignedTo = item.assignedTo || existing.assignedTo;
          existing.assignedToId = item.assignedToId || existing.assignedToId;
          existing.status = item.status || existing.status;
          existing.closingReason = item.closingReason || existing.closingReason;
        }
      }
    });

    const consolidatedList = Array.from(consolidatedMap.values());

    // Sort history newest first inside each thread
    consolidatedList.forEach(t => {
      t.history.sort((a, b) => new Date(b.followupDate || b.createdAt || 0) - new Date(a.followupDate || a.createdAt || 0));
    });

    if (cleaned.length !== parsed.length || consolidatedList.length !== cleaned.length) {
      localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(consolidatedList));
    }

    _cachedFollowups = consolidatedList;
    return consolidatedList;
  } catch (e) {
    _cachedFollowups = [];
    return [];
  }
};

export const getNextInquiryNo = () => {
  const currentLeads = getStoredLeads();
  const currentFollowups = getStoredFollowups();

  let maxSeq = 0;

  const parseNum = (str) => {
    if (!str) return 0;
    const match = String(str).match(/(\d+)$/);
    if (!match) return 0;
    const val = parseInt(match[1], 10);
    // Ignore random 3-digit seed numbers >= 100 so series starts cleanly from 01
    return val >= 100 && val <= 999 ? 0 : val;
  };

  currentLeads.forEach(l => {
    const n = parseNum(l.inquiryNo);
    if (n > maxSeq) maxSeq = n;
  });

  currentFollowups.forEach(f => {
    const n = parseNum(f.inquiryNo);
    if (n > maxSeq) maxSeq = n;
  });

  const realCount = currentLeads.filter(l => !['lead-1', 'lead-2', 'lead-3'].includes(l.id)).length;
  const nextSeq = Math.max(maxSeq + 1, realCount + 1);
  const formatted = String(nextSeq).padStart(2, '0');
  return `JUL26-${formatted}`;
};

let _inFlightSyncPromise = null;

export const syncCrmStoreWithBackendApi = async (params = null) => {
  if (typeof window === 'undefined') return;
  const token = sessionStorage.getItem('crm_token') || sessionStorage.getItem('token') || localStorage.getItem('crm_token') || localStorage.getItem('token');
  if (!token) return;

  // Deduplicate concurrent calls: return existing promise if sync is already running
  if (_inFlightSyncPromise) {
    return _inFlightSyncPromise;
  }

  _inFlightSyncPromise = (async () => {
    try {
      const [cRes, fRes, tRes] = await Promise.all([
        customerService.getAllCustomers(params).catch(() => null),
        followupService.getAllFollowups(params).catch(() => null),
        taskService.getAllTasks(params).catch(() => null)
      ]);

      // Check if the current user running sync is an Admin
      let activeUser = null;
      try {
        const uStr = sessionStorage.getItem('crm_user') || localStorage.getItem('crm_user');
        if (uStr) activeUser = JSON.parse(uStr);
      } catch (e) {}

      const isAdmin = activeUser ? isAdminUser(activeUser) : false;

      // Helper: Deduplicate a follow-up list by business keys (inquiryNo, leadId, customerName+phone)
      const deduplicateFollowupsList = (list) => {
        const map = new Map();
        for (const item of list) {
          const key = (item.inquiryNo && String(item.inquiryNo).trim())
            ? `inq_${String(item.inquiryNo).trim().toLowerCase()}`
            : (item.leadId && String(item.leadId).trim())
              ? `lead_${String(item.leadId).trim()}`
              : (item.customerName && item.phone)
                ? `cp_${String(item.customerName).toLowerCase().trim()}_${String(item.phone).trim()}`
                : `id_${item._id || item.id}`;

          if (!map.has(key)) {
            map.set(key, { ...item, _id: item._id || item.id, id: item._id || item.id });
          } else {
            const existing = map.get(key);
            // Retain authoritative backend ID if available
            if (item._id && !existing._id) {
              existing._id = item._id;
              existing.id = item._id;
            }
            // Merge histories
            if (Array.isArray(item.history) && item.history.length > 0) {
              const combined = [...(item.history || []), ...(existing.history || [])];
              const hMap = new Map();
              for (const h of combined) {
                const hKey = h.id || `${h.followupDate}_${h.notes}`;
                if (!hMap.has(hKey)) hMap.set(hKey, h);
              }
              existing.history = Array.from(hMap.values());
            }
          }
        }
        return Array.from(map.values());
      };

      // 1. Leads / Customer Directory Sync
      if (cRes && cRes.success && Array.isArray(cRes.data)) {
        if (isAdmin) {
          _cachedLeads = cRes.data;
          safeLocalStorageSet(LEADS_KEY, cRes.data);
        } else {
          // Reconcile: only keep local leads that truly DO NOT exist in backend data
          const existing = getStoredLeads();
          const backendLeads = cRes.data;
          const pendingLocalLeads = existing.filter(l => {
            const isLocal = String(l.id || '').startsWith('lead-') && !l._id;
            if (!isLocal) return false;
            // Check if already represented in backendLeads
            const inBackend = backendLeads.some(b => 
              (b._id && (b._id === l._id || b._id === l.id)) ||
              (b.inquiryNo && l.inquiryNo && b.inquiryNo.trim().toLowerCase() === l.inquiryNo.trim().toLowerCase()) ||
              (b.phone && l.phone && b.phone.trim() === l.phone.trim())
            );
            return !inBackend;
          });
          const finalLeads = [...cRes.data, ...pendingLocalLeads];
          _cachedLeads = finalLeads;
          safeLocalStorageSet(LEADS_KEY, finalLeads);
        }
      }

      // 2. Followups Sync
      if (fRes && fRes.success && Array.isArray(fRes.data)) {
        if (isAdmin) {
          const deduplicated = deduplicateFollowupsList(fRes.data);
          _cachedFollowups = deduplicated;
          safeLocalStorageSet(FOLLOWUPS_KEY, deduplicated);
        } else {
          // Reconcile: only keep local followups that DO NOT already exist on backend
          const existing = getStoredFollowups();
          const backendFollowups = fRes.data;
          const pendingLocalFups = existing.filter(f => {
            const isLocal = String(f.id || '').startsWith('fup-') && !f._id;
            if (!isLocal) return false;
            // Check if already returned by backend
            const inBackend = backendFollowups.some(b => 
              (b._id && (b._id === f._id || b._id === f.id)) ||
              (b.inquiryNo && f.inquiryNo && b.inquiryNo.trim().toLowerCase() === f.inquiryNo.trim().toLowerCase()) ||
              (b.leadId && f.leadId && b.leadId === f.leadId) ||
              (b.phone && f.phone && b.phone.trim() === f.phone.trim() &&
               b.customerName && f.customerName && b.customerName.trim().toLowerCase() === f.customerName.trim().toLowerCase())
            );
            return !inBackend;
          });
          const combined = [...backendFollowups, ...pendingLocalFups];
          const finalFups = deduplicateFollowupsList(combined);
          _cachedFollowups = finalFups;
          safeLocalStorageSet(FOLLOWUPS_KEY, finalFups);
        }
      }

      // 3. Tasks Sync
      if (tRes && tRes.success && Array.isArray(tRes.data)) {
        if (isAdmin) {
          _cachedTasks = tRes.data;
          safeLocalStorageSet(TASKS_KEY, tRes.data);
        } else {
          const existing = getStoredTasks();
          const backendTasks = tRes.data;
          const pendingLocalTasks = existing.filter(t => {
            const isLocal = String(t.id || '').startsWith('task-') && !t._id;
            if (!isLocal) return false;
            const inBackend = backendTasks.some(b => (b._id && (b._id === t._id || b._id === t.id)) || (b.title && t.title && b.title.trim().toLowerCase() === t.title.trim().toLowerCase()));
            return !inBackend;
          });
          const finalTasks = [...tRes.data, ...pendingLocalTasks];
          _cachedTasks = finalTasks;
          safeLocalStorageSet(TASKS_KEY, finalTasks);
        }
      }

      notifyStoreUpdated();
    } catch (err) {
      console.warn('[CRM Store Sync Warning]:', err.message);
    } finally {
      _inFlightSyncPromise = null;
    }
  })();

  return _inFlightSyncPromise;
};

export const saveLead = (leadData, currentUser = null) => {
  const currentLeads = getStoredLeads();
  const creatorName = currentUser?.name || currentUser?.username || leadData.createdBy || 'Staff';
  const creatorId = String(currentUser?.id || currentUser?._id || leadData.createdById || '');
  const leadId = leadData.id || `lead-${Date.now()}`;

  const newLead = {
    id: leadId,
    inquiryNo: leadData.inquiryNo || getNextInquiryNo(),
    ...leadData,
    contactPerson: leadData.contactPerson || leadData.customerName || '',
    customerName: leadData.customerName || leadData.contactPerson || '',
    company: leadData.company || leadData.companyName || 'Enterprise Account',
    phone: leadData.phone || leadData.primaryContact || '—',
    createdBy: creatorName,
    createdById: creatorId,
    assignedTo: leadData.assignedTo || creatorName,
    assignedToId: leadData.assignedToId || creatorId,
    status: leadData.leadStatus || leadData.status || 'warm',
    createdAt: new Date().toISOString()
  };

  // Persist asynchronously to MongoDB database
  customerService.createCustomer(newLead).then(res => {
    if (res && res.success && res.data) {
      syncCrmStoreWithBackendApi();
    }
  }).catch(e => console.warn('[MongoDB Customer Create Error]:', e.message));

  // Upsert Lead in local cache
  const existingIdx = currentLeads.findIndex(l => l.id === leadId || l.inquiryNo === newLead.inquiryNo);
  let updatedLeads;
  if (existingIdx >= 0) {
    updatedLeads = currentLeads.map((l, idx) => idx === existingIdx ? { ...l, ...newLead } : l);
  } else {
    updatedLeads = [newLead, ...currentLeads];
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(LEADS_KEY, updatedLeads);
    notifyStoreUpdated();
  }
  _cachedLeads = updatedLeads;

  // Create or sync follow-up thread
  createOrUpdateFollowupThreadFromLead(newLead, currentUser);

  return newLead;
};

export const updateLead = (leadId, updatedData) => {
  const currentLeads = getStoredLeads();
  let targetLead = null;
  const updatedLeads = currentLeads.map((l) => {
    if (l.id === leadId || l._id === leadId) {
      targetLead = { ...l, ...updatedData };
      return targetLead;
    }
    return l;
  });

  const mongoId = targetLead?._id || targetLead?.id || leadId;
  if (mongoId && !String(mongoId).startsWith('lead-')) {
    customerService.updateCustomer(mongoId, updatedData).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Customer Update Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(LEADS_KEY, updatedLeads);
    notifyStoreUpdated();
  }
  _cachedLeads = updatedLeads;

  if (targetLead) {
    createOrUpdateFollowupThreadFromLead(targetLead);
  }

  return updatedLeads;
};

export const transferLead = (leadId, targetEmployee, currentUser = null, transferNote = '') => {
  if (!leadId || !targetEmployee) return null;

  const targetId = String(targetEmployee._id || targetEmployee.id || '');
  const targetName = targetEmployee.name || targetEmployee.username || 'Employee';
  const senderName = currentUser?.name || currentUser?.username || 'Staff';
  const senderId = String(currentUser?.id || currentUser?._id || '');

  const currentLeads = getStoredLeads();
  let targetLead = null;

  const updatedLeads = currentLeads.map((l) => {
    if (l.id === leadId || l._id === leadId) {
      targetLead = {
        ...l,
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: targetName,
        createdById: targetId,
        originalAssignerName: targetName,
        originalAssignerId: targetId
      };
      return targetLead;
    }
    return l;
  });

  _cachedLeads = updatedLeads;
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(LEADS_KEY, updatedLeads);
  }

  // Also update associated followups in local store
  const currentFollowups = getStoredFollowups();
  const todayStr = new Date().toISOString().split('T')[0];

  const updatedFollowups = currentFollowups.map((f) => {
    if (
      (targetLead && ((f.leadId && (f.leadId === targetLead.id || f.leadId === targetLead._id)) || (f.inquiryNo && f.inquiryNo === targetLead.inquiryNo))) ||
      f.id === leadId || f.leadId === leadId
    ) {
      const history = Array.isArray(f.history) ? [...f.history] : [];
      history.unshift({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        followupDate: todayStr,
        followupType: 'System Transfer',
        notes: transferNote || `Lead transferred from ${senderName} to ${targetName}`,
        nextFollowupDate: f.nextFollowupDate || todayStr,
        preferredTime: f.preferredTime || '',
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: senderName,
        createdById: senderId,
        createdAt: new Date().toISOString()
      });

      return {
        ...f,
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: targetName,
        createdById: targetId,
        originalAssignerName: targetName,
        originalAssignerId: targetId,
        history
      };
    }
    return f;
  });

  _cachedFollowups = updatedFollowups;
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, updatedFollowups);
    notifyStoreUpdated();
  }

  // Persist to MongoDB backend
  const mongoId = targetLead?._id || targetLead?.id || leadId;
  if (mongoId && !String(mongoId).startsWith('lead-')) {
    customerService.transferCustomer(mongoId, {
      targetEmployeeId: targetId,
      targetEmployeeName: targetName,
      transferNote: transferNote
    }).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Customer Transfer Sync Error]:', e.message));
  }

  return targetLead;
};

export const bulkTransferLeads = (leadIds = [], targetEmployee, currentUser = null, transferNote = '') => {
  if (!Array.isArray(leadIds) || leadIds.length === 0 || !targetEmployee) return null;

  const targetId = String(targetEmployee._id || targetEmployee.id || '');
  const targetName = targetEmployee.name || targetEmployee.username || 'Employee';
  const senderName = currentUser?.name || currentUser?.username || 'Staff';
  const senderId = String(currentUser?.id || currentUser?._id || '');

  const idSet = new Set(leadIds.map(id => String(id)));
  const currentLeads = getStoredLeads();
  const matchedLeads = [];

  const updatedLeads = currentLeads.map((l) => {
    const lId = String(l.id || l._id || '');
    if (idSet.has(lId) || idSet.has(String(l.id)) || idSet.has(String(l._id))) {
      const updated = {
        ...l,
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: targetName,
        createdById: targetId,
        originalAssignerName: targetName,
        originalAssignerId: targetId
      };
      matchedLeads.push(updated);
      return updated;
    }
    return l;
  });

  _cachedLeads = updatedLeads;
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(LEADS_KEY, updatedLeads);
  }

  // Also update associated followups in local store
  const currentFollowups = getStoredFollowups();
  const todayStr = new Date().toISOString().split('T')[0];

  const matchedInquiryNos = new Set(matchedLeads.map(l => l.inquiryNo).filter(Boolean));

  const updatedFollowups = currentFollowups.map((f) => {
    const fLeadId = String(f.leadId || f.id || '');
    const fInquiry = f.inquiryNo || '';

    if (idSet.has(fLeadId) || matchedInquiryNos.has(fInquiry)) {
      const history = Array.isArray(f.history) ? [...f.history] : [];
      history.unshift({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        followupDate: todayStr,
        followupType: 'Bulk Transfer',
        notes: transferNote || `Bulk lead transferred from ${senderName} to ${targetName}`,
        nextFollowupDate: f.nextFollowupDate || todayStr,
        preferredTime: f.preferredTime || '',
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: senderName,
        createdById: senderId,
        createdAt: new Date().toISOString()
      });

      return {
        ...f,
        assignedTo: targetName,
        assignedToId: targetId,
        createdBy: targetName,
        createdById: targetId,
        originalAssignerName: targetName,
        originalAssignerId: targetId,
        history
      };
    }
    return f;
  });

  _cachedFollowups = updatedFollowups;
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, updatedFollowups);
    notifyStoreUpdated();
  }

  // Persist to MongoDB backend
  customerService.bulkTransferCustomers({
    leadIds: leadIds,
    targetEmployeeId: targetId,
    targetEmployeeName: targetName,
    transferNote: transferNote
  }).then(res => {
    if (res && res.success) syncCrmStoreWithBackendApi();
  }).catch(e => console.warn('[MongoDB Bulk Customer Transfer Sync Error]:', e.message));

  return matchedLeads;
};

export const deleteLead = (leadId) => {
  const currentLeads = getStoredLeads();
  const targetLead = currentLeads.find(l => l.id === leadId || l._id === leadId);
  const updatedLeads = currentLeads.filter((l) => l.id !== leadId && l._id !== leadId);

  const mongoId = targetLead?._id || targetLead?.id || leadId;
  if (mongoId && !String(mongoId).startsWith('lead-')) {
    customerService.deleteCustomer(mongoId).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Customer Delete Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LEADS_KEY, JSON.stringify(updatedLeads));
  }
  _cachedLeads = updatedLeads;

  // Sync deletion in followups - purge all matching follow-up records completely!
  if (targetLead) {
    deleteFollowupThreadByLeadId(
      targetLead.id || targetLead._id,
      targetLead.inquiryNo || '',
      targetLead.phone || targetLead.primaryContact || '',
      targetLead.customerName || targetLead.contactPerson || targetLead.name || ''
    );
  } else {
    deleteFollowupThreadByLeadId(leadId);
  }

  if (typeof window !== 'undefined') {
    notifyStoreUpdated();
  }

  return updatedLeads;
};

export const createOrUpdateFollowupThreadFromLead = (lead, currentUser = null) => {
  const currentFollowups = getStoredFollowups();
  const todayStr = new Date().toISOString().split('T')[0];

  const creatorName = currentUser?.name || currentUser?.username || lead.createdBy || lead.assignedTo || 'Staff';
  const creatorId = String(currentUser?.id || currentUser?._id || lead.createdById || lead.assignedToId || '');

  // Find existing thread for this lead
  const existingThreadIndex = currentFollowups.findIndex(
    f => (f.leadId && f.leadId === lead.id) || (f.inquiryNo && f.inquiryNo === lead.inquiryNo)
  );

  const initialNote = lead.followupNotes || `${(lead.status || 'WARM').toUpperCase()} lead profile updated for ${lead.customerName || lead.contactPerson || 'Customer'}`;

  let updatedFollowups;
  if (existingThreadIndex >= 0) {
    const existing = currentFollowups[existingThreadIndex];
    
    // Add history item if lead has new followup notes
    const newHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      followupDate: todayStr,
      followupType: lead.followupType || existing.followupType || 'Telephonic',
      notes: initialNote,
      nextFollowupDate: lead.nextFollowupDate || existing.nextFollowupDate || todayStr,
      preferredTime: lead.preferredTime || existing.preferredTime || '',
      assignedTo: lead.assignedTo || existing.assignedTo,
      assignedToId: lead.assignedToId || existing.assignedToId,
      createdBy: creatorName,
      createdById: creatorId,
      createdAt: new Date().toISOString()
    };

    const history = [newHistoryItem, ...(existing.history || [])];

    const updatedThread = {
      ...existing,
      customerName: lead.customerName || lead.contactPerson || existing.customerName,
      phone: lead.phone || lead.primaryContact || existing.phone,
      company: lead.company || lead.companyName || existing.company,
      email: lead.email || existing.email,
      assignedTo: lead.assignedTo || existing.assignedTo,
      assignedToId: lead.assignedToId || existing.assignedToId,
      followupDate: todayStr,
      followupType: lead.followupType || existing.followupType || 'Telephonic',
      nextFollowupDate: lead.nextFollowupDate || existing.nextFollowupDate || todayStr,
      preferredTime: lead.preferredTime || existing.preferredTime || '',
      notes: initialNote,
      status: lead.status === 'cold' ? 'No FollowUp' : 'Active',
      closingReason: lead.status === 'cold' ? 'Closed' : '—',
      history: history
    };

    updatedFollowups = currentFollowups.map((f, idx) => idx === existingThreadIndex ? updatedThread : f);
  } else {
    const newHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      followupDate: todayStr,
      followupType: lead.followupType || 'Telephonic',
      notes: initialNote,
      nextFollowupDate: lead.nextFollowupDate || todayStr,
      preferredTime: lead.preferredTime || '',
      assignedTo: lead.assignedTo || creatorName,
      assignedToId: lead.assignedToId || creatorId,
      createdBy: creatorName,
      createdById: creatorId,
      createdAt: new Date().toISOString()
    };

    const newThread = {
      id: `fup-${lead.id}`,
      leadId: lead.id,
      inquiryNo: lead.inquiryNo || getNextInquiryNo(),
      customerName: lead.customerName || lead.contactPerson || 'Unnamed Lead',
      phone: lead.phone || lead.primaryContact || '—',
      company: lead.company || lead.companyName || 'Enterprise Account',
      email: lead.email || '',
      assignedTo: lead.assignedTo || creatorName,
      assignedToId: lead.assignedToId || creatorId,
      createdBy: creatorName,
      createdById: creatorId,
      followupDate: todayStr,
      followupType: lead.followupType || 'Telephonic',
      nextFollowupDate: lead.nextFollowupDate || todayStr,
      preferredTime: lead.preferredTime || '',
      notes: initialNote,
      status: lead.status === 'cold' ? 'No FollowUp' : 'Active',
      closingReason: lead.status === 'cold' ? 'Closed' : '—',
      history: [newHistoryItem]
    };

    updatedFollowups = [newThread, ...currentFollowups];
  }

  // Persist follow-up thread to MongoDB database
  const targetThread = existingThreadIndex >= 0 ? updatedFollowups[existingThreadIndex] : updatedFollowups[0];
  const mongoFupId = targetThread?._id || (existingThreadIndex >= 0 && currentFollowups[existingThreadIndex]?._id);
  if (mongoFupId && !String(mongoFupId).startsWith('fup-')) {
    followupService.updateFollowup(mongoFupId, targetThread).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Followup Update Error]:', e.message));
  } else {
    followupService.createFollowup(targetThread).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Followup Create Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(updatedFollowups));
    notifyStoreUpdated();
  }
  _cachedFollowups = updatedFollowups;
};

export const createFollowupFromLead = createOrUpdateFollowupThreadFromLead;

export const addCustomerFollowup = (fupData, currentUser = null) => {
  const currentFollowups = getStoredFollowups();
  const todayStr = new Date().toISOString().split('T')[0];

  const loggedByName = currentUser?.name || currentUser?.username || fupData.createdBy || 'Staff';
  const loggedById = String(currentUser?.id || currentUser?._id || fupData.createdById || '');

  const targetLeadId = fupData.leadId || fupData.id || `lead-${Date.now()}`;
  const targetInquiryNo = fupData.inquiryNo || getNextInquiryNo();

  // Search existing thread by leadId, inquiryNo, or customer/phone
  const existingThreadIndex = currentFollowups.findIndex(
    f => (f.leadId && f.leadId === targetLeadId) ||
         (f.inquiryNo && f.inquiryNo === targetInquiryNo) ||
         (f.id === fupData.id) ||
         (f.customerName?.toLowerCase() === fupData.customerName?.toLowerCase() && f.phone === fupData.phone)
  );

  const existing = existingThreadIndex >= 0 ? currentFollowups[existingThreadIndex] : null;

  const assignedToName = fupData.assignedTo || (existing ? existing.assignedTo : loggedByName);
  const assignedToId = fupData.assignedToId || (existing ? existing.assignedToId : loggedById);
  const leadStatusValue = fupData.leadStatus || (existing ? existing.leadStatus : 'Warm');
  const isInactive = leadStatusValue === 'Cold' || leadStatusValue === 'Deal Cancelled' || leadStatusValue === 'Deal Done' || leadStatusValue === 'Closed' || fupData.status === 'No FollowUp';

  const newHistoryItem = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    followupDate: fupData.followupDate || todayStr,
    followupType: fupData.followupType || 'Telephonic',
    leadStatus: leadStatusValue,
    notes: fupData.notes || fupData.meetingNotes || 'Follow-up interaction logged',
    nextFollowupDate: isInactive ? '—' : (fupData.nextFollowupDate || todayStr),
    preferredTime: isInactive ? '' : (fupData.preferredTime || '12:00'),
    assignedTo: assignedToName,
    assignedToId: assignedToId,
    assignedToUsername: fupData.assignedToUsername || '',
    createdBy: loggedByName,
    createdById: loggedById,
    createdAt: new Date().toISOString()
  };

  let updatedFollowups;
  let targetThread;

  if (existingThreadIndex >= 0) {
    const existing = currentFollowups[existingThreadIndex];
    const updatedHistory = [newHistoryItem, ...(existing.history || [])];

    targetThread = {
      ...existing,
      customerName: fupData.customerName || existing.customerName,
      phone: fupData.phone || existing.phone,
      assignedTo: assignedToName,
      assignedToId: assignedToId,
      assignedToUsername: fupData.assignedToUsername || existing.assignedToUsername || '',
      assignedUntilDate: fupData.assignedUntilDate !== undefined ? fupData.assignedUntilDate : (existing.assignedUntilDate || null),
      originalAssignerId: fupData.originalAssignerId || existing.originalAssignerId || loggedById,
      originalAssignerName: fupData.originalAssignerName || existing.originalAssignerName || loggedByName,
      createdBy: existing.createdBy || fupData.createdBy || loggedByName,
      createdById: existing.createdById || fupData.createdById || loggedById,
      followupDate: fupData.followupDate || todayStr,
      followupType: fupData.followupType || existing.followupType,
      nextFollowupDate: isInactive ? '—' : (fupData.nextFollowupDate || existing.nextFollowupDate || todayStr),
      preferredTime: isInactive ? '' : (fupData.preferredTime || existing.preferredTime || ''),
      notes: fupData.notes || existing.notes,
      leadStatus: leadStatusValue,
      status: isInactive ? 'No FollowUp' : 'Active',
      closingReason: isInactive ? (leadStatusValue === 'Cold' ? 'Cold Lead (Archive)' : leadStatusValue === 'Deal Done' ? 'Deal Done (Won)' : 'Deal Cancelled') : '—',
      history: updatedHistory
    };

    updatedFollowups = currentFollowups.map((f, idx) => idx === existingThreadIndex ? targetThread : f);
  } else {
    targetThread = {
      id: `fup-${targetLeadId}`,
      leadId: targetLeadId,
      inquiryNo: targetInquiryNo,
      customerName: fupData.customerName || 'Unnamed Customer',
      phone: fupData.phone || '—',
      company: fupData.company || 'Enterprise Account',
      email: fupData.email || '',
      assignedTo: assignedToName,
      assignedToId: assignedToId,
      assignedToUsername: fupData.assignedToUsername || '',
      assignedUntilDate: fupData.assignedUntilDate || null,
      originalAssignerId: fupData.originalAssignerId || loggedById,
      originalAssignerName: fupData.originalAssignerName || loggedByName,
      createdBy: loggedByName,
      createdById: loggedById,
      followupDate: fupData.followupDate || todayStr,
      followupType: fupData.followupType || 'Telephonic',
      nextFollowupDate: isInactive ? '—' : (fupData.nextFollowupDate || todayStr),
      preferredTime: isInactive ? '' : (fupData.preferredTime || '12:00'),
      notes: fupData.notes || fupData.meetingNotes || 'Follow-up interaction logged',
      leadStatus: leadStatusValue,
      status: isInactive ? 'No FollowUp' : 'Active',
      closingReason: isInactive ? (leadStatusValue === 'Cold' ? 'Cold Lead (Archive)' : leadStatusValue === 'Deal Done' ? 'Deal Done (Won)' : 'Deal Cancelled') : '—',
      history: [newHistoryItem]
    };

    updatedFollowups = [targetThread, ...currentFollowups];
  }

  // Persist asynchronously to MongoDB database
  const mongoFupId = targetThread._id || (existing ? existing._id : null);
  if (mongoFupId && !String(mongoFupId).startsWith('fup-')) {
    followupService.updateFollowup(mongoFupId, targetThread).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Followup Update Error]:', e.message));
  } else {
    followupService.createFollowup(targetThread).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Followup Create Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, updatedFollowups);
    notifyStoreUpdated();
  }
  _cachedFollowups = updatedFollowups;

  // BI-DIRECTIONAL CRUD SYNC: Also upsert Customer in Customers Directory (`sanmora_crm_leads_v1`)
  syncLeadFromFollowupThread(targetThread, currentUser);

  return targetThread;
};

export const saveFollowup = addCustomerFollowup;

export const syncLeadFromFollowupThread = (thread, currentUser = null) => {
  const currentLeads = getStoredLeads();
  const existingLeadIndex = currentLeads.findIndex(
    l => l.id === thread.leadId || l.inquiryNo === thread.inquiryNo
  );

  let mappedStatus = 'warm';
  if (thread.leadStatus) {
    const ls = thread.leadStatus.toLowerCase();
    if (ls.includes('hot')) mappedStatus = 'hot';
    else if (ls.includes('prospect')) mappedStatus = 'prospect';
    else if (ls.includes('cold')) mappedStatus = 'cold';
    else if (ls.includes('done') || ls.includes('won')) mappedStatus = 'won';
    else if (ls.includes('cancel') || ls.includes('lost')) mappedStatus = 'lost';
    else mappedStatus = 'warm';
  } else if (thread.status === 'No FollowUp') {
    mappedStatus = 'cold';
  }

  const updatedLeadData = {
    id: thread.leadId || `lead-${Date.now()}`,
    inquiryNo: thread.inquiryNo,
    customerName: thread.customerName,
    contactPerson: thread.customerName,
    company: thread.company || 'Enterprise Account',
    phone: thread.phone,
    email: thread.email || '',
    assignedTo: thread.assignedTo,
    assignedToId: thread.assignedToId,
    assignedToUsername: thread.assignedToUsername || '',
    assignedUntilDate: thread.assignedUntilDate || null,
    originalAssignerId: thread.originalAssignerId || '',
    originalAssignerName: thread.originalAssignerName || '',
    createdBy: thread.createdBy,
    createdById: thread.createdById,
    nextFollowupDate: thread.nextFollowupDate,
    preferredTime: thread.preferredTime,
    followupType: thread.followupType,
    followupNotes: thread.notes,
    leadStatus: thread.leadStatus || mappedStatus,
    status: mappedStatus
  };

  let updatedLeads;
  if (existingLeadIndex >= 0) {
    const existing = currentLeads[existingLeadIndex];
    const targetCustomer = { ...existing, ...updatedLeadData };
    updatedLeads = currentLeads.map((l, idx) => idx === existingLeadIndex ? targetCustomer : l);

    const mongoId = targetCustomer._id || targetCustomer.id;
    if (mongoId && !String(mongoId).startsWith('lead-')) {
      customerService.updateCustomer(mongoId, updatedLeadData).then(res => {
        if (res && res.success) syncCrmStoreWithBackendApi();
      }).catch(e => console.warn('[MongoDB Customer Update Sync Error]:', e.message));
    }
  } else {
    const newCust = { ...updatedLeadData, createdAt: new Date().toISOString() };
    updatedLeads = [newCust, ...currentLeads];

    customerService.createCustomer(newCust).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Customer Create Sync Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(LEADS_KEY, updatedLeads);
    notifyStoreUpdated();
  }
  _cachedLeads = updatedLeads;
};

export const updateFollowupStatus = (fupId, newStatus, reason = '—') => {
  const current = getStoredFollowups();
  let targetThread = null;
  const updated = current.map((f) => {
    if (f.id === fupId || f.leadId === fupId) {
      targetThread = {
        ...f,
        status: newStatus,
        closingReason: newStatus === 'No FollowUp' || newStatus === 'Closed' ? (reason || 'Closed') : '—'
      };
      return targetThread;
    }
    return f;
  });

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, updated);
  }
  _cachedFollowups = updated;

  if (targetThread) {
    updateLead(targetThread.leadId, {
      status: newStatus === 'No FollowUp' || newStatus === 'Closed' ? 'cold' : 'warm'
    });
  }

  return updated;
};

export const deleteFollowup = (fupId) => {
  const current = getStoredFollowups();
  const targetThread = current.find(f => f.id === fupId || f._id === fupId || f.leadId === fupId);
  const updated = current.filter((f) => f.id !== fupId && f._id !== fupId && f.leadId !== fupId);

  const mongoId = targetThread?._id || targetThread?.id || fupId;
  if (mongoId && !String(mongoId).startsWith('fup-')) {
    followupService.deleteFollowup(mongoId).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Followup Delete Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, updated);
  }
  _cachedFollowups = updated;

  // ALSO sync delete in Customer Directory if deleting from follow-up side
  if (targetThread && targetThread.leadId) {
    const currentLeads = getStoredLeads();
    const updatedLeads = currentLeads.filter(l => l.id !== targetThread.leadId && l.inquiryNo !== targetThread.inquiryNo);
    if (typeof window !== 'undefined') {
      safeLocalStorageSet(LEADS_KEY, updatedLeads);
      _cachedLeads = updatedLeads;
    }
  }

  if (typeof window !== 'undefined') {
    notifyStoreUpdated();
  }

  return updated;
};

export const deleteAllFollowups = () => {
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(FOLLOWUPS_KEY, []);
    safeLocalStorageSet(LEADS_KEY, []);
    safeLocalStorageSet(PURGE_KEY, 'true');
    notifyStoreUpdated();
  }
  _cachedFollowups = [];
  _cachedLeads = [];
  return [];
};

export const deleteFollowupThreadByLeadId = (leadId, inquiryNo = '', phone = '', customerName = '') => {
  const current = getStoredFollowups();
  const normPhone = (phone || '').replace(/\D/g, '');
  const normName = (customerName || '').toLowerCase().trim();

  const targets = current.filter(f => {
    if (leadId && (f.leadId === leadId || f.id === leadId || f.id === `fup-${leadId}`)) return true;
    if (inquiryNo && f.inquiryNo === inquiryNo) return true;
    if (normPhone && f.phone && String(f.phone).replace(/\D/g, '') === normPhone) return true;
    if (normName && f.customerName && String(f.customerName).toLowerCase().trim() === normName) return true;
    return false;
  });

  targets.forEach(t => {
    const mongoFupId = t._id || t.id;
    if (mongoFupId && !String(mongoFupId).startsWith('fup-')) {
      followupService.deleteFollowup(mongoFupId).catch(() => {});
    }
  });

  const updated = current.filter(f => !targets.includes(f));

  if (typeof window !== 'undefined') {
    localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(updated));
    _cachedFollowups = updated;
    notifyStoreUpdated();
  } else {
    _cachedFollowups = updated;
  }
  return updated;
};

export const getCustomerFollowupHistory = (leadId, customerName = '', inquiryNo = '') => {
  const followups = getStoredFollowups();
  const thread = followups.find((f) => {
    if (leadId && (f.leadId === leadId || f.id === leadId)) return true;
    if (inquiryNo && f.inquiryNo === inquiryNo) return true;
    if (customerName && f.customerName?.toLowerCase() === customerName.toLowerCase()) return true;
    return false;
  });

  if (!thread) return [];
  if (Array.isArray(thread.history) && thread.history.length > 0) {
    return thread.history;
  }

  // Fallback single interaction item if history is empty
  return [{
    id: `hist-${thread.id}-${Math.random().toString(36).substring(2, 9)}`,
    followupDate: thread.followupDate,
    followupType: thread.followupType || 'Telephonic',
    notes: thread.notes || 'Initial record',
    nextFollowupDate: thread.nextFollowupDate,
    preferredTime: thread.preferredTime || '',
    assignedTo: thread.assignedTo || '',
    assignedToId: thread.assignedToId || '',
    createdBy: thread.createdBy || '',
    createdById: thread.createdById || '',
    createdAt: thread.createdAt || new Date().toISOString()
  }];
};

/**
 * matchUser - checks if a stored assignee/creator matches the logged-in user.
 * Since backend User model has NO username field, we match by:
 * 1. MongoDB _id exact string match (most reliable)
 * 2. Exact name match (case-insensitive)
 * 3. email or email-prefix match
 * 4. username field (only if present, legacy support)
 */
export const matchUser = (targetId, targetName, user, targetUsername = '') => {
  if (!user) return false;

  // Extract all possible identifiers for the logged-in user
  const uId       = String(user.id   || user._id  || '').trim();
  const uName     = String(user.name || '').trim().toLowerCase();
  const uEmail    = String(user.email || '').trim().toLowerCase();
  const uUsername = String(user.username || '').trim().toLowerCase();

  // Extract all possible identifiers from the stored record
  const tId       = String(targetId   || '').trim();
  const tName     = String(targetName || '').trim().toLowerCase();
  const tUsername = String(targetUsername || '').trim().toLowerCase();

  // Nothing to compare against
  if (!tId && !tName && !tUsername) return false;

  // ── 1. Strict ID Match (highest priority) ───────────────────────────
  if (uId && tId && uId === tId) {
    return true;
  }

  // ── 2. Strict Exact Name Match (case-insensitive) ───────────────────
  if (uName && tName && uName === tName) return true;

  // ── 3. Strict Exact Username Match (case-insensitive) ───────────────
  if (uUsername && tUsername && uUsername === tUsername) return true;
  if (uUsername && tName    && uUsername === tName)      return true;
  if (uName     && tUsername && uName === tUsername)     return true;

  // ── 4. Strict Exact Email Match ─────────────────────────────────────
  if (uEmail && tName && uEmail === tName) return true;
  if (uEmail && tUsername && uEmail === tUsername) return true;

  // ── 5. Exact Matches Only — Substring matching removed to prevent cross-employee data leaks ──

  return false;
};

/**
 * matchExecutiveFilter - Filters items based on selected executive dropdown value.
 * Performs bulletproof multi-field matching across ID, name, username, createdBy, assignedTo.
 */
export const matchExecutiveFilter = (item, selectedExecVal, allEmployees = []) => {
  if (!selectedExecVal || selectedExecVal === 'all') return true;
  if (!item) return false;

  const targetStr = String(selectedExecVal).toLowerCase().trim();

  // Find matching employee object if available
  const matchedEmp = allEmployees.find(e => {
    const eId = String(e._id || e.id || '').toLowerCase().trim();
    const eName = String(e.name || '').toLowerCase().trim();
    const eUsername = String(e.username || '').toLowerCase().trim();
    const eEmail = String(e.email || '').toLowerCase().trim();
    return eId === targetStr || eName === targetStr || eUsername === targetStr || eEmail === targetStr;
  });

  if (matchedEmp) {
    const isAssigned = matchUser(item.assignedToId, item.assignedTo, matchedEmp, item.assignedToUsername);
    const isCreated  = matchUser(item.createdById, item.createdBy, matchedEmp);
    if (isAssigned || isCreated) return true;
  }

  // Direct property string matching (exact match only — no substring leakage)
  const assignedName = String(item.assignedTo || '').toLowerCase().trim();
  const assignedId   = String(item.assignedToId || '').toLowerCase().trim();
  const createdName  = String(item.createdBy || '').toLowerCase().trim();
  const createdId    = String(item.createdById || '').toLowerCase().trim();

  if (assignedId === targetStr || createdId === targetStr) return true;
  if (assignedName === targetStr || createdName === targetStr) return true;

  return false;
};

/**
 * getSubordinateUsers - Returns array of user objects in the team hierarchy under `user`
 * (including `user` themselves, and all employees reporting to `user` directly or transitively).
 */
export const getSubordinateUsers = (user, allUsers = []) => {
  if (!user) return [];

  const uId = String(user.id || user._id || '').trim();
  const team = [user];

  const userList = Array.isArray(allUsers) && allUsers.length > 0 ? allUsers : getCombinedEmployees([]);
  if (userList.length === 0) return team;

  const visitedIds = new Set([uId]);
  const queue = [user];

  while (queue.length > 0) {
    const currMgr = queue.shift();
    const currMgrId = String(currMgr.id || currMgr._id || '').trim();
    const currMgrName = String(currMgr.name || '').trim().toLowerCase();
    const currMgrEmail = String(currMgr.email || '').trim().toLowerCase();
    const currMgrUsername = String(currMgr.username || '').trim().toLowerCase();

    userList.forEach((u) => {
      const targetId = String(u.id || u._id || '').trim();
      if (targetId && visitedIds.has(targetId)) return;

      const repVal = u.reportingTo;
      // Normalize repId: handle both populated object and raw string ID from MongoDB
      const repId = String(
        (repVal && typeof repVal === 'object' ? (repVal._id || repVal.id) : repVal) || ''
      ).trim();
      const repName = String(repVal?.name || (typeof repVal === 'string' ? repVal : '') || '').trim().toLowerCase();
      const repEmail = String(repVal?.email || '').trim().toLowerCase();
      const repUsername = String(repVal?.username || '').trim().toLowerCase();

      let isChild = false;
      // Primary: ID match (most reliable — MongoDB _id comparison)
      if (currMgrId && repId && currMgrId === repId) {
        isChild = true;
      }
      // Secondary: Name/email/username fallbacks
      else if (currMgrName && repName && currMgrName === repName) {
        isChild = true;
      } else if (currMgrEmail && repEmail && currMgrEmail === repEmail) {
        isChild = true;
      } else if (currMgrUsername && repUsername && currMgrUsername === repUsername) {
        isChild = true;
      } else if (currMgrUsername && repName && currMgrUsername === repName) {
        isChild = true;
      } else if (currMgrName && repUsername && currMgrName === repUsername) {
        isChild = true;
      }

      if (isChild) {
        if (targetId) visitedIds.add(targetId);
        team.push(u);
        queue.push(u);
      }
    });
  }

  return team;
};

/**
 * resolveEffectiveAssignee - Evaluates time-bound temporary assignments.
 * If `assignedUntilDate` is set on item, and `todayStr > item.assignedUntilDate`,
 * the assignment has EXPIRED, so the item automatically reverts to the original Assigner/Manager
 * (`originalAssignerId` / `originalAssignerName` or `createdById` / `createdBy`).
 */
export const resolveEffectiveAssignee = (item, todayStr = new Date().toISOString().split('T')[0]) => {
  if (!item) return { assignedToId: '', assignedTo: '', isExpired: false };

  const expiryDate = item.assignedUntilDate || item.assignmentExpiryDate;

  // Check if temporary assignment has expired
  if (expiryDate && todayStr > expiryDate) {
    const revertId   = item.originalAssignerId   || item.createdById || '';
    const revertName = item.originalAssignerName || item.createdBy   || 'Manager';
    return {
      assignedToId: revertId,
      assignedTo: revertName,
      assignedToUsername: '',
      isExpired: true,
      expiryDate: expiryDate
    };
  }

  return {
    assignedToId: item.assignedToId || '',
    assignedTo: item.assignedTo || '',
    assignedToUsername: item.assignedToUsername || '',
    isExpired: false,
    expiryDate: expiryDate || null
  };
};

/**
 * isAdminUser - Identifies Super Admin / Main Admin / System Admin who MUST see ALL data.
 *
 * ⚠️ ABSOLUTE RULE: Admin ALWAYS sees ALL follow-ups from ALL employees.
 * No employee filter. No assignedTo filter. No createdBy filter. No reportingTo filter.
 *
 * Detection layers:
 *   1. Direct boolean flags on user or role object (isSuperAdmin, isAdmin, isMainAdmin)
 *   2. Role name check (Super Admin, Main Admin, Admin, Administrator, System Admin, Owner)
 *   3. Known admin identity patterns (ID, username, email, name)
 *   4. System permissions / wildcard access
 */
export const isAdminUser = (user) => {
  let activeUser = user;
  if (!activeUser && typeof window !== 'undefined') {
    try {
      const storedStr = localStorage.getItem('crm_user') || localStorage.getItem('user') || sessionStorage.getItem('crm_user');
      if (storedStr) activeUser = JSON.parse(storedStr);
    } catch (e) {}
  }
  if (!activeUser) return false;

  // ── Layer 1: Direct boolean flags (fastest check) ───────────────────────
  if (
    activeUser.isSuperAdmin === true ||
    activeUser.isAdmin === true ||
    activeUser.isMainAdmin === true ||
    activeUser.role?.isSuperAdmin === true ||
    activeUser.role?.isAdmin === true ||
    activeUser.role?.isMainAdmin === true
  ) {
    return true;
  }

  // Exact admin role title set
  const ADMIN_ROLES = new Set([
    'super admin', 'superadmin', 'main admin', 'mainadmin',
    'admin', 'administrator', 'system admin', 'systemadministrator', 'owner'
  ]);

  // ── Layer 2: Strict Role name check ──────────────────────────────────────
  if (typeof activeUser.role === 'object' && activeUser.role !== null) {
    const roleObj = activeUser.role;
    const roleName = String(roleObj.name || roleObj.title || roleObj.roleName || '').toLowerCase().trim();
    if (ADMIN_ROLES.has(roleName)) return true;
  } else if (typeof activeUser.role === 'string') {
    const roleStr = activeUser.role.toLowerCase().trim();
    if (ADMIN_ROLES.has(roleStr)) return true;
  }

  // ── Layer 3: Known admin identity patterns ───────────────────────────────
  const username = String(activeUser.username || '').toLowerCase().trim();
  const email    = String(activeUser.email    || '').toLowerCase().trim();
  const name     = String(activeUser.name     || '').toLowerCase().trim();
  const uId      = String(activeUser.id || activeUser._id || '').toLowerCase().trim();

  if (uId === 'default-admin' || uId === 'admin') return true;
  if (username === 'admin' || username === 'superadmin' || username === 'mainadmin') return true;
  if (email === 'admin@sanmoracrm.com' || email.startsWith('admin@') || email.startsWith('superadmin@') || email.startsWith('mainadmin@')) return true;
  if (name === 'admin' || name === 'sanmora main admin' || name === 'main admin' || name === 'super admin') return true;

  // ── Layer 4: Explicit wildcard permission check ─────────────────────────
  if (Array.isArray(activeUser.effectivePermissions)) {
    if (activeUser.effectivePermissions.includes('*') || activeUser.effectivePermissions.includes('all') || activeUser.effectivePermissions.includes('system:admin')) return true;
  }

  return false;
};

export const filterByRole = (items = [], user = null, allUsers = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  // ══════════════════════════════════════════════════════════════════
  // ⚡ ADMIN GUARANTEE — Main Admin / Super Admin sees 100% of ALL records!
  // MUST BE CHECKED FIRST BEFORE ANY HIERARCHY FILTERING!
  // ══════════════════════════════════════════════════════════════════
  if (user && isAdminUser(user)) {
    return items;
  }

  // Fallback user retrieval if user prop is transiently null
  let activeUser = user;
  if (!activeUser && typeof window !== 'undefined') {
    try {
      const storedStr = localStorage.getItem('crm_user') || localStorage.getItem('user') || sessionStorage.getItem('crm_user');
      if (storedStr) activeUser = JSON.parse(storedStr);
    } catch (e) {}
  }

  if (activeUser && isAdminUser(activeUser)) {
    return items;
  }

  // ⚠️ SECURITY MANDATE: If activeUser is missing/null, return [] (empty array)
  // NEVER return items when user is unauthenticated or loading!
  if (!activeUser) return [];

  // ══════════════════════════════════════════════════════════════════
  // MANAGER / EMPLOYEE HIERARCHY FILTER
  // Each user sees: their own records + all subordinates' records
  // ══════════════════════════════════════════════════════════════════

  // Get all users (backend list takes priority over fallback)
  const effectiveUsersList = Array.isArray(allUsers) && allUsers.length > 0
    ? allUsers
    : getCombinedEmployees([]);

  // Build team: [activeUser, ...all direct/indirect subordinates]
  const teamUsers = getSubordinateUsers(activeUser, effectiveUsersList);
  const todayStr = new Date().toISOString().split('T')[0];

  // Build fast Sets of all team member identifiers for O(1) lookup
  const teamIdSet = new Set(
    teamUsers.map(m => String(m.id || m._id || '').trim()).filter(Boolean)
  );
  const teamNameSet = new Set(
    teamUsers.map(m => String(m.name || '').trim().toLowerCase()).filter(Boolean)
  );
  const teamUsernameSet = new Set(
    teamUsers.map(m => String(m.username || '').trim().toLowerCase()).filter(Boolean)
  );
  const teamEmailSet = new Set(
    teamUsers.map(m => String(m.email || '').trim().toLowerCase()).filter(Boolean)
  );

  // ──────────────────────────────────────────────────────────────────
  // isTeamMember: STRICT hierarchy membership check.
  // ──────────────────────────────────────────────────────────────────
  const GENERIC_NAMES = new Set([
    'staff', 'unassigned', 'n/a', '—', '-', 'none', 'myself',
    'null', 'undefined', 'default-admin', 'admin', 'super admin', 'main admin', 'administrator'
  ]);

  const isTeamMember = (storedId, storedName, storedUsername = '') => {
    const sid       = String(storedId       || '').trim();
    const sname     = String(storedName     || '').trim().toLowerCase();
    const susername = String(storedUsername || '').trim().toLowerCase();

    // 1. Strict ID match (highest priority — MongoDB _id)
    if (sid && sid !== 'default-admin' && teamIdSet.has(sid)) return true;

    // 2. Strict exact name match (ignoring generic placeholders like "Staff", "Unassigned")
    if (sname && !GENERIC_NAMES.has(sname) && teamNameSet.has(sname)) return true;

    // 3. Strict exact username match
    if (susername && !GENERIC_NAMES.has(susername) && teamUsernameSet.has(susername)) return true;

    // 4. Strict exact email match
    if (sname && !GENERIC_NAMES.has(sname) && teamEmailSet.has(sname)) return true;
    if (susername && !GENERIC_NAMES.has(susername) && teamEmailSet.has(susername)) return true;

    return false;
  };

  return items.filter((item) => {
    // ── Step 1: Check effective (time-resolved) assignee ─────────────
    // Evaluates temporary assignment & expiry (reverts to original assigner / creator if expired)
    const eff = resolveEffectiveAssignee(item, todayStr);
    if (isTeamMember(eff.assignedToId, eff.assignedTo, eff.assignedToUsername)) {
      return true;
    }

    // ── Step 2: Check Record Creator ──────────────────────────────────
    // The employee who created the record always maintains visibility
    if (isTeamMember(item.createdById, item.createdBy)) {
      return true;
    }

    // ── Step 3: Check Original Assigner ───────────────────────────────
    // If under active temporary assignment, the original assigner maintains visibility
    if (isTeamMember(item.originalAssignerId, item.originalAssignerName)) {
      return true;
    }

    // ── Step 4: Legacy fallback — history scan ONLY for old records ───
    // Only used when the follow-up has NO top-level ID fields at all
    // (records created before IDs were stored). This prevents history
    // entries from granting access to unrelated employees' follow-ups.
    const hasNoTopLevelIds = !item.assignedToId && !item.createdById;
    if (hasNoTopLevelIds && Array.isArray(item.history) && item.history.length > 0) {
      return item.history.some(h =>
        isTeamMember(h.assignedToId, h.assignedTo, h.assignedToUsername || '') ||
        isTeamMember(h.createdById,  h.createdBy)
      );
    }

    return false;
  });
};

const TASKS_KEY = 'sanmora_crm_tasks_v1';

export const getStoredTasks = () => {
  if (typeof window === 'undefined') return [];
  if (_cachedTasks !== null) return _cachedTasks;
  const stored = localStorage.getItem(TASKS_KEY);
  if (!stored) {
    localStorage.setItem(TASKS_KEY, JSON.stringify([]));
    _cachedTasks = [];
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    const result = Array.isArray(parsed) ? parsed : [];
    _cachedTasks = result;
    return result;
  } catch (e) {
    _cachedTasks = [];
    return [];
  }
};

export const saveTask = (taskData, currentUser = null) => {
  const currentTasks = getStoredTasks();
  const creatorName = currentUser?.name || currentUser?.username || taskData?.createdBy || 'Staff';
  const creatorId = String(currentUser?.id || currentUser?._id || taskData?.createdById || '1');

  const assignedName = taskData?.assignedTo || creatorName;
  const assignedId = String(taskData?.assignedToId || creatorId);

  const newTask = {
    id: taskData?.id || `task-${Date.now()}`,
    completed: taskData?.completed || false,
    status: taskData?.status || 'To Do',
    starred: taskData?.starred || false,
    checklist: taskData?.checklist || [],
    createdBy: creatorName,
    createdById: creatorId,
    assignedTo: assignedName,
    assignedToId: assignedId,
    assignedToUsername: taskData?.assignedToUsername || currentUser?.username || '',
    createdAt: new Date().toISOString(),
    ...taskData
  };

  taskService.createTask(newTask).then(res => {
    if (res && res.success && res.data) {
      const serverTask = { ...res.data, id: String(res.data._id || res.data.id) };
      const updatedList = getStoredTasks().map(t => (t.id === newTask.id ? serverTask : t));
      _cachedTasks = updatedList;
      if (typeof window !== 'undefined') {
        safeLocalStorageSet(TASKS_KEY, updatedList);
        notifyStoreUpdated();
      }
    } else {
      syncCrmStoreWithBackendApi();
    }
  }).catch(e => console.warn('[MongoDB Task Create Error]:', e.message));

  const updated = [newTask, ...currentTasks];
  if (typeof window !== 'undefined') {
    safeLocalStorageSet(TASKS_KEY, updated);
    notifyStoreUpdated();
  }
  _cachedTasks = updated;
  return newTask;
};

export const updateTask = (taskId, updatedData) => {
  const currentTasks = getStoredTasks();
  let targetTask = null;
  const updated = currentTasks.map((t) => {
    if (String(t.id) === String(taskId) || String(t._id) === String(taskId)) {
      targetTask = { ...t, ...updatedData };
      return targetTask;
    }
    return t;
  });

  const mongoId = targetTask?._id || targetTask?.id || taskId;
  if (mongoId && !String(mongoId).startsWith('task-')) {
    taskService.updateTask(mongoId, updatedData).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Task Update Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(TASKS_KEY, updated);
    notifyStoreUpdated();
  }
  _cachedTasks = updated;
  return updated;
};

export const deleteTask = (taskId) => {
  const currentTasks = getStoredTasks();
  const targetTask = currentTasks.find(t => String(t.id) === String(taskId) || String(t._id) === String(taskId));
  const updated = currentTasks.filter((t) => String(t.id) !== String(taskId) && String(t._id) !== String(taskId));

  const mongoId = targetTask?._id || targetTask?.id || taskId;
  if (mongoId && !String(mongoId).startsWith('task-')) {
    taskService.deleteTask(mongoId).then(res => {
      if (res && res.success) syncCrmStoreWithBackendApi();
    }).catch(e => console.warn('[MongoDB Task Delete Error]:', e.message));
  }

  if (typeof window !== 'undefined') {
    safeLocalStorageSet(TASKS_KEY, updated);
    notifyStoreUpdated();
  }
  _cachedTasks = updated;
  return updated;
};

// ── CUSTOMER PAYMENT LEDGER STORE (KHATA SYSTEM) ─────────────────
const LEDGER_KEY = 'sanmora_crm_ledger_v1';

export const getStoredLedgerAccounts = () => {
  if (typeof window === 'undefined') return {};
  if (_cachedLedgerAccounts !== null) return _cachedLedgerAccounts;
  const stored = localStorage.getItem(LEDGER_KEY);
  if (!stored) {
    _cachedLedgerAccounts = {};
    return {};
  }
  try {
    const parsed = JSON.parse(stored) || {};
    _cachedLedgerAccounts = parsed;
    return parsed;
  } catch (e) {
    _cachedLedgerAccounts = {};
    return {};
  }
};

export const saveLedgerAccount = (clientId, accountData) => {
  if (typeof window === 'undefined' || !clientId) return null;
  const store = getStoredLedgerAccounts();
  const existing = store[clientId] || {};
  
  const updatedAccount = {
    ...existing,
    ...accountData,
    clientId,
    updatedAt: new Date().toISOString()
  };

  store[clientId] = updatedAccount;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(store));
  _cachedLedgerAccounts = store;
  return updatedAccount;
};

export const deleteLedgerTransaction = (clientId, txId) => {
  if (typeof window === 'undefined' || !clientId) return null;
  const store = getStoredLedgerAccounts();
  const existing = store[clientId];
  if (!existing || !Array.isArray(existing.instalments)) return null;

  existing.instalments = existing.instalments.filter((inst) => inst.id !== txId);
  store[clientId] = existing;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(store));
  _cachedLedgerAccounts = store;
  return existing;
};

/**
 * Calculates dynamic step-by-step running balance for client payments:
 * Example:
 * Total Agreed Project Cost = ₹50,000
 * Instalment 1: ₹10,000 ➔ Running Dues = ₹40,000
 * Instalment 2: ₹10,000 ➔ Running Dues = ₹30,000
 * Instalment 3: ₹30,000 ➔ Running Dues = ₹0 (Settled)
 */
export const calculateRunningBalanceEntries = (agreedCost = 0, instalments = []) => {
  const totalAgreed = Number(agreedCost) || 0;
  let currentRunningDues = totalAgreed;
  let totalClearedPaid = 0;

  // Sort instalments chronologically
  const sortedInstalments = [...instalments].sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

  const processedEntries = sortedInstalments.map((inst, idx) => {
    const amt = Number(inst.amount) || 0;
    const isCleared = inst.status === 'Record Payment' || inst.status === 'Cleared' || inst.cleared !== false;
    
    if (isCleared) {
      totalClearedPaid += amt;
      currentRunningDues = Math.max(0, currentRunningDues - amt);
    }

    return {
      ...inst,
      partIndex: idx + 1,
      partTitle: inst.title || `Part ${idx + 1}`,
      amount: amt,
      cleared: isCleared,
      runningDuesBalance: currentRunningDues
    };
  });

  const remainingDues = Math.max(0, totalAgreed - totalClearedPaid);

  return {
    totalAgreed,
    totalClearedPaid,
    remainingDues,
    isFullyPaid: totalAgreed > 0 && remainingDues === 0,
    processedEntries
  };
};

// ── USER MONTHLY SALES TARGETS STORE ─────────────────
const TARGETS_KEY = 'sanmora_crm_targets_v1';
let _cachedTargets = null;

export const getStoredUserTargets = () => {
  if (typeof window === 'undefined') return {};
  if (_cachedTargets !== null) return _cachedTargets;
  const stored = localStorage.getItem(TARGETS_KEY);
  if (!stored) {
    _cachedTargets = {};
    return {};
  }
  try {
    const parsed = JSON.parse(stored) || {};
    _cachedTargets = parsed;
    return parsed;
  } catch (e) {
    _cachedTargets = {};
    return {};
  }
};

export const saveStoredUserTarget = (userObjOrId, year, month, targetAmount) => {
  if (typeof window === 'undefined' || !userObjOrId) return null;

  const store = getStoredUserTargets();
  const numVal = parseFloat(targetAmount) || 0;
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  const keysToSave = [];
  if (typeof userObjOrId === 'object' && userObjOrId !== null) {
    if (userObjOrId._id) keysToSave.push(String(userObjOrId._id));
    if (userObjOrId.id) keysToSave.push(String(userObjOrId.id));
    if (userObjOrId.name) keysToSave.push(String(userObjOrId.name).toLowerCase().trim());
    if (userObjOrId.email) keysToSave.push(String(userObjOrId.email).toLowerCase().trim());
  } else {
    keysToSave.push(String(userObjOrId));
  }

  keysToSave.forEach(k => {
    if (!k) return;
    const userTargets = store[k] || [];
    const existingIdx = userTargets.findIndex(t => t.year === targetYear && t.month === targetMonth);

    if (existingIdx > -1) {
      userTargets[existingIdx] = { year: targetYear, month: targetMonth, targetAmount: numVal, updatedAt: new Date().toISOString() };
    } else {
      userTargets.push({ year: targetYear, month: targetMonth, targetAmount: numVal, updatedAt: new Date().toISOString() });
    }
    store[k] = userTargets;
  });

  safeLocalStorageSet(TARGETS_KEY, store);
  _cachedTargets = store;
  return store;
};

export const getUserMonthlyTargetAmount = (userObj, year, month) => {
  if (!userObj) return 0;
  const targetYear = parseInt(year, 10);
  const targetMonth = parseInt(month, 10);

  // 1. Check userObj.monthlyTargets array from DB
  const dbTargets = userObj.monthlyTargets || userObj.userObj?.monthlyTargets || [];
  const dbMatch = dbTargets.find(t => t.year === targetYear && t.month === targetMonth);
  if (dbMatch && Number(dbMatch.targetAmount) > 0) {
    return Number(dbMatch.targetAmount);
  }

  // 2. Check Local Storage Targets for _id, id, name, or email
  const idsToCheck = [
    String(userObj._id || ''),
    String(userObj.id || ''),
    String(userObj.name || '').toLowerCase().trim(),
    String(userObj.email || '').toLowerCase().trim()
  ].filter(Boolean);

  const localStore = getStoredUserTargets();
  for (const k of Object.keys(localStore)) {
    const kClean = k.toLowerCase().trim();
    if (idsToCheck.some(id => id === kClean)) {
      const userList = localStore[k] || [];
      const match = userList.find(t => t.year === targetYear && t.month === targetMonth);
      if (match && Number(match.targetAmount) > 0) {
        return Number(match.targetAmount);
      }
    }
  }

  return 0;
};

// ── ANNOUNCEMENT LOCAL STORAGE HELPERS ──
let _cachedAnnouncements = null;

export const getStoredAnnouncements = () => {
  if (typeof window === 'undefined') return [];
  if (_cachedAnnouncements !== null) return _cachedAnnouncements;
  const stored = localStorage.getItem(ANNOUNCEMENTS_KEY);
  if (!stored) {
    safeLocalStorageSet(ANNOUNCEMENTS_KEY, []);
    _cachedAnnouncements = [];
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    _cachedAnnouncements = Array.isArray(parsed) ? parsed : [];
    return _cachedAnnouncements;
  } catch (e) {
    _cachedAnnouncements = [];
    return [];
  }
};

export const getActiveAnnouncementsStore = () => {
  const all = getStoredAnnouncements();
  const now = Date.now();
  return all.filter(a => {
    if (a.isActive === false) return false;
    const pubTime = new Date(a.publishedAt || a.createdAt || Date.now()).getTime();
    const durationMs = (Number(a.durationHours) || 44) * 60 * 60 * 1000;
    const expiryTime = a.expiresAt ? new Date(a.expiresAt).getTime() : (pubTime + durationMs);
    return expiryTime > now;
  });
};

export const saveAnnouncement = (payload, currentUser) => {
  if (typeof window === 'undefined') return null;
  const current = getStoredAnnouncements();
  const pubDate = new Date();
  const duration = Number(payload.durationHours) || 44;
  const expDate = new Date(pubDate.getTime() + duration * 60 * 60 * 1000);

  const newAnn = {
    id: payload.id || `ann-${Date.now()}`,
    _id: payload._id || `ann-${Date.now()}`,
    text: (payload.text || '').trim(),
    category: payload.category || 'Celebration',
    durationHours: duration,
    publishedAt: pubDate.toISOString(),
    expiresAt: expDate.toISOString(),
    isActive: true,
    createdByName: currentUser?.name || 'Admin',
    createdById: currentUser?.id || currentUser?._id || 'admin'
  };

  const updated = [newAnn, ...current];
  safeLocalStorageSet(ANNOUNCEMENTS_KEY, updated);
  _cachedAnnouncements = updated;
  return newAnn;
};

export const updateAnnouncementStore = (id, payload) => {
  if (typeof window === 'undefined') return null;
  const current = getStoredAnnouncements();
  const updated = current.map(item => {
    if (item.id === id || item._id === id) {
      const pubTime = item.publishedAt ? new Date(item.publishedAt).getTime() : Date.now();
      const dur = payload.durationHours !== undefined ? Number(payload.durationHours) : (item.durationHours || 44);
      const expDate = new Date(pubTime + dur * 60 * 60 * 1000).toISOString();
      return {
        ...item,
        ...payload,
        durationHours: dur,
        expiresAt: expDate
      };
    }
    return item;
  });
  safeLocalStorageSet(ANNOUNCEMENTS_KEY, updated);
  _cachedAnnouncements = updated;
  return updated;
};

export const deleteAnnouncementStore = (id) => {
  if (typeof window === 'undefined') return null;
  const current = getStoredAnnouncements();
  const updated = current.filter(item => item.id !== id && item._id !== id);
  safeLocalStorageSet(ANNOUNCEMENTS_KEY, updated);
  _cachedAnnouncements = updated;
  return updated;
};





