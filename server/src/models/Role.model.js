const mongoose = require('mongoose');
const { ALL_PERMISSIONS } = require('../constants/permissions');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    permissions: [
      {
        type: String,
        enum: ALL_PERMISSIONS
      }
    ],
    isSystem: {
      type: Boolean,
      default: false,
      description: 'System roles (like Super Admin) cannot be deleted'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Role', roleSchema);
