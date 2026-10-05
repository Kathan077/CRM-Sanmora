const mongoose = require('mongoose');

const followupHistorySchema = new mongoose.Schema(
  {
    followupDate: { type: String, default: '' },
    followupType: { type: String, default: 'Telephonic' },
    notes: { type: String, default: '' },
    nextFollowupDate: { type: String, default: '' },
    preferredTime: { type: String, default: '' },
    assignedTo: { type: String, default: '' },
    assignedToId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdById: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const followupSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      default: ''
    },
    inquiryNo: {
      type: String,
      trim: true,
      default: ''
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    company: {
      type: String,
      trim: true,
      default: 'Enterprise Account'
    },
    email: {
      type: String,
      trim: true,
      default: ''
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
    },
    followupDate: {
      type: String,
      default: ''
    },
    followupType: {
      type: String,
      default: 'Telephonic'
    },
    nextFollowupDate: {
      type: String,
      default: ''
    },
    preferredTime: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
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
    closingReason: {
      type: String,
      default: ''
    },
    history: [followupHistorySchema]
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for 100,000+ scaling
followupSchema.index({ assignedToId: 1, status: 1, updatedAt: -1 });
followupSchema.index({ createdById: 1, status: 1, updatedAt: -1 });
followupSchema.index({ originalAssignerId: 1 });
followupSchema.index({ followupDate: 1, nextFollowupDate: 1 });
followupSchema.index({ customerName: 'text', notes: 'text', phone: 'text', inquiryNo: 'text' });

module.exports = mongoose.model('Followup', followupSchema);
