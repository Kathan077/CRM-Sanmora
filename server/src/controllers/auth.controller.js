const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const UserSessionLog = require('../models/UserSessionLog.model');
const { invalidateUserAuthCache } = require('../middleware/auth.middleware');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'sanmora_super_secret_jwt_key_2026_pro_crm',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper to compute effective permissions: (Role Permissions + Custom Grants) - Denied Revocations
const getEffectivePermissions = (user) => {
  const rolePermissions = user.role ? user.role.permissions || [] : [];
  const customPermissions = user.customPermissions || [];
  const deniedPermissions = user.deniedPermissions || [];
  const effective = new Set([...rolePermissions, ...customPermissions]);
  deniedPermissions.forEach((p) => effective.delete(p));
  return Array.from(effective);
};

/**
 * @desc    Authenticate User & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user by email and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('role')
      .populate('reportingTo', '_id name email department designation');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const now = new Date();

    // Close any previous stale active session logs for this user in a single atomic batch
    const previousActiveLogs = await UserSessionLog.find({ user: user._id, isActive: true }).lean();
    if (previousActiveLogs.length > 0) {
      const bulkOps = previousActiveLogs.map(oldLog => {
        const duration = Math.max(0, Math.round((now.getTime() - new Date(oldLog.loginTime).getTime()) / 1000));
        return {
          updateOne: {
            filter: { _id: oldLog._id },
            update: {
              $set: {
                logoutTime: now,
                logoutType: 'session_expired',
                sessionDuration: duration,
                isActive: false
              }
            }
          }
        };
      });
      await UserSessionLog.bulkWrite(bulkOps);
    }

    // Create new UserSessionLog
    const sessionLog = await UserSessionLog.create({
      user: user._id,
      loginTime: now,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      isActive: true
    });

    // Update last login timestamp
    user.lastLogin = now;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const effectivePermissions = getEffectivePermissions(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        sessionId: sessionLog._id,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          designation: user.designation,
          reportingTo: user.reportingTo,
          lastLogin: user.lastLogin,
          lastLogout: user.lastLogout,
          lastLogoutType: user.lastLogoutType,
          role: {
            id: user.role._id,
            name: user.role.name,
            isSystem: user.role.isSystem
          },
          monthlyTargets: user.monthlyTargets || [],
          customPermissions: user.customPermissions || [],
          deniedPermissions: user.deniedPermissions || [],
          effectivePermissions
        }
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
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .populate('reportingTo', '_id name email department designation')
      .lean();
    const effectivePermissions = getEffectivePermissions(user);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        designation: user.designation,
        reportingTo: user.reportingTo,
        isActive: user.isActive,
        role: user.role,
        monthlyTargets: user.monthlyTargets || [],
        customPermissions: user.customPermissions || [],
        deniedPermissions: user.deniedPermissions || [],
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
 * @desc    Update Own Profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
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
 * @desc    Change Own Password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Logout User & record session log
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    let userId = req.user ? (req.user._id || req.user.id) : null;
    const { logoutType = 'manual', sessionId, userId: bodyUserId } = req.body;

    if (!userId && bodyUserId) {
      userId = bodyUserId;
    }

    // Try decoding token from authorization header if user is still not identified
    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      } catch (e) {
        // ignore error
      }
    }

    const now = new Date();

    // 1. Try finding by sessionId first
    let sessionLog = null;
    if (sessionId) {
      sessionLog = await UserSessionLog.findById(sessionId);
    }

    // 2. If not found by sessionId or belongs to another user, find any active session log for this user
    if ((!sessionLog || (userId && String(sessionLog.user) !== String(userId))) && userId) {
      sessionLog = await UserSessionLog.findOne({ user: userId, isActive: true }).sort({ createdAt: -1 });
    }

    // 3. If still no active session log found, find the most recent session log for this user
    if (!sessionLog && userId) {
      sessionLog = await UserSessionLog.findOne({ user: userId }).sort({ createdAt: -1 });
    }

    // 4. Update existing session log if found
    if (sessionLog) {
      const loginMs = new Date(sessionLog.loginTime).getTime();
      const durationInSeconds = Math.max(0, Math.round((now.getTime() - loginMs) / 1000));
      sessionLog.logoutTime = now;
      sessionLog.logoutType = logoutType;
      sessionLog.sessionDuration = durationInSeconds;
      sessionLog.isActive = false;
      await sessionLog.save();

      if (!userId) {
        userId = sessionLog.user;
      }
    } else if (userId) {
      // 5. Fallback: If no session log EVER existed for this user, CREATE one now to record the logout event!
      const userObj = await User.findById(userId);
      const loginTime = userObj?.lastLogin || new Date(now.getTime() - 60000);
      const durationInSeconds = Math.max(0, Math.round((now.getTime() - new Date(loginTime).getTime()) / 1000));

      sessionLog = await UserSessionLog.create({
        user: userId,
        loginTime,
        logoutTime: now,
        logoutType,
        sessionDuration: durationInSeconds,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || '',
        isActive: false
      });
    }

    // 6. Bulk-close ALL active session logs for this user in MongoDB so no stale "Active Now" records remain
    if (userId) {
      await UserSessionLog.updateMany(
        { user: userId, isActive: true },
        {
          $set: {
            logoutTime: now,
            logoutType: logoutType,
            isActive: false
          }
        }
      );

      // 7. Update User model's lastLogout and lastLogoutType
      await User.findByIdAndUpdate(userId, {
        lastLogout: now,
        lastLogoutType: logoutType
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout logged successfully',
      data: { sessionId: sessionLog ? sessionLog._id : null }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
};

