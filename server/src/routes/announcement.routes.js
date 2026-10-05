const express = require('express');
const router = express.Router();
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement.controller');
const { protect } = require('../middleware/auth.middleware');

// Public or lightweight endpoint to get currently active announcements
router.get('/active', getActiveAnnouncements);

// Protected routes below
router.use(protect);

router.route('/')
  .get(getAllAnnouncements)
  .post(createAnnouncement);

router.route('/:id')
  .put(updateAnnouncement)
  .delete(deleteAnnouncement);

module.exports = router;
