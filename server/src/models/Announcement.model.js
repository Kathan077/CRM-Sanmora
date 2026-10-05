const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Announcement text is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Celebration', 'Important', 'Achievement', 'Sales Target'],
      default: 'Celebration'
    },
    durationHours: {
      type: Number,
      default: 44,
      min: 1,
      max: 720
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdByName: {
      type: String,
      default: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

// Auto calculate expiresAt before saving if not explicitly set
announcementSchema.pre('save', function (next) {
  if (!this.expiresAt && this.publishedAt && this.durationHours) {
    const pubDate = new Date(this.publishedAt);
    this.expiresAt = new Date(pubDate.getTime() + this.durationHours * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
