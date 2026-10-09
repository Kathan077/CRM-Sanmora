const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// In-Memory User Auth Cache with Bounded LRU Eviction & 30s TTL
const userAuthCache = new Map();
const CACHE_TTL_MS = 30000;
const MAX_CACHE_SIZE = 10000;

const getCachedUser = (userId) => {
  if (!userId) return null;
  const key = String(userId);
  const cached = userAuthCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.user;
  }
  userAuthCache.delete(key);
  return null;
};

const setCachedUser = (userId, user) => {
  if (!userId || !user) return;
  const key = String(userId);
  // Prevent memory unbounded growth by evicting oldest item if max capacity reached
  if (userAuthCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = userAuthCache.keys().next().value;
    if (oldestKey) userAuthCache.delete(oldestKey);
  }
  userAuthCache.set(key, { user, timestamp: Date.now() });
};

// Expose cache invalidator for user updates / status toggles
const invalidateUserAuthCache = (userId) => {
  if (userId) userAuthCache.delete(String(userId));
};

/**
 * Protect middleware to authenticate JWT Bearer tokens
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sanmora_super_secret_jwt_key_2026_pro_crm');

      let user = getCachedUser(decoded.id);
      if (!user) {
        user = await User.findById(decoded.id).populate('role').lean();
        if (user) {
          setCachedUser(decoded.id, user);
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists or token is invalid.'
        });
      }

      if (!user.isActive) {
        invalidateUserAuthCache(decoded.id);
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact your Super Admin.'
        });
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
        console.error('[Auth Middleware Error]:', error.message);
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired.'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided.'
    });
  }
};

/**
 * Permissive auth middleware for logout requests (extracts user even if token expired)
 */
const permissiveAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      let userId = null;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sanmora_super_secret_jwt_key_2026_pro_crm');
        userId = decoded.id;
      } catch (err) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      }

      if (userId) {
        let user = getCachedUser(userId);
        if (!user) {
          user = await User.findById(userId).populate('role').lean();
          if (user) setCachedUser(userId, user);
        }
        if (user) {
          req.user = user;
        }
      }
    } catch (error) {
      // Continue next silently for logout handling
    }
  }

  return next();
};

module.exports = { protect, permissiveAuth, invalidateUserAuthCache };
