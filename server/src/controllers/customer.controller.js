const mongoose = require('mongoose');
const Customer = require('../models/Customer.model');
const User = require('../models/User.model');
const Followup = require('../models/Followup.model');

// Helper to determine if user is Super Admin / Main Admin
const isUserAdmin = (user) => {
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
  const ADMIN_ROLES = new Set([
    'super admin', 'superadmin', 'main admin', 'mainadmin',
    'admin', 'administrator', 'system admin', 'systemadministrator', 'owner'
  ]);
  const roleName = String(user.role?.name || user.role?.title || user.role || '').toLowerCase().trim();
  if (ADMIN_ROLES.has(roleName)) return true;

  const username = String(user.username || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();
  const name = String(user.name || '').toLowerCase().trim();
  const uId = String(user.id || user._id || '').toLowerCase().trim();

  if (uId === 'default-admin' || uId === 'admin') return true;
  if (username === 'admin' || username === 'superadmin' || username === 'mainadmin') return true;
  if (email === 'admin@sanmoracrm.com' || email.startsWith('admin@') || email.startsWith('superadmin@') || email.startsWith('mainadmin@')) return true;
  if (name === 'admin' || name === 'sanmora main admin' || name === 'main admin' || name === 'super admin') return true;

  return false;
};

// In-memory cache for Team Hierarchy Adjacency Map (60s TTL)
let customerHierarchyCache = { adjacency: null, usersMap: null, lastUpdated: 0 };
const CACHE_TTL_MS = 60000;

exports.invalidateCustomerHierarchyCache = () => {
  customerHierarchyCache = { adjacency: null, usersMap: null, lastUpdated: 0 };
};

// Helper to retrieve subordinate user IDs & names (O(team_size) graph traversal)
const getTeamIdentifiers = async (user) => {
  const uIdStr = String(user._id || user.id || '').trim();
  const uNameStr = String(user.name || '').trim();

  const teamIds = [uIdStr];
  const teamNames = [uNameStr];

  try {
    const now = Date.now();
    if (!customerHierarchyCache.adjacency || (now - customerHierarchyCache.lastUpdated) > CACHE_TTL_MS) {
      const allUsers = await User.find({}, '_id name reportingTo').lean();
      const adjacency = new Map();
      const usersMap = new Map();

      for (const u of allUsers) {
        const uId = String(u._id);
        usersMap.set(uId, u.name || '');
        const repVal = u.reportingTo;
        const repId = String(repVal && typeof repVal === 'object' ? (repVal._id || repVal.id) : (repVal || '')).trim();
        if (repId) {
          if (!adjacency.has(repId)) adjacency.set(repId, []);
          adjacency.get(repId).push(uId);
        }
      }

      customerHierarchyCache = { adjacency, usersMap, lastUpdated: now };
    }

    const { adjacency, usersMap } = customerHierarchyCache;
    const visited = new Set([uIdStr]);
    const queue = [uIdStr];

    while (queue.length > 0) {
      const currentMgrId = queue.shift();
      const directReports = adjacency.get(currentMgrId) || [];
      for (const subId of directReports) {
        if (!visited.has(subId)) {
          visited.add(subId);
          teamIds.push(subId);
          const subName = usersMap.get(subId);
          if (subName) teamNames.push(subName);
          queue.push(subId);
        }
      }
    }
  } catch (e) {}

  const cleanIds = teamIds.filter(Boolean);
  const cleanNames = teamNames.filter(Boolean);
  const objectIds = cleanIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  return { teamIds: cleanIds, teamNames: cleanNames, teamObjectIds: objectIds };
};

// Helper to safely escape regex characters
const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all customers (Role & Manager Hierarchy Scoped for MongoDB persistence)
// @route   GET /api/customers
// @access  Private
exports.getAllCustomers = async (req, res) => {
  try {
    let filterQuery = {};

    if (isUserAdmin(req.user)) {
      const { assignedTo, employeeId, executive } = req.query;
      const filterVal = (assignedTo || employeeId || executive || '').trim();

      if (filterVal && filterVal !== 'all') {
        const regexVal = new RegExp(`^${escapeRegex(filterVal)}$`, 'i');
        const objectIdFilter = mongoose.Types.ObjectId.isValid(filterVal) ? [new mongoose.Types.ObjectId(filterVal)] : [];
        filterQuery = {
          $or: [
            { createdById: { $in: [filterVal, ...objectIdFilter] } },
            { assignedToId: { $in: [filterVal, ...objectIdFilter] } },
            { originalAssignerId: { $in: [filterVal, ...objectIdFilter] } },
            { createdBy: regexVal },
            { assignedTo: regexVal },
            { originalAssignerName: regexVal }
          ]
        };
      }
    } else {
      // Manager & Hierarchy Scoped: Reporting Manager sees own + subordinates' records; Executive sees only own
      const { teamIds, teamNames, teamObjectIds } = await getTeamIdentifiers(req.user);
      const allTargetIds = [...teamIds, ...teamObjectIds];

      filterQuery = {
        $or: [
          { createdById: { $in: allTargetIds } },
          { assignedToId: { $in: allTargetIds } },
          { originalAssignerId: { $in: allTargetIds } },
          { createdBy: { $in: teamNames } },
          { assignedTo: { $in: teamNames } },
          { originalAssignerName: { $in: teamNames } }
        ]
      };
    }

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const hasPagination = !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0;

    let queryExec = Customer.find(filterQuery).sort({ createdAt: -1 });
    let total = 0;

    if (hasPagination) {
      const skip = (page - 1) * limit;
      const [pagedData, countTotal] = await Promise.all([
        queryExec.skip(skip).limit(limit).lean(),
        Customer.countDocuments(filterQuery)
      ]);
      const formatted = pagedData.map(c => ({ ...c, id: String(c._id) }));
      return res.status(200).json({
        success: true,
        count: formatted.length,
        total: countTotal,
        page,
        pages: Math.ceil(countTotal / limit),
        data: formatted
      });
    }

    // Default fast unpaginated fetch (lean query optimized by index)
    const customers = await queryExec.lean();
    const formatted = customers.map(c => ({ ...c, id: String(c._id) }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      total: formatted.length,
      page: 1,
      pages: 1,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer records',
      error: error.message
    });
  }
};

// @desc    Get all customers unfiltered (across all employees & admins for All Customers page)
// @route   GET /api/customers/all-records
// @access  Private
exports.getAllCustomersUnfiltered = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const hasPagination = !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0;

    let queryExec = Customer.find().sort({ createdAt: -1 });

    if (hasPagination) {
      const skip = (page - 1) * limit;
      const [pagedData, countTotal] = await Promise.all([
        queryExec.skip(skip).limit(limit).lean(),
        Customer.countDocuments()
      ]);
      const formatted = pagedData.map(c => ({ ...c, id: String(c._id) }));
      return res.status(200).json({
        success: true,
        count: formatted.length,
        total: countTotal,
        page,
        pages: Math.ceil(countTotal / limit),
        data: formatted
      });
    }

    const customers = await queryExec.lean();
    const formatted = customers.map(c => ({ ...c, id: String(c._id) }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      total: formatted.length,
      page: 1,
      pages: 1,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all customer records',
      error: error.message
    });
  }
};

