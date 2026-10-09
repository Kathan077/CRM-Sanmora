'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import SelectWithOther from '../../components/common/SelectWithOther';
import ProFilterDropdown from '../../components/common/ProFilterDropdown';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Star,
  Sparkles,
  X,
  ChevronDown,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Clock,
  TrendingUp,
  CheckCircle2,
  Shield,
  User,
  ListTodo,
  Phone,
  Users,
  Play,
  Settings,
  Pencil,
  Flame,
  Zap,
  TrendingDown
} from 'lucide-react';
import {
  getStoredTasks,
  saveTask,
  updateTask,
  deleteTask,
  filterByRole,
  syncCrmStoreWithBackendApi
} from '../../utils/crmStore';
import './tasks.css';

const getCategorySelectIcon = (category) => {
  switch (category) {
    case 'FollowUp Call': return <Phone size={14} style={{ color: '#EC4899' }} />;
    case 'Meeting': return <Users size={14} style={{ color: '#8B5CF6' }} />;
    case 'Demo': return <Play size={14} style={{ color: '#3B82F6' }} />;
    case 'Support': return <Settings size={14} style={{ color: '#10B981' }} />;
    default: return <ListTodo size={14} style={{ color: '#64748B' }} />;
  }
};

const getPrioritySelectIcon = (priority) => {
  switch (priority) {
    case 'Hot': return <Sparkles size={14} style={{ color: '#EF4444' }} />;
    case 'Medium': return <AlertTriangle size={14} style={{ color: '#F59E0B' }} />;
    default: return <CheckSquare size={14} style={{ color: '#3B82F6' }} />;
  }
};

const DEFAULT_NEW_TASK = {
  title: '',
  category: 'FollowUp Call',
  priority: 'Hot',
  assignedToId: '',
  assignedTo: '',
  dueDate: '',
  dueTime: '12:00',
  description: '',
  checklist: []
};

