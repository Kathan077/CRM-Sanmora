const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getAvailablePermissions,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/role.controller');
const { protect } = require('../middleware/auth.middleware');
const { hasPermission } = require('../middleware/rbac.middleware');
const { SYSTEM_PERMISSIONS } = require('../constants/permissions');

router.use(protect);

router
  .route('/')
  .get(hasPermission(SYSTEM_PERMISSIONS.ROLES_VIEW), getAllRoles)
  .post(hasPermission(SYSTEM_PERMISSIONS.ROLES_CREATE), createRole);

router
  .route('/permissions')
  .get(hasPermission(SYSTEM_PERMISSIONS.ROLES_VIEW), getAvailablePermissions);

router
  .route('/:id')
  .put(hasPermission(SYSTEM_PERMISSIONS.ROLES_UPDATE), updateRole)
  .delete(hasPermission(SYSTEM_PERMISSIONS.ROLES_DELETE), deleteRole);

module.exports = router;
