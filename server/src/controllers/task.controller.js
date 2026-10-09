const mongoose = require('mongoose');
const Task = require('../models/Task.model');
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

// In-memory cache for Team Hierarchy Adjacency Map (60s TTL)
let taskHierarchyCache = { adjacency: null, usersMap: null, lastUpdated: 0 };
const CACHE_TTL_MS = 60000;

// Helper to retrieve subordinate user IDs & names (O(team_size) graph traversal)
const getTeamIdentifiers = async (user) => {
  const uIdStr = String(user._id || user.id || '').trim();
  const uNameStr = String(user.name || '').trim();

  const teamIds = [uIdStr];
  const teamNames = [uNameStr];

  try {
    const now = Date.now();
    if (!taskHierarchyCache.adjacency || (now - taskHierarchyCache.lastUpdated) > CACHE_TTL_MS) {
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

      taskHierarchyCache = { adjacency, usersMap, lastUpdated: now };
    }

    const { adjacency, usersMap } = taskHierarchyCache;
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

// @desc    Get all tasks (Role & Manager Hierarchy Scoped for MongoDB persistence)
// @route   GET /api/tasks
// @access  Private
exports.getAllTasks = async (req, res) => {
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

    let queryExec = Task.find(filterQuery).sort({ createdAt: -1 });

    if (hasPagination) {
      const skip = (page - 1) * limit;
      const [pagedData, countTotal] = await Promise.all([
        queryExec.skip(skip).limit(limit).lean(),
        Task.countDocuments(filterQuery)
      ]);
      const formatted = pagedData.map(t => ({ ...t, id: String(t._id) }));
      return res.status(200).json({
        success: true,
        count: formatted.length,
        total: countTotal,
        page,
        pages: Math.ceil(countTotal / limit),
        data: formatted
      });
    }

    const tasks = await queryExec.lean();
    const formatted = tasks.map(t => ({ ...t, id: String(t._id) }));

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
      message: 'Failed to fetch task records',
      error: error.message
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const creatorName = req.user.name || req.user.username || 'Staff';
    const creatorId = String(req.user._id || req.user.id || '');

    const assignedName = req.body.assignedTo && req.body.assignedTo.trim() ? req.body.assignedTo.trim() : creatorName;
    const assignedId = req.body.assignedToId && String(req.body.assignedToId).trim() ? String(req.body.assignedToId).trim() : creatorId;

    const taskData = {
      ...req.body,
      createdBy: req.body.createdBy || creatorName,
      createdById: req.body.createdById || creatorId,
      assignedTo: assignedName,
      assignedToId: assignedId,
      originalAssignerName: creatorName,
      originalAssignerId: creatorId
    };

    const task = await Task.create(taskData);
    const obj = task.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create task record',
      error: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    let task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task record not found'
      });
    }

    task = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    const obj = task.toObject();
    const result = { ...obj, id: String(obj._id) };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update task record',
      error: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task record not found'
      });
    }

    await Task.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Task record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete task record',
      error: error.message
    });
  }
};
