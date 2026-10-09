const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALL_PERMISSIONS } = require('../constants/permissions');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false // Do not include password in default queries
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'User role is required']
    },
    // User-level custom permission overrides (extra permissions granted beyond the role)
    customPermissions: [
      {
        type: String,
        enum: ALL_PERMISSIONS
      }
    ],
    // User-level custom permission revocations (permissions explicitly removed/unselected from the role)
    deniedPermissions: [
      {
        type: String,
        enum: ALL_PERMISSIONS
      }
    ],
    // Reporting Manager / Parent User in team hierarchy
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      trim: true,
      default: 'Sales'
    },
    designation: {
      type: String,
      trim: true,
      default: 'Executive'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    lastLogout: {
      type: Date
    },
    lastLogoutType: {
      type: String
    },
    monthlyTargets: [
      {
        year: { type: Number, required: true },
        month: { type: Number, required: true }, // 1 for Jan, 12 for Dec
        targetAmount: { type: Number, required: true, default: 0 },
        setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Performance Indexes for high-concurrency query execution
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ department: 1, isActive: 1 });
userSchema.index({ reportingTo: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1 });

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
