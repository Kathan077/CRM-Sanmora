import { apiRequest } from './api';

export const userService = {
  async getAllUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return await apiRequest(endpoint, 'GET');
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
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users/activity-logs?${queryString}` : '/users/activity-logs';
    return await apiRequest(endpoint, 'GET');
  },

  async getUserAttendanceCalendar(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users/${userId}/attendance-calendar?${queryString}` : `/users/${userId}/attendance-calendar`;
    return await apiRequest(endpoint, 'GET');
  },

  async setUserMonthlyTarget(userId, data) {
    return await apiRequest(`/users/${userId}/monthly-target`, 'POST', data);
  }
};
