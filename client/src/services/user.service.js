import { apiRequest } from './api';

export const userService = {
  async getAllUsers(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/users?${queryString}` : '/users';
      return await apiRequest(endpoint, 'GET');
    } catch (err) {
      if (err.status === 403) {
        // Fall back to staff directory for non-admin employees needing dropdown / hierarchy data
        try {
          return await apiRequest('/users/directory', 'GET');
        } catch (dirErr) {
          return { success: false, data: [], message: err.message };
        }
      }
      throw err;
    }
  },

  async getStaffDirectory() {
    try {
      return await apiRequest('/users/directory', 'GET');
    } catch (err) {
      return { success: false, data: [], message: err.message };
    }
  },

  async getUserById(id) {
    return await apiRequest(`/users/${id}`, 'GET');
  },

  async createUser(userData) {
    return await apiRequest('/users', 'POST', userData);
  },

  async updateUser(id, userData) {
    return await apiRequest(`/users/${id}`, 'PUT', userData);
  },

  async toggleUserStatus(id) {
    return await apiRequest(`/users/${id}/toggle-status`, 'PATCH');
  },

  async deleteUser(id) {
    return await apiRequest(`/users/${id}`, 'DELETE');
  },

  async getUserActivityLogs(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/users/activity-logs?${queryString}` : '/users/activity-logs';
      return await apiRequest(endpoint, 'GET');
    } catch (err) {
      console.warn('[User Service] getUserActivityLogs error:', err.message);
      return { success: false, data: [], message: err.message, status: err.status };
    }
  },

  async getUserAttendanceCalendar(userId, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/users/${userId}/attendance-calendar?${queryString}` : `/users/${userId}/attendance-calendar`;
      return await apiRequest(endpoint, 'GET');
    } catch (err) {
      console.warn('[User Service] getUserAttendanceCalendar error:', err.message);
      return { success: false, data: null, message: err.message, status: err.status };
    }
  },

  async setUserMonthlyTarget(userId, data) {
    return await apiRequest(`/users/${userId}/monthly-target`, 'POST', data);
  }
};
