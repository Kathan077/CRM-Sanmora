/**
 * Role-Based Access Control (RBAC) Middleware
 */

const isAdminUser = (user) => {
  if (!user) return false;
  if (
    user.isSuperAdmin === true ||
    user.isAdmin === true ||
    user.isMainAdmin === true ||
    user.role?.isSuperAdmin === true ||
    user.role?.isAdmin === true ||
    user.role?.isMainAdmin === true
  ) {
    return true;
  }

  const username = String(user.username || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();
  const name = String(user.name || '').toLowerCase().trim();
  const uId = String(user.id || user._id || '').toLowerCase().trim();

  if (uId === 'default-admin' || uId === 'admin') return true;
  if (username === 'admin' || username === 'superadmin' || username === 'mainadmin') return true;
  if (email === 'admin@sanmoracrm.com' || email.startsWith('admin@') || email.startsWith('superadmin@') || email.startsWith('mainadmin@')) return true;
  if (name === 'admin' || name === 'sanmora main admin' || name === 'main admin' || name === 'super admin') return true;

  const ADMIN_ROLES = new Set([
    'super admin', 'superadmin', 'main admin', 'mainadmin',
    'admin', 'administrator', 'system admin', 'systemadministrator', 'owner'
  ]);

  if (typeof user.role === 'object' && user.role !== null) {
    const roleName = String(user.role.name || user.role.title || user.role.roleName || '').toLowerCase().trim();
    if (ADMIN_ROLES.has(roleName)) return true;
  } else if (typeof user.role === 'string') {
    const roleStr = user.role.toLowerCase().trim();
    if (ADMIN_ROLES.has(roleStr)) return true;
  }

  return false;
};

const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super Admin / Admin bypass: Admin has full access to everything
    if (isAdminUser(req.user)) {
      return next();
    }

    // Combine role permissions + user-level custom permissions
    const userRole = req.user.role;
    const rolePermissions = userRole ? userRole.permissions || [] : [];
    const customPermissions = req.user.customPermissions || [];
    const effectivePermissions = new Set([...rolePermissions, ...customPermissions]);

    if (effectivePermissions.has(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access Denied! You lack required permission: '${requiredPermission}'`
    });
  };
};

/**
 * Middleware to restrict route to Super Admin only
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !isAdminUser(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access Restricted to Super Admin only.'
    });
  }
  next();
};

module.exports = {
  hasPermission,
  requireSuperAdmin
};
