const mongoose = require('mongoose');
const Followup = require('../models/Followup.model');
const User = require('../models/User.model');

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

// In-memory cache for Team Hierarchy Traversal (30s TTL)
let teamHierarchyCache = { data: null, lastUpdated: 0 };
const CACHE_TTL_MS = 30000;

// Helper to retrieve subordinate user IDs & names (cached recursive hierarchy traversal)
const getTeamIdentifiers = async (user) => {
  const uIdStr = String(user._id || user.id || '').trim();
  const uNameStr = String(user.name || '').trim();

  const teamIds = [uIdStr];
  const teamNames = [uNameStr];

  try {
    const now = Date.now();
    if (!teamHierarchyCache.data || (now - teamHierarchyCache.lastUpdated) > CACHE_TTL_MS) {
      teamHierarchyCache.data = await User.find({}, 'name reportingTo').lean();
      teamHierarchyCache.lastUpdated = now;
    }
    const allUsers = teamHierarchyCache.data || [];
    const visited = new Set([uIdStr]);
    const queue = [uIdStr];

    while (queue.length > 0) {
      const currentMgrId = queue.shift();
      allUsers.forEach(u => {
        const uId = String(u._id || u.id);
        const repVal = u.reportingTo;
        const repId = String(repVal && typeof repVal === 'object' ? (repVal._id || repVal.id) : (repVal || '')).trim();

        if (repId && repId === currentMgrId && !visited.has(uId)) {
          visited.add(uId);
          teamIds.push(uId);
          if (u.name) teamNames.push(u.name);
          queue.push(uId);
        }
      });
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

// @desc    Get all follow-ups (Role & Manager Hierarchy Scoped for MongoDB persistence)
// @route   GET /api/followups
// @access  Private
exports.getAllFollowups = async (req, res) => {
  try {
    let followups;
    if (isUserAdmin(req.user)) {
      const { assignedTo, employeeId, executive } = req.query;
      const filterVal = (assignedTo || employeeId || executive || '').trim();

      if (filterVal && filterVal !== 'all') {
        const regexVal = new RegExp(`^${escapeRegex(filterVal)}$`, 'i');
        const objectIdFilter = mongoose.Types.ObjectId.isValid(filterVal) ? [new mongoose.Types.ObjectId(filterVal)] : [];
        followups = await Followup.find({
          $or: [
            { createdById: { $in: [filterVal, ...objectIdFilter] } },
            { assignedToId: { $in: [filterVal, ...objectIdFilter] } },
            { originalAssignerId: { $in: [filterVal, ...objectIdFilter] } },
            { createdBy: regexVal },
            { assignedTo: regexVal },
            { originalAssignerName: regexVal }
          ]
        }).sort({ updatedAt: -1 }).lean();
      } else {
        followups = await Followup.find().sort({ updatedAt: -1 }).lean();
      }
    } else {
      // Manager & Hierarchy Scoped: Reporting Manager sees own + subordinates' records; Executive sees only own
      const { teamIds, teamNames, teamObjectIds } = await getTeamIdentifiers(req.user);
      const allTargetIds = [...teamIds, ...teamObjectIds];
      const nameRegexes = teamNames.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i'));

      followups = await Followup.find({
        $or: [
          { createdById: { $in: allTargetIds } },
          { assignedToId: { $in: allTargetIds } },
          { originalAssignerId: { $in: allTargetIds } },
          { createdBy: { $in: nameRegexes } },
          { assignedTo: { $in: nameRegexes } },
          { originalAssignerName: { $in: nameRegexes } }
        ]
      }).sort({ updatedAt: -1 }).lean();
    }

    const formatted = followups.map(f => ({ ...f, id: String(f._id) }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch follow-up records',
      error: error.message
    });
  }
};

// @desc    Create new follow-up record in MongoDB
// @route   POST /api/followups
// @access  Private
exports.createFollowup = async (req, res) => {
  try {
    const creatorName = req.user.name || req.user.username || 'Staff';
    const creatorId = String(req.user._id || req.user.id || '');

    const followupData = {
      ...req.body,
      createdBy: req.body.createdBy || creatorName,
      createdById: req.body.createdById || creatorId,
      assignedTo: req.body.assignedTo || creatorName,
      assignedToId: req.body.assignedToId || creatorId
    };

    if (!Array.isArray(followupData.history) || followupData.history.length === 0) {
      followupData.history = [{
        followupDate: followupData.followupDate || new Date().toISOString().split('T')[0],
        followupType: followupData.followupType || 'Telephonic',
        notes: followupData.notes || 'Initial interaction',
        nextFollowupDate: followupData.nextFollowupDate || '—',
        preferredTime: followupData.preferredTime || '',
        assignedTo: followupData.assignedTo,
        assignedToId: followupData.assignedToId,
        createdBy: followupData.createdBy,
        createdById: followupData.createdById
      }];
    }

    const followup = await Followup.create(followupData);
    const obj = followup.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create follow-up record',
      error: error.message
    });
  }
};

// @desc    Update follow-up record
// @route   PUT /api/followups/:id
// @access  Private
exports.updateFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    let followup = await Followup.findById(id);

    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up record not found'
      });
    }

    followup = await Followup.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    const obj = followup.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update follow-up record',
      error: error.message
    });
  }
};

// @desc    Delete follow-up record
// @route   DELETE /api/followups/:id
// @access  Private
exports.deleteFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const followup = await Followup.findById(id);

    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up record not found'
      });
    }

    await Followup.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Follow-up record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete follow-up record',
      error: error.message
    });
  }
};
