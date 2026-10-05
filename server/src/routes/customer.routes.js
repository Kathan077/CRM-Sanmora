const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getAllCustomersUnfiltered,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  transferCustomer,
  bulkTransferCustomers
} = require('../controllers/customer.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/all-records', getAllCustomersUnfiltered);
router.post('/bulk-transfer', bulkTransferCustomers);

router
  .route('/')
  .get(getAllCustomers)
  .post(createCustomer);

router.post('/:id/transfer', transferCustomer);

router
  .route('/:id')
  .put(updateCustomer)
  .delete(deleteCustomer);

module.exports = router;
