const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getStaffDirectory,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserSessionLogs,
  getUserAttendanceCalendar,
  setUserMonthlyTarget
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { hasPermission, hasAnyPermission, canViewAttendanceCalendar } = require('../middleware/rbac.middleware');
const { SYSTEM_PERMISSIONS } = require('../constants/permissions');

router.use(protect);

router.get('/directory', getStaffDirectory);
router.get('/activity-logs', hasAnyPermission(SYSTEM_PERMISSIONS.ACTIVITY_LOGS_VIEW, SYSTEM_PERMISSIONS.USERS_VIEW), getUserSessionLogs);
router.get('/:id/attendance-calendar', canViewAttendanceCalendar, getUserAttendanceCalendar);
router.post('/:id/monthly-target', setUserMonthlyTarget);

router
  .route('/')
  .get(hasPermission(SYSTEM_PERMISSIONS.USERS_VIEW), getAllUsers)
  .post(hasPermission(SYSTEM_PERMISSIONS.USERS_CREATE), createUser);

router
  .route('/:id')
  .get(hasPermission(SYSTEM_PERMISSIONS.USERS_VIEW), getUserById)
  .put(hasPermission(SYSTEM_PERMISSIONS.USERS_UPDATE), updateUser)
  .delete(hasPermission(SYSTEM_PERMISSIONS.USERS_DELETE), deleteUser);

router
  .route('/:id/toggle-status')
  .patch(hasPermission(SYSTEM_PERMISSIONS.USERS_TOGGLE_STATUS), toggleUserStatus);

module.exports = router;
