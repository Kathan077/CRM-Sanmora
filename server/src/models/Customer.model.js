const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    inquiryNo: {
      type: String,
      trim: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true,
      default: 'Enterprise Account'
    },
    companyName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    primaryContact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    productInquiry: {
      type: String,
      trim: true,
      default: ''
    },
    requirementDetails: {
      type: String,
      trim: true,
      default: ''
    },
    leadStatus: {
      type: String,
      default: 'Warm'
    },
    status: {
      type: String,
      default: 'Active'
    },
    assignedTo: {
      type: String,
      default: 'Staff'
    },
    assignedToId: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      default: 'Staff'
    },
    createdById: {
      type: String,
      default: ''
    },
    originalAssignerName: {
      type: String,
      default: ''
    },
    originalAssignerId: {
      type: String,
      default: ''
    },
    assignedUntilDate: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for 100,000+ scaling
customerSchema.index({ assignedToId: 1, status: 1, createdAt: -1 });
customerSchema.index({ createdById: 1, status: 1, createdAt: -1 });
customerSchema.index({ originalAssignerId: 1 });
customerSchema.index({ phone: 1, email: 1 });

module.exports = mongoose.model('Customer', customerSchema);
