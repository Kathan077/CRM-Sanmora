const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/task.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router
  .route('/')
  .get(getAllTasks)
  .post(createTask);

router
  .route('/:id')
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;
