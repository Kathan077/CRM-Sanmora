const Role = require('../models/Role.model');
const User = require('../models/User.model');
const { ALL_PERMISSIONS, SYSTEM_PERMISSIONS } = require('../constants/permissions');

const seedInitialData = async () => {
  try {
    console.log('[Seed] Verifying system roles & Super Admin account...');

    // 1. Seed Super Admin Role
    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'Complete unrestricted control over the CRM system',
        permissions: ALL_PERMISSIONS,
        isSystem: true
      });
      console.log('[Seed] Super Admin Role created.');
    } else {
      // Ensure Super Admin has all latest permissions
      superAdminRole.permissions = ALL_PERMISSIONS;
      await superAdminRole.save();
    }

    const LEGACY_MAP = {
      'leads:view_all': 'customers:view',
      'leads:view_assigned': 'customers:view',
      'leads:create': 'customers:add',
      'leads:update': 'customers:edit',
      'leads:delete': 'customers:delete',
      'leads:assign': 'customers:edit',
      'leads:change_status': 'customers:edit',
      'followups:create': 'followups:add',
      'followups:update': 'followups:edit',
      'users:create': 'users:add',
      'users:update': 'users:edit',
      'users:toggle_status': 'users:edit',
      'reports:view': 'dashboard:view',
      'settings:manage': 'settings:edit'
    };

    // Auto-migrate legacy role permissions
    const allRoles = await Role.find();
    for (const r of allRoles) {
      if (r.name === 'Super Admin') {
        r.permissions = ALL_PERMISSIONS;
        await r.save();
        continue;
      }
      let modified = false;
      const newPerms = (r.permissions || []).map(p => {
        if (LEGACY_MAP[p]) {
          modified = true;
          return LEGACY_MAP[p];
        }
        return p;
      });
      if (modified) {
        r.permissions = Array.from(new Set(newPerms));
        await r.save();
        console.log(`[Seed Migration] Migrated role '${r.name}' permissions to standard catalog keys.`);
      }
    }

    // 2. Seed Sales Manager Role
    let managerRole = await Role.findOne({ name: 'Sales Manager' });
    if (!managerRole) {
      await Role.create({
        name: 'Sales Manager',
        description: 'Can manage sales team, assign leads, view analytics & all company leads',
        permissions: [
          'dashboard:view', 'dashboard:edit',
          'customers:view', 'customers:add', 'customers:edit',
          'followups:view', 'followups:add', 'followups:edit',
          'tasks:view', 'tasks:add', 'tasks:edit',
          'users:view', 'roles:view'
        ],
        isSystem: true
      });
      console.log('[Seed] Sales Manager Role created.');
    }

    // 3. Seed Sales Executive Role
    let executiveRole = await Role.findOne({ name: 'Sales Executive' });
    if (!executiveRole) {
      await Role.create({
        name: 'Sales Executive',
        description: 'Can create and work on assigned leads and schedule followups',
        permissions: [
          'dashboard:view',
          'customers:view', 'customers:add', 'customers:edit',
          'followups:view', 'followups:add', 'followups:edit',
          'tasks:view', 'tasks:add', 'tasks:edit'
        ],
        isSystem: true
      });
      console.log('[Seed] Sales Executive Role created.');
    }

    // 4. Seed Support Executive Role
    let supportRole = await Role.findOne({ name: 'Support Executive' });
    if (!supportRole) {
      await Role.create({
        name: 'Support Executive',
        description: 'Handles customer support followups & query tickets',
        permissions: [
          'customers:view', 'followups:view', 'followups:add', 'tasks:view'
        ],
        isSystem: true
      });
      console.log('[Seed] Support Executive Role created.');
    }

    // 5. Seed Super Admin User Account
    const defaultAdminEmail = 'admin@sanmoracrm.com';
    let superAdminUser = await User.findOne({ email: defaultAdminEmail });

    if (!superAdminUser) {
      superAdminUser = await User.create({
        name: 'Sanmora Main Admin',
        email: defaultAdminEmail,
        password: 'Admin@123456', // Pre-hashed by mongoose pre-save hook
        role: superAdminRole._id,
        department: 'Management',
        designation: 'System Administrator',
        phone: '+91 98765 43210',
        isActive: true
      });
      console.log(`[Seed] Super Admin User created: ${defaultAdminEmail} / Admin@123456`);
    } else {
      // Ensure super admin role is linked
      superAdminUser.role = superAdminRole._id;
      superAdminUser.isActive = true;
      await superAdminUser.save({ validateBeforeSave: false });
    }

    console.log('[Seed] Initial data seeding complete!');
  } catch (error) {
    console.error('[Seed Error]:', error.message);
  }
};

module.exports = seedInitialData;
