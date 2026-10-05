const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    text: { type: String, default: '' },
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    category: {
      type: String,
      default: 'FollowUp Call'
    },
    priority: {
      type: String,
      default: 'Hot'
    },
    description: {
      type: String,
      default: ''
    },
    assignedTo: {
      type: String,
      default: ''
    },
    assignedToId: {
      type: String,
      default: ''
    },
    assignedToUsername: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      default: ''
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
    dueDate: {
      type: String,
      default: ''
    },
    dueTime: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'To Do'
    },
    starred: {
      type: Boolean,
      default: false
    },
    checklist: [checklistItemSchema],
    subtasks: [checklistItemSchema]
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for 100,000+ scaling
taskSchema.index({ assignedToId: 1, status: 1, dueDate: 1 });
taskSchema.index({ createdById: 1, status: 1, dueDate: 1 });
taskSchema.index({ originalAssignerId: 1 });

module.exports = mongoose.model('Task', taskSchema);
