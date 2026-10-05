const mongoose = require('mongoose');

const userSessionLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    loginTime: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    logoutTime: {
      type: Date,
      default: null
    },
    logoutType: {
      type: String,
      enum: ['manual', 'idle_timeout', 'session_expired', 'app_closed', null],
      default: null
    },
    sessionDuration: {
      type: Number, // Session duration in seconds
      default: 0
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

userSessionLogSchema.index({ user: 1, isActive: 1 });
userSessionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UserSessionLog', userSessionLogSchema);