// @desc    Create new customer record in MongoDB
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const creatorName = req.user.name || req.user.username || 'Staff';
    const creatorId = String(req.user._id || req.user.id || '');

    const customerData = {
      ...req.body,
      createdBy: req.body.createdBy || creatorName,
      createdById: req.body.createdById || creatorId,
      assignedTo: req.body.assignedTo || creatorName,
      assignedToId: req.body.assignedToId || creatorId
    };

    const customer = await Customer.create(customerData);
    const obj = customer.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create customer record',
      error: error.message
    });
  }
};

// @desc    Update customer record
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    let customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer record not found'
      });
    }

    customer = await Customer.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    const obj = customer.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update customer record',
      error: error.message
    });
  }
};

// @desc    Delete customer record
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer record not found'
      });
    }

    // CASCADE DELETE: Remove matching follow-ups from MongoDB Followup collection
    const filterConditions = [{ leadId: id }, { leadId: `lead-${id}` }];
    if (customer.inquiryNo) filterConditions.push({ inquiryNo: customer.inquiryNo });
    if (customer.phone) filterConditions.push({ phone: customer.phone });
    if (customer.customerName) filterConditions.push({ customerName: customer.customerName });

    await Followup.deleteMany({ $or: filterConditions });
    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Customer record and associated follow-ups deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer record',
      error: error.message
    });
  }
};

