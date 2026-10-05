const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/auth.controller');
const { protect, permissiveAuth } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/logout', permissiveAuth, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
