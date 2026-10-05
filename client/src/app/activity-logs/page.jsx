'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './activity.css';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import { getStoredLeads, getStoredLedgerAccounts, getUserMonthlyTargetAmount, saveStoredUserTarget, isAdminUser, getSubordinateUsers } from '../../utils/crmStore';
import {
  Activity, Calendar, Search, User, Clock, ShieldAlert, CheckCircle2,
  Filter, RotateCcw, Sparkles, Download, ChevronLeft, ChevronRight,
  Globe, Laptop, LogOut, ShieldCheck, Zap, X, UserCheck, Check, AlertCircle, Eye,
  Trophy, Target, Award, Crown, TrendingUp, IndianRupee, Edit3, Plus, Flame, Star, Medal
} from 'lucide-react';

export default function ActivityLogsPage() {
  const { user, loading: authLoading, can, sidebarCollapsed } = useAuth();

  // Active View Tab: 'leaderboard' (Sales Target Leaderboard) | 'calendar' (User Calendar) | 'team' (Team Directory) | 'logs' (Global Session Logs)
  const [activeTab, setActiveTab] = useState('leaderboard');

  // Users List
  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // 🏆 Leaderboard Filter & Target Modal States
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // Calendar Date State (Year & Month: 1-12)
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  // Selected Date Inspector Modal State
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Global Raw Logs Table States
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalActiveNow: 0,
    loginsToday: 0,
    idleTimeoutsCount: 0,
    manualLogoutsCount: 0,
    totalLogs: 0,
    avgDurationSeconds: 0
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination for Raw Logs
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ⚡ ROLE HIERARCHY SCOPED USERS LIST
  const effectiveUsersList = useMemo(() => {
    if (!user) return usersList;
    if (isAdminUser(user)) {
      return usersList; // Super Admin sees 100% company staff
    }
    const team = getSubordinateUsers(user, usersList);
    return team && team.length > 0 ? team : [user]; // Manager sees team; Exec sees self
  }, [user, usersList]);

  // 1. Fetch Users List on Mount
  const loadUsers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await userService.getAllUsers();
      if (res.success) {
        const list = res.data || [];
        setUsersList(list);
      }
    } catch (err) {
      console.warn('Failed to load users list:', err.message);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadUsers();
    }
  }, [authLoading, loadUsers]);

  useEffect(() => {
    if (effectiveUsersList.length > 0) {
      const exists = effectiveUsersList.some(u => String(u._id || u.id) === String(selectedUserId));
      if (!exists) {
        const currentObj = effectiveUsersList.find(u => String(u._id || u.id) === String(user?.id || user?._id));
        setSelectedUserId(currentObj ? String(currentObj._id || currentObj.id) : String(effectiveUsersList[0]._id || effectiveUsersList[0].id));
      }
    }
  }, [effectiveUsersList, selectedUserId, user]);

  // 2. Fetch User Attendance Calendar Data when selectedUserId, calYear, or calMonth changes
  const fetchCalendar = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      setCalLoading(true);
      const res = await userService.getUserAttendanceCalendar(selectedUserId, {
        year: calYear,
        month: calMonth
      });
      if (res.success) {
        setCalendarData(res);
      }
    } catch (err) {
      console.error('Failed to fetch user attendance calendar:', err);
    } finally {
      setCalLoading(false);
    }
  }, [selectedUserId, calYear, calMonth]);

  useEffect(() => {
    if (activeTab === 'calendar' && selectedUserId) {
      fetchCalendar();
    }
  }, [activeTab, selectedUserId, calYear, calMonth, fetchCalendar]);

  // 3. Fetch Global Activity Raw Session Logs
  const fetchRawLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLogsLoading(true);
      const params = { page, limit };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedUserId) params.userId = selectedUserId;
      if (selectedStatus && selectedStatus !== 'all') params.logoutType = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await userService.getUserActivityLogs(params);
      if (res.success) {
        setLogs(res.data || []);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching activity raw logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [user, page, limit, searchQuery, selectedUserId, selectedStatus, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchRawLogs();
    }
  }, [activeTab, fetchRawLogs]);

  // 🏆 LEDGER REVENUE COMPUTATION PER USER
  const calculateUserMonthlyCollections = useCallback((uObj, year, month) => {
    if (typeof window === 'undefined') return 0;
    const leads = getStoredLeads();
    const ledgerStore = getStoredLedgerAccounts();
    if (!leads || leads.length === 0) return 0;

    const uId = String(uObj._id || uObj.id || '');
    const uName = (uObj.name || '').toLowerCase();
    const uEmail = (uObj.email || '').toLowerCase();

    // Filter leads assigned to or created by this user
    const userLeads = leads.filter(l => {
      const assignedId = String(l.assignedTo?._id || l.assignedTo || l.assignedUserId || '');
      const createdId = String(l.createdBy?._id || l.createdBy || '');
      const assignedName = (l.assignedTo?.name || l.assignedTo || '').toString().toLowerCase();
      const createdName = (l.createdBy?.name || l.createdBy || '').toString().toLowerCase();

      return (
        (uId && (assignedId === uId || createdId === uId)) ||
        (uName && (assignedName.includes(uName) || createdName.includes(uName))) ||
        (uEmail && (assignedName.includes(uEmail) || createdName.includes(uEmail)))
      );
    });

    let totalCollected = 0;

    userLeads.forEach(l => {
      const acc = ledgerStore[l.id];
      if (acc && Array.isArray(acc.instalments)) {
        acc.instalments.forEach(inst => {
          const isCleared = inst.status === 'Record Payment' || inst.status === 'Cleared' || inst.cleared !== false;
          if (isCleared && inst.date) {
            const instDate = new Date(inst.date);
            const instYear = instDate.getFullYear();
            const instMonth = instDate.getMonth() + 1;

            if (instYear === year && instMonth === month) {
              totalCollected += (Number(inst.amount) || 0);
            }
          }
        });
      }
    });

    return totalCollected;
  }, []);

  // 🏆 LEADERBOARD DATA CALCULATION & RANKING
  const leaderboardData = useMemo(() => {
    if (!effectiveUsersList || effectiveUsersList.length === 0) return [];

    const computedList = effectiveUsersList.map(u => {
      const targetAmount = getUserMonthlyTargetAmount(u, targetYear, targetMonth);
      const achievedRevenue = calculateUserMonthlyCollections(u, targetYear, targetMonth);

      let achievementPct = 0;
      if (targetAmount > 0) {
        achievementPct = Math.round((achievedRevenue / targetAmount) * 100);
      } else if (achievedRevenue > 0) {
        achievementPct = 100;
      }

      return {
        user: u,
        targetAmount,
        achievedRevenue,
        achievementPct
      };
    });

    // Sort by achieved revenue descending, then by achievement percentage
    computedList.sort((a, b) => {
      if (b.achievedRevenue !== a.achievedRevenue) {
        return b.achievedRevenue - a.achievedRevenue;
      }
      return b.achievementPct - a.achievementPct;
    });

    // Assign Rank Numbers
    const ranked = computedList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    // Filter by search query if typed
    if (!leaderboardSearch.trim()) return ranked;

    const q = leaderboardSearch.toLowerCase().trim();
    return ranked.filter(item =>
      (item.user.name && item.user.name.toLowerCase().includes(q)) ||
      (item.user.email && item.user.email.toLowerCase().includes(q)) ||
      (item.user.department && item.user.department.toLowerCase().includes(q)) ||
      (item.user.role?.name && item.user.role.name.toLowerCase().includes(q))
    );
  }, [effectiveUsersList, targetYear, targetMonth, leaderboardSearch, calculateUserMonthlyCollections]);

  // Overall Team Performance Stats
  const teamPerformanceStats = useMemo(() => {
    let totalTarget = 0;
    let totalCollected = 0;
    let topPerformer = null;

    leaderboardData.forEach(item => {
      totalTarget += item.targetAmount;
      totalCollected += item.achievedRevenue;
    });

    if (leaderboardData.length > 0) {
      topPerformer = leaderboardData[0];
    }

    const overallPct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : (totalCollected > 0 ? 100 : 0);

    return {
      totalTarget,
      totalCollected,
      overallPct,
      topPerformer
    };
  }, [leaderboardData]);

  // Open Set Target Modal
  const handleOpenSetTargetModal = (userObj, currentTarget) => {
    setTargetUser(userObj);
    setTargetAmountInput(currentTarget || '');
    setShowTargetModal(true);
  };

  // Save Target Handler
  const handleSaveMonthlyTarget = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    const numVal = parseFloat(targetAmountInput);
    if (isNaN(numVal) || numVal < 0) {
      alert('Please enter a valid target amount in Rupees.');
      return;
    }

    try {
      setSavingTarget(true);
      const userId = String(targetUser._id || targetUser.id);
      
      // Save locally to storage (multi-key indexing by id, name, and email)
      saveStoredUserTarget(targetUser, targetYear, targetMonth, numVal);

      // Save via Backend API
      const res = await userService.setUserMonthlyTarget(userId, {
        year: targetYear,
        month: targetMonth,
        targetAmount: numVal
      });

      // Update local usersList state immediately
      setUsersList(prev => prev.map(u => {
        if (String(u._id || u.id) === userId) {
          const existingTargets = u.monthlyTargets || [];
          const idx = existingTargets.findIndex(t => t.year === targetYear && t.month === targetMonth);
          let updatedTargets = [...existingTargets];

          if (idx > -1) {
            updatedTargets[idx] = { ...updatedTargets[idx], targetAmount: numVal, updatedAt: new Date() };
          } else {
            updatedTargets.push({ year: targetYear, month: targetMonth, targetAmount: numVal, updatedAt: new Date() });
          }

          return { ...u, monthlyTargets: updatedTargets };
        }
        return u;
      }));

      setShowTargetModal(false);
    } catch (err) {
      console.error('Failed to save monthly sales target:', err);
      alert('Failed to save target. Please try again.');
    } finally {
      setSavingTarget(false);
    }
  };

  // Format Currency Helper (Rupees ₹)
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Filtered Team Members for Tab 3
  const filteredTeamMembers = useMemo(() => {
    if (!teamSearchQuery.trim()) return effectiveUsersList;
    const q = teamSearchQuery.toLowerCase().trim();
    return effectiveUsersList.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role?.name && u.role.name.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  }, [effectiveUsersList, teamSearchQuery]);

  // Format Helper Functions
  const formatTimeOnly = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLocalDateStr = (d = new Date()) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatSecToHours = (seconds, isActive = false) => {
    if (isActive && (!seconds || seconds < 60)) return 'Just Logged In';
    if (!seconds || seconds <= 0) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    if (mins > 0) return `${mins} min ${secs} sec`;
    return `${secs} sec`;
  };

  // Calendar Grid Calculation
  const calendarDaysList = useMemo(() => {
    if (!calendarData || !calendarData.daysMap) return [];
    
    const firstDayObj = new Date(calYear, calMonth - 1, 1);
    const startDayOfWeek = firstDayObj.getDay();
    const totalDaysInMonth = calendarData.daysInMonth || 30;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ empty: true, id: `empty-${i}` });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayPad = String(d).padStart(2, '0');
      const monthPad = String(calMonth).padStart(2, '0');
      const dateKey = `${calYear}-${monthPad}-${dayPad}`;
      const dayData = calendarData.daysMap[dateKey] || {
        dateStr: dateKey,
        dayNumber: d,
        isPresent: false,
        isWeekend: (new Date(calYear, calMonth - 1, d).getDay() === 0),
        isFuture: dateKey > getLocalDateStr(new Date()),
        sessions: []
      };
      days.push({ empty: false, ...dayData });
    }

    return days;
  }, [calendarData, calYear, calMonth]);

  // Selected User Object
  const targetUserObj = useMemo(() => {
    return usersList.find(u => String(u._id || u.id) === String(selectedUserId)) || calendarData?.user || user;
  }, [usersList, selectedUserId, calendarData, user]);

  // Attendance Rate % calculation
  const attendanceRate = useMemo(() => {
    if (!calendarData || !calendarData.stats) return 0;
    const { presentDays, absentDays } = calendarData.stats;
    const totalWorkingDays = presentDays + absentDays;
    if (totalWorkingDays === 0) return 100;
    return Math.round((presentDays / totalWorkingDays) * 100);
  }, [calendarData]);

  // CSV Export Handler
  const handleExportCSV = useCallback(() => {
    if (!logs || logs.length === 0) return;
    const headers = ['User Name', 'Email', 'Role', 'Department', 'Login Time', 'Logout Time', 'Duration', 'Status / Logout Reason', 'IP Address'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const uName = `"${log.user?.name || 'Employee'}"`;
      const uEmail = `"${log.user?.email || 'N/A'}"`;
      const uRole = `"${log.user?.role?.name || 'User'}"`;
      const uDept = `"${log.user?.department || 'Sales'}"`;
      const loginStr = `"${log.loginTime ? new Date(log.loginTime).toLocaleString('en-IN') : 'N/A'}"`;
      const logoutStr = `"${log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-IN') : 'Active Now'}"`;
      const sec = log.sessionDuration || 0;
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const durationStr = `"${hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}"`;

      let statusStr = '"Active Now"';
      if (!log.isActive && log.logoutTime) {
        if (log.logoutType === 'idle_timeout') statusStr = '"1-Hour Inactivity Timeout"';
        else if (log.logoutType === 'manual') statusStr = '"Normal Logout"';
        else statusStr = '"Session Expired"';
      }
      const ipStr = `"${log.ipAddress || '127.0.0.1'}"`;
      csvRows.push([uName, uEmail, uRole, uDept, loginStr, logoutStr, durationStr, statusStr, ipStr].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sanmora_Activity_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logs]);

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <Sparkles className="spin-icon" />
        <span>Loading Sanmora Team Dashboard...</span>
      </div>
    );
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentTargetMonthName = monthNames[targetMonth - 1];
  const currentMonthName = monthNames[calMonth - 1];

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Team Performance & Activity Center" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="activity-logs-container">

          {/* ── VIEW MODE SWITCHER TABS ── */}
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <Trophy size={18} />
              <span>Target Leaderboard</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar size={18} />
              <span>Attendance Calendar</span>
            </button>

            <button
              type="button"
              className={`view-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <UserCheck size={18} />
              <span>Team Directory</span>
            </button>
          </div>

          {/* ── TAB 1: 🏆 MONTHLY SALES TARGET & LEDGER LEADERBOARD ── */}
          {activeTab === 'leaderboard' && (
            <div className="leaderboard-section">

              {/* Leaderboard Hero & Date Filter Bar */}
              <div className="lb-hero-banner">
                <div className="lb-hero-left">
                  <div className="lb-trophy-badge">
                    <Crown size={28} />
                  </div>
                  <div>
                    <h2 className="lb-hero-title">
                      Sales Target & Revenue Leaderboard
                    </h2>
                    <p className="lb-hero-sub">
                      Monthly Target Achievement based on Customer Ledger Collections • {currentTargetMonthName} {targetYear}
                    </p>
                  </div>
                </div>

                <div className="lb-hero-right">
                  <div className="lb-month-selector">
                    <label className="lb-filter-lbl"><Calendar size={15} /> Select Month:</label>
                    <select
                      className="lb-select-input"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(parseInt(e.target.value, 10))}
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>

                    <select
                      className="lb-select-input"
                      value={targetYear}
                      onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Leaderboard KPI Summary Cards */}
              <div className="activity-kpi-grid">
                <div className="act-kpi-card">
                  <div className="act-kpi-top">
                    <span className="act-kpi-label">Total Team Target</span>
                    <div className="act-kpi-icon icon-today">
                      <Target size={22} />
                    </div>
                  </div>
                  <div className="act-kpi-val-row">
                    <div className="act-kpi-value" style={{ fontSize: '1.8rem' }}>
                      {formatINR(teamPerformanceStats.totalTarget)}
                    </div>
                  </div>
                  <div className="act-kpi-sub sub-purple" style={{ marginTop: '12px' }}>
                    <Sparkles size={13} /> Target for {currentTargetMonthName}
                  </div>
                </div>

                <div className="act-kpi-card">
                  <div className="act-kpi-top">
                    <span className="act-kpi-label">Revenue Collected</span>
                    <div className="act-kpi-icon icon-active">
                      <IndianRupee size={22} />
                    </div>
                  </div>
                  <div className="act-kpi-val-row">
                    <div className="act-kpi-value" style={{ fontSize: '1.8rem', color: '#10B981' }}>
                      {formatINR(teamPerformanceStats.totalCollected)}
                    </div>
                  </div>
                  <div className="act-kpi-sub sub-green" style={{ marginTop: '12px' }}>
                    <CheckCircle2 size={13} /> Ledger Payments Cleared
                  </div>
                </div>

                <div className="act-kpi-card">
                  <div className="act-kpi-top">
                    <span className="act-kpi-label">Overall Achievement</span>
                    <div className="act-kpi-icon icon-duration">
                      <TrendingUp size={22} />
                    </div>
                  </div>
                  <div className="act-kpi-val-row">
                    <div className="act-kpi-value" style={{ fontSize: '2.2rem', color: '#3B82F6' }}>
                      {teamPerformanceStats.overallPct}%
                    </div>
                  </div>
                  <div className="act-kpi-sub sub-blue" style={{ marginTop: '12px' }}>
                    <Flame size={13} /> Team Goal Progress
                  </div>
                </div>

                <div className="act-kpi-card act-kpi-gold-champ">
                  <div className="act-kpi-top">
                    <span className="act-kpi-label champ-label">🥇 Top Sales Champ</span>
                    <div className="act-kpi-icon champ-icon">
                      <Crown size={22} />
                    </div>
                  </div>
                  <div className="act-kpi-val-row">
                    <div className="act-kpi-value champ-value">
                      {teamPerformanceStats.topPerformer ? teamPerformanceStats.topPerformer.user.name : '—'}
                    </div>
                  </div>
                  <div className="act-kpi-sub champ-sub">
                    <Trophy size={13} /> Revenue: {formatINR(teamPerformanceStats.topPerformer?.achievedRevenue || 0)}
                  </div>
                </div>
              </div>

              {/* Leaderboard Table & Filter Bar */}
              <div className="lb-content-card">
                <div className="lb-table-header">
                  <div className="lb-table-title-wrap">
                    <Trophy size={22} style={{ color: '#EAB308' }} />
                    <h3 className="lb-table-title">Employee Rankings ({leaderboardData.length})</h3>
                  </div>

                  <div className="lb-search-wrap">
                    <Search size={16} className="search-icon-inside" />
                    <input
                      type="text"
                      placeholder="Search employee name, role, department..."
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                    />
                    {leaderboardSearch && (
                      <button type="button" onClick={() => setLeaderboardSearch('')} className="team-search-clear">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-responsive-wrapper">
                  <table className="lb-table">
                    <thead>
                      <tr>
                        <th className="col-rank">Rank</th>
                        <th className="col-team-member">Team Member</th>
                        <th className="col-target">Monthly Target (₹)</th>
                        <th className="col-collected">Collected Revenue (₹)</th>
                        <th className="col-progress">Target Progress</th>
                        <th className="col-action">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.length > 0 ? (
                        leaderboardData.map((item) => {
                          const { user: u, targetAmount, achievedRevenue, achievementPct, rank } = item;
                          const uId = String(u._id || u.id);
                          const isTop1 = rank === 1;
                          const isTop2 = rank === 2;
                          const isTop3 = rank === 3;

                          return (
                            <tr key={uId} className={isTop1 ? 'tr-rank-1' : isTop2 ? 'tr-rank-2' : isTop3 ? 'tr-rank-3' : ''}>
                              <td className="col-rank">
                                {isTop1 ? (
                                  <span className="rank-badge rank-gold">
                                    <Crown size={14} /> #1 TOP
                                  </span>
                                ) : isTop2 ? (
                                  <span className="rank-badge rank-silver">
                                    <Medal size={14} /> #2
                                  </span>
                                ) : isTop3 ? (
                                  <span className="rank-badge rank-bronze">
                                    <Award size={14} /> #3
                                  </span>
                                ) : (
                                  <span className="rank-badge rank-default">
                                    #{rank}
                                  </span>
                                )}
                              </td>

                              <td className="col-team-member">
                                <div className="user-cell-wrap">
                                  <div className={`user-cell-avatar ${isTop1 ? 'avatar-gold' : isTop2 ? 'avatar-silver' : isTop3 ? 'avatar-bronze' : ''}`}>
                                    {(u.name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="user-cell-name">{u.name}</div>
                                    <div className="user-cell-email">{u.email}</div>
                                    <div className="user-cell-tags">
                                      <span className="role-pill-sm">{u.role?.name || u.role || 'Staff'}</span>
                                      <span className="pill-dept">{u.department || 'Sales'}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="col-target">
                                <div className="target-amount-cell">
                                  {targetAmount > 0 ? (
                                    <span className="target-val-text">{formatINR(targetAmount)}</span>
                                  ) : (
                                    <span className="target-not-set">Target Not Set</span>
                                  )}
                                </div>
                              </td>

                              <td className="col-collected">
                                <div className="collected-amount-cell">
                                  <span className="collected-val-text">{formatINR(achievedRevenue)}</span>
                                </div>
                              </td>

                              <td className="col-progress">
                                <div className="progress-cell-container">
                                  <div className="progress-top-info">
                                    <span className="progress-pct-badge" style={{
                                      color: achievementPct >= 100 ? '#10B981' : achievementPct >= 50 ? '#EAB308' : '#64748B'
                                    }}>
                                      {achievementPct}% Achieved
                                    </span>
                                    <span className="progress-sub-text">
                                      {achievedRevenue >= targetAmount && targetAmount > 0 ? '🎯 Goal Met!' : targetAmount > 0 ? `${formatINR(Math.max(0, targetAmount - achievedRevenue))} Remaining` : 'Set Target to track'}
                                    </span>
                                  </div>

                                  <div className="lb-progress-bar-track">
                                    <div
                                      className={`lb-progress-bar-fill ${achievementPct >= 100 ? 'fill-emerald' : achievementPct >= 50 ? 'fill-amber' : 'fill-purple'}`}
                                      style={{ width: `${Math.min(100, Math.max(achievementPct, 0))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="col-action">
                                <button
                                  type="button"
                                  className="btn-set-target-sm"
                                  onClick={() => handleOpenSetTargetModal(u, targetAmount)}
                                >
                                  <Edit3 size={14} />
                                  <span>{targetAmount > 0 ? 'Edit Target' : 'Set Target'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                            No team members matched your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 2: INTERACTIVE USER ATTENDANCE CALENDAR ── */}
          {activeTab === 'calendar' && (
            <div className="user-cal-section">
              
              {/* User Selector Banner Header */}
              <div className="user-banner-bar">
                <div className="u-banner-left">
                  <div className="u-banner-avatar">
                    {(targetUserObj?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="u-banner-title">{targetUserObj?.name || 'Select User'}</h2>
                    <div className="u-banner-pills-row">
                      <span className="u-meta-pill u-meta-email">
                        <User size={13} /> {targetUserObj?.email || 'N/A'}
                      </span>
                      <span className="u-meta-pill u-meta-role">
                        <ShieldCheck size={13} /> {targetUserObj?.role?.name || 'Staff'}
                      </span>
                      <span className="u-meta-pill u-meta-dept">
                        <Zap size={13} /> {targetUserObj?.department || 'Sales'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="u-banner-right">
                  <label className="u-select-label">
                    <UserCheck size={15} />
                    <span>Select Team Member:</span>
                  </label>
                  <select
                    className="select-user-dropdown"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    {effectiveUsersList.map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {u.name} ({u.role?.name || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month Navigator Bar */}
              <div className="month-nav-bar">
                <button type="button" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} className="nav-month-btn">
                  <ChevronLeft size={16} /> Previous Month
                </button>

                <div className="month-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={22} style={{ color: '#7C3AED' }} />
                    <span className="month-name">{monthNames[calMonth - 1] || ''} {calYear}</span>
                  </div>

                  {/* 🗓️ Interactive Quick Month, Year & Date Picker Controls */}
                  <div className="cal-header-picker-group">
                    <select
                      className="cal-header-select"
                      value={calMonth}
                      onChange={(e) => setCalMonth(parseInt(e.target.value, 10))}
                      title="Select Month"
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>

                    <select
                      className="cal-header-select"
                      value={calYear}
                      onChange={(e) => setCalYear(parseInt(e.target.value, 10))}
                      title="Select Year"
                    >
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    {/* Date Picker Button (Pick exact date from graphical calendar popup) */}
                    <div className="cal-picker-btn-wrapper" title="Click to Pick Specific Calendar Date">
                      <input
                        type="date"
                        className="cal-date-input-overlay"
                        onChange={(e) => {
                          if (e.target.value) {
                            const parts = e.target.value.split('-');
                            if (parts.length === 3) {
                              const y = parseInt(parts[0], 10);
                              const m = parseInt(parts[1], 10);
                              const d = parseInt(parts[2], 10);
                              setCalYear(y);
                              setCalMonth(m);

                              // Auto inspect selected day
                              const targetDateKey = e.target.value;
                              setTimeout(() => {
                                if (calendarData?.daysMap?.[targetDateKey]) {
                                  setSelectedDayData(calendarData.daysMap[targetDateKey]);
                                  setShowDayModal(true);
                                }
                              }, 350);
                            }
                          }
                        }}
                      />
                      <button type="button" className="cal-picker-pill-btn">
                        <Calendar size={14} /> Pick Date
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" onClick={() => { const n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth() + 1); }} className="btn-jump-today">
                    <Sparkles size={14} /> Jump to Today
                  </button>
                  <button type="button" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} className="nav-month-btn">
                    Next Month <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Monthly Attendance Stats Row */}
              <div className="attendance-stats-row">
                <div className="att-stat-box box-present">
                  <div className="att-stat-info">
                    <div className="att-stat-label">Present Days</div>
                    <div className="att-stat-sub">Logged in on work day</div>
                  </div>
                  <div className="att-stat-val">{calendarData?.stats?.presentDays || 0} Days</div>
                </div>

                <div className="att-stat-box box-absent">
                  <div className="att-stat-info">
                    <div className="att-stat-label">Absent Days</div>
                    <div className="att-stat-sub">No login on work day</div>
                  </div>
                  <div className="att-stat-val">{calendarData?.stats?.absentDays || 0} Days</div>
                </div>

                <div className="att-stat-box box-hours">
                  <div className="att-stat-info">
                    <div className="att-stat-label">Total Time Worked</div>
                    <div className="att-stat-sub">Sum of all work sessions</div>
                  </div>
                  <div className="att-stat-val">{formatSecToHours(calendarData?.stats?.totalWorkingSeconds)}</div>
                </div>

                <div className="att-stat-box box-rate">
                  <div className="att-stat-info">
                    <div className="att-stat-label">Attendance Score</div>
                    <div className="att-stat-sub">Monthly consistency rating</div>
                  </div>
                  <div className="att-stat-val">{attendanceRate}%</div>
                </div>
              </div>

              {/* 7-COLUMN MONTHLY CALENDAR GRID */}
              <div className="calendar-grid-wrapper">
                <div className="calendar-header-days">
                  <div className="day-name-hdr">Sun</div>
                  <div className="day-name-hdr">Mon</div>
                  <div className="day-name-hdr">Tue</div>
                  <div className="day-name-hdr">Wed</div>
                  <div className="day-name-hdr">Thu</div>
                  <div className="day-name-hdr">Fri</div>
                  <div className="day-name-hdr">Sat</div>
                </div>

                {calLoading ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: '#7C3AED', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Sparkles className="spin-icon" size={24} />
                    <span>Loading attendance calendar grid...</span>
                  </div>
                ) : (
                  <div className="calendar-days-grid">
                    {calendarDaysList.map((dayItem, idx) => {
                      if (dayItem.empty) {
                        return <div key={dayItem.id} className="cal-day-cell is-empty" />;
                      }

                      const todayStr = getLocalDateStr(new Date());
                      const isToday = dayItem.dateStr === todayStr;

                      return (
                        <div
                          key={dayItem.dateStr || idx}
                          className={`cal-day-cell ${isToday ? 'is-today' : ''}`}
                          onClick={() => {
                            setSelectedDayData(dayItem);
                            setShowDayModal(true);
                          }}
                        >
                          <div className="cell-top-row">
                            <span className={`cell-date-num ${isToday ? 'is-today-badge' : ''}`}>
                              {dayItem.dayNumber}
                            </span>

                            {dayItem.isActiveToday ? (
                              <span className="att-badge-sm att-active">
                                <span className="status-pulse-dot-green" /> Online
                              </span>
                            ) : dayItem.isPresent ? (
                              <span className="att-badge-sm att-present">
                                <Check size={11} /> Present
                              </span>
                            ) : dayItem.isFuture ? (
                              <span className="att-badge-sm att-future">Upcoming</span>
                            ) : dayItem.isWeekend ? (
                              <span className="att-badge-sm att-weekend">Weekend</span>
                            ) : (
                              <span className="att-badge-sm att-absent">
                                <X size={11} /> Absent
                              </span>
                            )}
                          </div>

                          {dayItem.isPresent ? (
                            <div className="cell-time-info">
                              <div className="cell-time-lbl">
                                In: <span>{formatTimeOnly(dayItem.firstLogin)}</span>
                              </div>
                              <div className="cell-time-lbl">
                                Out: <span>{dayItem.lastLogout ? formatTimeOnly(dayItem.lastLogout) : 'Active'}</span>
                              </div>
                              <div className="cell-dur-tag">
                                {formatSecToHours(dayItem.dayDurationSeconds)}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: dayItem.isFuture ? '#64748B' : dayItem.isWeekend ? '#94A3B8' : '#E11D48', fontWeight: 600, marginTop: 'auto' }}>
                              {dayItem.isFuture ? 'Upcoming' : dayItem.isWeekend ? 'Weekend' : 'Absent'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── TAB 3: TEAM DIRECTORY (GRID OF ALL EMPLOYEES) ── */}
          {activeTab === 'team' && (
            <div>
              <div className="team-directory-header">
                <div className="team-dir-title-row">
                  <div className="team-dir-icon-wrap">
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h3 className="team-dir-title">Team Directory ({filteredTeamMembers.length} Members)</h3>
                    <p className="team-dir-sub">Select any employee to view their attendance calendar & daily work logs</p>
                  </div>
                </div>

                <div className="team-search-box">
                  <Search size={18} className="team-search-icon" />
                  <input
                    type="text"
                    placeholder="Search employee by name, email, role or department..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                  />
                  {teamSearchQuery && (
                    <button type="button" onClick={() => setTeamSearchQuery('')} className="team-search-clear">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {filteredTeamMembers.length > 0 ? (
                <div className="team-users-grid">
                  {filteredTeamMembers.map((u) => {
                    const uId = String(u._id || u.id);
                    const isCurrentSelected = uId === selectedUserId;

                    return (
                      <div key={uId} className={`user-attendance-card ${isCurrentSelected ? 'active-selected' : ''}`}>
                        <div>
                          <div className="u-card-head">
                            <div className="u-avatar-lg">
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="u-info-name">{u.name}</div>
                              <div className="u-info-email">{u.email}</div>
                              <div className="u-info-pills">
                                <span className="pill-role">{u.role?.name || 'Staff'}</span>
                                <span className="pill-dept">{u.department || 'Sales'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => { setSelectedUserId(uId); setActiveTab('calendar'); }}
                          className="btn-open-user-cal"
                        >
                          <Calendar size={16} />
                          <span>View Attendance Calendar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state">
                  <Search size={36} style={{ color: '#94A3B8', marginBottom: '12px' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)' }}>
                    No Team Members Found
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #64748B)', marginTop: '4px' }}>
                    No employee matched your search query "{teamSearchQuery}".
                  </div>
                  <button type="button" onClick={() => setTeamSearchQuery('')} className="btn-reset-filter" style={{ marginTop: '16px' }}>
                    Clear Search Filter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: GLOBAL RAW SESSION LOGS TABLE ── */}
          {activeTab === 'logs' && (
            <div>
              <div className="activity-filter-panel">
                <div className="filter-preset-tabs">
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Quick Date:
                  </span>
                  <button type="button" className={`preset-tab-btn ${datePreset === 'all' ? 'active' : ''}`} onClick={() => { setDatePreset('all'); setStartDate(''); setEndDate(''); setPage(1); }}>All Time</button>
                  <button type="button" className={`preset-tab-btn ${datePreset === 'today' ? 'active' : ''}`} onClick={() => { setDatePreset('today'); setStartDate(getLocalDateStr(new Date())); setEndDate(getLocalDateStr(new Date())); setPage(1); }}>Today</button>
                  <button type="button" className={`preset-tab-btn ${datePreset === 'yesterday' ? 'active' : ''}`} onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); const yStr = getLocalDateStr(y); setDatePreset('yesterday'); setStartDate(yStr); setEndDate(yStr); setPage(1); }}>Yesterday</button>
                </div>

                <div className="filter-inputs-row">
                  <div className="search-input-wrap">
                    <Search size={16} className="search-icon-inside" />
                    <input type="text" placeholder="Search user name or email..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
                  </div>

                  <div className="filter-select-wrap">
                    <select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); setPage(1); }}>
                      <option value="">All Team Members</option>
                      {usersList.map((u) => (
                        <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role?.name || 'Staff'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-select-wrap">
                    <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}>
                      <option value="all">All Session Statuses</option>
                      <option value="active">Active Now (Online)</option>
                      <option value="manual">Normal Logout</option>
                      <option value="idle_timeout">1-Hour Idle Timeout</option>
                      <option value="session_expired">Session Expired</option>
                    </select>
                  </div>

                  <div className="date-input-wrap">
                    <span className="date-label-sm">From Date</span>
                    <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); setPage(1); }} />
                  </div>

                  <div className="date-input-wrap">
                    <span className="date-label-sm">To Date</span>
                    <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); setPage(1); }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button type="button" onClick={() => { setSearchQuery(''); setSelectedUserId(''); setSelectedStatus('all'); setDatePreset('all'); setStartDate(''); setEndDate(''); setPage(1); }} className="btn-reset-filter"><RotateCcw size={14} /> Reset</button>
                    <button type="button" onClick={handleExportCSV} className="btn-export-csv"><Download size={15} /> Export CSV</button>
                  </div>
                </div>
              </div>

              <div className="activity-table-panel">
                <div className="table-responsive-wrapper">
                  <table className="act-table">
                    <thead>
                      <tr>
                        <th>Team Member</th>
                        <th>Login Date & Time</th>
                        <th>Logout Date & Time</th>
                        <th>Session Duration</th>
                        <th>Logout Reason / Status</th>
                        <th>IP / Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsLoading ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#7C3AED', fontWeight: 600 }}>
                              <Sparkles className="spin-icon" size={20} />
                              <span>Fetching session activity records...</span>
                            </div>
                          </td>
                        </tr>
                      ) : logs.length > 0 ? (
                        logs.map((log) => {
                          const uName = log.user?.name || 'Employee';
                          const uEmail = log.user?.email || '—';
                          const uRole = log.user?.role?.name || 'User';
                          const isActiveNow = log.isActive || !log.logoutTime;
                          const loginStr = log.loginTime ? new Date(log.loginTime).toLocaleString('en-IN') : '—';
                          const logoutStr = log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-IN') : 'Active Now';

                          return (
                            <tr key={log._id}>
                              <td>
                                <div className="user-cell-wrap">
                                  <div className="user-cell-avatar">{uName.charAt(0).toUpperCase()}</div>
                                  <div>
                                    <div className="user-cell-name">{uName}</div>
                                    <div className="user-cell-email">{uEmail}</div>
                                    <span className="role-pill-sm">{uRole}</span>
                                  </div>
                                </div>
                              </td>
                              <td><div className="time-cell-main">{loginStr}</div></td>
                              <td><div className="time-cell-main">{logoutStr}</div></td>
                              <td><span className="duration-pill"><Clock size={13} />{formatSecToHours(log.sessionDuration)}</span></td>
                              <td>
                                {isActiveNow ? (
                                  <span className="status-pill-badge status-active-now"><span className="status-pulse-dot-green" /> Active Now</span>
                                ) : log.logoutType === 'idle_timeout' ? (
                                  <span className="status-pill-badge status-idle-timeout"><Clock size={14} /> Auto Logout</span>
                                ) : log.logoutType === 'manual' ? (
                                  <span className="status-pill-badge status-manual-logout"><LogOut size={14} /> Normal Logout</span>
                                ) : (
                                  <span className="status-pill-badge status-session-expired"><ShieldCheck size={14} /> Session Expired</span>
                                )}
                              </td>
                              <td><span style={{ fontSize: '0.82rem', color: '#64748B' }}>{log.ipAddress || '127.0.0.1'}</span></td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No session logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SET MONTHLY TARGET MODAL ── */}
          {showTargetModal && targetUser && (
            <div className="modal-overlay" onClick={() => setShowTargetModal(false)}>
              <div className="date-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="date-modal-header" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)' }}>
                  <div className="date-modal-title-row">
                    <Target size={24} />
                    <div>
                      <div className="date-modal-title">Set Monthly Sales Target</div>
                      <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                        {targetUser.name} • {currentTargetMonthName} {targetYear}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTargetModal(false)}
                    className="date-modal-close-btn"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveMonthlyTarget}>
                  <div className="date-modal-body" style={{ padding: '24px' }}>
                    <div className="target-emp-card">
                      <div className="target-emp-header-lbl">EMPLOYEE DETAILS</div>
                      <div className="target-emp-name">{targetUser.name}</div>
                      <div className="target-emp-sub">{targetUser.email} • {targetUser.role?.name || 'Staff'}</div>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <label className="target-label">
                        QUICK PRESETS (CLICK TO SET):
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[100000, 250000, 500000, 1000000].map(val => (
                          <button
                            key={val}
                            type="button"
                            className="preset-tab-btn"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setTargetAmountInput(String(val))}
                          >
                            +{formatINR(val)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label className="target-label">
                        TARGET REVENUE AMOUNT (IN ₹ RUPEES) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 850, color: '#7C3AED', fontSize: '1.1rem' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          required
                          placeholder="e.g. 500000"
                          value={targetAmountInput}
                          onChange={(e) => setTargetAmountInput(e.target.value)}
                          className="target-amount-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="target-modal-footer">
                    <button
                      type="button"
                      className="btn-reset-filter"
                      onClick={() => setShowTargetModal(false)}
                      style={{ height: '46px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTarget}
                      className="btn-open-user-cal"
                      style={{ width: 'auto', padding: '0 28px', height: '46px' }}
                    >
                      {savingTarget ? 'Saving Target...' : 'Save Target Amount'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── DATE DETAILS INSPECTOR MODAL ── */}
          {showDayModal && selectedDayData && (
            <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
              <div className="date-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="date-modal-header">
                  <div className="date-modal-title-row">
                    <Calendar size={22} />
                    <div>
                      <div className="date-modal-title">Attendance Details</div>
                      <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                        {formatFullDate(selectedDayData.dateStr)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDayModal(false)}
                    className="date-modal-close-btn"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="date-modal-body">
                  <div className="modal-summary-box">
                    <div className="modal-sum-item">
                      <div className="sum-item-lbl">Attendance Status</div>
                      <div className="sum-item-val" style={{ color: selectedDayData.isPresent ? '#10B981' : selectedDayData.isFuture ? '#64748B' : selectedDayData.isWeekend ? '#94A3B8' : '#FB7185' }}>
                        {selectedDayData.isActiveToday ? 'ONLINE NOW' : selectedDayData.isPresent ? 'PRESENT' : selectedDayData.isFuture ? 'UPCOMING' : selectedDayData.isWeekend ? 'WEEKEND' : 'ABSENT'}
                      </div>
                    </div>

                    <div className="modal-sum-item">
                      <div className="sum-item-lbl">Total Time Worked Today</div>
                      <div className="sum-item-val" style={{ color: '#A78BFA' }}>
                        {formatSecToHours(selectedDayData.dayDurationSeconds)}
                      </div>
                    </div>

                    <div className="modal-sum-item">
                      <div className="sum-item-lbl">Total Work Sessions</div>
                      <div className="sum-item-val">{selectedDayData.sessionCount || 0} Sessions</div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)', marginBottom: '14px' }}>
                    Daily Work Sessions Summary
                  </h4>

                  {selectedDayData.sessions && selectedDayData.sessions.length > 0 ? (
                    <div className="modal-session-list">
                      {selectedDayData.sessions.map((sess, idx) => {
                        const isSessActive = sess.isActive || !sess.logoutTime;
                        return (
                          <div key={sess.id || idx} className="modal-session-card">
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary, #0F172A)' }}>
                                Work Session #{idx + 1}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)', marginTop: '3px' }}>
                                Started: <strong>{formatTimeOnly(sess.loginTime)}</strong> • Ended: <strong>{sess.logoutTime ? formatTimeOnly(sess.logoutTime) : 'Online Now'}</strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="duration-pill">
                                <Clock size={13} /> {formatSecToHours(sess.sessionDuration, isSessActive)}
                              </span>

                              {isSessActive ? (
                                <span className="status-pill-badge status-active-now" style={{ padding: '4px 12px', fontSize: '0.76rem' }}>
                                  <span className="status-pulse-dot-green" /> Online Now
                                </span>
                              ) : sess.logoutType === 'idle_timeout' ? (
                                <span className="status-pill-badge status-idle-timeout" style={{ padding: '4px 12px', fontSize: '0.76rem' }}>
                                  Auto Logout
                                </span>
                              ) : (
                                <span className="status-pill-badge status-manual-logout" style={{ padding: '4px 12px', fontSize: '0.76rem' }}>
                                  Normal Logout
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-login-record-box">
                      <AlertCircle size={32} style={{ color: '#E11D48', margin: '0 auto 8px auto' }} />
                      <div className="no-login-title">
                        {selectedDayData.isFuture ? 'Upcoming Date' : selectedDayData.isWeekend ? 'Sunday Weekend' : 'Absent (No Login Record)'}
                      </div>
                      <div className="no-login-sub">
                        {selectedDayData.isFuture ? 'This is an upcoming future date.' : selectedDayData.isWeekend ? 'Sunday is a weekly non-working day.' : 'User did not log into the CRM system on this day (Marked as Absent).'}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
