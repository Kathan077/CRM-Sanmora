const Role = require('../models/Role.model');
const User = require('../models/User.model');
const { PERMISSION_GROUPS, ALL_PERMISSIONS } = require('../constants/permissions');

/**
 * @desc    Get All System Roles
 * @route   GET /api/roles
 * @access  Private (ROLES_VIEW or Super Admin)
 */
const getAllRoles = async (req, res) => {
  try {
    const [roles, userCounts] = await Promise.all([
      Role.find().sort({ createdAt: 1 }).lean(),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ])
    ]);

    const countMap = new Map(
      userCounts.map(c => [c._id ? c._id.toString() : '', c.count])
    );

    const rolesWithCounts = roles.map((role) => ({
      ...role,
      userCount: countMap.get(role._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      count: rolesWithCounts.length,
      data: rolesWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get Available System Permissions Catalog
 * @route   GET /api/roles/permissions
 * @access  Private (ROLES_VIEW or Super Admin)
 */
const getAvailablePermissions = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        allPermissions: ALL_PERMISSIONS,
        permissionGroups: PERMISSION_GROUPS
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Create New Custom Role
 * @route   POST /api/roles
 * @access  Private (ROLES_CREATE or Super Admin)
 */
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }

    const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: `Role with name '${name}' already exists.`
      });
    }

    // Validate permissions array
    const validPermissions = (permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));

    const role = await Role.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      permissions: validPermissions,
      isSystem: false
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update Existing Role
 * @route   PUT /api/roles/:id
 * @access  Private (ROLES_UPDATE or Super Admin)
 */
const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent changing name of root Super Admin role
    if (role.name === 'Super Admin' && name && name.trim() !== 'Super Admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rename root Super Admin role'
      });
    }

    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();

    if (permissions && Array.isArray(permissions)) {
      role.permissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    }

    await role.save();

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete Role
 * @route   DELETE /api/roles/:id
 * @access  Private (ROLES_DELETE or Super Admin)
 */
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    if (role.name === 'Super Admin') {
      return res.status(400).json({
        success: false,
        message: 'Root Super Admin role cannot be deleted'
      });
    }

    // Check if any active user is assigned to this role
    const assignedUserCount = await User.countDocuments({ role: role._id });
    if (assignedUserCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${assignedUserCount} user(s) are currently assigned to this role. Reassign them first.`
      });
    }

    await role.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllRoles,
  getAvailablePermissions,
  createRole,
  updateRole,
  deleteRole
};
