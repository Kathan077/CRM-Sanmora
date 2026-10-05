const Announcement = require('../models/Announcement.model');

/**
 * @desc    Get Active Announcements (non-expired and active)
 * @route   GET /api/announcements/active
 * @access  Public / Private
 */
const getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const activeAnnouncements = await Announcement.find({
      isActive: true,
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: { $exists: false } }
      ]
    }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: activeAnnouncements.length,
      data: activeAnnouncements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get All Announcements (Admin list)
 * @route   GET /api/announcements
 * @access  Private
 */
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Create / Publish New Announcement
 * @route   POST /api/announcements
 * @access  Private
 */
const createAnnouncement = async (req, res) => {
  try {
    const { text, category, durationHours } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Announcement text is required'
      });
    }

    const duration = Number(durationHours) || 44;
    const publishedAt = new Date();
    const expiresAt = new Date(publishedAt.getTime() + duration * 60 * 60 * 1000);

    const announcement = await Announcement.create({
      text: text.trim(),
      category: category || 'Celebration',
      durationHours: duration,
      publishedAt,
      expiresAt,
      isActive: true,
      createdBy: req.user ? req.user._id : null,
      createdByName: req.user ? req.user.name : 'Admin'
    });

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update Announcement
 * @route   PUT /api/announcements/:id
 * @access  Private
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, category, durationHours, isActive } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (text !== undefined) announcement.text = text.trim();
    if (category !== undefined) announcement.category = category;
    if (isActive !== undefined) announcement.isActive = Boolean(isActive);

    if (durationHours !== undefined) {
      announcement.durationHours = Number(durationHours) || 44;
      const pubTime = announcement.publishedAt ? new Date(announcement.publishedAt).getTime() : Date.now();
      announcement.expiresAt = new Date(pubTime + announcement.durationHours * 60 * 60 * 1000);
    }

    await announcement.save();

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete / Deactivate Announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await Announcement.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
