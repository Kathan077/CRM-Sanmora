/**
 * System Permissions Definition
 * 8 Authentic CRM Modules with Granular View, Add, Edit, Delete Privileges.
 */

const CRM_MODULES = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    subtitle: 'Command center & sales metrics overview',
    icon: 'LayoutDashboard'
  },
  {
    id: 'customers',
    name: 'Customer Directory',
    subtitle: 'Customer profiles, contacts & history',
    icon: 'Users'
  },
  {
    id: 'all_customers',
    name: 'All Customers Confidential',
    subtitle: 'Master confidential customers database',
    icon: 'ShieldCheck'
  },
  {
    id: 'followups',
    name: 'Customer Follow-Ups',
    subtitle: 'Sales pipeline & follow-up tracking',
    icon: 'PhoneCall'
  },
  {
    id: 'tasks',
    name: 'To-Do & Tasks',
    subtitle: 'Daily task checklists & team to-dos',
    icon: 'CheckSquare'
  },
  {
    id: 'ledger',
    name: 'Customer Ledger (Khata)',
    subtitle: 'Financial transactions & customer balances',
    icon: 'Wallet'
  },
  {
    id: 'activity_logs',
    name: 'Team Activity Logs',
    subtitle: 'Activity logs, leaderboard & calendar',
    icon: 'Activity'
  },
  {
    id: 'announcements',
    name: 'Announcements & News',
    subtitle: 'Company-wide announcements & broadcasts',
    icon: 'Megaphone'
  },
  {
    id: 'users',
    name: 'User Management',
    subtitle: 'Employee profiles & staff management',
    icon: 'UserCheck'
  },
  {
    id: 'roles',
    name: 'Roles & Privileges',
    subtitle: 'Granular role & permission matrix',
    icon: 'Key'
  },
  {
    id: 'settings',
    name: 'System Settings',
    subtitle: 'System configuration',
    icon: 'Settings'
  }
];

const ACTIONS = ['view', 'add', 'edit', 'delete'];

// Generate dynamic permission matrix keys for 8 modules x 4 actions = 32 permissions
const SYSTEM_PERMISSIONS = {};
const MATRIX_PERMISSIONS = [];

CRM_MODULES.forEach(mod => {
  ACTIONS.forEach(act => {
    const key = `${mod.id}:${act}`;
    const constKey = `${mod.id.toUpperCase()}_${act.toUpperCase()}`;
    SYSTEM_PERMISSIONS[constKey] = key;
    MATRIX_PERMISSIONS.push(key);
  });
});

// Backwards compatibility legacy keys
SYSTEM_PERMISSIONS.USERS_VIEW = 'users:view';
SYSTEM_PERMISSIONS.USERS_CREATE = 'users:add';
SYSTEM_PERMISSIONS.USERS_UPDATE = 'users:edit';
SYSTEM_PERMISSIONS.USERS_DELETE = 'users:delete';
SYSTEM_PERMISSIONS.USERS_TOGGLE_STATUS = 'users:edit';

SYSTEM_PERMISSIONS.ROLES_VIEW = 'roles:view';
SYSTEM_PERMISSIONS.ROLES_CREATE = 'roles:add';
SYSTEM_PERMISSIONS.ROLES_UPDATE = 'roles:edit';
SYSTEM_PERMISSIONS.ROLES_DELETE = 'roles:delete';

SYSTEM_PERMISSIONS.LEADS_VIEW_ALL = 'customers:view';
SYSTEM_PERMISSIONS.LEADS_VIEW_ASSIGNED = 'customers:view';
SYSTEM_PERMISSIONS.LEADS_CREATE = 'customers:add';
SYSTEM_PERMISSIONS.LEADS_UPDATE = 'customers:edit';
SYSTEM_PERMISSIONS.LEADS_DELETE = 'customers:delete';
SYSTEM_PERMISSIONS.LEADS_ASSIGN = 'customers:edit';
SYSTEM_PERMISSIONS.LEADS_CHANGE_STATUS = 'customers:edit';

SYSTEM_PERMISSIONS.FOLLOWUPS_VIEW = 'followups:view';
SYSTEM_PERMISSIONS.FOLLOWUPS_CREATE = 'followups:add';
SYSTEM_PERMISSIONS.FOLLOWUPS_UPDATE = 'followups:edit';

SYSTEM_PERMISSIONS.REPORTS_VIEW = 'dashboard:view';
SYSTEM_PERMISSIONS.SETTINGS_MANAGE = 'settings:edit';

const ALL_PERMISSIONS = Array.from(new Set([...MATRIX_PERMISSIONS, ...Object.values(SYSTEM_PERMISSIONS)]));

const PERMISSION_GROUPS = CRM_MODULES.map(mod => ({
  module: mod.id,
  name: mod.name,
  subtitle: mod.subtitle,
  icon: mod.icon,
  permissions: ACTIONS.map(act => ({
    action: act,
    key: `${mod.id}:${act}`,
    label: `${act.charAt(0).toUpperCase() + act.slice(1)} ${mod.name}`
  }))
}));

module.exports = {
  CRM_MODULES,
  ACTIONS,
  SYSTEM_PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSION_GROUPS
};
