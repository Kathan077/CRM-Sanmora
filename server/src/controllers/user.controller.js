const User = require('../models/User.model');
const Role = require('../models/Role.model');
const UserSessionLog = require('../models/UserSessionLog.model');
const { ALL_PERMISSIONS } = require('../constants/permissions');
const { invalidateUserAuthCache } = require('../middleware/auth.middleware');

/**
 * @desc    Get All Users / Employees
 * @route   GET /api/users
 * @access  Private (USERS_VIEW or Super Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { roleId, status, search } = req.query;

    const query = {};

    if (roleId) {
      query.role = roleId;
    }

    if (status !== undefined) {
      query.isActive = status === 'active' || status === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('role')
      .populate('reportingTo', '_id name email department designation')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get Single User By ID
 * @route   GET /api/users/:id
 * @access  Private (USERS_VIEW or Super Admin)
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('role')
      .populate('reportingTo', '_id name email department designation')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const rolePermissions = user.role ? user.role.permissions || [] : [];
    const customPermissions = user.customPermissions || [];
    const effectivePermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));

    res.status(200).json({
      success: true,
      data: {
        ...user,
        effectivePermissions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Create New User / Employee
 * @route   POST /api/users
 * @access  Private (USERS_CREATE or Super Admin)
 */
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      roleId,
      phone,
      department,
      designation,
      customPermissions,
      reportingTo
    } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and roleId'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `User with email '${email}' already exists.`
      });
    }

    const roleObj = await Role.findById(roleId);
    if (!roleObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID provided'
      });
    }

    const validCustomPermissions = (customPermissions || []).filter((p) =>
      ALL_PERMISSIONS.includes(p)
    );

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: roleId,
      phone: phone ? phone.trim() : '',
      department: department ? department.trim() : 'Sales',
      designation: designation ? designation.trim() : 'Executive',
      customPermissions: validCustomPermissions,
      reportingTo: reportingTo || null,
      isActive: true
    });

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('role')
      .populate('reportingTo', '_id name email department designation')
      .lean();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: populatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update User Info & Permissions
 * @route   PUT /api/users/:id
 * @access  Private (USERS_UPDATE or Super Admin)
 */
