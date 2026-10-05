'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Sidebar.css';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  PhoneCall,
  CheckSquare,
  Wallet,
  UserCheck,
  Key,
  Settings,
  LogOut,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Activity,
  Megaphone
} from 'lucide-react';

function Sidebar() {
  const pathname = usePathname();
  const { user, logout, can, sidebarCollapsed, toggleSidebar } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  // 8 Authentic CRM Modules mapped directly to Matrix permissions
  const navItems = [
    {
      label: 'Dashboard Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: can('dashboard:view')
    },
    {
      label: 'Customer Directory',
      href: '/customers',
      icon: Users,
      show: can('customers:view')
    },
    
    {
      label: 'Customer Follow-Ups',
      href: '/followups',
      icon: PhoneCall,
      show: can('followups:view')
    },

    {
      label: 'To-Do & Tasks',
      href: '/tasks',
      icon: CheckSquare,
      show: can('tasks:view')
    },
     {
      label: 'Customer Ledger (Khata)',
      href: '/ledger',
      icon: Wallet,
      show: can('ledger:view')
    },
    {
      label: 'Team Activity Logs',
      href: '/activity-logs',
      icon: Activity,
      show: can('activity_logs:view') || can('users:view') || user?.role?.name === 'Super Admin'
    },
    {
      label: 'Announcements & News',
      href: '/announcements',
      icon: Megaphone,
      show: can('announcements:view') || can('dashboard:view')
    },
    {
      label: 'User Management',
      href: '/users',
      icon: UserCheck,
      show: can('users:view') || user?.role?.name === 'Super Admin'
    },
    {
      label: 'Roles & Privileges',
      href: '/roles',
      icon: Key,
      show: can('roles:view') || user?.role?.name === 'Super Admin'
    },
    {
      label: 'All Customers',
      href: '/all-customers',
      icon: ShieldCheck,
      show: can('all_customers:view') || can('customers:view')
    },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <aside className={`crm-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        {/* Collapsed: only small icon. Expanded: only full logo */}
        {sidebarCollapsed ? (
          <div className="brand-logo" onClick={toggleSidebar} title="Click to Toggle Sidebar">
            <img
              src="/logo/download.png"
              alt="Sanmora CRM Logo"
              style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        ) : (
          <div className="brand-text" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={toggleSidebar}>
            <img
              src="/logo/download.png"
              alt="Sanmora CRM"
              style={{ height: '120px', maxWidth: '180px', objectFit: 'contain', borderRadius: '6px' }}
            />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="collapse-toggle-btn"
          title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse to Mini Icon Mode'}
        >
          {sidebarCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
        </button>
      </div>

      <div className="sidebar-nav-container">
        {!sidebarCollapsed && (
          <div className="nav-section-label">AUTHORIZED MODULES ({visibleItems.length})</div>
        )}
        {visibleItems.length === 0 ? (
          <div className="no-access-msg">No access</div>
        ) : (
          visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname === '/leads' && item.href === '/customers');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="sidebar-icon-box">
                  <Icon size={18} />
                </div>
                {!sidebarCollapsed && <span className="link-label">{item.label}</span>}
                {!sidebarCollapsed && isActive && <ChevronRight size={15} className="sidebar-arrow" />}
              </Link>
            );
          })
        )}
      </div>

      {/* SIDEBAR THEME MODE TOGGLE BUTTON */}
      <div className="sidebar-theme-wrapper">
        <button
          onClick={toggleTheme}
          className={`sidebar-theme-btn ${theme}`}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          <div className="sidebar-theme-icon-box">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </div>
          {!sidebarCollapsed && (
            <span className="sidebar-theme-label">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          )}
          {!sidebarCollapsed && (
            <span className={`theme-pill-tag ${theme}`}>
              {theme === 'dark' ? 'ON' : 'OFF'}
            </span>
          )}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar" title={user.name}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        {!sidebarCollapsed && (
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role?.name || 'Employee'}</div>
          </div>
        )}
        <button onClick={logout} className="logout-btn" title="Logout Account">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default React.memo(Sidebar);
