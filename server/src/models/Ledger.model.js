const mongoose = require('mongoose');

const instalmentSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    title: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    date: { type: String, default: '' },
    paymentMethod: { type: String, default: 'UPI / GPay' },
    utrNo: { type: String, default: '' },
    status: { type: String, default: 'Record Payment' },
    recordedBy: { type: String, default: '' },
    recordedById: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const ledgerSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: [true, 'Client ID is required'],
      unique: true,
      index: true
    },
    projectName: {
      type: String,
      default: 'Project Development'
    },
    agreedProjectCost: {
      type: Number,
      default: 0
    },
    contractDate: {
      type: String,
      default: ''
    },
    instalments: [instalmentSchema],
    createdBy: {
      type: String,
      default: 'Staff'
    },
    createdById: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

ledgerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