export default function TasksPage() {
  const { user: currentUser, can, sidebarCollapsed } = useAuth();
  
  // Tasks list and employees list
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'today' | 'overdue' | 'upcoming' | 'todo' | 'inprogress' | 'assigned' | 'completed'

  // Modals & States
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newTask, setNewTask] = useState(DEFAULT_NEW_TASK);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [statusMenuOpenTaskId, setStatusMenuOpenTaskId] = useState(null);

  // Role details
  const roleName = currentUser?.role?.name || currentUser?.role || '';
  const isAdmin =
    roleName.toLowerCase().includes('admin') ||
    roleName === 'Super Admin' ||
    roleName === 'Admin';

  // Initialize and Sync with MongoDB Backend
  useEffect(() => {
    loadTasksFromStore(true);
    loadEmployeesList();

    // Trigger background sync with backend database
    syncCrmStoreWithBackendApi().then(() => {
      loadTasksFromStore(false);
    });

    let debounceTimer = null;
    const handleStoreUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadTasksFromStore(false);
      }, 50);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm_store_updated', handleStoreUpdate);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm_store_updated', handleStoreUpdate);
      }
    };
  }, [currentUser]);

  const loadTasksFromStore = (showLoading = false) => {
    if (showLoading) setLoading(true);
    const stored = getStoredTasks();
    setTasks(stored);
    if (showLoading) setLoading(false);
  };

  const loadEmployeesList = async () => {
    try {
      const res = await userService.getStaffDirectory();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setEmployees(res.data);
      } else if (currentUser) {
        setEmployees([currentUser]);
      }
    } catch (e) {
      if (currentUser) {
        setEmployees([currentUser]);
      }
    }
  };

  // Open create modal reset
  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setNewTask(DEFAULT_NEW_TASK);
    setSubtaskInput('');
    setShowWizardModal(true);
  };

  // Open edit modal populate
  const handleOpenEditModal = (task) => {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title || '',
      category: task.category || 'FollowUp Call',
      priority: task.priority || 'Hot',
      assignedToId: task.assignedToId || '',
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate || '',
      dueTime: task.dueTime || '12:00',
      description: task.description || '',
      checklist: task.checklist || []
    });
    setSubtaskInput('');
    setShowWizardModal(true);
  };

  // Save new or update task
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    // Find employee details if assigned
    let assignedName = currentUser?.name || currentUser?.username || 'Staff';
    let assignedId = String(currentUser?.id || currentUser?._id || '1');
    let assignedUsername = currentUser?.username || '';
    
    if (newTask.assignedToId) {
      const selectedEmp = employees.find(emp => String(emp._id || emp.id) === String(newTask.assignedToId));
      if (selectedEmp) {
        assignedName = selectedEmp.name || selectedEmp.username;
        assignedId = String(selectedEmp._id || selectedEmp.id);
        assignedUsername = selectedEmp.username || '';
      }
    }

    const payload = {
      ...newTask,
      assignedTo: assignedName,
      assignedToId: assignedId,
      assignedToUsername: assignedUsername
    };

    if (editingTaskId) {
      updateTask(editingTaskId, payload);
    } else {
      saveTask(payload, currentUser);
    }

    setShowWizardModal(false);
    setEditingTaskId(null);
    setNewTask(DEFAULT_NEW_TASK);
    setSubtaskInput('');
    loadTasksFromStore();
  };

  // Toggle status of a task
  const handleUpdateStatus = (taskId, newStatus) => {
    const isCompleted = newStatus === 'Completed';
    updateTask(taskId, { status: newStatus, completed: isCompleted });
    setStatusMenuOpenTaskId(null);
    loadTasksFromStore();
  };

  // Toggle star
  const handleToggleStar = (task) => {
    updateTask(task.id, { starred: !task.starred });
    loadTasksFromStore();
  };

  // Delete task
  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
      loadTasksFromStore();
    }
  };

  // Toggle checklist subtask checkbox
  const handleToggleSubtask = (task, subtaskId) => {
    const updatedChecklist = (task.checklist || []).map(item =>
      item.id === subtaskId ? { ...item, completed: !item.completed } : item
    );
    // If all checked, do we mark task as Completed? Or let status stand.
    updateTask(task.id, { checklist: updatedChecklist });
    loadTasksFromStore();
  };

  // Checklist helper inside Create Wizard
  const handleAddSubtaskToWizard = () => {
    if (!subtaskInput.trim()) return;
    const subItem = {
      id: `sub-${Date.now()}`,
      text: subtaskInput.trim(),
      completed: false
    };
    setNewTask({
      ...newTask,
      checklist: [...(newTask.checklist || []), subItem]
    });
    setSubtaskInput('');
  };

  const handleRemoveSubtaskFromWizard = (subId) => {
    setNewTask({
      ...newTask,
      checklist: (newTask.checklist || []).filter(item => item.id !== subId)
    });
  };

  // Filter Tasks list based on current user role access & team hierarchy
  const roleFilteredTasks = filterByRole(tasks, currentUser, employees);

  // Filter further by admin staff dropdown selection
  const staffFilteredTasks = roleFilteredTasks.filter(t => {
    if (!isAdmin) return true; // Non-admin gets role-filtered only
    if (!selectedEmployeeFilter) return true;
    return String(t.assignedToId) === String(selectedEmployeeFilter);
  });

  // Calculate Metrics based on role and employee filters
  const metricsTasks = staffFilteredTasks;
  const totalCount = metricsTasks.length;
  const pendingCount = metricsTasks.filter(t => t.status === 'To Do').length;
  const inProgressCount = metricsTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = metricsTasks.filter(t => t.status === 'Completed').length;
  
  // Calculate completion percentage rate
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Tab Counter Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  
  const tabCounts = {
    active: metricsTasks.filter(t => t.status === 'To Do' || t.status === 'In Progress').length,
    today: metricsTasks.filter(t => t.dueDate === todayStr && t.status !== 'Completed').length,
    overdue: metricsTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Completed').length,
    upcoming: metricsTasks.filter(t => t.dueDate && t.dueDate > todayStr && t.status !== 'Completed').length,
    todo: metricsTasks.filter(t => t.status === 'To Do').length,
    inprogress: metricsTasks.filter(t => t.status === 'In Progress').length,
    assigned: metricsTasks.filter(t => String(t.assignedToId) === String(currentUser?.id || currentUser?._id)).length,
    completed: metricsTasks.filter(t => t.status === 'Completed').length
  };

  // Filter list by Tab Switcher selection
  const tabFilteredTasks = metricsTasks.filter(t => {
    switch (activeTab) {
      case 'active':
        return t.status === 'To Do' || t.status === 'In Progress';
      case 'today':
        return t.dueDate === todayStr && t.status !== 'Completed';
      case 'overdue':
        return t.dueDate && t.dueDate < todayStr && t.status !== 'Completed';
      case 'upcoming':
        return t.dueDate && t.dueDate > todayStr && t.status !== 'Completed';
      case 'todo':
        return t.status === 'To Do';
      case 'inprogress':
        return t.status === 'In Progress';
      case 'assigned':
        return String(t.assignedToId) === String(currentUser?.id || currentUser?._id);
      case 'completed':
        return t.status === 'Completed';
      default:
        return true;
    }
  });

  // Filter list by Search Bar and Criteria Selects
  const finalFilteredTasks = tabFilteredTasks.filter(t => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase());

    const matchesPriority = !selectedPriority || t.priority === selectedPriority;
    const matchesCategory = !selectedCategory || t.category === selectedCategory;

    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Overall checklist subtask completion rate
  const totalSubtasksCount = finalFilteredTasks.reduce((acc, t) => acc + (t.checklist || []).length, 0);
  const completedSubtasksCount = finalFilteredTasks.reduce(
    (acc, t) => acc + (t.checklist || []).filter(s => s.completed).length,
    0
  );
  const overallProgressPercent =
    totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  // Helper: check if a task is overdue
  const isTaskOverdue = (task) => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    return task.dueDate < todayStr;
  };

  return (
    <div className="crm-layout">
      <Sidebar />
      <Header title="Daily Task Manager" />

      <main className={`crm-main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* HERO TITLE ACCENT CONTAINER */}
        <div className="tasks-hero-card">
          <div className="tasks-hero-left">
            <span className="tasks-module-badge">
              <ListTodo size={13} /> Daily Action Tracker
            </span>
            <h2 className="tasks-hero-title">To-Do & Daily Task Control Center</h2>
            <p className="tasks-hero-sub">
              Execute team assignments, track checklist progress, set due dates & manage priority action items. 
              {overallProgressPercent > 0 && ` • Overall Progress: ${overallProgressPercent}%`}
            </p>
          </div>

          {can('tasks:add') && (
            <button onClick={handleOpenCreateModal} className="tasks-btn-primary">
              <Plus size={16} /> <span>Create New Task</span>
            </button>
          )}
        </div>

        {/* METRICS COUNT SUMMARY ROW */}
        <div className="tasks-kpi-grid">
          <div className="tasks-kpi-card tasks-kpi-purple">
            <div className="tasks-kpi-info">
              <span className="tasks-kpi-title">Total Tasks</span>
              <span className="tasks-kpi-val">{totalCount}</span>
              <span className="tasks-kpi-sub">
                {tabCounts.assigned} Assigned to You
              </span>
            </div>
            <div className="tasks-kpi-icon">
              <CheckSquare size={20} />
            </div>
          </div>

          <div className="tasks-kpi-card tasks-kpi-yellow">
            <div className="tasks-kpi-info">
              <span className="tasks-kpi-title">Pending (To Do)</span>
              <span className="tasks-kpi-val">{pendingCount}</span>
              <span className="tasks-kpi-sub">Awaiting execution</span>
            </div>
            <div className="tasks-kpi-icon">
              <Clock size={20} />
            </div>
          </div>

          <div className="tasks-kpi-card tasks-kpi-blue">
            <div className="tasks-kpi-info">
              <span className="tasks-kpi-title">In Progress</span>
              <span className="tasks-kpi-val">{inProgressCount}</span>
              <span className="tasks-kpi-sub">Active execution</span>
            </div>
            <div className="tasks-kpi-icon">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="tasks-kpi-card tasks-kpi-green">
            <div className="tasks-kpi-info">
              <span className="tasks-kpi-title">Completed Tasks</span>
              <span className="tasks-kpi-val">{completedCount}</span>
              <span className="tasks-kpi-sub">{completionRate}% Completion Rate</span>
            </div>
            <div className="tasks-kpi-icon">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* STAFF FILTERING ROW (ADMINS ONLY) */}
        {isAdmin && (
          <div className="tasks-dist-card">
            <div className="tasks-dist-left">
              <div className="tasks-dist-icon">
                <User size={18} />
              </div>
              <div>
                <h4 className="tasks-dist-title">EMPLOYEE TASK DISTRIBUTION</h4>
                <p className="tasks-dist-desc">Select staff member from pro dropdown to filter assigned workload</p>
              </div>
            </div>

            <div className="tasks-dist-filter">
              <ProFilterDropdown
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                options={[
                  { value: '', label: `Filter Staff... (${totalCount} tasks)`, icon: <User size={14} /> },
                  ...employees.map((emp) => {
                    const empTasks = roleFilteredTasks.filter(t => String(t.assignedToId) === String(emp._id));
                    const isYou = String(emp._id || emp.id) === String(currentUser?.id || currentUser?._id);
                    const name = emp.name || emp.username;
                    return {
                      value: emp._id,
                      label: `${name}${isYou ? ' (You)' : ''} (${empTasks.length} tasks)`,
                      icon: <User size={14} />
                    };
                  })
                ]}
                iconLeft={<Filter size={14} />}
              />
            </div>
          </div>
        )}

        {/* CONTROLS BAR: SEGMENTED SWITCHER, SEARCH, SELECTS */}
        <div className="tasks-control-bar">
          <div className="tasks-tabs-row">
            
            {/* SEGMENTED TAB SWITCHER */}
            <div className="tasks-tabs-list">
              <button
                className={`tasks-tab-pill ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                <span>Active To-Do</span>
                <span className="tasks-tab-count">{tabCounts.active}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => setActiveTab('today')}
              >
                <span>Today Due</span>
                <span className="tasks-tab-count">{tabCounts.today}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => setActiveTab('overdue')}
              >
                <span>Missed / Overdue</span>
                <span className="tasks-tab-count">{tabCounts.overdue}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <span>Future Upcoming</span>
                <span className="tasks-tab-count">{tabCounts.upcoming}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'todo' ? 'active' : ''}`}
                onClick={() => setActiveTab('todo')}
              >
                <span>To Do</span>
                <span className="tasks-tab-count">{tabCounts.todo}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'inprogress' ? 'active' : ''}`}
                onClick={() => setActiveTab('inprogress')}
              >
                <span>In Progress</span>
                <span className="tasks-tab-count">{tabCounts.inprogress}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'assigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('assigned')}
              >
                <span>Assigned to Me</span>
                <span className="tasks-tab-count">{tabCounts.assigned}</span>
              </button>

              <button
                className={`tasks-tab-pill ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                <span>Completed History</span>
                <span className="tasks-tab-count">{tabCounts.completed}</span>
              </button>
            </div>
          </div>

          <div className="tasks-filter-row">
            {/* SEARCH TEXTBAR */}
            <div className="tasks-search-wrap">
              <Search size={16} className="tasks-search-icon" />
              <input
                type="text"
                placeholder="Search tasks by title, description, category or staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="tasks-search-input"
              />
            </div>

            {/* PRIORITY CRITERIA DROPDOWN */}
            <ProFilterDropdown
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              options={[
                { value: '', label: 'All Priorities', icon: <AlertTriangle size={14} /> },
                { value: 'Hot', label: 'Hot Priority', icon: <Flame size={14} /> },
                { value: 'Medium', label: 'Medium Priority', icon: <Zap size={14} /> },
                { value: 'Low', label: 'Low Priority', icon: <Clock size={14} /> },
              ]}
              iconLeft={<AlertTriangle size={14} />}
            />

            {/* CATEGORY / MODULES DROPDOWN */}
            <ProFilterDropdown
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: '', label: 'All Modules', icon: <Filter size={14} /> },
                { value: 'FollowUp Call', label: 'FollowUp Call', icon: <Phone size={14} /> },
                { value: 'Meeting', label: 'Meeting', icon: <Calendar size={14} /> },
                { value: 'Demo', label: 'Demo', icon: <Sparkles size={14} /> },
                { value: 'Support', label: 'Support', icon: <CheckSquare size={14} /> },
                { value: 'General', label: 'General', icon: <ListTodo size={14} /> },
              ]}
              iconLeft={<Filter size={14} />}
            />
          </div>
        </div>

        {/* LIST RENDER STREAM */}
        <div className="tasks-stream">
          {loading ? (
            <div className="tasks-empty-panel">
              <Sparkles size={28} className="tasks-empty-icon spin-icon" />
              <h4>Loading checklist workload...</h4>
              <p>Fetching active staff tasks from local storage</p>
            </div>
          ) : finalFilteredTasks.length === 0 ? (
            <div className="tasks-empty-panel">
              <CheckSquare size={36} className="tasks-empty-icon" />
              <h4>No checklist tasks found</h4>
              <p>Try switching filter parameters or create a new team assignment task above!</p>
            </div>
          ) : (
            finalFilteredTasks.map((t) => {
              // Calculate checklist metrics for this task
              const currentChecklist = t.checklist || t.subtasks || [];
              const subTasksCount = currentChecklist.length;
              const subCompleted = currentChecklist.filter(s => s.completed).length;
              const subPercent = subTasksCount > 0 ? Math.round((subCompleted / subTasksCount) * 100) : (t.status === 'Completed' ? 100 : 0);
              const overdue = isTaskOverdue(t);

              // Initials for avatar
              const initials = t.assignedTo
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

              return (
                <div
                  key={t.id}
                  className={`tasks-card-pro ${
                    t.status === 'Completed' ? 'completed-task-style' : ''
                  }`}
                >
                  {/* Inner padded content */}
                  <div className="tasks-card-inner">

                    {/* Title row: title + staff avatar */}
                    <div className="tasks-card-title-row">
                      <div className="tasks-title-left-wrap">
                        <div className="tasks-title-icon-badge">
                          <CheckSquare size={15} />
                        </div>
                        <h3
                          className={`tasks-title-text ${t.status === 'Completed' ? 'completed-title' : ''}`}
                        >
                          {t.title}
                        </h3>
                      </div>
                      <div className="tasks-hdr-staff-right">
                        <div className="tasks-staff-info">
                          <span className="tasks-staff-name">{t.assignedTo}</span>
                          <span className="tasks-staff-role">
                            {t.assignedToId === currentUser?.id || t.assignedToId === currentUser?._id
                              ? 'You'
                              : 'Staff'}
                          </span>
                        </div>
                        <div
                          className="tasks-staff-avatar"
                        >
                          {initials || 'EM'}
                        </div>
                      </div>
                    </div>

                    {/* Badge row: status, category, priority, overdue */}
                    <div className="tasks-card-hdr">
                      <div className="tasks-hdr-meta-left">
                        {/* Interactive Status Selector badge */}
                        <div className="tasks-status-dropdown-wrap">
                          <button
                            onClick={() =>
                              setStatusMenuOpenTaskId(statusMenuOpenTaskId === t.id ? null : t.id)
                            }
                            className={`tasks-status-select-badge ${
                              t.status === 'Completed'
                                ? 'completed'
                                : t.status === 'In Progress'
                                ? 'inprogress'
                                : 'todo'
                            }`}
                          >
                            <span>{t.status || 'To Do'}</span>
                            <ChevronDown size={11} />
                          </button>

                          {statusMenuOpenTaskId === t.id && (
                            <div className="tasks-status-dropdown-menu">
                              <div
                                onClick={() => handleUpdateStatus(t.id, 'To Do')}
                                className="tasks-status-opt"
                              >
                                To Do
                              </div>
                              <div
                                onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                                className="tasks-status-opt"
                              >
                                In Progress
                              </div>
                              <div
                                onClick={() => handleUpdateStatus(t.id, 'Completed')}
                                className="tasks-status-opt"
                              >
                                Completed
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Category */}
                        <span className="tasks-category-badge">{t.category}</span>

                        {/* Priority */}
                        <span
                          className={`tasks-priority-badge ${
                            t.priority === 'Hot' ? 'hot' : t.priority === 'Medium' ? 'medium' : 'low'
                          }`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {t.priority === 'Hot' ? <><Flame size={12} /> Hot</> : t.priority === 'Medium' ? <><Zap size={12} /> Medium</> : <><TrendingDown size={12} /> Low</>}
                        </span>

                        {/* Missed Overdue alert */}
                        {overdue && <span className="tasks-alert-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Overdue</span>}
                      </div>
                    </div>

                    {/* Task Description */}
                    {t.description && <p className="tasks-card-desc">{t.description}</p>}

                    {/* Checklist Subtasks Progress Section */}
                    {subTasksCount > 0 && (
                      <div className="tasks-checklist-progress-section">
                        <div className="tasks-progress-header-row">
                          <span>
                            Checklist Progress ({subCompleted} of {subTasksCount} items complete)
                          </span>
                          <span className="tasks-progress-percentage">{subPercent}%</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="tasks-progress-bar-bg">
                          <div
                            className="tasks-progress-bar-fill"
                            style={{ width: `${subPercent}%` }}
                          ></div>
                        </div>

                        {/* Subtask Checkboxes */}
                        <div className="tasks-checklist-checks-list">
                          {(t.checklist || t.subtasks || []).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleSubtask(t, item.id)}
                              className={`tasks-check-item ${
                                item.completed ? 'item-completed-style' : ''
                              }`}
                            >
                              <div className="tasks-custom-check-box">
                                <CheckSquare size={13} style={{ fill: 'currentColor' }} />
                              </div>
                              <span className="tasks-check-text">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer row — outside inner padding */}
                  <div className="tasks-card-footer">
                    <div
                      className={`tasks-due-badge ${overdue ? 'overdue-date-style' : ''}`}
                    >
                      <Calendar size={15} />
                      <span>
                        Due: {t.dueDate ? `${t.dueDate} (${t.dueTime || '12:00'})` : 'No Due Date'}
                      </span>
                    </div>

                    <div className="tasks-card-act-buttons">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="tasks-card-circle-btn btn-edit"
                        title="Edit Task"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Delete Button */}
                      {can('tasks:delete') && (
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="tasks-card-circle-btn btn-del"
                          title="Delete Task"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>


      {/* CREATE NEW TASK WIZARD MODAL */}
      {showWizardModal && (
        <div className="tmodal-backdrop">
          <div className="tmodal-card">
            
            {/* Modal Header */}
            <div className="tmodal-header">
              <div className="tmodal-title-left">
                <div className="tmodal-hdr-icon">
                  <Sparkles size={18} />
                </div>
                <div className="tmodal-hdr-text-wrap">
                  <h3 className="tmodal-title">
                    {editingTaskId ? 'Edit To-Do Task' : 'Add New To-Do Task'}
                  </h3>
                  <span className="tmodal-sub">
                    {editingTaskId
                      ? 'Update task requirements, checklist & assign staff'
                      : 'Create a task, checklist items & assign staff'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowWizardModal(false)}
                className="tmodal-close-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTask} className="tmodal-body">
              <div className="tmodal-form">
                
                {/* Task Title */}
                <div className="tmodal-field">
                  <label className="tmodal-label">
                    Task Title <span className="tmodal-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Call Hydro Jet Energy & Send Quotation"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="tmodal-input"
                  />
                </div>

                {/* Category, Priority, Assign Row */}
                <div className="tmodal-grid-3">
                  <div className="tmodal-field">
                    <label className="tmodal-label">Category</label>
                    <div className="tmodal-select-wrapper">
                      <div className="tmodal-select-icon-left">
                        {getCategorySelectIcon(newTask.category)}
                      </div>
                      <SelectWithOther
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                        inputClassName="tmodal-select"
                        name="category"
                      >
                        <option value="FollowUp Call">FollowUp Call</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Demo">Demo</option>
                        <option value="Support">Support</option>
                        <option value="General">General</option>
                      </SelectWithOther>
                      <ChevronDown size={14} className="tmodal-select-chevron-right" />
                    </div>
                  </div>

                  <div className="tmodal-field">
                    <label className="tmodal-label">Priority Level</label>
                    <div className="tmodal-select-wrapper">
                      <div className="tmodal-select-icon-left">
                        {getPrioritySelectIcon(newTask.priority)}
                      </div>
                      <SelectWithOther
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        inputClassName="tmodal-select"
                        name="priority"
                        showOther={false}
                      >
                        <option value="Hot">Hot</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </SelectWithOther>
                      <ChevronDown size={14} className="tmodal-select-chevron-right" />
                    </div>
                  </div>

                  <div className="tmodal-field">
                    <label className="tmodal-label">Assign Staff</label>
                    <div className="tmodal-select-wrapper">
                      <div className="tmodal-select-icon-left">
                        <User size={14} style={{ color: '#7C3AED' }} />
                      </div>
                      <select
                        value={newTask.assignedToId}
                        onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
                        className="tmodal-select"
                      >
                        <option value="">Assign to Myself</option>
                        {employees.map((emp) => {
                          const empId = String(emp._id || emp.id || '');
                          return (
                            <option key={empId} value={empId}>
                              {emp.name || emp.username} ({emp.role?.name || 'Staff'})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={14} className="tmodal-select-chevron-right" />
                    </div>
                  </div>
                </div>

                {/* Due Date & Time */}
                <div className="tmodal-grid-2">
                  <div className="tmodal-field">
                    <label className="tmodal-label">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      onClick={(e) => {
                        try { e.target.showPicker(); } catch (err) {}
                      }}
                      className="tmodal-input"
                    />
                  </div>

                  <div className="tmodal-field">
                    <label className="tmodal-label">Due Time</label>
                    <input
                      type="time"
                      value={newTask.dueTime}
                      onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                      onClick={(e) => {
                        try { e.target.showPicker(); } catch (err) {}
                      }}
                      className="tmodal-input"
                    />
                  </div>
                </div>

                {/* Description notes */}
                <div className="tmodal-field">
                  <label className="tmodal-label">Description & Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide background context or task requirements..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="tmodal-textarea"
                  ></textarea>
                </div>

              </div>

              {/* Form Actions */}
              <div className="tmodal-footer">
                <button
                  type="button"
                  onClick={() => setShowWizardModal(false)}
                  className="tmodal-btn-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="tmodal-btn-submit">
                  <Sparkles size={15} />{' '}
                  <span>{editingTaskId ? 'Update Task' : 'Create Task'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