// @desc    Transfer customer lead to another employee
// @route   POST /api/customers/:id/transfer
// @access  Private
exports.transferCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmployeeId, targetEmployeeName, transferNote } = req.body;

    if (!targetEmployeeId || !targetEmployeeName) {
      return res.status(400).json({
        success: false,
        message: 'Target employee ID and name are required for lead transfer'
      });
    }

    let customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer record not found'
      });
    }

    const senderName = req.user.name || req.user.username || 'Staff';
    const senderId = String(req.user._id || req.user.id || '');

    // Update Customer ownership fields (set all ownership fields to target employee so sender no longer matches)
    customer.assignedTo = targetEmployeeName;
    customer.assignedToId = String(targetEmployeeId);
    customer.createdBy = targetEmployeeName;
    customer.createdById = String(targetEmployeeId);
    customer.originalAssignerName = targetEmployeeName;
    customer.originalAssignerId = String(targetEmployeeId);

    await customer.save();

    // Cascade update to matching Followup documents in MongoDB
    const filterConditions = [{ leadId: id }, { leadId: `lead-${id}` }];
    if (customer.inquiryNo) filterConditions.push({ inquiryNo: customer.inquiryNo });
    if (customer.phone) filterConditions.push({ phone: customer.phone });
    if (customer.customerName) filterConditions.push({ customerName: customer.customerName });

    const followups = await Followup.find({ $or: filterConditions }).lean();
    if (followups.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const bulkOps = followups.map(fup => {
        const historyItem = {
          followupDate: todayStr,
          followupType: 'System Transfer',
          notes: transferNote || `Lead transferred from ${senderName} to ${targetEmployeeName}`,
          nextFollowupDate: fup.nextFollowupDate || todayStr,
          preferredTime: fup.preferredTime || '',
          assignedTo: targetEmployeeName,
          assignedToId: String(targetEmployeeId),
          createdBy: senderName,
          createdById: senderId,
          createdAt: new Date()
        };
        return {
          updateOne: {
            filter: { _id: fup._id },
            update: {
              $set: {
                assignedTo: targetEmployeeName,
                assignedToId: String(targetEmployeeId),
                createdBy: targetEmployeeName,
                createdById: String(targetEmployeeId),
                originalAssignerName: targetEmployeeName,
                originalAssignerId: String(targetEmployeeId)
              },
              $push: { history: historyItem }
            }
          }
        };
      });
      await Followup.bulkWrite(bulkOps);
    }

    const obj = customer.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(200).json({
      success: true,
      message: `Lead successfully transferred to ${targetEmployeeName}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to transfer customer record',
      error: error.message
    });
  }
};

// @desc    Bulk Transfer customer leads to another employee
// @route   POST /api/customers/bulk-transfer
// @access  Private
exports.bulkTransferCustomers = async (req, res) => {
  try {
    const { leadIds, targetEmployeeId, targetEmployeeName, transferNote } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty list of lead IDs is required for bulk transfer'
      });
    }

    if (!targetEmployeeId || !targetEmployeeName) {
      return res.status(400).json({
        success: false,
        message: 'Target employee ID and name are required for bulk transfer'
      });
    }

    const senderName = req.user.name || req.user.username || 'Staff';
    const senderId = String(req.user._id || req.user.id || '');
    const todayStr = new Date().toISOString().split('T')[0];

    const cleanLeadIds = leadIds.map(id => String(id));
    const objectIds = cleanLeadIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // Update matching Customer documents in MongoDB
    const filterQuery = {
      $or: [
        { _id: { $in: objectIds } },
        { id: { $in: cleanLeadIds } }
      ]
    };

    const customersToUpdate = await Customer.find(filterQuery);
    if (customersToUpdate.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching customer records found for bulk transfer'
      });
    }

    const updatedCustomerIds = customersToUpdate.map(c => String(c._id));
    const inquiryNos = customersToUpdate.map(c => c.inquiryNo).filter(Boolean);
    const phones = customersToUpdate.map(c => c.phone).filter(Boolean);

    await Customer.updateMany(filterQuery, {
      $set: {
        assignedTo: targetEmployeeName,
        assignedToId: String(targetEmployeeId),
        createdBy: targetEmployeeName,
        createdById: String(targetEmployeeId),
        originalAssignerName: targetEmployeeName,
        originalAssignerId: String(targetEmployeeId)
      }
    });

    // Cascade update to matching Followup documents in MongoDB
    const followupFilter = {
      $or: [
        { leadId: { $in: [...updatedCustomerIds, ...cleanLeadIds] } },
        { inquiryNo: { $in: inquiryNos } },
        { phone: { $in: phones } }
      ]
    };

    const followups = await Followup.find(followupFilter).lean();
    if (followups.length > 0) {
      const bulkOps = followups.map(fup => {
        const historyItem = {
          followupDate: todayStr,
          followupType: 'Bulk Transfer',
          notes: transferNote || `Bulk lead transferred from ${senderName} to ${targetEmployeeName}`,
          nextFollowupDate: fup.nextFollowupDate || todayStr,
          preferredTime: fup.preferredTime || '',
          assignedTo: targetEmployeeName,
          assignedToId: String(targetEmployeeId),
          createdBy: senderName,
          createdById: senderId,
          createdAt: new Date()
        };
        return {
          updateOne: {
            filter: { _id: fup._id },
            update: {
              $set: {
                assignedTo: targetEmployeeName,
                assignedToId: String(targetEmployeeId),
                createdBy: targetEmployeeName,
                createdById: String(targetEmployeeId),
                originalAssignerName: targetEmployeeName,
                originalAssignerId: String(targetEmployeeId)
              },
              $push: { history: historyItem }
            }
          }
        };
      });
      await Followup.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      count: customersToUpdate.length,
      message: `Successfully transferred ${customersToUpdate.length} leads to ${targetEmployeeName}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk transfer',
      error: error.message
    });
  }
};


