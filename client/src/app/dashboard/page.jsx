'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './dashboard.css';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import ManageFollowUpModal from '../../components/customers/ManageFollowUpModal';
import LeadCustomerModal from '../../components/customers/LeadCustomerModal';
import AnalyticsCharts from '../../components/dashboard/AnalyticsCharts';
import CrmCalendarWidget from '../../components/dashboard/CrmCalendarWidget';
import { useAuth } from '../../context/AuthContext';
import { roleService } from '../../services/role.service';
import { userService } from '../../services/user.service';
import {
  getStoredFollowups,
  getStoredTasks,
  getStoredLeads,
  getStoredLedgerAccounts,
  getUserMonthlyTargetAmount,
  saveLead,
  updateFollowupStatus,
  saveTask,
  updateTask,
  deleteTask,
  filterByRole,
  syncCrmStoreWithBackendApi,
  resolveEffectiveAssignee,
  isAdminUser,
  getSubordinateUsers
} from '../../utils/crmStore';
import {
  Users, ShieldCheck, Kanban, CheckCircle2, TrendingUp,
  ArrowUpRight, Sparkles, UserCheck, PlusCircle, Activity,
  PhoneCall, Clock, AlertTriangle, CheckSquare, Phone, Plus,
  Calendar, Check, ChevronRight, ChevronDown, ChevronUp, Flame, DollarSign,
  RotateCcw, ListTodo, User, Pencil, Trash2, Target
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading, can, sidebarCollapsed } = useAuth();

  // Data States
  const [followups, setFollowups] = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [leads, setLeads]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deferredReady, setDeferredReady] = useState(false);

  // Dashboard Control Desk Filters
  const [fupTab, setFupTab]       = useState('today'); // 'today' | 'missed' | 'all' | 'upcoming' | 'closed'
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId]   = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [expandedNotes, setExpandedNotes]   = useState({});

  const toggleNoteExpand = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal States
  const [showFupModal, setShowFupModal] = useState(false);
  const [selectedFupTarget, setSelectedFupTarget] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Edit Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask]     = useState(null);
  const [taskForm, setTaskForm]           = useState({
    title: '',
    category: 'FollowUp Call',
    priority: 'Hot',
    assignedTo: '',
    dueDate: '',
    dueTime: '12:00',
    notes: '',
    subtasks: []
  });
  const [subtaskInput, setSubtaskInput]   = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const formattedDateStr = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setDeferredReady(true), 20);
    return () => clearTimeout(timer);
  }, []);

  const userId = user?.id || user?._id;

  const loadDashboardAllData = useCallback((empList = employees) => {
    if (!user) return;
    syncCrmStoreWithBackendApi();
    const rawFups  = getStoredFollowups();
    const rawTasks = getStoredTasks();
    const rawLeads = getStoredLeads();

    const scopedFups  = filterByRole(rawFups, user, empList);
    const scopedTasks = filterByRole(rawTasks, user, empList);
    const scopedLeads = filterByRole(rawLeads, user, empList);

    setFollowups(scopedFups);
    setTasks(scopedTasks);
    setLeads(scopedLeads);
  }, [user, employees]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [usersRes, rolesRes] = await Promise.all([
          userService.getAllUsers().catch(() => ({ data: [] })),
          can('roles:view') ? roleService.getAllRoles() : Promise.resolve({ data: [] })
        ]);

        if (!isMounted) return;

        const empData = usersRes.data || [];
        const rawFups  = getStoredFollowups();
        const rawTasks = getStoredTasks();
        const rawLeads = getStoredLeads();

        const scopedFups  = filterByRole(rawFups, user, empData);
        const scopedTasks = filterByRole(rawTasks, user, empData);
        const scopedLeads = filterByRole(rawLeads, user, empData);

        setEmployees(empData);
        setRoles(rolesRes.data || []);
        setFollowups(scopedFups);
        setTasks(scopedTasks);
        setLeads(scopedLeads);


      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!authLoading && userId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, authLoading]);

  // Handle Quick Task Add
  const handleAddQuickTask = useCallback((e) => {
    if (e) e.preventDefault();
    const titleText = quickTaskTitle.trim();
    if (!titleText) return;

    const uId = String(user?.id || user?._id || '');
    const uName = user?.name || user?.username || 'Self';

    const newTaskPayload = {
      id: `task-${Date.now()}`,
      title: titleText,
      category: 'FollowUp Call',
      priority: 'Hot',
      assignedToId: uId,
      assignedTo: uName,
      createdById: uId,
      createdBy: uName,
      dueDate: todayStr,
      dueTime: '18:00',
      description: 'Quick task created from Dashboard Command Center',
      status: 'To Do',
      checklist: []
    };

    saveTask(newTaskPayload, user);
    setQuickTaskTitle('');

    const allRawTasks = getStoredTasks();
    const scopedTasks = filterByRole(allRawTasks, user, employees);
    setTasks(scopedTasks);
  }, [quickTaskTitle, user, todayStr, employees]);

  // Handle Task Checkbox Toggle
  const handleToggleTaskStatus = useCallback((task) => {
    const nextStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    updateTask(task.id, { ...task, status: nextStatus }, user);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));
    loadDashboardAllData(employees);
  }, [user, employees, loadDashboardAllData]);

  // Handle Task Delete
  const handleDeleteTaskItem = useCallback((taskId) => {
    deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    loadDashboardAllData(employees);
  }, [employees, loadDashboardAllData]);

  // Open Create Task Modal
  const handleOpenCreateTaskModal = useCallback(() => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      category: 'FollowUp Call',
      priority: 'Hot',
      assignedTo: user?.name || 'Self',
      assignedToId: String(user?.id || user?._id || ''),
      dueDate: todayStr,
      dueTime: '12:00',
      notes: '',
      subtasks: []
    });
    setSubtaskInput('');
    setShowTaskModal(true);
  }, [user, todayStr]);

  // Handle Task Edit Modal & Delete
  const handleOpenTaskEditModal = useCallback((task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      category: task.category || 'FollowUp Call',
      priority: task.priority || 'Hot',
      assignedTo: task.assignedTo || user?.name || 'Self',
      assignedToId: task.assignedToId || String(user?.id || user?._id || ''),
      dueDate: task.dueDate || todayStr,
      dueTime: task.dueTime || '12:00',
      notes: task.notes || task.description || '',
      subtasks: task.subtasks || task.checklist || []
    });
    setSubtaskInput('');
    setShowTaskModal(true);
  }, [user, todayStr]);

  const handleAddSubtask = useCallback(() => {
    if (!subtaskInput.trim()) return;
    const newItem = { id: Date.now().toString(), text: subtaskInput.trim(), completed: false };
    setTaskForm(prev => ({ ...prev, subtasks: [...prev.subtasks, newItem] }));
    setSubtaskInput('');
  }, [subtaskInput]);

  const handleRemoveSubtask = useCallback((id) => {
    setTaskForm(prev => ({ ...prev, subtasks: prev.subtasks.filter(st => st.id !== id) }));
  }, []);

  const handleToggleSubtask = useCallback((id) => {
    setTaskForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st)
    }));
  }, []);

  const handleSaveTaskModal = useCallback((e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    let assignedName = taskForm.assignedTo || user?.name || 'Self';
    let assignedId = String(user?.id || user?._id || '');
    let assignedUsername = user?.username || '';

    const selectedEmp = employees.find(
      emp => emp.name === taskForm.assignedTo || String(emp.id || emp._id) === String(taskForm.assignedToId)
    );
    if (selectedEmp) {
      assignedName = selectedEmp.name || selectedEmp.username;
      assignedId = String(selectedEmp._id || selectedEmp.id);
      assignedUsername = selectedEmp.username || '';
    }

    const payload = {
      title: taskForm.title.trim(),
      category: taskForm.category || 'FollowUp Call',
      priority: taskForm.priority || 'Hot',
      assignedTo: assignedName,
      assignedToId: assignedId,
      assignedToUsername: assignedUsername,
      dueDate: taskForm.dueDate || todayStr,
      dueTime: taskForm.dueTime || '12:00',
      notes: taskForm.notes || '',
      description: taskForm.notes || '',
      checklist: taskForm.subtasks || []
    };
    
    if (editingTask) {
      updateTask(editingTask.id, {
        ...editingTask,
        ...payload
      }, user);
    } else {
      saveTask({
        id: `task-${Date.now()}`,
        status: 'To Do',
        starred: false,
        createdById: String(user?.id || user?._id || ''),
        createdBy: user?.name || 'Self',
        ...payload
      }, user);
    }
    
    setShowTaskModal(false);
    setEditingTask(null);
    loadDashboardAllData(employees);
  }, [taskForm, editingTask, employees, user, todayStr, loadDashboardAllData]);

  // Handle Follow-Up Quick Status Toggle
  const handleToggleFupStatus = useCallback((fup) => {
    const nextStatus = fup.status === 'Active' ? 'No FollowUp' : 'Active';
    updateFollowupStatus(fup.id, nextStatus, nextStatus === 'No FollowUp' ? 'Closed' : '—');
    loadDashboardAllData(employees);
  }, [employees, loadDashboardAllData]);

  // Open Log Follow-Up Modal
  const handleOpenFupModal = useCallback((fupItem) => {
    setSelectedFupTarget(fupItem);
    setShowFupModal(true);
  }, []);

  const handleLeadSubmitFromModal = useCallback((payload) => {
    saveLead(payload, user);
    setShowLeadModal(false);
    loadDashboardAllData(employees);
  }, [user, employees, loadDashboardAllData]);

  // Dashboard Metrics Calculation (Optimized single-pass with zero-data short-circuit)
  const { countTodayDue, countOverdue, countUpcoming, countClosed } = useMemo(() => {
    if (!followups || followups.length === 0) {
      return { countTodayDue: 0, countOverdue: 0, countUpcoming: 0, countClosed: 0 };
    }
    let today = 0, overdue = 0, upcoming = 0, closed = 0;
    for (let i = 0; i < followups.length; i++) {
      const f = followups[i];
      if (f.status === 'No FollowUp' || f.status === 'Closed' || f.status === 'Completed') {
        closed++;
      } else if (f.status === 'Active') {
        if (f.nextFollowupDate === todayStr) today++;
        else if (f.nextFollowupDate < todayStr) overdue++;
        else if (f.nextFollowupDate > todayStr) upcoming++;
      }
    }
    return { countTodayDue: today, countOverdue: overdue, countUpcoming: upcoming, countClosed: closed };
  }, [followups, todayStr]);

  const pendingTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status !== 'Completed') count++;
    }
    return count;
  }, [tasks]);

  const activeLeadsVal = useMemo(() => {
    if (!leads || leads.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < leads.length; i++) {
      sum += (Number(leads[i].leadValue || leads[i].value) || 0);
    }
    return sum;
  }, [leads]);

  // Filtered Followups List for Desk
  const deskFollowups = useMemo(() => {
    if (!followups || followups.length === 0) return [];
    return followups.filter((f) => {
      if (fupTab === 'today') return f.nextFollowupDate === todayStr && f.status === 'Active';
      if (fupTab === 'missed') return f.nextFollowupDate < todayStr && f.status === 'Active';
      if (fupTab === 'upcoming') return f.nextFollowupDate > todayStr && f.status === 'Active';
      if (fupTab === 'closed') return f.status === 'No FollowUp' || f.status === 'Closed' || f.status === 'Completed';
      return true;
    });
  }, [followups, fupTab, todayStr]);

  const userInitials = useMemo(
    () => (user?.name || 'U').charAt(0).toUpperCase(),
    [user?.name]
  );

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

  // Compute Current User Target & Ledger Collections
  const myTargetAmount = useMemo(() => {
    return getUserMonthlyTargetAmount(user, currentYear, currentMonth);
  }, [user, currentYear, currentMonth]);

  const myCollectionsAmount = useMemo(() => {
    if (typeof window === 'undefined' || !user) return 0;
    const scopedLeads = (leads && leads.length > 0) ? leads : filterByRole(getStoredLeads(), user, employees);
    const ledgerStore = getStoredLedgerAccounts() || {};

    let total = 0;
    scopedLeads.forEach(l => {
      const acc = ledgerStore[l.id];
      if (acc && Array.isArray(acc.instalments)) {
        acc.instalments.forEach(inst => {
          const isCleared = inst.status === 'Record Payment' || inst.status === 'Cleared' || inst.cleared !== false;
          if (isCleared && inst.date) {
            const d = new Date(inst.date);
            if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
              total += (Number(inst.amount) || 0);
            }
          }
        });
      }
    });
    return total;
  }, [user, currentYear, currentMonth, leads, employees]);

  const scopedTeamCount = useMemo(() => {
    if (!user) return 1;
    if (isAdminUser(user)) {
      return employees.length || 1;
    }
    const team = getSubordinateUsers(user, employees);
    return team.length || 1;
  }, [user, employees]);

  const myTargetPct = useMemo(() => {
    if (myTargetAmount > 0) return Math.round((myCollectionsAmount / myTargetAmount) * 100);
    if (myCollectionsAmount > 0) return 100;
    return 0;
  }, [myTargetAmount, myCollectionsAmount]);

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <Sparkles className="spin-icon" />
        <span>Loading Sanmora CRM Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Dashboard Command Center" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* ── 1. COMPACT HERO WELCOME BANNER ── */}
        <div className="dash-hero-compact">
          <div className="dash-hero-left">
            <div className="dash-avatar-ring">{userInitials}</div>
            <div className="dash-hero-title-group">
              <h2>Welcome back, <span>{user.name}</span>! 👋</h2>
              <div className="dash-hero-sub">
                <span>Role: <strong>{user.role?.name || 'User'}</strong></span>
                <span>•</span>
                <span>{formattedDateStr}</span>
              </div>
            </div>
          </div>

          <div className="dash-hero-actions">
            <button onClick={() => setShowLeadModal(true)} className="dash-btn btn-purple">
              <Plus size={15} />
              <span>Add New Lead</span>
            </button>
            <button onClick={() => handleOpenFupModal(followups[0] || null)} className="dash-btn btn-white-glass">
              <PhoneCall size={15} />
              <span>Log Follow-Up</span>
            </button>
          </div>
        </div>

        {/* ── 2. INLINE KPI METRICS ROW ── */}
        <div className="kpi-row-compact">
          <div className="kpi-card-compact kpi-purple" onClick={() => setFupTab('today')}>
            <div className="kpi-top">
              <span className="kpi-lbl">Today's Due</span>
              <div className="kpi-icn"><PhoneCall size={16} /></div>
            </div>
            <div className="kpi-val-row">
              <div className="kpi-val">{countTodayDue}</div>
              <span className="kpi-tag positive"><Clock size={11} /> Due Today</span>
            </div>
          </div>

          <div className="kpi-card-compact kpi-red" onClick={() => setFupTab('missed')}>
            <div className="kpi-top">
              <span className="kpi-lbl">Overdue / Missed</span>
              <div className="kpi-icn"><Flame size={16} /></div>
            </div>
            <div className="kpi-val-row">
              <div className="kpi-val">{countOverdue}</div>
              <span className="kpi-tag urgent"><AlertTriangle size={11} /> Urgent</span>
            </div>
          </div>

          <div className="kpi-card-compact kpi-amber">
            <div className="kpi-top">
              <span className="kpi-lbl">Pipeline Value</span>
              <div className="kpi-icn"><DollarSign size={16} /></div>
            </div>
            <div className="kpi-val-row">
              <div className="kpi-val">₹{activeLeadsVal.toLocaleString('en-IN')}</div>
              <span className="kpi-tag"><TrendingUp size={11} /> {leads.length} Leads</span>
            </div>
          </div>

          <div className="kpi-card-compact kpi-blue">
            <div className="kpi-top">
              <span className="kpi-lbl">Pending Tasks</span>
              <div className="kpi-icn"><CheckSquare size={16} /></div>
            </div>
            <div className="kpi-val-row">
              <div className="kpi-val">{pendingTasks}</div>
              <span className="kpi-tag"><ListTodo size={11} /> Daily To-Do</span>
            </div>
          </div>

          <div className="kpi-card-compact kpi-green">
            <div className="kpi-top">
              <span className="kpi-lbl">Team Members</span>
              <div className="kpi-icn"><Users size={16} /></div>
            </div>
            <div className="kpi-val-row">
              <div className="kpi-val">{scopedTeamCount}</div>
              <span className="kpi-tag positive"><UserCheck size={11} /> Active Staff</span>
            </div>
          </div>
        </div>

        {/* ── 3. MAIN DASHBOARD CONTENT GRID (FOLLOW-UP DESK & DAILY TO-DO CHECKLIST) ── */}
        <div className="dash-content-grid">

          {/* ── LEFT COLUMN: FOLLOW-UP DESK & TEAM MEMBERS ── */}
          <div className="dash-left-column">

            {/* ── FOLLOW-UP ACTION DESK (GOD-LEVEL VIP SECTION) ── */}
            <div className="desk-panel-vip">
              <div className="desk-god-header">
                <div className="desk-god-title-wrap">
                  <div className="desk-god-icon-glow">
                    <PhoneCall size={22} />
                  </div>
                  <div>
                    <div className="desk-god-title-row">
                      <h3>Follow-Up Action Desk</h3>
                      <span className="desk-god-pill">{deskFollowups.length} Records</span>
                    </div>
                    <p className="desk-god-sub">Real-time Customer Discussion & Interaction Command Hub</p>
                  </div>
                </div>

                {/* VIP Filter Tabs Bar */}
                <div className="desk-god-tabs">
                  <button
                    className={`god-tab ${fupTab === 'today' ? 'active' : ''}`}
                    onClick={() => setFupTab('today')}
                  >
                    <span>Today's Due</span>
                    <span className="god-tab-count">{countTodayDue}</span>
                  </button>
                  <button
                    className={`god-tab ${fupTab === 'missed' ? 'active red' : ''}`}
                    onClick={() => setFupTab('missed')}
                  >
                    <span>Overdue</span>
                    <span className="god-tab-count red">{countOverdue}</span>
                  </button>
                  <button
                    className={`god-tab ${fupTab === 'all' ? 'active' : ''}`}
                    onClick={() => setFupTab('all')}
                  >
                    <span>All Active</span>
                  </button>
                  <button
                    className={`god-tab ${fupTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setFupTab('upcoming')}
                  >
                    <span>Upcoming</span>
                    <span className="god-tab-count">{countUpcoming}</span>
                  </button>
                  <button
                    className={`god-tab ${fupTab === 'closed' ? 'active' : ''}`}
                    onClick={() => setFupTab('closed')}
                  >
                    <span>Closed</span>
                    <span className="god-tab-count">{countClosed}</span>
                  </button>
                </div>
              </div>

              {/* VIP Follow-Up Cards List */}
              <div className="fup-list-vip">
                {deskFollowups.length > 0 ? (
                  deskFollowups.map((fup) => {
                    const eff = resolveEffectiveAssignee(fup, todayStr);
                    const isOverdue = fup.nextFollowupDate < todayStr && fup.status === 'Active';
                    const initials  = (fup.customerName || 'C').charAt(0).toUpperCase();

                    return (
                      <div key={fup.id} className={`fup-card-vip ${isOverdue ? 'is-overdue' : ''}`}>
                        {/* TOP ROW: Avatar + Customer Details + Due Date Badge */}
                        <div className="fup-vip-top">
                          <div className="fup-vip-user">
                            <div className="avatar-vip-wrap">
                              <div className="avatar-vip-initials">{initials}</div>
                              <span className={`status-pulse-dot ${isOverdue ? 'red' : 'green'}`} />
                            </div>

                            <div className="cust-vip-head-row">
                              <span className="cust-vip-name">{fup.customerName}</span>
                              <span className="inq-vip-pill">{fup.inquiryNo || '#INQ-0000'}</span>
                              {eff.isExpired && (
                                <span className="revert-vip-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <RotateCcw size={11} /> Reverted to Manager (Expired {eff.expiryDate})
                                </span>
                              )}
                              {!eff.isExpired && fup.assignedUntilDate && (
                                <span className="temp-vip-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} /> Temp Until {fup.assignedUntilDate}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`date-vip-badge ${isOverdue ? 'overdue' : ''}`}>
                            <Clock size={13} />
                            <span>{fup.nextFollowupDate}</span>
                          </div>
                        </div>

                        {/* MIDDLE ROW: Customer Discussion Notes */}
                        <div className="notes-clean-box">
                          {fup.notes && fup.notes.length > 140 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className="notes-txt-body">
                                “{expandedNotes[fup.id] ? fup.notes : `${fup.notes.slice(0, 140)}...`}”
                              </span>
                              <button
                                type="button"
                                className="btn-note-toggle"
                                onClick={() => toggleNoteExpand(fup.id)}
                              >
                                {expandedNotes[fup.id] ? (
                                  <>
                                    <span>Show Less</span> <ChevronUp size={13} />
                                  </>
                                ) : (
                                  <>
                                    <span>Read More</span> <ChevronDown size={13} />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="notes-txt-body">“{fup.notes || 'No notes added.'}”</span>
                          )}
                        </div>

                        {/* BOTTOM ROW: Meta Information & Action Buttons */}
                        <div className="fup-vip-bottom">
                          <div className="meta-pills-row">
                            <span className="meta-pill"><Calendar size={12} /> {fup.followupDate}</span>
                            <span className="meta-pill"><Phone size={12} /> {fup.followupType || 'Telephonic'}</span>
                            <span className="meta-pill assigned-pill"><User size={12} /> Assigned: <strong>{eff.assignedTo || fup.assignedTo || 'Staff'}</strong></span>
                          </div>

                          <div className="fup-actions-grp">
                            <button
                              onClick={() => handleOpenFupModal(fup)}
                              className="btn-vip-action"
                              title="Log Followup Discussion & Customer Activity"
                            >
                              <Plus size={15} />
                              <span>Log Activity</span>
                            </button>


                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-vip-desk">
                    <CheckCircle2 size={40} className="text-green" />
                    <h4>All Clear! No Follow-ups Pending in this Filter.</h4>
                    <p>All customer interactions for this category are up to date.</p>
                  </div>
                )}
              </div>
            </div>



          </div>

          {/* ── RIGHT COLUMN: TO-DO CHECKLIST & QUICK LAUNCHPAD ── */}
          <div className="dash-right-column">

            {/* MY DAILY TO-DO CHECKLIST */}
            <div className="panel-card-pro">
              <div className="panel-head-pro">
                <div className="panel-title-pro">
                  <CheckSquare size={18} style={{ color: '#10B981' }} />
                  <h3>Daily To-Do Checklist</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="count-badge-pro" style={{ background: '#FEF3C7', color: '#B45309' }}>
                    {pendingTasks} Pending
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreateTaskModal}
                    className="btn-add-task-pro"
                    title="Add New Task"
                  >
                    <Plus size={16} />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="todo-list-compact">
                {tasks.slice(0, 6).map((task) => {
                  const isDone = task.status === 'Completed';

                  return (
                    <div key={task.id} className={`todo-card-vip ${isDone ? 'is-done' : ''}`}>
                      <div className="todo-top-row">
                        <div className="todo-title-wrap">
                          <label className="todo-check-label">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleToggleTaskStatus(task)}
                            />
                            <span className="chk-box-custom" />
                          </label>
                          
                          <span
                            className="todo-txt-sm"
                            onClick={() => handleOpenTaskEditModal(task)}
                            title="Click to edit task details in modal popup"
                            style={{ cursor: 'pointer' }}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="todo-actions-grp">
                          <span className={`prio-pill-sm ${task.priority?.toLowerCase() || 'medium'}`}>
                            {task.priority || 'Hot'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenTaskEditModal(task)}
                            className="todo-icon-btn edit"
                            title="Open Edit Task Popup Modal"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTaskItem(task.id)}
                            className="todo-icon-btn delete"
                            title="Delete Task"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Sub Meta Info */}
                      <div className="todo-meta-sub">
                        <span><Calendar size={13} /> {task.dueDate || todayStr}</span>
                        {task.dueTime && (
                          <>
                            <span>•</span>
                            <span><Clock size={13} /> {task.dueTime}</span>
                          </>
                        )}
                        <span>•</span>
                        <span><User size={13} /> {task.assignedTo || 'Self'}</span>
                        {task.category && (
                          <>
                            <span>•</span>
                            <span className="todo-cat-pill">{task.category}</span>
                          </>
                        )}
                      </div>

                      {(task.notes || task.description) && (
                        <div className="todo-notes-snippet">
                          {(task.notes || task.description).length > 120 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span>
                                “{expandedNotes[task.id] ? (task.notes || task.description) : `${(task.notes || task.description).slice(0, 120)}...`}”
                              </span>
                              <button
                                type="button"
                                className="btn-note-toggle"
                                onClick={() => toggleNoteExpand(task.id)}
                              >
                                {expandedNotes[task.id] ? (
                                  <>
                                    <span>Show Less</span> <ChevronUp size={13} />
                                  </>
                                ) : (
                                  <>
                                    <span>Read More</span> <ChevronDown size={13} />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span>“{task.notes || task.description}”</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {tasks.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center', padding: '10px 0' }}>
                    No tasks for today. Click "+ Add Task" above to create one!
                  </div>
                )}
              </div>

              <Link href="/tasks" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7C3AED', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingTop: '4px' }}>
                <span>Go to Tasks Board →</span>
              </Link>
            </div>



          </div>

        </div>

        {/* ── 4. LIVE REAL CRM ANALYTICS CHARTS HUB (ZERO FAKE DATA) ── */}
        {deferredReady && (
          <AnalyticsCharts
            leads={leads}
            followups={followups}
            tasks={tasks}
            employees={employees}
            currentUser={user}
          />
        )}

        {/* ── 5. REAL CRM FOLLOW-UP & TASK SCHEDULE CALENDAR ── */}
        {deferredReady && (
          <div style={{ marginBottom: '24px' }}>
            <CrmCalendarWidget
              followups={followups}
              tasks={tasks}
              employees={employees}
              currentUser={user}
              onEditTask={handleOpenTaskEditModal}
              onToggleTask={handleToggleTaskStatus}
            />
          </div>
        )}



      </main>

      {/* --- LOG / MANAGE FOLLOWUP MODAL --- */}
      {showFupModal && (
        <ManageFollowUpModal
          isOpen={showFupModal}
          onClose={() => {
            setShowFupModal(false);
            setSelectedFupTarget(null);
          }}
          customer={selectedFupTarget}
          followup={selectedFupTarget}
          employees={employees}
          currentUser={user}
        />
      )}

      {/* --- ADD NEW LEAD MODAL --- */}
      {showLeadModal && (
        <LeadCustomerModal
          isOpen={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          onSubmit={handleLeadSubmitFromModal}
          initialData={null}
          employees={employees}
        />
      )}

      {/* --- TASK POPUP MODAL (CREATE / EDIT) --- */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pro">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge purple">
                  {editingTask ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3>{editingTask ? 'Edit Task Details' : 'Create New Task'}</h3>
                  <p>{editingTask ? 'Update checklist task parameters & staff assignment' : 'Add a new checklist task & assign to team staff'}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowTaskModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTaskModal} className="modal-form-body">
              {/* TASK TITLE */}
              <div className="form-group-pro">
                <label className="form-lbl-pro">TASK TITLE <span className="req">*</span></label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Call client for agreement review"
                  className="form-input-pro"
                  required
                />
              </div>

              {/* 3-COLUMN GRID: CATEGORY, PRIORITY, ASSIGN STAFF */}
              <div className="form-grid-3col">
                <div className="form-group-pro">
                  <label className="form-lbl-pro">CATEGORY</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="form-select-pro"
                  >
                    <option value="FollowUp Call">FollowUp Call</option>
                    <option value="Client Meeting">Client Meeting</option>
                    <option value="Payment Collection">Payment Collection</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group-pro">
                  <label className="form-lbl-pro">PRIORITY LEVEL</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="form-select-pro"
                  >
                    <option value="Hot">Hot Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div className="form-group-pro">
                  <label className="form-lbl-pro">ASSIGN STAFF</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="form-select-pro"
                  >
                    <option value={user?.name || 'Sanmora Main Admin'}>
                      {user?.name || 'Sanmora Main Admin'} (Self)
                    </option>
                    {employees.map((emp, idx) => (
                      <option key={emp.id || emp._id || `emp-${idx}`} value={emp.name}>
                        {emp.name} ({emp.roleName || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2-COLUMN GRID: DUE DATE & DUE TIME */}
              <div className="form-grid-2col">
                <div className="form-group-pro">
                  <label className="form-lbl-pro">DUE DATE</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="form-input-pro"
                  />
                </div>

                <div className="form-group-pro">
                  <label className="form-lbl-pro">DUE TIME</label>
                  <input
                    type="time"
                    value={taskForm.dueTime}
                    onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                    className="form-input-pro"
                  />
                </div>
              </div>

              {/* DESCRIPTION & NOTES */}
              <div className="form-group-pro">
                <label className="form-lbl-pro">DESCRIPTION & NOTES</label>
                <textarea
                  rows={3}
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Task details and instructions..."
                  className="form-textarea-pro"
                />
              </div>

              <div className="modal-footer-pro">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save purple">
                  <Sparkles size={16} />
                  <span>{editingTask ? 'Update Task' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
