'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  getStoredLeads,
  getStoredFollowups,
  getStoredTasks,
  filterByRole
} from '../../utils/crmStore';
import { userService } from '../../services/user.service';
import {
  Search, Bell, ShieldCheck, ChevronsLeft, ChevronsRight,
  Users, RefreshCw, CheckSquare, User, ArrowRight, X, Sparkles, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Trash2, Check, ExternalLink, Sun, Moon, Music, Megaphone, Menu
} from 'lucide-react';
import EntranceMusicPlayer from '../common/EntranceMusicPlayer';
import GlobalAnnouncementBanner from '../common/GlobalAnnouncementBanner';
import './Header.css';

function Header({ title = 'Dashboard' }) {
  const { user, sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [systemUsers, setSystemUsers] = useState([]);
  const [mounted, setMounted] = useState(false);
  
  // Notification states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'flow' | 'task' | 'lead'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('sanmora_read_notif_ids_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReadNotifIds(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to restore read notifications from storage:', e);
    }
  }, []);

  // Fetch users list for search
  useEffect(() => {
    let isMounted = true;
    userService.getAllUsers()
      .then(res => {
        const uList = Array.isArray(res) ? res : (res?.data || res?.users || []);
        if (isMounted) setSystemUsers(uList);
      })
      .catch(() => {
        if (isMounted) setSystemUsers([]);
      });
    return () => { isMounted = false; };
  }, []);

  // Keyboard Shortcut: Cmd+K / Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Search Engine across 4 Categories
  const searchResults = useCallback(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { leads: [], followups: [], tasks: [], users: [], total: 0 };

    // 1. Search Leads / Customers
    const leads = filterByRole(getStoredLeads(), user, systemUsers).filter(l => {
      const name = (l.customerName || l.contactPerson || '').toLowerCase();
      const phone = (l.phone || l.primaryContact || '').toLowerCase();
      const company = (l.company || l.companyName || '').toLowerCase();
      const status = (l.leadStatus || l.status || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q) || status.includes(q);
    }).slice(0, 4);

    // 2. Search Follow-Ups (Flow)
    const followups = filterByRole(getStoredFollowups(), user, systemUsers).filter(f => {
      const name = (f.customerName || '').toLowerCase();
      const inq = (f.inquiryNo || '').toLowerCase();
      const notes = (f.notes || '').toLowerCase();
      const assigned = (f.assignedTo || '').toLowerCase();
      const type = (f.followupType || '').toLowerCase();
      return name.includes(q) || inq.includes(q) || notes.includes(q) || assigned.includes(q) || type.includes(q);
    }).slice(0, 4);

    // 3. Search Tasks
    const tasks = filterByRole(getStoredTasks(), user, systemUsers).filter(t => {
      const titleText = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const status = (t.status || '').toLowerCase();
      const assigned = (t.assignedTo || '').toLowerCase();
      return titleText.includes(q) || desc.includes(q) || status.includes(q) || assigned.includes(q);
    }).slice(0, 4);

    // 4. Search Users
    const users = systemUsers.filter(u => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const roleName = (u.role?.name || u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roleName.includes(q);
    }).slice(0, 4);

    const total = leads.length + followups.length + tasks.length + users.length;
    return { leads, followups, tasks, users, total };
  }, [searchQuery, systemUsers])();

  // ⚡ REAL-TIME ACTION NOTIFICATIONS ENGINE (Flow, Tasks, Leads)
  const notifications = useMemo(() => {
    if (!mounted) return [];
    const list = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Scope followups, tasks, and leads according to User Role & Manager Hierarchy
    const rawFollowups = getStoredFollowups();
    const rawTasks = getStoredTasks();
    const rawLeads = getStoredLeads();

    const followups = filterByRole(rawFollowups, user, systemUsers);
    const tasks = filterByRole(rawTasks, user, systemUsers);
    const leads = filterByRole(rawLeads, user, systemUsers);

    // 1. Flow / Follow-Up Notifications (Overdue / Due Today)
    followups.forEach(f => {
      const rawStatus = String(f.status || '').toLowerCase();
      const rawLeadStatus = String(f.leadStatus || '').toLowerCase();
      const rawNotes = String(f.notes || '').toLowerCase();

      const isInactive =
        rawStatus === 'no followup' ||
        rawStatus === 'closed' ||
        rawStatus === 'completed' ||
        rawLeadStatus.includes('cold') ||
        rawLeadStatus.includes('cancel') ||
        rawLeadStatus.includes('done') ||
        rawLeadStatus.includes('won') ||
        rawLeadStatus.includes('lost') ||
        rawNotes.includes('deal done') ||
        rawNotes.includes('deal cancelled') ||
        rawNotes.includes('cold lead');

      if (isInactive) return;

      const targetNextDate = (f.nextFollowupDate && f.nextFollowupDate !== '—') ? f.nextFollowupDate : null;
      if (!targetNextDate) return;

      const isDueToday = targetNextDate === todayStr;
      const isOverdue = targetNextDate < todayStr;

      if (isDueToday || isOverdue) {
        list.push({
          id: `notif-fup-${f.id || f.leadId}`,
          type: 'flow',
          categoryName: isOverdue ? 'OVERDUE FLOW' : 'FLOW DUE TODAY',
          title: `Follow-Up Due: ${f.customerName || f.inquiryNo || 'Client Account'}`,
          desc: f.notes ? `"${f.notes.slice(0, 50)}..."` : `Scheduled ${f.followupType || 'Telephonic'} interaction`,
          time: isOverdue ? `Overdue (${targetNextDate})` : 'Due Today',
          isUrgent: isOverdue,
          actionText: 'Take Flow',
          linkUrl: `/followups?search=${encodeURIComponent(f.customerName || f.inquiryNo || '')}`
        });
      }
    });

    // 2. Task Assignment Notifications
    tasks.forEach(t => {
      if (t.completed || t.status === 'Completed' || t.status === 'Done') return;
      list.push({
        id: `notif-task-${t.id}`,
        type: 'task',
        categoryName: 'WORK TASK ASSIGNED',
        title: `Task: ${t.title || 'Work Task'}`,
        desc: `Assigned to ${t.assignedTo || 'Staff'} • Status: ${t.status || 'To Do'}`,
        time: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recent Task',
        isUrgent: t.priority === 'High',
        actionText: 'View Task',
        linkUrl: `/tasks?search=${encodeURIComponent(t.title || '')}`
      });
    });

    // 3. New Leads / Converted Client Notifications
    leads.slice(0, 5).forEach(l => {
      const rawLeadStatus = String(l.leadStatus || l.status || '').toLowerCase();
      const isDealDone = rawLeadStatus.includes('done') || rawLeadStatus.includes('won');
      const isCold = rawLeadStatus.includes('cold') || rawLeadStatus.includes('cancel') || rawLeadStatus.includes('lost');

      if (isCold) return;

      list.push({
        id: `notif-lead-${l.id}`,
        type: 'lead',
        categoryName: isDealDone ? 'CLIENT CONVERTED' : 'NEW LEAD INQUIRY',
        title: `${isDealDone ? 'Client Converted' : 'New Lead'}: ${l.customerName || l.contactPerson || 'Inquiry'}`,
        desc: `${l.company || 'Corporate Client'} • Phone: ${l.phone || '—'}`,
        time: isDealDone ? 'Account Settled' : 'Active Inquiry',
        isUrgent: isDealDone,
        actionText: isDealDone ? 'View Khata' : 'View Lead',
        linkUrl: isDealDone ? `/ledger` : `/customers?search=${encodeURIComponent(l.customerName || '')}`
      });
    });

    return list;
  }, [refreshTrigger, mounted, user, systemUsers]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readNotifIds.has(n.id)).length;
  }, [notifications, readNotifIds]);

  const filteredNotifs = useMemo(() => {
    if (notifFilter === 'all') return notifications;
    return notifications.filter(n => n.type === notifFilter);
  }, [notifications, notifFilter]);

  const saveReadNotifs = useCallback((newSet) => {
    setReadNotifIds(newSet);
    try {
      const arr = Array.from(newSet).slice(-500);
      localStorage.setItem('sanmora_read_notif_ids_v1', JSON.stringify(arr));
    } catch (e) {
      console.error('Failed to save read notifications to storage:', e);
    }
  }, []);

  const handleMarkAllRead = () => {
    const allIds = new Set([...readNotifIds, ...notifications.map(n => n.id)]);
    saveReadNotifs(allIds);
  };

  const handleNotificationAction = (notif, e) => {
    e.stopPropagation();
    const nextSet = new Set([...readNotifIds, notif.id]);
    saveReadNotifs(nextSet);
    setIsNotifOpen(false);
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  // Navigation handlers for clicking search recommendations
  const handleSelectLead = (lead) => {
    setIsOpen(false);
    setSearchQuery('');
    router.push(`/customers?search=${encodeURIComponent(lead.customerName || lead.contactPerson || '')}`);
  };

  const handleSelectFollowup = (fup) => {
    setIsOpen(false);
    setSearchQuery('');
    router.push(`/followups?search=${encodeURIComponent(fup.customerName || fup.inquiryNo || '')}`);
  };

  const handleSelectTask = (task) => {
    setIsOpen(false);
    setSearchQuery('');
    router.push(`/tasks?search=${encodeURIComponent(task.title || '')}`);
  };

  const handleSelectUser = (u) => {
    setIsOpen(false);
    setSearchQuery('');
    router.push(`/users?search=${encodeURIComponent(u.name || u.email || '')}`);
  };

  return (
    <>
      {/* FULL-WIDTH ANNOUNCEMENT BANNER — spans entire screen including sidebar area */}
      <div className="crm-announcement-fullwidth">
        <GlobalAnnouncementBanner />
      </div>

      {/* HEADER CONTAINER — positioned below announcement banner */}
      <div className={`crm-header-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <header className="crm-header">
        <div className="header-left">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={toggleMobileSidebar}
          className="header-mobile-hamburger-btn"
          title="Open Navigation Menu"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="header-toggle-btn desktop-only"
          title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse to Mini Icon Mode'}
        >
          {sidebarCollapsed ? (
            <ChevronsRight size={18} className="toggle-icon-active" />
          ) : (
            <ChevronsLeft size={18} className="toggle-icon-active" />
          )}
        </button>
        <div className="header-title-container">
          <h1 className="page-title">{title}</h1>
          <span className="header-subtitle-tag">SANMORA CRM ENTERPRISE</span>
        </div>

        {/* 🎊 PRO-ALIGNED MINIMIZED CELEBRATION ANNOUNCEMENT SLOT */}
        <div id="header-announcement-slot" className="header-announcement-slot" />
      </div>

      <div className="header-right">
        {/* GLOBAL SEARCH CONTAINER WITH INSTANT DROPDOWN RECOMMENDATIONS */}
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search leads, flows, tasks, users..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setIsNotifOpen(false);
            }}
            onFocus={() => {
              setIsOpen(true);
              setIsNotifOpen(false);
            }}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); setIsOpen(false); }}
              className="search-clear-btn"
              title="Clear Search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="search-shortcut">⌘K</span>
          )}

          {/* SEARCH RECOMMENDATIONS DROPDOWN */}
          {isOpen && searchQuery.trim().length > 0 && (
            <div ref={dropdownRef} className="search-dropdown-menu">
              <div className="dropdown-header">
                <span>INSTANT SEARCH RECOMMENDATIONS</span>
                <span className="count-tag">{searchResults.total} matches</span>
              </div>

              <div className="dropdown-scroll-body">
                {searchResults.total === 0 ? (
                  <div className="search-no-results">
                    <Search size={22} style={{ color: '#94A3B8' }} />
                    <p>No matching leads, flows, tasks or users found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <>
                    {/* CATEGORY 1: LEADS / CUSTOMERS */}
                    {searchResults.leads.length > 0 && (
                      <div className="search-category-section">
                        <div className="category-title">
                          <Users size={13} /> LEADS & CUSTOMERS ({searchResults.leads.length})
                        </div>
                        {searchResults.leads.map(lead => (
                          <div
                            key={lead.id}
                            onClick={() => handleSelectLead(lead)}
                            className="search-result-row"
                          >
                            <div className="row-left">
                              <span className="badge-cat badge-lead">LEAD</span>
                              <div className="info-wrap">
                                <span className="item-title">{lead.customerName || lead.contactPerson}</span>
                                <span className="item-sub">{lead.company || lead.phone || 'Client Lead'}</span>
                              </div>
                            </div>
                            <div className="row-right">
                              <span className="item-pill">{lead.leadStatus || lead.status || 'Warm'}</span>
                              <ChevronRight size={14} className="arrow-icn" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CATEGORY 2: FOLLOW-UPS (FLOW) */}
                    {searchResults.followups.length > 0 && (
                      <div className="search-category-section">
                        <div className="category-title">
                          <RefreshCw size={13} /> FOLLOW-UPS & FLOW ({searchResults.followups.length})
                        </div>
                        {searchResults.followups.map(fup => (
                          <div
                            key={fup.id}
                            onClick={() => handleSelectFollowup(fup)}
                            className="search-result-row"
                          >
                            <div className="row-left">
                              <span className="badge-cat badge-fup">FLOW</span>
                              <div className="info-wrap">
                                <span className="item-title">{fup.customerName || fup.inquiryNo}</span>
                                <span className="item-sub">{fup.notes || fup.followupType || 'Follow-up interaction'}</span>
                              </div>
                            </div>
                            <div className="row-right">
                              <span className="item-pill fup-pill">{fup.status || 'Pending'}</span>
                              <ChevronRight size={14} className="arrow-icn" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CATEGORY 3: TASKS */}
                    {searchResults.tasks.length > 0 && (
                      <div className="search-category-section">
                        <div className="category-title">
                          <CheckSquare size={13} /> TASKS ({searchResults.tasks.length})
                        </div>
                        {searchResults.tasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => handleSelectTask(task)}
                            className="search-result-row"
                          >
                            <div className="row-left">
                              <span className="badge-cat badge-task">TASK</span>
                              <div className="info-wrap">
                                <span className="item-title">{task.title}</span>
                                <span className="item-sub">Assigned to: {task.assignedTo || 'Staff'}</span>
                              </div>
                            </div>
                            <div className="row-right">
                              <span className="item-pill task-pill">{task.status || 'To Do'}</span>
                              <ChevronRight size={14} className="arrow-icn" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CATEGORY 4: USERS / STAFF */}
                    {searchResults.users.length > 0 && (
                      <div className="search-category-section">
                        <div className="category-title">
                          <User size={13} /> SYSTEM USERS & STAFF ({searchResults.users.length})
                        </div>
                        {searchResults.users.map(u => (
                          <div
                            key={u._id || u.id}
                            onClick={() => handleSelectUser(u)}
                            className="search-result-row"
                          >
                            <div className="row-left">
                              <span className="badge-cat badge-user">USER</span>
                              <div className="info-wrap">
                                <span className="item-title">{u.name}</span>
                                <span className="item-sub">{u.email}</span>
                              </div>
                            </div>
                            <div className="row-right">
                              <span className="item-pill user-pill">{u.role?.name || u.role || 'Staff'}</span>
                              <ChevronRight size={14} className="arrow-icn" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🔔 ACTION NOTIFICATION SYSTEM POPOVER */}
        <div className="notif-container" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsOpen(false);
              setRefreshTrigger(prev => prev + 1);
            }}
            className={`icon-btn ${isNotifOpen ? 'active' : ''}`}
            title="System Action Notifications"
          >
            <Bell size={18} className="bell-icon" />
            {unreadCount > 0 && (
              <span className="notif-badge-count">{unreadCount}</span>
            )}
          </button>

          {/* NOTIFICATION POPOVER MENU */}
          {isNotifOpen && (
            <div className="notif-dropdown-popover">
              <div className="notif-header">
                <div className="notif-header-left">
                  <Bell size={16} className="notif-header-icn" />
                  <span className="notif-header-title">ACTION NOTIFICATIONS</span>
                  {unreadCount > 0 && (
                    <span className="unread-pill-tag">{unreadCount} UNREAD</span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="btn-mark-all-read" title="Mark all notifications as read">
                    <CheckCircle2 size={13} /> Mark All Read
                  </button>
                )}
              </div>

              {/* NOTIFICATION FILTER TABS */}
              <div className="notif-tabs-bar">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`notif-tab-btn ${notifFilter === 'all' ? 'active' : ''}`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('flow')}
                  className={`notif-tab-btn ${notifFilter === 'flow' ? 'active' : ''}`}
                >
                  Flows
                </button>
                <button
                  onClick={() => setNotifFilter('task')}
                  className={`notif-tab-btn ${notifFilter === 'task' ? 'active' : ''}`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setNotifFilter('lead')}
                  className={`notif-tab-btn ${notifFilter === 'lead' ? 'active' : ''}`}
                >
                  Leads
                </button>
              </div>

              {/* NOTIFICATION LIST */}
              <div className="notif-scroll-list">
                {filteredNotifs.length === 0 ? (
                  <div className="notif-empty-state">
                    <CheckCircle2 size={32} style={{ color: '#10B981' }} />
                    <p className="empty-txt">All Caught Up!</p>
                    <span className="empty-sub">No pending flow, task or lead action notifications right now.</span>
                  </div>
                ) : (
                  filteredNotifs.map(notif => {
                    const isRead = readNotifIds.has(notif.id);

                    return (
                      <div
                        key={notif.id}
                        onClick={(e) => handleNotificationAction(notif, e)}
                        className={`notif-item-card ${isRead ? 'read' : 'unread'} ${notif.isUrgent ? 'urgent' : ''}`}
                      >
                        <div className="notif-card-left">
                          <div className={`notif-type-circle ${notif.type}`}>
                            {notif.type === 'flow' && <RefreshCw size={15} />}
                            {notif.type === 'task' && <CheckSquare size={15} />}
                            {notif.type === 'lead' && <Users size={15} />}
                          </div>

                          <div className="notif-content-box">
                            <div className="notif-top-row">
                              <span className={`notif-cat-badge ${notif.type}`}>
                                {notif.categoryName}
                              </span>
                              <span className="notif-time">{notif.time}</span>
                            </div>

                            <h4 className="notif-item-title">{notif.title}</h4>
                            <p className="notif-item-desc">{notif.desc}</p>
                          </div>
                        </div>

                        <div className="notif-card-right">
                          <button
                            onClick={(e) => handleNotificationAction(notif, e)}
                            className="btn-notif-action"
                          >
                            <span>{notif.actionText}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* GOD-LEVEL ANIMATED DARK MODE TOGGLE BUTTON */}
        <button
          onClick={toggleTheme}
          className={`header-theme-toggle-btn ${theme}`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme Mode"
        >
          <div className="theme-toggle-inner">
            {theme === 'dark' ? (
              <Sun size={17} className="theme-icon sun-icon" />
            ) : (
              <Moon size={17} className="theme-icon moon-icon" />
            )}
            <span className="theme-mode-text">{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
          </div>
        </button>

        {user && (
          <div className="role-pill" title={`Logged in as ${user.name || 'User'} (${user.role?.name || user.role || 'Super Admin'})`}>
            <div className="avatar-icon-box">
              <ShieldCheck size={16} className="avatar-shield-icn" />
              <span className="online-status-dot" title="Active Executive Session" />
            </div>
            <div className="role-info-stack">
              <span className="user-role-title">{user.role?.name || user.role || 'Super Admin'}</span>
              <span className="user-email-sub">{user.name || user.email || 'Executive Portal'}</span>
            </div>
          </div>
        )}
      </div>

      {/* SYNTHESIZED 1-MIN ENTRANCE MUSIC PLAYER */}
      <EntranceMusicPlayer user={user} />
    </header>
  </div>
  </>
  );
}

export default React.memo(Header);