const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      roleId,
      phone,
      department,
      designation,
      customPermissions,
      reportingTo
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (roleId) {
      const roleObj = await Role.findById(roleId);
      if (!roleObj) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }
      user.role = roleId;
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (password) user.password = password;
    if (phone !== undefined) user.phone = phone.trim();
    if (department) user.department = department.trim();
    if (designation) user.designation = designation.trim();
    if (reportingTo !== undefined) user.reportingTo = reportingTo || null;
    if (customPermissions) {
      user.customPermissions = customPermissions.filter((p) =>
        ALL_PERMISSIONS.includes(p)
      );
    }

    await user.save();
    invalidateUserAuthCache(user._id);

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('role')
      .populate('reportingTo', '_id name email department designation')
      .lean();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Toggle User Active / Deactivated Status
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Private (USERS_TOGGLE_STATUS or Super Admin)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role && user.role.name === 'Super Admin' && user.isActive) {
      // Check how many super admins exist
      const activeSuperAdmins = await User.countDocuments({
        isActive: true,
        role: user.role._id
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the sole active Super Admin account.'
        });
      }
    }

    user.isActive = !user.isActive;
    await user.save();
    invalidateUserAuthCache(user._id);

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete User Account
 * @route   DELETE /api/users/:id
 * @access  Private (USERS_DELETE or Super Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.email === 'admin@sanmoracrm.com') {
      return res.status(400).json({
        success: false,
        message: 'The primary system Super Admin account (admin@sanmoracrm.com) cannot be deleted.'
      });
    }

    await user.deleteOne();
    invalidateUserAuthCache(user._id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get User Session & Login/Logout Activity Logs (Admin view)
 * @route   GET /api/users/activity-logs
 * @access  Private (Admin / Super Admin / USERS_VIEW)
 */
const getUserSessionLogs = async (req, res) => {
  try {
    const { userId, search, logoutType, startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (logoutType) {
      if (logoutType === 'active') {
        query.isActive = true;
      } else {
        query.logoutType = logoutType;
      }
    }

    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        query.loginTime.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.loginTime.$lte = eDate;
      }
    }

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      query.user = { $in: userIds };
    }

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const parsedPage = Math.max(1, parseInt(page, 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [logs, total] = await Promise.all([
      UserSessionLog.find(query)
        .populate({
          path: 'user',
          select: 'name email department designation role avatar',
          populate: { path: 'role', select: 'name' }
        })
        .sort({ loginTime: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      UserSessionLog.countDocuments(query)
    ]);

    // Statistics calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalActiveNow, loginsToday, idleTimeoutsCount, manualLogoutsCount, totalLogs] = await Promise.all([
      UserSessionLog.countDocuments({ isActive: true }),
      UserSessionLog.countDocuments({ loginTime: { $gte: todayStart } }),
      UserSessionLog.countDocuments({ logoutType: 'idle_timeout' }),
      UserSessionLog.countDocuments({ logoutType: 'manual' }),
      UserSessionLog.countDocuments({})
    ]);

    // Calculate average session duration for logged out sessions
    const avgDurationResult = await UserSessionLog.aggregate([
      { $match: { sessionDuration: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$sessionDuration' } } }
    ]);
    const avgDurationSeconds = avgDurationResult.length > 0 ? Math.round(avgDurationResult[0].avgDuration) : 0;

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      stats: {
        totalActiveNow,
        loginsToday,
        idleTimeoutsCount,
        manualLogoutsCount,
        totalLogs,
        avgDurationSeconds
      },
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserAttendanceCalendar = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { year, month } = req.query;

    const userObj = await User.findById(userId)
      .select('name email department designation role avatar isActive')
      .populate('role', 'name')
      .lean();

    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentDate = new Date();
    const targetYear = parseInt(year, 10) || currentDate.getFullYear();
    const targetMonth = parseInt(month, 10) || (currentDate.getMonth() + 1); // 1-12

    // Month bounds
    const monthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Fetch all session logs for this user in selected month
    const sessionLogs = await UserSessionLog.find({
      user: userId,
      loginTime: { $gte: monthStart, $lte: monthEnd }
    })
      .sort({ loginTime: 1 })
      .lean();

    // Group logs by YYYY-MM-DD date key
    const daysMap = {};
    let presentDays = 0;
    let absentDays = 0;
    let totalWorkingSeconds = 0;

    // Helper to format date into local YYYY-MM-DD string
    const formatLocalDateStr = (dObj) => {
      if (!dObj) return '';
      const date = new Date(dObj);
      if (isNaN(date.getTime())) return '';
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = formatLocalDateStr(currentDate);

    for (let day = 1; day <= daysInMonth; day++) {
      const monthPad = String(targetMonth).padStart(2, '0');
      const dayPad = String(day).padStart(2, '0');
      const dateStr = `${targetYear}-${monthPad}-${dayPad}`;

      const dateObj = new Date(targetYear, targetMonth - 1, day);
      const isFuture = dateStr > todayStr;
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0; // Only Sunday is Weekend

      // Filter sessions that belong to this date
      const daySessions = sessionLogs.filter(log => {
        const logDateStr = formatLocalDateStr(log.loginTime);
        return logDateStr === dateStr;
      });

      const isPresent = daySessions.length > 0;
      let firstLogin = null;
      let lastLogout = null;
      let dayDurationSeconds = 0;
      let isActiveToday = false;

      if (isPresent) {
        presentDays++;
        // Sort day sessions chronologically
        daySessions.sort((a, b) => new Date(a.loginTime) - new Date(b.loginTime));
        firstLogin = daySessions[0].loginTime;
        
        // Is user currently online? ONLY if the most recent session on today's date is still active
        const latestSession = daySessions[daySessions.length - 1];
        if (dateStr === todayStr && latestSession && latestSession.isActive && !latestSession.logoutTime) {
          isActiveToday = true;
        }

        // Compute last logout and total duration
        for (const s of daySessions) {
          if (s.logoutTime) {
            lastLogout = s.logoutTime;
          }
          dayDurationSeconds += (s.sessionDuration || 0);
        }
        totalWorkingSeconds += dayDurationSeconds;
      } else {
        if (!isFuture && !isWeekend) {
          absentDays++;
        }
      }

      daysMap[dateStr] = {
        dateStr,
        dayNumber: day,
        dayOfWeek,
        isWeekend,
        isFuture,
        isPresent,
        isActiveToday,
        firstLogin,
        lastLogout,
        sessionCount: daySessions.length,
        dayDurationSeconds,
        sessions: daySessions.map(s => ({
          id: s._id,
          loginTime: s.loginTime,
          logoutTime: s.logoutTime,
          logoutType: s.logoutType,
          sessionDuration: s.sessionDuration,
          isActive: s.isActive,
          ipAddress: s.ipAddress
        }))
      };
    }

    res.status(200).json({
      success: true,
      user: userObj,
      year: targetYear,
      month: targetMonth,
      daysInMonth,
      stats: {
        presentDays,
        absentDays,
        totalWorkingSeconds,
        totalSessions: sessionLogs.length
      },
      daysMap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const setUserMonthlyTarget = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { year, month, targetAmount } = req.body;

    if (!year || !month || targetAmount === undefined || targetAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid year, month, and targetAmount'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.monthlyTargets) {
      user.monthlyTargets = [];
    }

    const existingIndex = user.monthlyTargets.findIndex(
      t => t.year === parseInt(year, 10) && t.month === parseInt(month, 10)
    );

    const numericAmount = parseFloat(targetAmount);

    if (existingIndex > -1) {
      user.monthlyTargets[existingIndex].targetAmount = numericAmount;
      user.monthlyTargets[existingIndex].setBy = req.user ? req.user._id : null;
      user.monthlyTargets[existingIndex].updatedAt = new Date();
    } else {
      user.monthlyTargets.push({
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        targetAmount: numericAmount,
        setBy: req.user ? req.user._id : null,
        updatedAt: new Date()
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Monthly sales target updated successfully',
      data: {
        userId: user._id,
        userName: user.name,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        targetAmount: numericAmount,
        monthlyTargets: user.monthlyTargets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserSessionLogs,
  getUserAttendanceCalendar,
  setUserMonthlyTarget
};


