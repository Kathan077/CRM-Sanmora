'use client';

import React, { useState, useMemo } from 'react';
import './EnterpriseDashboard.css';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  PhoneCall, CheckCircle2, User, History, Phone, Sparkles, AlertCircle,
  CheckSquare, ListTodo, Pencil, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import ManageFollowUpModal from '../customers/ManageFollowUpModal';

function CrmCalendarWidget({
  followups = [],
  tasks = [],
  employees = [],
  currentUser = null,
  onSelectDate,
  onOpenTimeline,
  onEditTask,
  onToggleTask
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [feedFilter, setFeedFilter] = useState('all'); // 'all' | 'followup' | 'task'
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  const toggleNoteExpand = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const now = useMemo(() => new Date(), []);
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  };

  // Map events (followups + tasks) by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map();
    if ((!followups || followups.length === 0) && (!tasks || tasks.length === 0)) {
      return map;
    }

    const formatDateStr = (dateVal) => {
      if (!dateVal) return null;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    };

    // 1. Process Follow-ups
    followups.forEach((f, idx) => {
      const dateKey = f.nextFollowupDate || formatDateStr(f.followupDate) || formatDateStr(f.createdAt);
      if (dateKey) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push({
          id: f.id || f._id || `fup-${idx}`,
          customerName: f.customerName || f.clientName || f.name || f.leadName || 'Client Follow-up',
          phone: f.phone || f.mobile || f.contactNumber || '',
          exec: f.assignedToName || f.execName || f.handler || f.assignedTo || 'Sanmora Admin',
          title: f.title || f.subject || f.notes || 'Follow-up Interaction',
          time: f.preferredTime || f.time || '10:30 AM',
          type: f.activityType || f.type || 'Telephonic',
          notes: f.notes || f.remarks || f.description || '',
          status: f.status || 'Active',
          itemCategory: 'followup',
          isTask: false,
          rawItem: f
        });
      }
    });

    // 2. Process Daily To-Do Tasks
    tasks.forEach((t, idx) => {
      const dateKey = t.dueDate || formatDateStr(t.createdAt);
      if (dateKey) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        const rawPhone = t.phone && t.phone !== '3333333333' ? t.phone : '';
        map.get(dateKey).push({
          id: t.id || t._id || `task-${idx}`,
          customerName: t.title || t.taskName || 'CRM To-Do Task',
          phone: rawPhone,
          exec: t.assignedTo || t.assignedToName || t.execName || 'Sanmora Admin',
          title: t.title || 'Task Activity',
          time: t.dueTime || t.time || '12:00 PM',
          type: 'To-Do Task',
          category: t.category || 'General Task',
          priority: t.priority || 'Hot',
          notes: t.description || t.notes || '',
          status: t.status || 'To Do',
          itemCategory: 'task',
          isTask: true,
          rawItem: t
        });
      }
    });

    return map;
  }, [followups, tasks]);

  // Current selected date string
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayEventsRaw = eventsByDate.get(selectedDateStr) || [];

  // Filter day events based on selected filter tab
  const dayEvents = useMemo(() => {
    if (feedFilter === 'followup') return dayEventsRaw.filter(item => item.itemCategory === 'followup');
    if (feedFilter === 'task') return dayEventsRaw.filter(item => item.itemCategory === 'task');
    return dayEventsRaw;
  }, [dayEventsRaw, feedFilter]);

  const countFollowups = useMemo(() => dayEventsRaw.filter(item => item.itemCategory === 'followup').length, [dayEventsRaw]);
  const countTasks = useMemo(() => dayEventsRaw.filter(item => item.itemCategory === 'task').length, [dayEventsRaw]);

  // Formatted date string for header: e.g. "Thu, 3 Sep, 2026"
  const selectedDateObj = new Date(year, month, selectedDay);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="crm-calendar-reference-layout">
      {/* ── LEFT COLUMN: COMPACT CALENDAR CARD ── */}
      <div className="cal-ref-card">
        {/* Blue/Purple Gradient Header Banner */}
        <div className="cal-ref-header">
          <button onClick={handlePrevMonth} className="cal-ref-nav-btn" title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <div className="cal-ref-month-title">
            {monthNames[month]} {year}
          </div>
          <button onClick={handleNextMonth} className="cal-ref-nav-btn" title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* White Days Body Grid */}
        <div className="cal-ref-body">
          {/* Weekday Row (S M T W T F S) */}
          <div className="cal-ref-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="cal-ref-wd">{d}</span>
            ))}
          </div>

          {/* Days Numbers Grid */}
          <div className="cal-ref-days-grid">
            {/* Empty offset slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="cal-ref-cell empty" />
            ))}

            {/* Day slots */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const eventsForDay = eventsByDate.get(dateStr) || [];
              const hasFollowup = eventsForDay.some(e => e.itemCategory === 'followup');
              const hasTask = eventsForDay.some(e => e.itemCategory === 'task');
              const hasEvents = eventsForDay.length > 0;
              const isSelected = dayNum === selectedDay;
              const isToday = year === todayYear && month === todayMonth && dayNum === todayDay;

              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    setSelectedDay(dayNum);
                    if (onSelectDate) onSelectDate(dateStr);
                  }}
                  className={`cal-ref-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
                  title={`${monthNames[month]} ${dayNum}, ${year}${hasEvents ? ` (${eventsForDay.length} items)` : ''}`}
                >
                  <span className="cal-num">{dayNum}</span>
                  {!isSelected && hasEvents && (
                    <div className="cal-dots-container">
                      {hasFollowup && <span className="cal-dot-indicator fup" title="Follow-up scheduled" />}
                      {hasTask && <span className="cal-dot-indicator task" title="To-Do Task scheduled" />}
                    </div>
                  )}
                  {isSelected && <span className="cal-selected-white-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="cal-ref-footer">
          <span className="cal-leg-item">
            <span className="cal-leg-dot fup" /> Follow-Up
          </span>
          <span className="cal-leg-item">
            <span className="cal-leg-dot task" /> Daily To-Do
          </span>
          <span className="cal-leg-item">
            <span className="cal-leg-dot outline" /> Today
          </span>
        </div>
      </div>

      {/* ── RIGHT COLUMN: SELECTED DATE & DETAILED TASKS / AGENDA FEED ── */}
      <div className="cal-ref-feed-section">
        {/* Selected Date Header Card */}
        <div className="cal-feed-header-card">
          <div>
            <span className="cal-fh-subtitle">SELECTED DATE SCHEDULE</span>
            <h3 className="cal-fh-title">{formattedSelectedDate}</h3>
          </div>

          <div className="cal-fh-right-wrap">
            {/* Category Filter Tabs */}
            <div className="cal-feed-filter-tabs">
              <button
                type="button"
                className={`cal-feed-tab-btn ${feedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setFeedFilter('all')}
              >
                All ({dayEventsRaw.length})
              </button>
              <button
                type="button"
                className={`cal-feed-tab-btn fup ${feedFilter === 'followup' ? 'active' : ''}`}
                onClick={() => setFeedFilter('followup')}
              >
                Follow-ups ({countFollowups})
              </button>
              <button
                type="button"
                className={`cal-feed-tab-btn task ${feedFilter === 'task' ? 'active' : ''}`}
                onClick={() => setFeedFilter('task')}
              >
                To-Dos ({countTasks})
              </button>
            </div>
          </div>
        </div>

        {/* List of Tasks / Followups */}
        <div className="cal-feed-cards-list">
          {dayEvents.length > 0 ? (
            dayEvents.map(item => {
              const isTask = item.isTask;

              return (
                <div key={item.id} className={`cal-feed-item-card ${isTask ? 'task-card' : 'followup-card'}`}>
                  {/* Top Row: Type Pill + Status Badge */}
                  <div className="cfi-top-row">
                    <span className={`cfi-type-pill ${isTask ? 'task' : 'followup'}`}>
                      {isTask ? (
                        <>
                          <CheckSquare size={14} className="cfi-pill-icon task" />
                          <span>Task ({item.category})</span>
                        </>
                      ) : (
                        <>
                          <PhoneCall size={14} className="cfi-pill-icon followup" />
                          <span>Follow-up ({item.type})</span>
                        </>
                      )}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isTask && item.priority && (
                        <span className={`prio-pill-sm ${item.priority.toLowerCase()}`}>
                          {item.priority} Priority
                        </span>
                      )}
                      <span className={`cfi-status-badge ${
                        item.status.toLowerCase().includes('completed') ? 'completed' :
                        item.status.toLowerCase().includes('active') ? 'active' :
                        item.status.toLowerCase().includes('to do') || item.status.toLowerCase().includes('pending') ? 'todo' : 'nofup'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer / Task Title */}
                  <h4 className="cfi-title">{item.customerName}</h4>

                  {/* Details Sub-row */}
                  <div className="cfi-details-row">
                    {isTask ? (
                      <>
                        <span className="cfi-det-time"><Clock size={13} /> {item.time}</span>
                        <span className="cfi-det-sep">|</span>
                        <span className="cfi-det-exec"><User size={13} /> Assigned: {item.exec}</span>
                        {item.phone && (
                          <>
                            <span className="cfi-det-sep">|</span>
                            <span className="cfi-det-phone"><Phone size={13} /> {item.phone}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="cfi-det-phone"><Phone size={13} /> {item.phone || 'No Contact'}</span>
                        <span className="cfi-det-sep">|</span>
                        <span className="cfi-det-exec"><User size={13} /> Exec: {item.exec}</span>
                      </>
                    )}
                  </div>

                  {/* Notes Quote Box if present */}
                  {item.notes && (
                    <div className="cfi-notes-quote">
                      {item.notes.length > 140 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>“{expandedNotes[item.id] ? item.notes : `${item.notes.slice(0, 140)}...`}”</span>
                          <button
                            type="button"
                            className="btn-cfi-note-toggle"
                            onClick={() => toggleNoteExpand(item.id)}
                          >
                            {expandedNotes[item.id] ? (
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
                        <span>“{item.notes}”</span>
                      )}
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="cfi-action-row">
                    {isTask ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="cfi-task-action-btn edit"
                          onClick={() => {
                            if (onEditTask) {
                              onEditTask(item.rawItem);
                            }
                          }}
                        >
                          <Pencil size={13} />
                          <span>Edit Task Details</span>
                        </button>
                        <button
                          type="button"
                          className={`cfi-task-action-btn toggle ${item.status === 'Completed' ? 'done' : ''}`}
                          onClick={() => {
                            if (onToggleTask) {
                              onToggleTask(item.rawItem);
                            }
                          }}
                        >
                          <Check size={13} />
                          <span>{item.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="cfi-timeline-btn"
                        onClick={() => {
                          const targetObj = item.rawItem || {
                            customerName: item.customerName,
                            phone: item.phone,
                            assignedToName: item.exec,
                            notes: item.notes,
                            status: item.status,
                            activityType: item.type
                          };
                          if (onOpenTimeline) {
                            onOpenTimeline(targetObj);
                          } else {
                            setSelectedTimelineItem(targetObj);
                            setShowTimelineModal(true);
                          }
                        }}
                      >
                        <History size={14} />
                        <span>Log Discussion / History</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="cal-feed-empty-card">
              <CalendarIcon size={38} className="cf-empty-icon" />
              <h4>No Activity Scheduled</h4>
              <p>No follow-ups or tasks logged for {formattedSelectedDate}{feedFilter !== 'all' ? ` in category "${feedFilter}"` : ''}. Select a highlighted date on the calendar to view its schedule.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── DEDICATED TIMELINE HISTORY & FOLLOWUP MODAL ── */}
      {showTimelineModal && (
        <ManageFollowUpModal
          isOpen={showTimelineModal}
          onClose={() => {
            setShowTimelineModal(false);
            setSelectedTimelineItem(null);
          }}
          customer={selectedTimelineItem}
          followup={selectedTimelineItem}
          employees={employees}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default React.memo(CrmCalendarWidget);

