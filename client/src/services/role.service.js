import { apiRequest } from './api';

export const roleService = {
  async getAllRoles() {
    return await apiRequest('/roles', 'GET');
  },

  async getPermissionsCatalog() {
    return await apiRequest('/roles/permissions', 'GET');
  },

  async createRole(roleData) {
    return await apiRequest('/roles', 'POST', roleData);
  },

  async updateRole(id, roleData) {
    return await apiRequest(`/roles/${id}`, 'PUT', roleData);
  },

  async deleteRole(id) {
    return await apiRequest(`/roles/${id}`, 'DELETE');
  }
};
