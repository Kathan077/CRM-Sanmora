const Ledger = require('../models/Ledger.model');

// @desc    Get all ledger accounts
// @route   GET /api/ledger
// @access  Private
exports.getAllLedgerAccounts = async (req, res) => {
  try {
    const ledgers = await Ledger.find().lean();
    // Return both dictionary map and array for seamless client compatibility
    const storeMap = {};
    for (const item of ledgers) {
      storeMap[item.clientId] = {
        ...item,
        id: String(item._id)
      };
    }

    res.status(200).json({
      success: true,
      count: ledgers.length,
      data: storeMap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ledger accounts',
      error: error.message
    });
  }
};

// @desc    Get single ledger account by client ID
// @route   GET /api/ledger/:clientId
// @access  Private
exports.getLedgerByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    const ledger = await Ledger.findOne({ clientId }).lean();

    if (!ledger) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: { ...ledger, id: String(ledger._id) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ledger account',
      error: error.message
    });
  }
};

// @desc    Upsert ledger account by client ID
// @route   POST /api/ledger/:clientId
// @access  Private
exports.saveLedgerAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const accountData = req.body;
    const creatorName = req.user?.name || req.user?.username || 'Staff';
    const creatorId = String(req.user?._id || req.user?.id || '');

    let ledger = await Ledger.findOne({ clientId });

    if (!ledger) {
      ledger = await Ledger.create({
        ...accountData,
        clientId,
        createdBy: creatorName,
        createdById: creatorId
      });
    } else {
      if (accountData.projectName !== undefined) ledger.projectName = accountData.projectName;
      if (accountData.agreedProjectCost !== undefined) ledger.agreedProjectCost = Number(accountData.agreedProjectCost) || 0;
      if (accountData.contractDate !== undefined) ledger.contractDate = accountData.contractDate;
      if (Array.isArray(accountData.instalments)) {
        ledger.instalments = accountData.instalments;
      }
      await ledger.save();
    }

    const obj = ledger.toObject();
    res.status(200).json({
      success: true,
      data: { ...obj, id: String(obj._id) }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to save ledger account',
      error: error.message
    });
  }
};

// @desc    Delete installment from ledger account
// @route   DELETE /api/ledger/:clientId/instalment/:instId
// @access  Private
exports.deleteInstalment = async (req, res) => {
  try {
    const { clientId, instId } = req.params;
    const ledger = await Ledger.findOne({ clientId });

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: 'Ledger account not found'
      });
    }

    ledger.instalments = ledger.instalments.filter(
      (inst) => String(inst.id) !== String(instId) && String(inst._id) !== String(instId)
    );

    await ledger.save();

    const obj = ledger.toObject();
    res.status(200).json({
      success: true,
      message: 'Instalment deleted successfully',
      data: { ...obj, id: String(obj._id) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete installment',
      error: error.message
    });
  }
};
