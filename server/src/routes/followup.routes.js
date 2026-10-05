const express = require('express');
const router = express.Router();
const {
  getAllFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup
} = require('../controllers/followup.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router
  .route('/')
  .get(getAllFollowups)
  .post(createFollowup);

router
  .route('/:id')
  .put(updateFollowup)
  .delete(deleteFollowup);

module.exports = router;
