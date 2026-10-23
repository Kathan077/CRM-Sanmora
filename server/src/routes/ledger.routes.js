const express = require('express');
const router = express.Router();
const {
  getAllLedgerAccounts,
  getLedgerByClientId,
  saveLedgerAccount,
  deleteInstalment
} = require('../controllers/ledger.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getAllLedgerAccounts);
router.get('/:clientId', getLedgerByClientId);
router.post('/:clientId', saveLedgerAccount);
router.delete('/:clientId/instalment/:instId', deleteInstalment);

module.exports = router;
